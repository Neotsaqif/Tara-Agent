"""Gemini provider (official ``google-genai`` SDK).

Design constraints:
* The API key is read from settings (server-side only) and is never logged,
  echoed, or returned in any error or health payload.
* Structured output is requested via ``response_schema=ModelAnswer`` and
  validated with Pydantic. Invalid JSON is a typed error, not a silent fallback.
* Retries are bounded and only applied to transient categories.
* The health check performs a real probe (one tiny generation) — a present key
  alone never reports ``operational``.
"""
from __future__ import annotations

import json
import time

from pydantic import ValidationError

from ..config import settings
from .prompts import SYSTEM_INSTRUCTION
from .provider import (
    LLMProvider,
    ProviderError,
    ProviderErrorKind,
    ProviderHealth,
    ProviderHealthLevel,
    with_retry,
)
from .schemas import ModelAnswer

_HEALTH_PROMPT = 'Balas JSON sah: {"answer":"ok","evidence":[],"assumptions":[],"limitations":[],"needs_approval":false,"available_actions":[]}'


def _classify(exc: Exception) -> ProviderError:
    """Map SDK exceptions to a safe, retry-aware ProviderError (no raw text)."""
    text = str(exc).lower()
    name = type(exc).__name__.lower()
    status = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    if isinstance(status, int):
        text = f"{status} {text}"
    if "429" in text or "resource_exhausted" in text or "quota" in text or "rate" in text:
        return ProviderError("Kuota atau rate limit Gemini tercapai. Coba lagi nanti.", retryable=True, kind=ProviderErrorKind.RATE_LIMIT)
    if "timeout" in text or "deadline" in name or "timed out" in text or "timeout" in name:
        return ProviderError("Permintaan Gemini melewati batas waktu.", retryable=True, kind=ProviderErrorKind.TIMEOUT)
    if any(code in text for code in ("503", "500", "502", "504", "unavailable", "internal")):
        return ProviderError("Layanan Gemini sementara tidak tersedia.", retryable=True, kind=ProviderErrorKind.TRANSIENT)
    if any(code in text for code in ("401", "403", "api key", "api_key", "unauthenticated", "permission_denied", "invalid authentication")):
        return ProviderError("Kredensial Gemini tidak valid atau tidak berizin.", retryable=False, kind=ProviderErrorKind.AUTH)
    if "404" in text or "not found" in text or "not_found" in text:
        return ProviderError("Model Gemini tidak tersedia untuk akun ini.", retryable=False, kind=ProviderErrorKind.MODEL)
    if "safety" in text or "blocked" in text or "recitation" in text:
        return ProviderError("Respons Gemini diblokir oleh kebijakan keamanan.", retryable=False, kind=ProviderErrorKind.SAFETY)
    if "connection" in text or "network" in text or "dns" in text or "connect" in text:
        return ProviderError("Gemini tidak dapat dihubungi.", retryable=True, kind=ProviderErrorKind.TRANSIENT)
    return ProviderError("Permintaan ke Gemini gagal.", retryable=False, kind=ProviderErrorKind.UNKNOWN)


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str, timeout_seconds: float = 30) -> None:
        if not api_key:
            raise ProviderError("Gemini API key belum dikonfigurasi.", retryable=False, kind=ProviderErrorKind.AUTH)
        from google import genai
        from google.genai import types

        self.model = model
        self._types = types
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=int(timeout_seconds * 1000)),
        )
        self._max_retries = max(0, settings.llm_max_retries)
        self._max_output_tokens = settings.llm_max_output_tokens

    def _config(self):
        return self._types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=ModelAnswer,
            temperature=0.2,
            max_output_tokens=self._max_output_tokens,
        )

    def _call_once(self, prompt: str) -> ModelAnswer:
        from google.genai import errors as genai_errors

        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=self._config(),
            )
        except genai_errors.APIError as exc:
            raise _classify(exc) from exc
        except ProviderError:
            raise
        except Exception as exc:  # network/timeouts from httpx
            raise _classify(exc) from exc

        # Safety/finish-reason handling: a blocked prompt often yields no text.
        candidates = getattr(response, "candidates", None) or []
        finish_reason = None
        if candidates:
            finish_reason = str(getattr(candidates[0], "finish_reason", "") or "")
        if finish_reason and any(token in finish_reason.upper() for token in ("SAFETY", "BLOCK", "RECITATION")):
            raise ProviderError("Respons Gemini diblokir oleh kebijakan keamanan.", retryable=False, kind=ProviderErrorKind.SAFETY)

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, ModelAnswer):
            return parsed
        if isinstance(parsed, dict):
            try:
                return ModelAnswer.model_validate(parsed)
            except ValidationError as exc:
                raise ProviderError("Respons Gemini tidak sesuai schema.", retryable=False, kind=ProviderErrorKind.PARSE) from exc
        text = getattr(response, "text", "") or ""
        text = text.strip()
        if not text:
            raise ProviderError("Gemini mengembalikan respons kosong.", retryable=True, kind=ProviderErrorKind.EMPTY)
        # Strip potential markdown fences before parsing.
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:].strip()
        try:
            payload = json.loads(text)
            return ModelAnswer.model_validate(payload)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ProviderError("Respons Gemini bukan JSON yang valid sesuai schema.", retryable=False, kind=ProviderErrorKind.PARSE) from exc

    def answer(self, prompt: str) -> ModelAnswer:
        return with_retry(lambda: self._call_once(prompt), max_retries=self._max_retries)

    def health(self) -> ProviderHealth:
        """Real probe: configured -> reachable -> model responds with valid JSON."""
        started = time.monotonic()

        def _latency() -> int:
            return int((time.monotonic() - started) * 1000)

        try:
            self._call_once(_HEALTH_PROMPT)
        except ProviderError as error:
            level = {
                ProviderErrorKind.AUTH: ProviderHealthLevel.KEY_MISSING,
                ProviderErrorKind.MODEL: ProviderHealthLevel.MODEL_ERROR,
                ProviderErrorKind.RATE_LIMIT: ProviderHealthLevel.MODEL_ERROR,
                ProviderErrorKind.PARSE: ProviderHealthLevel.MODEL_ERROR,
                ProviderErrorKind.SAFETY: ProviderHealthLevel.MODEL_ERROR,
                ProviderErrorKind.TIMEOUT: ProviderHealthLevel.UNREACHABLE,
                ProviderErrorKind.TRANSIENT: ProviderHealthLevel.UNREACHABLE,
            }.get(error.kind, ProviderHealthLevel.UNREACHABLE)
            return ProviderHealth(level, self.name, self.model, str(error), _latency())
        except Exception:
            return ProviderHealth(
                ProviderHealthLevel.UNREACHABLE,
                self.name,
                self.model,
                "Gemini tidak dapat dihubungi.",
                _latency(),
            )
        return ProviderHealth(
            ProviderHealthLevel.OPERATIONAL,
            self.name,
            self.model,
            "Gemini merespons dengan JSON valid sesuai schema.",
            _latency(),
        )


def build_provider() -> LLMProvider:
    """Build the configured provider.

    When Gemini is selected but the key is missing the app still boots with a
    provider that fails loudly on use (status endpoint reports ``key_missing``)
    instead of crashing at import time.
    """
    if settings.llm_provider == "gemini":
        return GeminiProvider(settings.llm_api_key, settings.llm_model, settings.llm_timeout_seconds)
    from .provider import MockProvider

    return MockProvider()


def provider_health(provider: LLMProvider) -> ProviderHealth:
    """Safe health probe for any provider."""
    probe = getattr(provider, "health", None)
    if callable(probe):
        try:
            return probe()
        except Exception:  # health must never raise into the API layer
            return ProviderHealth(
                ProviderHealthLevel.UNREACHABLE,
                getattr(provider, "name", "unknown"),
                getattr(provider, "model", "unknown"),
                "Health check gagal.",
                None,
            )
    return ProviderHealth(
        ProviderHealthLevel.NOT_CONFIGURED,
        getattr(provider, "name", "unknown"),
        getattr(provider, "model", "unknown"),
        "Provider tidak menyediakan health check.",
        None,
    )

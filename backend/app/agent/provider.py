"""LLM provider abstraction.

Providers receive a fully-built prompt (system rules are injected by the
provider itself) and return a validated :class:`ModelAnswer`. The provider is
the *only* place where an external LLM is called; all business numbers are
computed elsewhere.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol

from .schemas import ModelAnswer


class ProviderError(RuntimeError):
    """Safe, user-facing provider failure category."""

    def __init__(self, message: str, *, retryable: bool = False, kind: str = "error") -> None:
        super().__init__(message)
        self.retryable = retryable
        self.kind = kind


class ProviderErrorKind:
    AUTH = "auth"
    RATE_LIMIT = "rate_limit"
    TIMEOUT = "timeout"
    TRANSIENT = "transient"
    MODEL = "model"
    EMPTY = "empty"
    PARSE = "parse"
    SAFETY = "safety"
    UNKNOWN = "unknown"


class ProviderHealthLevel(StrEnum):
    NOT_CONFIGURED = "not_configured"
    KEY_MISSING = "key_missing"
    UNREACHABLE = "unreachable"
    MODEL_ERROR = "model_error"
    OPERATIONAL = "operational"
    # Backwards-compatible alias kept for existing callers/tests.
    OK = "operational"


@dataclass(frozen=True)
class ProviderHealth:
    level: ProviderHealthLevel
    provider: str
    model: str
    message: str
    latency_ms: int | None = None


class LLMProvider(Protocol):
    name: str
    model: str

    def answer(self, prompt: str) -> ModelAnswer: ...


class MockProvider:
    """Offline provider used in tests and when ``LLM_PROVIDER=mock``.

    It never invents business figures: it echoes back a deterministic,
    evidence-free explanation and explicitly states the limitation.
    """

    name = "mock"
    model = "mock"

    def answer(self, prompt: str) -> ModelAnswer:
        return ModelAnswer(
            answer=(
                "Mode mock aktif: saya TIDAK memanggil model AI eksternal. "
                "Angka bisnis pada jawaban ini (jika ada) berasal dari perhitungan deterministik "
                "backend, bukan dari LLM."
            ),
            evidence=[],
            assumptions=[],
            limitations=[
                "LLM_PROVIDER=mock — tidak ada penalaran AI generatif.",
                "Isi jawaban naratif dapat berbeda saat LLM_PROVIDER=gemini dan key valid.",
            ],
        )

    def health(self) -> ProviderHealth:
        return ProviderHealth(
            ProviderHealthLevel.NOT_CONFIGURED,
            self.name,
            self.model,
            "Mock provider aktif; tidak ada API eksternal yang dipanggil.",
            0,
        )


def with_retry(fn, *, max_retries: int, base_delay: float = 0.5, sleep=time.sleep):
    """Retry only for provider errors explicitly flagged ``retryable``."""
    attempt = 0
    while True:
        try:
            return fn()
        except ProviderError as error:
            if not error.retryable or attempt >= max_retries:
                raise
            sleep(base_delay * (2 ** attempt))
            attempt += 1

from google import genai
from google.genai import types

from .prompts import SYSTEM_INSTRUCTION
from .provider import ProviderError
from .schemas import ModelAnswer


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str, timeout_seconds: float = 30) -> None:
        if not api_key:
            raise ProviderError("Gemini API key is not configured")
        self.model = model
        self._client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=int(timeout_seconds * 1000)))

    def answer(self, prompt: str) -> ModelAnswer:
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=ModelAnswer,
                ),
            )
            parsed = getattr(response, "parsed", None)
            if isinstance(parsed, ModelAnswer):
                return parsed
            text = getattr(response, "text", "") or ""
            if not text:
                raise ProviderError("Gemini returned an empty response")
            return ModelAnswer.model_validate_json(text)
        except ProviderError:
            raise
        except Exception as error:
            raise ProviderError("Gemini provider request failed") from error

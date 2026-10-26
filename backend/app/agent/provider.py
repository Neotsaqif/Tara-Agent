from typing import Protocol


class LLMProvider(Protocol):
    def answer(self, prompt: str) -> str: ...


class MockProvider:
    """Explicit local provider; never represents a production LLM response."""

    def answer(self, prompt: str) -> str:
        return f"[MOCK] No external LLM configured. Prompt received: {prompt[:120]}"

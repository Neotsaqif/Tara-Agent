from typing import Protocol
from .schemas import ModelAnswer


class ProviderError(RuntimeError):
    """Safe, user-facing provider failure category."""


class LLMProvider(Protocol):
    name: str
    def answer(self, prompt: str) -> ModelAnswer: ...


class MockProvider:
    name = "mock"

    def answer(self, prompt: str) -> ModelAnswer:
        return ModelAnswer(
            answer="Saya belum dapat menyimpulkan kondisi bisnis tanpa dataset yang terhubung.",
            limitations=["Belum ada dataset penjualan yang terhubung.", "Diperlukan data periode, outlet, transaksi, harga, dan biaya."],
        )

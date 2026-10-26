from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class GeoContextRequest:
    outlet_id: str
    question: str


@dataclass(frozen=True)
class GeoContextResult:
    status: str
    findings: tuple[str, ...]
    data_sources: tuple[str, ...]
    observed_at: datetime | None
    coverage: str
    limitations: tuple[str, ...]
    confidence: float | None


class GeoAIProvider(Protocol):
    def analyze(self, request: GeoContextRequest) -> GeoContextResult: ...


class MockGeoAIProvider:
    def analyze(self, request: GeoContextRequest) -> GeoContextResult:
        return GeoContextResult("mock", (), ("none",), None, "none", ("No geospatial provider configured",), None)

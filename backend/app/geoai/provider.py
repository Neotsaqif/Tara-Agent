"""TARA GEOAI providers.

* :class:`MockGeoAIProvider` — deterministic, clearly-labelled synthetic
  findings. Used when ``GEOAI_PROVIDER=mock`` or in tests.
* :class:`OverpassGeoAIProvider` — real adapter that queries the OpenStreetMap
  Overpass API. It never fabricates counts, distances or populations; when the
  service is unreachable it returns an explicit ``unreachable`` status so the
  UI can show a honest empty state instead of fake data.

Every result carries its ``data_sources`` and an ``observed_at`` timestamp so
downstream consumers can label provenance.
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from ..config import settings


@dataclass(frozen=True)
class GeoContextRequest:
    outlet_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_m: float = 1500.0
    question: str = ""


@dataclass(frozen=True)
class GeoFinding:
    kind: str  # amenity | shop | tourism | distance | population_note
    label: str
    value: str | None = None


@dataclass(frozen=True)
class GeoContextResult:
    status: str  # ok | unreachable | not_configured | mock | no_coordinates
    findings: tuple[GeoFinding, ...]
    data_sources: tuple[str, ...]
    observed_at: datetime | None
    coverage: str
    limitations: tuple[str, ...]
    confidence: float | None


class GeoAIProvider(Protocol):
    def analyze(self, request: GeoContextRequest) -> GeoContextResult: ...


_LIMITATIONS_OSM = (
    "Data OpenStreetMap bersifat kontribusi sukarela; kelengkapan bervariasi.",
    "Hasil adalah petunjuk konteks lokasi, bukan survei pasar formal.",
)


def _validate_coords(lat: float | None, lon: float | None) -> tuple[float, float]:
    if lat is None or lon is None:
        raise ValueError("latitude dan longitude wajib untuk analisis geospatial.")
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise ValueError("latitude/longitude di luar rentang valid.")
    return float(lat), float(lon)


class MockGeoAIProvider:
    def analyze(self, request: GeoContextRequest) -> GeoContextResult:
        return GeoContextResult(
            status="mock",
            findings=(
                GeoFinding(kind="mock", label="Provider mock aktif", value="Tidak ada data nyata dipanggil."),
            ),
            data_sources=("mock",),
            observed_at=datetime.now(timezone.utc),
            coverage=f"mock radius {request.radius_m}m",
            limitations=("GEOAI_PROVIDER=mock — tidak ada layanan eksternal yang dipanggil.",),
            confidence=None,
        )


class OverpassGeoAIProvider:
    """Real Overpass API adapter. Failures are surfaced, not faked."""

    def __init__(
        self,
        *,
        endpoint: str | None = None,
        timeout: float | None = None,
        user_agent: str | None = None,
        sleep=time.sleep,
        opener: urllib.request.OpenerDirector | None = None,
    ) -> None:
        self.endpoint = endpoint or settings.geoai_overpass_url
        self.timeout = timeout or settings.geoai_timeout_seconds
        self.user_agent = user_agent or settings.geoai_user_agent
        self._sleep = sleep
        self._opener = opener

    def _query(self, lat: float, lon: float, radius_m: float) -> dict | None:
        # Discover F&B-relevant amenities + competitors within the radius.
        query = f"""
        [out:json][timeout:{int(self.timeout)}];
        (
          node["amenity"~"cafe|restaurant|fast_food|bar"](around:{radius_m},{lat},{lon});
          way["amenity"~"cafe|restaurant|fast_food|bar"](around:{radius_m},{lat},{lon});
          node["shop"~"bakery|convenience|supermarket"](around:{radius_m},{lat},{lon});
        );
        out tags center 200;
        """
        body = urllib.parse.urlencode({"data": query}).encode("utf-8")
        req = urllib.request.Request(
            self.endpoint,
            data=body,
            headers={"User-Agent": self.user_agent, "Content-Type": "application/x-www-form-urlencoded"},
        )
        opener = self._opener or urllib.request.build_opener()
        try:
            with opener.open(req, timeout=self.timeout) as response:
                payload = response.read()
        except Exception:
            return None
        try:
            return json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def analyze(self, request: GeoContextRequest) -> GeoContextResult:
        started = time.monotonic()
        try:
            lat, lon = _validate_coords(request.latitude, request.longitude)
        except ValueError as exc:
            return GeoContextResult(
                status="no_coordinates",
                findings=(GeoFinding(kind="error", label="Koordinat tidak valid", value=str(exc)),),
                data_sources=("none",),
                observed_at=datetime.now(timezone.utc),
                coverage="none",
                limitations=("Latitude dan longitude wajib untuk analisis GEOAI.",),
                confidence=None,
            )
        radius = min(float(request.radius_m or 1500.0), settings.geoai_max_radius_m)
        data = self._query(lat, lon, radius)
        observed_at = datetime.now(timezone.utc)
        if data is None:
            return GeoContextResult(
                status="unreachable",
                findings=(GeoFinding(kind="error", label="Layanan Overpass tidak dapat dijangkau", value=f"{int((time.monotonic() - started) * 1000)}ms"),),
                data_sources=("overpass-api.de",),
                observed_at=observed_at,
                coverage=f"radius {radius}m",
                limitations=_LIMITATIONS_OSM + ("Layanan Overpass tidak dapat dijangkau saat ini; tidak ada data palsu yang dibuat.",),
                confidence=None,
            )
        elements = data.get("elements", []) or []
        amenity_counts: dict[str, int] = {}
        shop_counts: dict[str, int] = {}
        for el in elements:
            tags = el.get("tags") or {}
            amenity = tags.get("amenity")
            shop = tags.get("shop")
            if amenity:
                amenity_counts[amenity] = amenity_counts.get(amenity, 0) + 1
            if shop:
                shop_counts[shop] = shop_counts.get(shop, 0) + 1
        findings: list[GeoFinding] = []
        for kind, count in sorted(amenity_counts.items(), key=lambda x: x[1], reverse=True):
            findings.append(GeoFinding(kind="amenity", label=kind, value=f"{count} tempat"))
        for kind, count in sorted(shop_counts.items(), key=lambda x: x[1], reverse=True):
            findings.append(GeoFinding(kind="shop", label=kind, value=f"{count} toko"))
        if not findings:
            findings.append(GeoFinding(kind="note", label="Tidak ada POI F&B/signifikan ditemukan", value="0 hasil"))
        return GeoContextResult(
            status="ok",
            findings=tuple(findings[:20]),
            data_sources=("OpenStreetMap/Overpass API",),
            observed_at=observed_at,
            coverage=f"radius {radius}m di sekitar ({lat:.4f}, {lon:.4f})",
            limitations=_LIMITATIONS_OSM,
            confidence=0.7 if findings else 0.3,
        )


def build_geoai_provider() -> GeoAIProvider:
    if settings.geoai_provider == "osm":
        return OverpassGeoAIProvider()
    if settings.geoai_provider == "mock":
        return MockGeoAIProvider()
    # When ``none``, return a mock that clearly reports it is not configured.
    return MockGeoAIProvider()


def result_to_dict(result: GeoContextResult) -> dict:
    return {
        "status": result.status,
        "findings": [{"kind": f.kind, "label": f.label, "value": f.value} for f in result.findings],
        "data_sources": list(result.data_sources),
        "observed_at": result.observed_at.isoformat() if result.observed_at else None,
        "coverage": result.coverage,
        "limitations": list(result.limitations),
        "confidence": result.confidence,
    }

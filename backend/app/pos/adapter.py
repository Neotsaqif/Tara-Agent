"""POS integration architecture.

Flow: ``POS Provider → Adapter → Normalization → Validation → Idempotency →
Internal Schema → Database``.

Only a generic REST adapter is provided because no vendor API is available.
The adapter is fully unit-testable against a local mock HTTP server and never
assumes a vendor-specific payload shape — the mapping is configurable.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Protocol

from ..config import settings


class PosError(RuntimeError):
    def __init__(self, message: str, *, retryable: bool = False, kind: str = "error") -> None:
        super().__init__(message)
        self.retryable = retryable
        self.kind = kind


@dataclass(frozen=True)
class NormalizedSale:
    outlet_code: str
    sku: str
    product_name: str
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    discount_amount: Decimal
    transaction_date: datetime
    external_id: str


@dataclass(frozen=True)
class SyncResult:
    status: str
    fetched: int
    valid: int
    invalid: int
    duplicates: int
    errors: tuple[str, ...] = ()
    raw_sample: list[dict] = field(default_factory=list)


class PosAdapter(Protocol):
    def fetch_sales(self, *, since: datetime | None = None) -> list[dict]: ...
    def normalize(self, raw: dict) -> NormalizedSale: ...


class GenericRestPosAdapter:
    """Generic REST adapter with timeout, retry and safe errors."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        sleep=time.sleep,
    ) -> None:
        self.base_url = (base_url or settings.pos_api_base_url).rstrip("/")
        self.api_key = api_key or settings.pos_api_key
        self.timeout = timeout or settings.pos_timeout_seconds
        self.max_retries = max_retries if max_retries is not None else settings.pos_max_retries
        self._sleep = sleep

    def fetch_sales(self, *, since: datetime | None = None) -> list[dict]:
        if not self.base_url:
            raise PosError("POS belum dikonfigurasi.", retryable=False, kind="not_configured")
        params = f"?since={urllib.parse.quote(since.isoformat())}" if since else ""
        url = f"{self.base_url}/sales{params}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {self.api_key}", "Accept": "application/json"})
        attempt = 0
        while True:
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as response:  # noqa: S310 - configured URL
                    payload = json.loads(response.read().decode("utf-8"))
                break
            except urllib.error.HTTPError as exc:
                if exc.code in (429, 500, 502, 503, 504) and attempt < self.max_retries:
                    attempt += 1
                    self._sleep(0.5 * (2 ** attempt))
                    continue
                raise PosError(f"POS HTTP error {exc.code}", retryable=exc.code in (429, 500, 502, 503, 504), kind="http") from exc
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                if attempt < self.max_retries:
                    attempt += 1
                    self._sleep(0.5 * (2 ** attempt))
                    continue
                raise PosError("POS tidak dapat dijangkau atau respons tidak valid.", retryable=True, kind="network") from exc
        if isinstance(payload, dict):
            payload = payload.get("data", [])
        if not isinstance(payload, list):
            raise PosError("Format payload POS tidak valid.", retryable=False, kind="schema")
        return payload

    def normalize(self, raw: dict) -> NormalizedSale:
        try:
            qty = int(raw["quantity"])
            price = Decimal(str(raw["unit_price"]))
            cost = Decimal(str(raw.get("unit_cost") or 0))
            discount = Decimal(str(raw.get("discount_amount") or 0))
            if qty <= 0 or price < 0 or cost < 0 or discount < 0:
                raise ValueError("nilai tidak valid")
            dt = datetime.fromisoformat(str(raw["transaction_date"]))
            return NormalizedSale(
                outlet_code=str(raw["outlet_code"]).strip(),
                sku=str(raw["sku"]).strip(),
                product_name=str(raw.get("product_name") or raw["sku"]),
                quantity=qty,
                unit_price=price,
                unit_cost=cost,
                discount_amount=discount,
                transaction_date=dt,
                external_id=str(raw.get("external_id") or f"POS-{qtoken(raw)}"),
            )
        except (KeyError, ValueError, InvalidOperation, TypeError) as exc:
            raise PosError(f"Baris POS tidak valid: {exc}", retryable=False, kind="validation") from exc


def qtoken(raw: dict) -> str:
    """Deterministic fallback external id from a raw record."""
    import hashlib

    digest = hashlib.sha1(json.dumps(raw, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    return digest[:24]

"""Application configuration.

All secrets are read from environment variables (via pydantic-settings `.env`).
Nothing secret is exposed to the frontend; `VITE_*` variables live exclusively
in the frontend repository and are non-secret.

Defaults are safe for local development only. ``APP_ENV=production`` triggers
strict validation of secrets at startup (see :func:`validate_runtime_settings`).
"""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve `.env` relative to the repository root so scripts work regardless of CWD.
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    app_env: str = "development"
    api_base_url: str = "http://localhost:8000"
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    database_url: str = "sqlite:///./tara.db"
    api_public_prefix: str = "/api/v1"

    # ── LLM provider ────────────────────────────────────────────────────
    llm_provider: str = "mock"
    llm_api_key: str = ""
    llm_model: str = "gemini-3.5-flash-lite"
    llm_timeout_seconds: float = 30.0
    llm_max_retries: int = 2
    llm_max_output_tokens: int = 2048

    # ── Authentication / RBAC ───────────────────────────────────────────
    tara_jwt_secret: str = ""
    tara_jwt_expire_minutes: int = 60
    tara_refresh_expire_days: int = 14
    tara_enable_dev_seed: bool = False
    tara_password_min_length: int = 10
    tara_login_max_failed: int = 5
    tara_login_lock_minutes: int = 15
    tara_max_sessions_per_user: int = 20
    tara_access_token_issuer: str = "tara-agent"
    tara_cookie_secure: bool = False

    # ── Business defaults ───────────────────────────────────────────────
    tara_max_discount_pct: float = 30.0
    tara_min_margin_pct: float = 40.0
    tara_promo_budget: float = 10_000_000.0
    tara_max_volume_uplift_pct: float = 500.0

    # ── CSV import ──────────────────────────────────────────────────────
    tara_csv_max_bytes: int = 10 * 1024 * 1024
    tara_csv_max_rows: int = 200_000

    # ── GEOAI ───────────────────────────────────────────────────────────
    geoai_provider: str = "none"  # none | mock | osm
    geoai_overpass_url: str = "https://overpass-api.de/api/interpreter"
    geoai_timeout_seconds: float = 20.0
    geoai_cache_ttl_seconds: int = 3600
    geoai_user_agent: str = "TARAAgent/1.0"
    geoai_max_radius_m: float = 5000.0

    # ── POS integration ─────────────────────────────────────────────────
    pos_provider: str = "none"  # none | mock | generic
    pos_api_base_url: str = ""
    pos_api_key: str = ""
    pos_timeout_seconds: float = 20.0
    pos_provider_name: str = "generic"
    pos_max_retries: int = 2

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE), extra="ignore", case_sensitive=False
    )

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith(("postgresql", "postgres"))

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


settings = Settings()


class ConfigurationError(RuntimeError):
    """Raised when runtime configuration is unsafe or incomplete."""


_WEAK_SECRETS = {
    "secret",
    "changeme",
    "change-me",
    "password",
    "tara",
    "dev",
    "development",
    "test",
    "jwt-secret",
    "supersecret",
}


def validate_runtime_settings(is_production: bool | None = None) -> list[str]:
    """Validate runtime configuration at startup. Returns warnings.

    Production mode raises :class:`ConfigurationError` when JWT secret, database
    or CORS are unsafe. Development mode returns warnings without crashing the
    server (so a developer can boot the app and see what is missing).
    """
    production = settings.is_production if is_production is None else is_production
    warnings: list[str] = []
    problems: list[str] = []

    secret = settings.tara_jwt_secret or ""
    if not secret:
        problems.append("TARA_JWT_SECRET belum dikonfigurasi (minimum 32 karakter di production).")
    elif len(secret) < 16:
        problems.append("TARA_JWT_SECRET terlalu pendek (minimum 16, rekomendasi 32+).")
    elif secret.lower() in _WEAK_SECRETS:
        problems.append("TARA_JWT_SECRET menggunakan nilai lemah yang umum dipakai.")

    if settings.is_production:
        if settings.database_url.startswith("sqlite"):
            warnings.append("Production memakai SQLite; PostgreSQL disarankan sebagai target utama.")
        if "*" in settings.cors_origins:
            problems.append("CORS_ORIGINS tidak boleh memakai wildcard '*' di production.")
        if settings.tara_enable_dev_seed:
            problems.append("TARA_ENABLE_DEV_SEED harus false di production.")
        if settings.llm_provider not in {"gemini", "mock"}:
            problems.append(f"LLM_PROVIDER tidak dikenal: {settings.llm_provider}")
        if settings.llm_provider == "gemini" and not settings.llm_api_key:
            problems.append("LLM_PROVIDER=gemini tetapi LLM_API_KEY kosong.")

    if settings.llm_provider == "gemini" and not settings.llm_api_key:
        warnings.append("LLM_PROVIDER=gemini tetapi LLM_API_KEY kosong; chat live akan gagal sampai key diisi.")

    if production and problems:
        raise ConfigurationError("Konfigurasi tidak aman: " + " | ".join(problems))
    warnings.extend(problems)
    return warnings

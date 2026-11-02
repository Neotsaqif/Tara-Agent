"""Shared pytest bootstrap for the TARA AGENT backend.

Why this file exists
--------------------
The application reads configuration from a developer-local ``.env`` file via
``pydantic-settings``. That means a laptop configured for *live* Gemini and a
real database would leak into the test-suite, making results depend on whoever
happens to run them.

This conftest pins a **hermetic** test environment *before* ``app.config`` is
imported:

* ``LLM_PROVIDER=mock``  → tests never call a paid/live LLM.
* ``DATABASE_URL`` → a throwaway SQLite file under the pytest tmp dir, never the
  developer's ``tara.db``.
* ``TARA_JWT_SECRET`` → a deterministic non-production secret so token tests are
  reproducible and never require a real secret.
* ``GEOAI_PROVIDER`` / ``POS_PROVIDER`` → ``none`` so external network calls are
  impossible from CI.

Values are only applied when the variable is *not already set*, so a CI job can
still override them explicitly.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


def _pin(key: str, value: str) -> None:
    os.environ.setdefault(key, value)


# A non-empty secret is required for *identity* (JWT) tests to run. It is a test
# fixture, not a credential: it never reaches a deployed environment.
_pin("TARA_JWT_SECRET", "test-only-jwt-secret-not-for-production-0123456789")
_pin("APP_ENV", "test")
_pin("LLM_PROVIDER", "mock")
_pin("LLM_API_KEY", "")
_pin("GEOAI_PROVIDER", "none")
_pin("POS_PROVIDER", "none")
_pin("TARA_ENABLE_DEV_SEED", "false")

# Isolated database so tests can never mutate the developer's tara.db.
if "DATABASE_URL" not in os.environ:
    _test_db = Path(tempfile.gettempdir()) / "tara-agent-pytest.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{_test_db.as_posix()}"

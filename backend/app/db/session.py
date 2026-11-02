"""Database engine and session management.

SQLite is used for local dev/tests. PostgreSQL is the production target (set
``DATABASE_URL`` to a ``postgresql+psycopg://`` DSN). The engine lazily connects
so importing the app never fails when the DB is unreachable; health checks call
``ping_database`` explicitly.
"""
from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from ..config import settings

# Repository root — used to anchor relative SQLite paths so the app behaves
# identically no matter which directory a script or the CLI is launched from.
_REPO_ROOT = Path(__file__).resolve().parents[3]


def _normalize_url(url: str) -> str:
    """Anchor relative SQLite file paths to the repository root."""
    prefix = "sqlite:///"
    if url.startswith(prefix) and not url.startswith("sqlite:////"):
        raw = url[len(prefix) :]
        if raw and raw != ":memory:" and not Path(raw).is_absolute():
            return f"{prefix}{(_REPO_ROOT / raw).as_posix()}"
    return url


def _make_engine() -> Engine:
    url = _normalize_url(settings.database_url)
    connect_args: dict = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True, future=True)
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def _fk_pragma(dbapi_connection, _record):  # noqa: ANN001
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a request-scoped session with rollback safety."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional scope for background/seed/service usage."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def ping_database() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

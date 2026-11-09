"""GET /api/health (liveness, no DB) and GET /api/health/ready (DB readiness)."""

from __future__ import annotations

import psycopg
import pytest


def test_ready_ok_when_database_is_reachable(client):
    res = client.get("/api/health/ready")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "db": "ok"}


def test_ready_503_when_database_is_unreachable(client, monkeypatch):
    from backend import main

    def unreachable(*_args, **_kwargs):
        raise psycopg.OperationalError("connection refused")

    monkeypatch.setattr(main, "ping", unreachable)
    res = client.get("/api/health/ready")
    assert res.status_code == 503
    assert res.json() == {"status": "error", "db": "unavailable"}
    # Liveness does not touch the database
    assert client.get("/api/health").status_code == 200


def test_ping_succeeds_against_database(db):
    from backend.db import ping

    ping()  # raises if the database is unreachable


def test_ping_raises_when_database_is_unreachable(db, monkeypatch):
    from backend.config import get_settings
    from backend.db import ping

    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:1/none")
    get_settings.cache_clear()
    try:
        with pytest.raises(psycopg.OperationalError):
            ping(timeout_s=1)
    finally:
        monkeypatch.undo()
        get_settings.cache_clear()

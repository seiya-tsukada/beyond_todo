"""Integration test fixtures.

Requires a disposable PostgreSQL database given by TEST_DATABASE_URL; the
`beyond_todo` schema is dropped and recreated from the migrations for each test.
"""

from __future__ import annotations

import os
from pathlib import Path

import psycopg
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture(scope="session", autouse=True)
def _env():
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL or ""
    os.environ["COOKIE_SECURE"] = "false"
    os.environ["CRON_SECRET"] = "test-cron-secret"
    os.environ.pop("RESEND_API_KEY", None)
    os.environ.pop("GEMINI_API_KEY", None)
    from backend.config import get_settings

    get_settings.cache_clear()


@pytest.fixture
def db():
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL is not set")
    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
        conn.execute("drop schema if exists beyond_todo cascade")
        for role in ("anon", "authenticated"):  # exist on Supabase, not on plain Postgres
            conn.execute(
                f"do $$ begin if not exists (select from pg_roles where rolname = '{role}') "
                f"then create role {role}; end if; end $$"
            )
        for migration in MIGRATIONS:
            conn.execute(migration.read_text())
    yield TEST_DATABASE_URL


@pytest.fixture
def sent_emails(monkeypatch):
    """Capture outgoing e-mails instead of sending them."""
    outbox: list = []
    from backend.notifications import emails

    monkeypatch.setattr(emails, "send_email", lambda message: outbox.append(message) or True)
    return outbox


@pytest.fixture
def client(db, sent_emails):
    from backend.main import app

    with TestClient(app) as c:
        yield c


def register(client: TestClient, email: str = "a@example.com", password: str = "password123", name: str = "A"):
    res = client.post("/api/auth/register", json={"email": email, "password": password, "name": name})
    assert res.status_code == 201, res.text
    return res.json()["user"]


@pytest.fixture
def new_client(db, sent_emails):
    """Factory for additional independent clients (separate cookie jars)."""
    from backend.main import app

    clients: list[TestClient] = []

    def make() -> TestClient:
        c = TestClient(app)
        clients.append(c)
        return c

    yield make
    for c in clients:
        c.close()

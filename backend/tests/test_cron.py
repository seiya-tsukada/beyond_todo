import pytest

from .conftest import register

AUTH = {"Authorization": "Bearer test-cron-secret"}


def test_cron_requires_secret(client):
    assert client.get("/api/cron/weekly-review-reminder").status_code == 401
    assert client.get("/api/cron/weekly-review-reminder", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_weekly_review_reminder(client, new_client, sent_emails):
    register(client)
    client.post("/api/priorities", json={"title": "完了した優先事項", "status": "Completed"})

    register(new_client(), email="unverified@example.com", verify=False)

    opted_out = new_client()
    register(opted_out, email="optout@example.com")
    opted_out.patch("/api/auth/me", json={"notify_weekly_review": False})

    reviewed = new_client()
    register(reviewed, email="reviewed@example.com")
    reviewed.post("/api/reviews", json={"summary": "done"})

    sent_emails.clear()
    res = client.get("/api/cron/weekly-review-reminder", headers=AUTH).json()
    assert res["sent"] == 1
    assert [m.to for m in sent_emails] == ["a@example.com"]
    assert "完了した優先事項" in sent_emails[0].text

    # idempotent: a retry in the same week sends nothing
    assert client.get("/api/cron/weekly-review-reminder", headers=AUTH).json()["sent"] == 0


def test_keepalive_requires_secret(client):
    assert client.get("/api/cron/keepalive").status_code == 401


def test_keepalive_is_read_only(client, db, sent_emails):
    import psycopg

    register(client)
    sent_emails.clear()
    with psycopg.connect(db) as conn:
        before = conn.execute("select count(*), max(updated_at) from beyond_todo.users").fetchone()
    res = client.get("/api/cron/keepalive", headers=AUTH)
    assert res.status_code == 200 and res.json() == {"ok": True}
    with psycopg.connect(db) as conn:
        assert conn.execute("select count(*), max(updated_at) from beyond_todo.users").fetchone() == before
    assert sent_emails == []
    assert client.get("/api/auth/me").status_code == 200  # sessions untouched


def test_keepalive_transaction_rejects_writes(db, monkeypatch):
    """The keep-alive connection is READ ONLY, so even a stray write fails."""
    import psycopg

    from backend.db import connect

    with pytest.raises(psycopg.errors.ReadOnlySqlTransaction):
        with connect() as conn:
            conn.read_only = True
            conn.execute("delete from beyond_todo.users")

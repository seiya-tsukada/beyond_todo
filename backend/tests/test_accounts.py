"""End-to-end account flows against PostgreSQL."""

import re

import psycopg

from .conftest import register

LOGIN_ERROR = "メールアドレスまたはパスワードが正しくありません。"


def _token(message, param: str) -> str:
    match = re.search(rf"{param}=([\w-]+)", message.text)
    assert match, message.text
    return match.group(1)


def _sql(db, query, params=None):
    with psycopg.connect(db, autocommit=True) as conn:
        cur = conn.execute(query, params)
        return cur.fetchall() if cur.description else cur.rowcount


def test_register_verify_login_logout(client, new_client, sent_emails, db):
    user = register(client, email="flow@example.com")
    assert set(user) == {"id", "email", "name", "title", "email_verified_at", "notify_weekly_review", "created_at"}
    token = _token(sent_emails[-1], "verify_token")

    # Only the hash of the token / session is stored
    stored = _sql(db, "select token_hash from beyond_todo.auth_tokens where purpose = 'verify_email'")
    assert stored and token not in stored[0][0]
    cookie = client.cookies.get("bt_session")
    assert cookie and _sql(db, "select 1 from beyond_todo.sessions where token_hash = %s", (cookie,)) == []

    # Verification works from another browser (no session needed)
    verified = new_client().post("/api/auth/verify-email", json={"token": token})
    assert verified.status_code == 200
    assert verified.json()["user"]["email_verified_at"] is not None

    assert client.post("/api/auth/logout").json() == {"success": True}
    assert client.get("/api/auth/me").status_code == 401

    login = client.post("/api/auth/login", json={"email": "FLOW@example.com", "password": "password123"})
    assert login.status_code == 200
    assert login.json()["user"]["email_verified_at"] is not None
    assert client.get("/api/auth/me").json()["user"]["id"] == user["id"]

    client.post("/api/auth/logout")
    assert _sql(db, "select count(*) from beyond_todo.sessions")[0][0] == 0


def test_login_error_does_not_reveal_whether_email_exists(client):
    register(client, email="known@example.com")
    wrong_password = client.post("/api/auth/login", json={"email": "known@example.com", "password": "nope-nope"})
    unknown_email = client.post("/api/auth/login", json={"email": "unknown@example.com", "password": "nope-nope"})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json() == {"error": LOGIN_ERROR}


def test_verification_token_expiry_and_resend(client, sent_emails, db):
    register(client)
    first = _token(sent_emails[-1], "verify_token")
    _sql(db, "update beyond_todo.auth_tokens set expires_at = now() - interval '1 second'")
    assert client.post("/api/auth/verify-email", json={"token": first}).status_code == 400

    resent = client.post("/api/auth/verify-email/resend")
    assert resent.status_code == 200 and resent.json()["success"] is True
    second = _token(sent_emails[-1], "verify_token")
    assert second != first
    assert client.post("/api/auth/verify-email", json={"token": second}).status_code == 200
    # Already verified: no new mail
    count = len(sent_emails)
    assert client.post("/api/auth/verify-email/resend").json()["message"] == "メールアドレスは確認済みです。"
    assert len(sent_emails) == count


def test_token_lifetimes(client, sent_emails, db):
    register(client)
    client.post("/api/auth/forgot-password", json={"email": "a@example.com"})
    rows = _sql(
        db,
        "select purpose, extract(epoch from expires_at - created_at)::int from beyond_todo.auth_tokens order by purpose",
    )
    lifetimes = dict(rows)
    assert abs(lifetimes["verify_email"] - 24 * 3600) <= 5
    assert abs(lifetimes["reset_password"] - 3600) <= 5


def test_password_reset_flow(client, new_client, sent_emails, db):
    register(client)
    other = new_client()

    other.post("/api/auth/forgot-password", json={"email": "A@example.com"})
    stale = _token(sent_emails[-1], "reset_token")
    other.post("/api/auth/forgot-password", json={"email": "a@example.com"})
    token = _token(sent_emails[-1], "reset_token")
    # Only the newest reset link stays valid
    assert other.post("/api/auth/reset-password", json={"token": stale, "password": "new-password-1"}).status_code == 400

    # A verification token cannot be used as a reset token
    verify_token = _token(sent_emails[0], "verify_token")
    assert other.post("/api/auth/reset-password", json={"token": verify_token, "password": "x" * 8}).status_code == 400

    # Too short a new password is rejected without consuming the token
    assert other.post("/api/auth/reset-password", json={"token": token, "password": "short"}).status_code == 400

    done = other.post("/api/auth/reset-password", json={"token": token, "password": "new-password-1"})
    assert done.status_code == 200
    assert "パスワードが変更されました" in sent_emails[-1].subject  # completion notice
    assert client.get("/api/auth/me").status_code == 401  # every session revoked

    # Single use
    assert other.post("/api/auth/reset-password", json={"token": token, "password": "new-password-2"}).status_code == 400

    old = other.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert old.status_code == 401 and old.json()["error"] == LOGIN_ERROR
    assert other.post("/api/auth/login", json={"email": "a@example.com", "password": "new-password-1"}).status_code == 200


def test_expired_reset_token_rejected(client, sent_emails, db):
    register(client)
    client.post("/api/auth/forgot-password", json={"email": "a@example.com"})
    token = _token(sent_emails[-1], "reset_token")
    _sql(db, "update beyond_todo.auth_tokens set expires_at = now() - interval '1 second' where purpose = 'reset_password'")
    assert client.post("/api/auth/reset-password", json={"token": token, "password": "new-password-1"}).status_code == 400


def test_expired_session_rejected(client, db):
    register(client)
    _sql(db, "update beyond_todo.sessions set expires_at = now() - interval '1 second'")
    assert client.get("/api/auth/me").status_code == 401


def test_concurrent_duplicate_registration_is_a_400(client, new_client, monkeypatch):
    """The unique index catches a duplicate that slipped past the lookup."""
    register(client, email="dup@example.com")
    from backend.repositories import users

    monkeypatch.setattr(users, "get_by_email", lambda conn, email: None)
    res = new_client().post(
        "/api/auth/register", json={"email": "DUP@example.com", "password": "password123", "name": "B"}
    )
    assert res.status_code == 400
    assert res.json() == {"error": "このメールアドレスは既に登録されています。"}


def test_register_validation(client):
    cases = [
        {"email": "not-an-email", "password": "password123", "name": "A"},
        {"email": "a@example.com", "password": "short", "name": "A"},
        {"email": "a@example.com", "password": "password123", "name": ""},
        {"email": "a@example.com", "password": "x" * 129, "name": "A"},
        {"email": "a@example.com", "password": "password123"},
    ]
    for body in cases:
        res = client.post("/api/auth/register", json=body)
        assert res.status_code == 400, body
        assert res.json()["error"]


def test_purge_expired_sessions_and_tokens(client, new_client, sent_emails, db):
    register(client)
    stale = new_client()
    register(stale, email="b@example.com")
    _sql(db, "update beyond_todo.sessions set expires_at = now() - interval '1 day' where token_hash = %s",
         (_sql(db, "select token_hash from beyond_todo.sessions order by created_at desc limit 1")[0][0],))
    _sql(db, "update beyond_todo.auth_tokens set used_at = now() where user_id = "
             "(select id from beyond_todo.users where email = 'b@example.com')")

    res = client.get("/api/cron/weekly-review-reminder", headers={"Authorization": "Bearer test-cron-secret"})
    assert res.json()["purged"] == {"sessions": 1, "auth_tokens": 1}
    assert client.get("/api/auth/me").status_code == 200  # valid session kept
    assert _sql(db, "select count(*) from beyond_todo.auth_tokens")[0][0] == 1

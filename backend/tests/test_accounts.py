"""End-to-end account flows against PostgreSQL."""

import re

import psycopg

from .conftest import register, signup_code

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
    pending = register(client, email="flow@example.com", verify=False)
    assert set(pending) == {"email", "message"}
    assert client.cookies.get("bt_session") is None  # no session before the code
    code = signup_code(sent_emails[-1])

    # Only a hash of the code is stored, salted with the user id
    stored = _sql(db, "select token_hash from beyond_todo.auth_tokens where purpose = 'verify_email'")
    assert len(stored) == 1 and code not in stored[0][0] and len(stored[0][0]) == 64

    # The code works from any browser; it signs that browser in
    verified = client.post("/api/auth/register/verify", json={"email": "flow@example.com", "code": code})
    assert verified.status_code == 200
    user = verified.json()["user"]
    assert set(user) == {"id", "email", "name", "title", "email_verified_at", "notify_weekly_review", "created_at"}
    assert user["email_verified_at"] is not None
    cookie = client.cookies.get("bt_session")
    assert cookie and _sql(db, "select 1 from beyond_todo.sessions where token_hash = %s", (cookie,)) == []

    assert client.post("/api/auth/logout").json() == {"success": True}
    assert client.get("/api/auth/me").status_code == 401

    login = client.post("/api/auth/login", json={"email": "FLOW@example.com", "password": "password123"})
    assert login.status_code == 200
    assert client.get("/api/auth/me").json()["user"]["id"] == user["id"]

    client.post("/api/auth/logout")
    assert _sql(db, "select count(*) from beyond_todo.sessions")[0][0] == 0


def test_login_error_does_not_reveal_whether_email_exists(client):
    register(client, email="known@example.com")
    wrong_password = client.post("/api/auth/login", json={"email": "known@example.com", "password": "nope-nope"})
    unknown_email = client.post("/api/auth/login", json={"email": "unknown@example.com", "password": "nope-nope"})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json() == {"error": LOGIN_ERROR}


def test_code_expiry_and_resend(client, sent_emails, db):
    register(client, verify=False)
    first = signup_code(sent_emails[-1])
    _sql(db, "update beyond_todo.auth_tokens set expires_at = now() - interval '1 second'")
    res = client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": first})
    assert res.status_code == 400 and "有効期限" in res.json()["error"]

    # Resend is rate limited
    res = client.post("/api/auth/register/resend", json={"email": "a@example.com"})
    assert res.status_code == 429
    _sql(db, "update beyond_todo.auth_tokens set created_at = now() - interval '61 seconds'")
    res = client.post("/api/auth/register/resend", json={"email": "a@example.com"})
    assert res.status_code == 200 and res.json()["success"] is True
    second = signup_code(sent_emails[-1])
    assert client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": second}).status_code == 200

    # Already verified or unknown: same answer, no mail
    count = len(sent_emails)
    for email in ("a@example.com", "nobody@example.com"):
        res = client.post("/api/auth/register/resend", json={"email": email})
        assert res.status_code == 200
    assert len(sent_emails) == count


def test_wrong_codes_lock_the_code(client, sent_emails, db):
    register(client, verify=False)
    code = signup_code(sent_emails[-1])
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(4):
        res = client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": wrong})
        assert res.status_code == 400 and res.json()["error"] == "確認コードが正しくありません。"
    # Wrong guesses are counted even though each request fails
    assert _sql(db, "select attempts from beyond_todo.auth_tokens")[0][0] == 4
    res = client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": wrong})
    assert "上限" in res.json()["error"]
    # Locked: even the right code no longer works
    assert client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": code}).status_code == 400
    assert client.get("/api/auth/me").status_code == 401


def test_malformed_code_rejected(client):
    register(client, verify=False)
    for code in ("12345", "1234567", "abcdef", ""):
        res = client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": code})
        assert res.status_code == 400 and res.json()["error"] == "確認コードは6桁の数字で入力してください。"


def test_unverified_login_mails_a_code(client, sent_emails, db):
    register(client, verify=False)
    _sql(db, "update beyond_todo.auth_tokens set created_at = now() - interval '61 seconds'")
    count = len(sent_emails)

    # Wrong password: the usual error, no mail
    bad = client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong-pass"})
    assert bad.status_code == 401 and len(sent_emails) == count

    res = client.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert res.status_code == 403 and "確認コード" in res.json()["error"]
    assert client.get("/api/auth/me").status_code == 401
    assert len(sent_emails) == count + 1  # the code survived the error response
    code = signup_code(sent_emails[-1])
    assert client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": code}).status_code == 200


def test_pending_signup_cannot_be_taken_over(client, new_client, sent_emails):
    register(client, verify=False)
    owner_code = signup_code(sent_emails[-1])

    # Someone else re-registers the pending address with their own password
    attacker = new_client()
    res = attacker.post("/api/auth/register", json={"email": "a@example.com", "password": "attacker-pw1"})
    assert res.status_code == 400

    # The owner retrying with their own password is fine
    res = client.post("/api/auth/register", json={"email": "a@example.com", "password": "password123"})
    assert res.status_code == 201
    verified = client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": owner_code})
    assert verified.status_code == 200
    assert attacker.post("/api/auth/login", json={"email": "a@example.com", "password": "attacker-pw1"}).status_code == 401


def test_sessions_of_unverified_accounts_are_rejected(client, db):
    """Accounts created before codes were required may hold a session while unverified."""
    register(client)
    _sql(db, "update beyond_todo.users set email_verified_at = null")
    assert client.get("/api/auth/me").status_code == 401


def test_token_lifetimes(client, sent_emails, db):
    register(client, verify=False)
    client.post("/api/auth/forgot-password", json={"email": "a@example.com"})
    rows = _sql(
        db,
        "select purpose, extract(epoch from expires_at - created_at)::int from beyond_todo.auth_tokens order by purpose",
    )
    lifetimes = dict(rows)
    assert abs(lifetimes["verify_email"] - 10 * 60) <= 5
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

    # A sign-up code cannot be used as a reset token
    code = signup_code(sent_emails[0])
    assert other.post("/api/auth/reset-password", json={"token": code, "password": "xxxxxxx1"}).status_code == 400

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
        "/api/auth/register", json={"email": "DUP@example.com", "password": "password123"}
    )
    assert res.status_code == 400
    assert res.json() == {"error": "このメールアドレスは既に登録されています。"}


def test_register_validation(client):
    cases = [
        {"email": "not-an-email", "password": "password123"},
        {"email": "a@example.com", "password": "short"},
        {"email": "a@example.com", "password": "x" * 129},
        {"email": "a@example.com"},
        {"password": "password123"},
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
    # Codes of a and b were used; a pending sign-up's code is still valid
    register(new_client(), email="c@example.com", verify=False)

    res = client.get("/api/cron/weekly-review-reminder", headers={"Authorization": "Bearer test-cron-secret"})
    assert res.json()["purged"] == {"sessions": 1, "auth_tokens": 2}
    assert client.get("/api/auth/me").status_code == 200  # valid session kept
    assert _sql(db, "select count(*) from beyond_todo.auth_tokens")[0][0] == 1


def test_signup_needs_only_email_and_password(client, sent_emails):
    user = register(client, email="taro.yamada@example.com")
    assert user["name"] is None and user["title"] is None
    # Mails greet by the part of the address before "@"
    assert sent_emails[-1].text.startswith("taro.yamada さん")
    # A name can still be set later
    res = client.patch("/api/auth/me", json={"name": "山田 太郎"})
    assert res.json()["user"]["name"] == "山田 太郎"


def test_signup_fails_visibly_when_mail_cannot_be_sent(client, monkeypatch, db):
    from backend.notifications import emails

    monkeypatch.setattr(emails, "send_email", lambda message: False)
    res = client.post("/api/auth/register", json={"email": "a@example.com", "password": "password-123"})
    assert res.status_code == 502 and "送信できませんでした" in res.json()["error"]
    # Rolled back: no half-created account blocks an immediate retry
    assert _sql(db, "select count(*) from beyond_todo.users")[0][0] == 0

import re

from .conftest import register, signup_code


def _token(message, param: str) -> str:
    match = re.search(rf"{param}=([\w-]+)", message.text)
    assert match, message.text
    return match.group(1)


def test_requires_login(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/challenges").status_code == 401


def test_register_login_logout(client, sent_emails):
    user = register(client, email="Founder@Example.com")
    assert "password_hash" not in user
    assert user["email_verified_at"] is not None
    assert client.get("/api/auth/me").json()["user"]["id"] == user["id"]
    assert len(sent_emails) == 1 and "確認コード" in sent_emails[0].subject

    # duplicate e-mail (case-insensitive)
    res = client.post("/api/auth/register", json={"email": "founder@example.com", "password": "password123"})
    assert res.status_code == 400

    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    bad = client.post("/api/auth/login", json={"email": "founder@example.com", "password": "wrong-pass"})
    assert bad.status_code == 401
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "password123"})
    assert unknown.status_code == 401

    ok = client.post("/api/auth/login", json={"email": "founder@example.com", "password": "password123"})
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_short_password_rejected(client):
    res = client.post("/api/auth/register", json={"email": "a@example.com", "password": "short"})
    assert res.status_code == 400
    assert "error" in res.json()


def test_register_does_not_sign_in_until_code_is_entered(client, sent_emails):
    res = register(client, verify=False)
    assert res["email"] == "a@example.com" and "確認コード" in res["message"]
    assert "user" not in res
    assert client.get("/api/auth/me").status_code == 401
    code = signup_code(sent_emails[-1])

    verified = client.post("/api/auth/register/verify", json={"email": "A@example.com", "code": code})
    assert verified.status_code == 200, verified.text
    assert verified.json()["user"]["email_verified_at"] is not None
    assert client.get("/api/auth/me").status_code == 200
    # single use
    again = client.post("/api/auth/register/verify", json={"email": "a@example.com", "code": code})
    assert again.status_code == 400


def test_password_reset_revokes_sessions(client, new_client, sent_emails):
    register(client)
    other = new_client()
    res = other.post("/api/auth/forgot-password", json={"email": "a@example.com"})
    assert res.status_code == 200
    token = _token(sent_emails[-1], "reset_token")

    # unknown address gets the same response and no mail
    count = len(sent_emails)
    assert other.post("/api/auth/forgot-password", json={"email": "x@example.com"}).status_code == 200
    assert len(sent_emails) == count

    assert other.post("/api/auth/reset-password", json={"token": token, "password": "new-password-1"}).status_code == 200
    assert "パスワードが変更されました" in sent_emails[-1].subject
    assert client.get("/api/auth/me").status_code == 401  # old session revoked

    assert other.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"}).status_code == 401
    login = other.post("/api/auth/login", json={"email": "a@example.com", "password": "new-password-1"})
    assert login.status_code == 200
    assert login.json()["user"]["email_verified_at"] is not None


def test_update_profile(client):
    register(client)
    res = client.patch("/api/auth/me", json={"name": " New Name ", "notify_weekly_review": False})
    user = res.json()["user"]
    assert user["name"] == "New Name"
    assert user["notify_weekly_review"] is False


def test_cross_site_write_rejected(client):
    register(client)
    res = client.post("/api/challenges", json={"title": "x"}, headers={"Origin": "https://evil.example"})
    assert res.status_code == 403
    same = client.post("/api/challenges", json={"title": "x"}, headers={"Origin": "http://testserver"})
    assert same.status_code == 201


def test_demo_login_is_gone(client):
    assert client.post("/api/auth/demo-login").status_code == 404
    assert "demo_login" not in client.get("/api/health").json()

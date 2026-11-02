import re

from .conftest import register

AUTH = {"Authorization": "Bearer test-cron-secret"}


def _verify(client, sent_emails):
    token = re.search(r"verify_token=([\w-]+)", sent_emails[-1].text).group(1)
    client.post("/api/auth/verify-email", json={"token": token})


def test_cron_requires_secret(client):
    assert client.get("/api/cron/weekly-review-reminder").status_code == 401
    assert client.get("/api/cron/weekly-review-reminder", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_weekly_review_reminder(client, new_client, sent_emails):
    register(client)
    _verify(client, sent_emails)
    client.post("/api/priorities", json={"title": "完了した優先事項", "status": "Completed"})

    unverified = new_client()
    register(unverified, email="unverified@example.com")

    opted_out = new_client()
    register(opted_out, email="optout@example.com")
    _verify(opted_out, sent_emails)
    opted_out.patch("/api/auth/me", json={"notify_weekly_review": False})

    reviewed = new_client()
    register(reviewed, email="reviewed@example.com")
    _verify(reviewed, sent_emails)
    reviewed.post("/api/reviews", json={"summary": "done"})

    sent_emails.clear()
    res = client.get("/api/cron/weekly-review-reminder", headers=AUTH).json()
    assert res["sent"] == 1
    assert [m.to for m in sent_emails] == ["a@example.com"]
    assert "完了した優先事項" in sent_emails[0].text

    # idempotent: a retry in the same week sends nothing
    assert client.get("/api/cron/weekly-review-reminder", headers=AUTH).json()["sent"] == 0

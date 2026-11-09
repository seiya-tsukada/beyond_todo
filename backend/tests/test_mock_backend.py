"""DATA_BACKEND=mock serves the API without a database.

The repository implementation is chosen when the app is imported, so the flow
runs in a fresh interpreter with the mock settings.
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

SCRIPT = r"""
from fastapi.testclient import TestClient
from backend.main import app
from backend.repositories.mock.users import DEMO_EMAIL, DEMO_PASSWORD

c = TestClient(app)
assert c.get("/api/health").json()["data"] == "mock"
assert c.get("/api/health/ready").json() == {"status": "ok", "db": "skipped"}
assert c.get("/api/auth/me").status_code == 401
assert c.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-password"}).status_code == 401
r = c.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
assert r.status_code == 200, r.text
assert c.get("/api/auth/me").json()["user"]["email"] == DEMO_EMAIL
c.post("/api/auth/logout")
r = c.post("/api/auth/demo-login")
assert r.status_code == 200, r.text
assert c.get("/api/auth/me").json()["user"]["email"] == DEMO_EMAIL

overview = c.get("/api/dashboard/overview").json()
assert overview["challenges"] and overview["priorities"] and overview["stakeholders"]
assert overview["latestReview"] is not None

for path in ("/api/challenges", "/api/priorities", "/api/interests", "/api/stakeholders",
             "/api/reviews", "/api/decision-logs", "/api/memos", "/api/system/export"):
    assert c.get(path).status_code == 200, path

created = c.post("/api/challenges", json={"title": "new"})
assert created.status_code in (200, 201), created.text
assert created.json()["title"] == "new"
# Nothing is stored
assert all(ch["title"] != "new" for ch in c.get("/api/challenges").json())

memo_id = c.get("/api/memos").json()[0]["id"]
r = c.post(f"/api/memos/{memo_id}/convert", json={"targetType": "challenge"})
assert r.status_code == 200, r.text
assert c.post("/api/memos/auto-stock", json={}).status_code == 200

r = c.get("/api/cron/weekly-review-reminder", headers={"Authorization": "Bearer s"})
assert r.json()["sent"] == 1, r.text
r = c.get("/api/cron/keepalive", headers={"Authorization": "Bearer s"})
assert r.json() == {"ok": True, "skipped": "mock"}, r.text
print("ok")
"""


def test_mock_backend_flow():
    env = {
        **{k: v for k, v in os.environ.items() if not k.startswith(("VERCEL", "DATABASE_URL", "RESEND"))},
        "APP_ENV": "local",
        "DATA_BACKEND": "mock",
        "MAIL_BACKEND": "log",
        "COOKIE_SECURE": "false",
        "CRON_SECRET": "s",
    }
    result = subprocess.run(
        [sys.executable, "-c", SCRIPT], cwd=ROOT, env=env, capture_output=True, text=True, timeout=60
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip().endswith("ok")

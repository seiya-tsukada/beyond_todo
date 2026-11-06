"""Mock users / sessions / tokens (DATA_BACKEND=mock).

Every session token resolves to the single demo user, and writes are accepted
but not stored. Log in with DEMO_EMAIL / DEMO_PASSWORD.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from ...security import hash_password, new_token
from ._data import DEMO_USER_ID, created_at, new_row

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo-password"

PUBLIC_USER_COLUMNS = ("id", "email", "name", "title", "email_verified_at", "notify_weekly_review", "created_at")

_DEMO_USER: dict[str, Any] = {
    "id": DEMO_USER_ID,
    "email": DEMO_EMAIL,
    "password_hash": hash_password(DEMO_PASSWORD),
    "name": "デモユーザー",
    "title": "プロダクトマネージャー",
    "email_verified_at": created_at(30),
    "notify_weekly_review": True,
    "created_at": created_at(30),
    "updated_at": created_at(30),
}


def _demo() -> dict[str, Any]:
    return dict(_DEMO_USER)


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {k: row[k] for k in PUBLIC_USER_COLUMNS}


def get_by_email(conn: Any, email: str) -> dict[str, Any] | None:
    return _demo() if email.lower() == DEMO_EMAIL else None


def get_by_id(conn: Any, user_id: str) -> dict[str, Any] | None:
    return _demo() if str(user_id) == DEMO_USER_ID else None


def create(conn: Any, *, email: str, password_hash: str, name: str, title: str | None) -> dict[str, Any]:
    return new_row(
        "users",
        {"email": email, "password_hash": password_hash, "name": name, "title": title},
        user_id=None,
    )


def update(conn: Any, user_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
    user = get_by_id(conn, user_id)
    return {**user, **values} if user else None


# --- Sessions ---
def create_session(conn: Any, user_id: str, ttl_days: int) -> str:
    return new_token()


def get_user_by_session(conn: Any, token: str) -> dict[str, Any] | None:
    return _demo()


def delete_session(conn: Any, token: str) -> None:
    return None


def delete_all_sessions(conn: Any, user_id: str) -> None:
    return None


# --- One-time tokens ---
def issue_token(conn: Any, user_id: str, purpose: str, ttl: timedelta) -> str:
    return new_token()


def consume_token(conn: Any, token: str, purpose: str) -> str | None:
    return DEMO_USER_ID


def purge_expired(conn: Any) -> dict[str, int]:
    return {"sessions": 0, "auth_tokens": 0}


# --- Scheduled notifications ---
def users_due_weekly_review_reminder(conn: Any, week_start: datetime) -> list[dict[str, Any]]:
    return [_demo()]


def claim_delivery(conn: Any, user_id: str, kind: str, ref: str) -> bool:
    return True


def release_delivery(conn: Any, user_id: str, kind: str, ref: str) -> None:
    return None

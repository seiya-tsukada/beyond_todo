"""Users, sessions and one-time e-mail tokens."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from psycopg import sql

from ..db import Conn, execute, fetch_all, fetch_one, insert
from ..security import hash_token, new_token

TokenPurpose = Literal["verify_email", "reset_password"]

PUBLIC_USER_COLUMNS = ("id", "email", "name", "title", "email_verified_at", "notify_weekly_review", "created_at")


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    """Strip secrets (password hash) before returning a user to the client."""
    return {k: row[k] for k in PUBLIC_USER_COLUMNS}


def get_by_email(conn: Conn, email: str) -> dict[str, Any] | None:
    return fetch_one(conn, "select * from beyond_todo.users where lower(email) = lower(%s)", (email,))


def get_by_id(conn: Conn, user_id: str) -> dict[str, Any] | None:
    return fetch_one(conn, "select * from beyond_todo.users where id = %s", (user_id,))


def create(conn: Conn, *, email: str, password_hash: str, name: str, title: str | None) -> dict[str, Any]:
    return insert(conn, "users", {"email": email, "password_hash": password_hash, "name": name, "title": title})


def update(conn: Conn, user_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
    if not values:
        return get_by_id(conn, user_id)
    query = sql.SQL("update beyond_todo.users set {} where id = %(__id)s returning *").format(
        sql.SQL(", ").join(sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in values)
    )
    return fetch_one(conn, query, {**values, "__id": user_id})


# --- Sessions ---
def create_session(conn: Conn, user_id: str, ttl_days: int) -> str:
    token = new_token()
    insert(
        conn,
        "sessions",
        {
            "user_id": user_id,
            "token_hash": hash_token(token),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=ttl_days),
        },
    )
    return token


def get_user_by_session(conn: Conn, token: str) -> dict[str, Any] | None:
    return fetch_one(
        conn,
        """
        select u.* from beyond_todo.sessions s
        join beyond_todo.users u on u.id = s.user_id
        where s.token_hash = %s and s.expires_at > now()
        """,
        (hash_token(token),),
    )


def delete_session(conn: Conn, token: str) -> None:
    execute(conn, "delete from beyond_todo.sessions where token_hash = %s", (hash_token(token),))


def delete_all_sessions(conn: Conn, user_id: str) -> None:
    execute(conn, "delete from beyond_todo.sessions where user_id = %s", (user_id,))


# --- One-time tokens (e-mail verification / password reset) ---
def issue_token(conn: Conn, user_id: str, purpose: TokenPurpose, ttl: timedelta) -> str:
    # Only the newest token of each purpose stays valid
    execute(
        conn,
        "delete from beyond_todo.auth_tokens where user_id = %s and purpose = %s and used_at is null",
        (user_id, purpose),
    )
    token = new_token()
    insert(
        conn,
        "auth_tokens",
        {
            "user_id": user_id,
            "purpose": purpose,
            "token_hash": hash_token(token),
            "expires_at": datetime.now(timezone.utc) + ttl,
        },
    )
    return token


def consume_token(conn: Conn, token: str, purpose: TokenPurpose) -> str | None:
    """Mark a valid token as used and return its user id (None if invalid/expired/used)."""
    row = fetch_one(
        conn,
        """
        update beyond_todo.auth_tokens set used_at = now()
        where token_hash = %s and purpose = %s and used_at is null and expires_at > now()
        returning user_id
        """,
        (hash_token(token), purpose),
    )
    return str(row["user_id"]) if row else None


# --- Scheduled notifications ---
def users_due_weekly_review_reminder(conn: Conn, week_start: datetime) -> list[dict[str, Any]]:
    """Verified, opted-in users who have not written a review since `week_start`."""
    return fetch_all(
        conn,
        """
        select u.* from beyond_todo.users u
        where u.email_verified_at is not null
          and u.notify_weekly_review
          and not exists (
            select 1 from beyond_todo.weekly_reviews r
            where r.user_id = u.id and r.created_at >= %s
          )
        order by u.created_at
        """,
        (week_start,),
    )


def claim_delivery(conn: Conn, user_id: str, kind: str, ref: str) -> bool:
    """Record that a notification is being sent. False if it was already sent."""
    row = fetch_one(
        conn,
        """
        insert into beyond_todo.notification_deliveries (user_id, kind, ref) values (%s, %s, %s)
        on conflict (user_id, kind, ref) do nothing
        returning id
        """,
        (user_id, kind, ref),
    )
    return row is not None


def release_delivery(conn: Conn, user_id: str, kind: str, ref: str) -> None:
    execute(
        conn,
        "delete from beyond_todo.notification_deliveries where user_id = %s and kind = %s and ref = %s",
        (user_id, kind, ref),
    )

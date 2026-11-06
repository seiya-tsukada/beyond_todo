"""Business rules shared by every code path that creates or edits priorities."""

from __future__ import annotations

from typing import Any

from ..db import Conn
from ..errors import AppError
from ..repositories import workspace as repo

# Also enforced by the trigger in supabase/migrations/20261106000000_integrity.sql
MAX_ACTIVE_PRIORITIES_PER_WEEK = 5


def capacity_message() -> str:
    return (
        f"未完了の最優先事項は週に最大{MAX_ACTIVE_PRIORITIES_PER_WEEK}件までです。"
        "本当に集中すべきことだけに絞り込みましょう。"
    )


def has_capacity(conn: Conn, user_id: str, target_week: str, exclude_id: str | None = None) -> bool:
    return repo.count_active_priorities(conn, user_id, target_week, exclude_id) < MAX_ACTIVE_PRIORITIES_PER_WEEK


def ensure_capacity(conn: Conn, user_id: str, target_week: str, exclude_id: str | None = None) -> None:
    if not has_capacity(conn, user_id, target_week, exclude_id):
        raise AppError(400, capacity_message())


def ensure_challenge_owned(conn: Conn, user_id: str, challenge_id: Any) -> None:
    if challenge_id is not None and repo.get_challenge(conn, user_id, str(challenge_id)) is None:
        raise AppError(400, "紐付ける課題が見つかりません。")

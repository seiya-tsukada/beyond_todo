"""Turning quick memos into challenges / priorities / interests / stakeholder expectations."""

from __future__ import annotations

from typing import Any, Literal

from ..db import Conn
from ..errors import AppError, not_found
from ..repositories import workspace as repo
from ..schemas import MemoConvertIn
from ..weeks import current_week
from . import priorities as priority_rules

StockTarget = Literal["priority", "challenge", "interest"]


def classify(tags: list[str]) -> StockTarget:
    """Pick the stock a memo belongs to from its tags. Untagged memos become priorities."""
    if any("優先" in t or "priorit" in t.lower() for t in tags):
        return "priority"
    if any("problem" in t.lower() or "課題" in t for t in tags):
        return "challenge"
    if any("関心" in t or "interest" in t.lower() for t in tags):
        return "interest"
    return "priority"


def _title_from(content: str) -> str:
    return content.strip().split("\n")[0][:50]


def convert(conn: Conn, user_id: str, memo_id: str, body: MemoConvertIn) -> dict[str, Any]:
    memo = repo.get_memo(conn, user_id, memo_id)
    if memo is None:
        raise not_found("メモ")

    title = body.title or _title_from(memo["content"])
    description = body.description if body.description is not None else memo["content"]

    if body.targetType == "challenge":
        created = repo.create_challenge(
            conn,
            user_id,
            {
                "title": title,
                "description": description,
                "status": body.status if body.status in ("Open", "In Progress", "Resolved") else "Open",
                "importance": body.importance or "High",
            },
        )
    elif body.targetType == "priority":
        week = current_week()
        priority_rules.ensure_capacity(conn, user_id, week)
        created = repo.create_priority(
            conn,
            user_id,
            {
                "title": title,
                "description": description,
                "reason": body.reason or "メモから重要と判断したため",
                "status": "Not Started",
                "target_week": week,
            },
        )
    elif body.targetType == "interest":
        created = repo.create_interest(
            conn,
            user_id,
            {"title": title, "description": description, "category": body.category or "General"},
        )
    else:
        if body.stakeholder_id is None or repo.get_stakeholder(conn, user_id, str(body.stakeholder_id)) is None:
            raise AppError(400, "期待事項を紐付けるステークホルダーを指定してください。")
        created = repo.create_stakeholder_interest(
            conn,
            user_id,
            str(body.stakeholder_id),
            {"title": title, "description": description, "importance": body.importance or "High"},
        )

    repo.update_memo(conn, user_id, memo_id, {"converted_to": body.targetType})
    return {"success": True, "createdEntity": created, "convertedType": body.targetType}


def auto_stock(conn: Conn, user_id: str, memo_ids: list[str] | None) -> dict[str, Any]:
    """Move memos into their stocks and delete them.

    Memos that would exceed the weekly priority limit stay in the memo list.
    """
    week = current_week()
    counts: dict[StockTarget, int] = {"priority": 0, "challenge": 0, "interest": 0}
    skipped = 0

    for memo in repo.list_memos(conn, user_id, memo_ids):
        if memo["converted_to"]:
            # Already promoted via "convert"; stocking it again would create a duplicate
            repo.delete_memo(conn, user_id, str(memo["id"]))
            continue

        target = classify(memo["tags"] or [])
        title = _title_from(memo["content"])
        description = memo["content"].strip()

        if target == "priority":
            if not priority_rules.has_capacity(conn, user_id, week):
                skipped += 1
                continue
            repo.create_priority(
                conn,
                user_id,
                {
                    "title": title,
                    "description": description,
                    "reason": "メモから自動ストック",
                    "status": "In Progress",
                    "target_week": week,
                },
            )
        elif target == "challenge":
            repo.create_challenge(conn, user_id, {"title": title, "description": description})
        else:
            repo.create_interest(conn, user_id, {"title": title, "description": description})

        counts[target] += 1
        repo.delete_memo(conn, user_id, str(memo["id"]))

    return {
        "success": True,
        "processedCount": sum(counts.values()),
        "skippedCount": skipped,
        "stockedCounts": counts,
    }

"""Mock workspace data (DATA_BACKEND=mock).

Same functions as repositories/postgres/workspace.py. Reads return the static
sample data in _data.py; creates/updates return the resulting row and deletes
report success for existing ids, but nothing is stored.
"""

from __future__ import annotations

from typing import Any

from . import _data as d
from ._data import Row


# --- Challenges ---
def list_challenges(conn: Any, user_id: str) -> list[Row]:
    return d.rows(d.CHALLENGES)


def get_challenge(conn: Any, user_id: str, challenge_id: str) -> Row | None:
    return d.find(d.CHALLENGES, challenge_id)


def create_challenge(conn: Any, user_id: str, values: Row) -> Row:
    return d.new_row("challenges", values)


def update_challenge(conn: Any, user_id: str, challenge_id: str, values: Row) -> Row | None:
    return d.merged(d.CHALLENGES, challenge_id, values)


def delete_challenge(conn: Any, user_id: str, challenge_id: str) -> bool:
    return d.find(d.CHALLENGES, challenge_id) is not None


# --- Priorities ---
def _with_challenge_title(row: Row) -> Row:
    challenge = d.find(d.CHALLENGES, str(row["challenge_id"])) if row.get("challenge_id") else None
    return {**row, "challenge_title": challenge["title"] if challenge else None}


def list_priorities(conn: Any, user_id: str, target_week: str | None = None) -> list[Row]:
    rows = d.rows(d.priorities())
    return [p for p in rows if p["target_week"] == target_week] if target_week else rows


def get_priority(conn: Any, user_id: str, priority_id: str) -> Row | None:
    return d.find(d.priorities(), priority_id)


def count_active_priorities(conn: Any, user_id: str, target_week: str, exclude_id: str | None = None) -> int:
    return sum(
        1
        for p in d.priorities()
        if p["target_week"] == target_week and p["status"] != "Completed" and p["id"] != exclude_id
    )


def create_priority(conn: Any, user_id: str, values: Row) -> Row:
    return _with_challenge_title(d.new_row("priorities", values))


def update_priority(conn: Any, user_id: str, priority_id: str, values: Row) -> Row | None:
    row = d.merged(d.priorities(), priority_id, values)
    return _with_challenge_title(row) if row else None


def delete_priority(conn: Any, user_id: str, priority_id: str) -> bool:
    return d.find(d.priorities(), priority_id) is not None


# --- Interests ---
def list_interests(conn: Any, user_id: str) -> list[Row]:
    return d.rows(d.INTERESTS)


def create_interest(conn: Any, user_id: str, values: Row) -> Row:
    return d.new_row("interests", values)


def update_interest(conn: Any, user_id: str, interest_id: str, values: Row) -> Row | None:
    return d.merged(d.INTERESTS, interest_id, values)


def delete_interest(conn: Any, user_id: str, interest_id: str) -> bool:
    return d.find(d.INTERESTS, interest_id) is not None


# --- Stakeholders & their expectations ---
def _expectations(stakeholder_id: str | None = None) -> list[Row]:
    names = {s["id"]: s["name"] for s in d.STAKEHOLDERS}
    rows = sorted(d.rows(d.STAKEHOLDER_INTERESTS), key=lambda r: r["created_at"])
    return [
        {**r, "stakeholder_name": names[r["stakeholder_id"]]}
        for r in rows
        if stakeholder_id is None or r["stakeholder_id"] == str(stakeholder_id)
    ]


def list_stakeholders(conn: Any, user_id: str) -> list[Row]:
    return [{**s, "interests": _expectations(s["id"])} for s in d.rows(d.STAKEHOLDERS)]


def get_stakeholder(conn: Any, user_id: str, stakeholder_id: str) -> Row | None:
    row = d.find(d.STAKEHOLDERS, stakeholder_id)
    return {**row, "interests": _expectations(stakeholder_id)} if row else None


def create_stakeholder(conn: Any, user_id: str, values: Row) -> Row:
    return {**d.new_row("stakeholders", values), "interests": []}


def update_stakeholder(conn: Any, user_id: str, stakeholder_id: str, values: Row) -> Row | None:
    row = d.merged(d.STAKEHOLDERS, stakeholder_id, values)
    return {**row, "interests": _expectations(stakeholder_id)} if row else None


def delete_stakeholder(conn: Any, user_id: str, stakeholder_id: str) -> bool:
    return d.find(d.STAKEHOLDERS, stakeholder_id) is not None


def get_stakeholder_interest(conn: Any, user_id: str, interest_id: str) -> Row | None:
    return next((r for r in _expectations() if r["id"] == str(interest_id)), None)


def create_stakeholder_interest(conn: Any, user_id: str, stakeholder_id: str, values: Row) -> Row:
    stakeholder = d.find(d.STAKEHOLDERS, stakeholder_id)
    row = d.new_row("stakeholder_interests", {**values, "stakeholder_id": str(stakeholder_id)})
    return {**row, "stakeholder_name": stakeholder["name"] if stakeholder else None}


def update_stakeholder_interest(conn: Any, user_id: str, interest_id: str, values: Row) -> Row | None:
    row = get_stakeholder_interest(conn, user_id, interest_id)
    return {**row, **values} if row else None


def delete_stakeholder_interest(conn: Any, user_id: str, interest_id: str) -> bool:
    return get_stakeholder_interest(conn, user_id, interest_id) is not None


# --- Weekly reviews ---
def list_reviews(conn: Any, user_id: str, limit: int | None = None) -> list[Row]:
    rows = d.rows(d.reviews())
    return rows[:limit] if limit else rows


def create_review(conn: Any, user_id: str, values: Row) -> Row:
    return d.new_row("weekly_reviews", values)


# --- Decision logs ---
def list_decision_logs(conn: Any, user_id: str) -> list[Row]:
    return d.rows(d.DECISION_LOGS)


def create_decision_log(conn: Any, user_id: str, values: Row) -> Row:
    return d.new_row("decision_logs", values)


def delete_decision_log(conn: Any, user_id: str, log_id: str) -> bool:
    return d.find(d.DECISION_LOGS, log_id) is not None


# --- Quick memos ---
def list_memos(conn: Any, user_id: str, memo_ids: list[str] | None = None) -> list[Row]:
    if memo_ids is not None:
        wanted = {str(i) for i in memo_ids}
        return sorted((m for m in d.rows(d.QUICK_MEMOS) if m["id"] in wanted), key=lambda r: r["created_at"])
    return d.rows(d.QUICK_MEMOS)


def get_memo(conn: Any, user_id: str, memo_id: str) -> Row | None:
    return d.find(d.QUICK_MEMOS, memo_id)


def create_memo(conn: Any, user_id: str, values: Row) -> Row:
    return d.new_row("quick_memos", values)


def update_memo(conn: Any, user_id: str, memo_id: str, values: Row) -> Row | None:
    return d.merged(d.QUICK_MEMOS, memo_id, values)


def delete_memo(conn: Any, user_id: str, memo_id: str) -> bool:
    return d.find(d.QUICK_MEMOS, memo_id) is not None

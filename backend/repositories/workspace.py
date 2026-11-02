"""Per-user workspace data: challenges, priorities, interests, stakeholders,
weekly reviews, decision logs and quick memos.

Every query is scoped by user_id; callers never touch another user's rows.
"""

from __future__ import annotations

from typing import Any

from psycopg.types.json import Jsonb

from ..db import Conn, delete_owned, fetch_all, fetch_one, insert, update_owned

Row = dict[str, Any]


# --- Challenges ---
def list_challenges(conn: Conn, user_id: str) -> list[Row]:
    return fetch_all(
        conn, "select * from beyond_todo.challenges where user_id = %s order by created_at desc", (user_id,)
    )


def get_challenge(conn: Conn, user_id: str, challenge_id: str) -> Row | None:
    return fetch_one(
        conn, "select * from beyond_todo.challenges where id = %s and user_id = %s", (challenge_id, user_id)
    )


def create_challenge(conn: Conn, user_id: str, values: Row) -> Row:
    return insert(conn, "challenges", {**values, "user_id": user_id})


def update_challenge(conn: Conn, user_id: str, challenge_id: str, values: Row) -> Row | None:
    return update_owned(conn, "challenges", user_id, challenge_id, values)


def delete_challenge(conn: Conn, user_id: str, challenge_id: str) -> bool:
    return delete_owned(conn, "challenges", user_id, challenge_id)


# --- Priorities (joined with the linked challenge title) ---
_PRIORITY_SELECT = """
    select p.*, c.title as challenge_title
    from beyond_todo.priorities p
    left join beyond_todo.challenges c on c.id = p.challenge_id
"""


def list_priorities(conn: Conn, user_id: str, target_week: str | None = None) -> list[Row]:
    if target_week:
        return fetch_all(
            conn,
            _PRIORITY_SELECT + " where p.user_id = %s and p.target_week = %s order by p.created_at desc",
            (user_id, target_week),
        )
    return fetch_all(conn, _PRIORITY_SELECT + " where p.user_id = %s order by p.created_at desc", (user_id,))


def get_priority(conn: Conn, user_id: str, priority_id: str) -> Row | None:
    return fetch_one(conn, _PRIORITY_SELECT + " where p.id = %s and p.user_id = %s", (priority_id, user_id))


def count_active_priorities(conn: Conn, user_id: str, target_week: str, exclude_id: str | None = None) -> int:
    row = fetch_one(
        conn,
        """
        select count(*) as n from beyond_todo.priorities
        where user_id = %s and target_week = %s and status <> 'Completed'
          and (%s::uuid is null or id <> %s::uuid)
        """,
        (user_id, target_week, exclude_id, exclude_id),
    )
    return int(row["n"]) if row else 0


def create_priority(conn: Conn, user_id: str, values: Row) -> Row:
    created = insert(conn, "priorities", {**values, "user_id": user_id})
    return get_priority(conn, user_id, str(created["id"]))  # type: ignore[return-value]


def update_priority(conn: Conn, user_id: str, priority_id: str, values: Row) -> Row | None:
    if update_owned(conn, "priorities", user_id, priority_id, values) is None:
        return None
    return get_priority(conn, user_id, priority_id)


def delete_priority(conn: Conn, user_id: str, priority_id: str) -> bool:
    return delete_owned(conn, "priorities", user_id, priority_id)


# --- Interests ---
def list_interests(conn: Conn, user_id: str) -> list[Row]:
    return fetch_all(
        conn, "select * from beyond_todo.interests where user_id = %s order by created_at desc", (user_id,)
    )


def create_interest(conn: Conn, user_id: str, values: Row) -> Row:
    return insert(conn, "interests", {**values, "user_id": user_id})


def update_interest(conn: Conn, user_id: str, interest_id: str, values: Row) -> Row | None:
    return update_owned(conn, "interests", user_id, interest_id, values)


def delete_interest(conn: Conn, user_id: str, interest_id: str) -> bool:
    return delete_owned(conn, "interests", user_id, interest_id)


# --- Stakeholders & their expectations ---
_STAKEHOLDER_INTEREST_SELECT = """
    select si.*, s.name as stakeholder_name
    from beyond_todo.stakeholder_interests si
    join beyond_todo.stakeholders s on s.id = si.stakeholder_id
"""


def list_stakeholders(conn: Conn, user_id: str) -> list[Row]:
    stakeholders = fetch_all(
        conn, "select * from beyond_todo.stakeholders where user_id = %s order by created_at desc", (user_id,)
    )
    expectations = fetch_all(
        conn, _STAKEHOLDER_INTEREST_SELECT + " where si.user_id = %s order by si.created_at", (user_id,)
    )
    by_stakeholder: dict[Any, list[Row]] = {}
    for e in expectations:
        by_stakeholder.setdefault(e["stakeholder_id"], []).append(e)
    return [{**s, "interests": by_stakeholder.get(s["id"], [])} for s in stakeholders]


def get_stakeholder(conn: Conn, user_id: str, stakeholder_id: str) -> Row | None:
    row = fetch_one(
        conn, "select * from beyond_todo.stakeholders where id = %s and user_id = %s", (stakeholder_id, user_id)
    )
    if row is None:
        return None
    expectations = fetch_all(
        conn, _STAKEHOLDER_INTEREST_SELECT + " where si.stakeholder_id = %s order by si.created_at", (stakeholder_id,)
    )
    return {**row, "interests": expectations}


def create_stakeholder(conn: Conn, user_id: str, values: Row) -> Row:
    return {**insert(conn, "stakeholders", {**values, "user_id": user_id}), "interests": []}


def update_stakeholder(conn: Conn, user_id: str, stakeholder_id: str, values: Row) -> Row | None:
    if update_owned(conn, "stakeholders", user_id, stakeholder_id, values) is None:
        return None
    return get_stakeholder(conn, user_id, stakeholder_id)


def delete_stakeholder(conn: Conn, user_id: str, stakeholder_id: str) -> bool:
    return delete_owned(conn, "stakeholders", user_id, stakeholder_id)


def get_stakeholder_interest(conn: Conn, user_id: str, interest_id: str) -> Row | None:
    return fetch_one(
        conn, _STAKEHOLDER_INTEREST_SELECT + " where si.id = %s and si.user_id = %s", (interest_id, user_id)
    )


def create_stakeholder_interest(conn: Conn, user_id: str, stakeholder_id: str, values: Row) -> Row:
    created = insert(conn, "stakeholder_interests", {**values, "user_id": user_id, "stakeholder_id": stakeholder_id})
    return get_stakeholder_interest(conn, user_id, str(created["id"]))  # type: ignore[return-value]


def update_stakeholder_interest(conn: Conn, user_id: str, interest_id: str, values: Row) -> Row | None:
    if update_owned(conn, "stakeholder_interests", user_id, interest_id, values) is None:
        return None
    return get_stakeholder_interest(conn, user_id, interest_id)


def delete_stakeholder_interest(conn: Conn, user_id: str, interest_id: str) -> bool:
    return delete_owned(conn, "stakeholder_interests", user_id, interest_id)


# --- Weekly reviews ---
_REVIEW_JSON_COLUMNS = ("completed_priorities", "incomplete_priorities", "next_week_actions", "answers")


def list_reviews(conn: Conn, user_id: str, limit: int | None = None) -> list[Row]:
    query = "select * from beyond_todo.weekly_reviews where user_id = %s order by created_at desc"
    if limit:
        return fetch_all(conn, query + " limit %s", (user_id, limit))
    return fetch_all(conn, query, (user_id,))


def create_review(conn: Conn, user_id: str, values: Row) -> Row:
    values = {k: Jsonb(v) if k in _REVIEW_JSON_COLUMNS else v for k, v in values.items()}
    return insert(conn, "weekly_reviews", {**values, "user_id": user_id})


# --- Decision logs ---
def list_decision_logs(conn: Conn, user_id: str) -> list[Row]:
    return fetch_all(
        conn, "select * from beyond_todo.decision_logs where user_id = %s order by created_at desc", (user_id,)
    )


def create_decision_log(conn: Conn, user_id: str, values: Row) -> Row:
    return insert(conn, "decision_logs", {**values, "user_id": user_id})


def delete_decision_log(conn: Conn, user_id: str, log_id: str) -> bool:
    return delete_owned(conn, "decision_logs", user_id, log_id)


# --- Quick memos ---
def list_memos(conn: Conn, user_id: str, memo_ids: list[str] | None = None) -> list[Row]:
    if memo_ids is not None:
        return fetch_all(
            conn,
            "select * from beyond_todo.quick_memos where user_id = %s and id = any(%s::uuid[]) order by created_at",
            (user_id, memo_ids),
        )
    return fetch_all(
        conn, "select * from beyond_todo.quick_memos where user_id = %s order by created_at desc", (user_id,)
    )


def get_memo(conn: Conn, user_id: str, memo_id: str) -> Row | None:
    return fetch_one(
        conn, "select * from beyond_todo.quick_memos where id = %s and user_id = %s", (memo_id, user_id)
    )


def create_memo(conn: Conn, user_id: str, values: Row) -> Row:
    return insert(conn, "quick_memos", {**values, "user_id": user_id})


def update_memo(conn: Conn, user_id: str, memo_id: str, values: Row) -> Row | None:
    return update_owned(conn, "quick_memos", user_id, memo_id, values)


def delete_memo(conn: Conn, user_id: str, memo_id: str) -> bool:
    return delete_owned(conn, "quick_memos", user_id, memo_id)

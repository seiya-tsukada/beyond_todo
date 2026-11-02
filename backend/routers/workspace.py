"""CRUD endpoints for challenges, priorities, interests, stakeholders,
weekly reviews, decision logs and quick memos."""

from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..deps import CurrentUser, DbConn, user_id
from ..errors import not_found
from ..repositories import workspace as repo
from ..schemas import (
    AutoStockIn,
    ChallengeCreate,
    ChallengeUpdate,
    DecisionLogCreate,
    InterestCreate,
    InterestUpdate,
    MemoConvertIn,
    PriorityCreate,
    PriorityUpdate,
    QuickMemoCreate,
    QuickMemoUpdate,
    StakeholderCreate,
    StakeholderInterestCreate,
    StakeholderInterestUpdate,
    StakeholderUpdate,
    WeeklyReviewCreate,
)
from ..services import memos as memo_service
from ..services import priorities as priority_rules
from ..weeks import current_week, today, week_bounds

router = APIRouter(prefix="/api")

SUCCESS = {"success": True}


def changes(body: BaseModel, nullable: tuple[str, ...] = ()) -> dict[str, Any]:
    """Fields the client actually sent. `null` is only honoured for nullable columns."""
    return {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None or k in nullable}


# --- Challenges ---
@router.get("/challenges")
def list_challenges(user: CurrentUser, conn: DbConn):
    return repo.list_challenges(conn, user_id(user))


@router.post("/challenges", status_code=201)
def create_challenge(body: ChallengeCreate, user: CurrentUser, conn: DbConn):
    return repo.create_challenge(conn, user_id(user), body.model_dump())


@router.put("/challenges/{challenge_id}")
def update_challenge(challenge_id: UUID, body: ChallengeUpdate, user: CurrentUser, conn: DbConn):
    row = repo.update_challenge(conn, user_id(user), str(challenge_id), changes(body))
    if row is None:
        raise not_found("課題")
    return row


@router.delete("/challenges/{challenge_id}")
def delete_challenge(challenge_id: UUID, user: CurrentUser, conn: DbConn):
    if not repo.delete_challenge(conn, user_id(user), str(challenge_id)):
        raise not_found("課題")
    return SUCCESS


# --- Priorities ---
@router.get("/priorities")
def list_priorities(user: CurrentUser, conn: DbConn, target_week: Optional[str] = Query(None)):
    return repo.list_priorities(conn, user_id(user), target_week)


@router.post("/priorities", status_code=201)
def create_priority(body: PriorityCreate, user: CurrentUser, conn: DbConn):
    uid = user_id(user)
    values = body.model_dump()
    values["target_week"] = values["target_week"] or current_week()
    priority_rules.ensure_challenge_owned(conn, uid, values["challenge_id"])
    if values["status"] != "Completed":
        priority_rules.ensure_capacity(conn, uid, values["target_week"])
    return repo.create_priority(conn, uid, values)


@router.put("/priorities/{priority_id}")
def update_priority(priority_id: UUID, body: PriorityUpdate, user: CurrentUser, conn: DbConn):
    uid, pid = user_id(user), str(priority_id)
    existing = repo.get_priority(conn, uid, pid)
    if existing is None:
        raise not_found("優先事項")
    values = changes(body, nullable=("challenge_id",))
    if "challenge_id" in values:
        priority_rules.ensure_challenge_owned(conn, uid, values["challenge_id"])
    status = values.get("status", existing["status"])
    week = values.get("target_week", existing["target_week"])
    reactivated = existing["status"] == "Completed" or week != existing["target_week"]
    if status != "Completed" and reactivated:
        priority_rules.ensure_capacity(conn, uid, week, exclude_id=pid)
    return repo.update_priority(conn, uid, pid, values)


@router.delete("/priorities/{priority_id}")
def delete_priority(priority_id: UUID, user: CurrentUser, conn: DbConn):
    if not repo.delete_priority(conn, user_id(user), str(priority_id)):
        raise not_found("優先事項")
    return SUCCESS


# --- Interests ---
@router.get("/interests")
def list_interests(user: CurrentUser, conn: DbConn):
    return repo.list_interests(conn, user_id(user))


@router.post("/interests", status_code=201)
def create_interest(body: InterestCreate, user: CurrentUser, conn: DbConn):
    return repo.create_interest(conn, user_id(user), body.model_dump())


@router.put("/interests/{interest_id}")
def update_interest(interest_id: UUID, body: InterestUpdate, user: CurrentUser, conn: DbConn):
    row = repo.update_interest(conn, user_id(user), str(interest_id), changes(body))
    if row is None:
        raise not_found("興味関心")
    return row


@router.delete("/interests/{interest_id}")
def delete_interest(interest_id: UUID, user: CurrentUser, conn: DbConn):
    if not repo.delete_interest(conn, user_id(user), str(interest_id)):
        raise not_found("興味関心")
    return SUCCESS


# --- Stakeholders ---
@router.get("/stakeholders")
def list_stakeholders(user: CurrentUser, conn: DbConn):
    return repo.list_stakeholders(conn, user_id(user))


@router.post("/stakeholders", status_code=201)
def create_stakeholder(body: StakeholderCreate, user: CurrentUser, conn: DbConn):
    return repo.create_stakeholder(conn, user_id(user), body.model_dump())


@router.put("/stakeholders/{stakeholder_id}")
def update_stakeholder(stakeholder_id: UUID, body: StakeholderUpdate, user: CurrentUser, conn: DbConn):
    row = repo.update_stakeholder(conn, user_id(user), str(stakeholder_id), changes(body))
    if row is None:
        raise not_found("ステークホルダー")
    return row


@router.delete("/stakeholders/{stakeholder_id}")
def delete_stakeholder(stakeholder_id: UUID, user: CurrentUser, conn: DbConn):
    if not repo.delete_stakeholder(conn, user_id(user), str(stakeholder_id)):
        raise not_found("ステークホルダー")
    return SUCCESS


@router.post("/stakeholders/{stakeholder_id}/interests", status_code=201)
def create_stakeholder_interest(
    stakeholder_id: UUID, body: StakeholderInterestCreate, user: CurrentUser, conn: DbConn
):
    uid = user_id(user)
    if repo.get_stakeholder(conn, uid, str(stakeholder_id)) is None:
        raise not_found("ステークホルダー")
    return repo.create_stakeholder_interest(conn, uid, str(stakeholder_id), body.model_dump())


@router.put("/stakeholder-interests/{interest_id}")
def update_stakeholder_interest(
    interest_id: UUID, body: StakeholderInterestUpdate, user: CurrentUser, conn: DbConn
):
    row = repo.update_stakeholder_interest(conn, user_id(user), str(interest_id), changes(body))
    if row is None:
        raise not_found("期待事項")
    return row


@router.delete("/stakeholder-interests/{interest_id}")
def delete_stakeholder_interest(interest_id: UUID, user: CurrentUser, conn: DbConn):
    if not repo.delete_stakeholder_interest(conn, user_id(user), str(interest_id)):
        raise not_found("期待事項")
    return SUCCESS


# --- Weekly reviews ---
@router.get("/reviews")
def list_reviews(user: CurrentUser, conn: DbConn):
    return repo.list_reviews(conn, user_id(user))


@router.get("/reviews/latest")
def latest_review(user: CurrentUser, conn: DbConn):
    rows = repo.list_reviews(conn, user_id(user), limit=1)
    return rows[0] if rows else None


@router.post("/reviews", status_code=201)
def create_review(body: WeeklyReviewCreate, user: CurrentUser, conn: DbConn):
    values = body.model_dump()
    monday, sunday = week_bounds(today())
    values["week_start"] = values["week_start"] or monday
    values["week_end"] = values["week_end"] or sunday
    return repo.create_review(conn, user_id(user), values)


# --- Decision logs ---
@router.get("/decision-logs")
def list_decision_logs(user: CurrentUser, conn: DbConn):
    return repo.list_decision_logs(conn, user_id(user))


@router.post("/decision-logs", status_code=201)
def create_decision_log(body: DecisionLogCreate, user: CurrentUser, conn: DbConn):
    uid = user_id(user)
    values = body.model_dump()
    if values["priority_id"] is not None and repo.get_priority(conn, uid, str(values["priority_id"])) is None:
        raise not_found("優先事項")
    return repo.create_decision_log(conn, uid, values)


@router.delete("/decision-logs/{log_id}")
def delete_decision_log(log_id: UUID, user: CurrentUser, conn: DbConn):
    if not repo.delete_decision_log(conn, user_id(user), str(log_id)):
        raise not_found("意思決定ログ")
    return SUCCESS


# --- Quick memos ---
@router.get("/memos")
def list_memos(user: CurrentUser, conn: DbConn):
    return repo.list_memos(conn, user_id(user))


@router.post("/memos", status_code=201)
def create_memo(body: QuickMemoCreate, user: CurrentUser, conn: DbConn):
    return repo.create_memo(conn, user_id(user), {"content": body.content.strip(), "tags": body.tags})


# Registered before /memos/{memo_id} routes so "auto-stock" is never parsed as an id
@router.post("/memos/auto-stock")
def auto_stock_memos(user: CurrentUser, conn: DbConn, body: Optional[AutoStockIn] = None):
    memo_ids = [str(i) for i in body.memo_ids] if body and body.memo_ids is not None else None
    return memo_service.auto_stock(conn, user_id(user), memo_ids)


@router.put("/memos/{memo_id}")
def update_memo(memo_id: UUID, body: QuickMemoUpdate, user: CurrentUser, conn: DbConn):
    values = changes(body)
    if "content" in values:
        values["content"] = values["content"].strip()
    row = repo.update_memo(conn, user_id(user), str(memo_id), values)
    if row is None:
        raise not_found("メモ")
    return row


@router.delete("/memos/{memo_id}")
def delete_memo(memo_id: UUID, user: CurrentUser, conn: DbConn):
    if not repo.delete_memo(conn, user_id(user), str(memo_id)):
        raise not_found("メモ")
    return SUCCESS


@router.post("/memos/{memo_id}/convert")
def convert_memo(memo_id: UUID, body: MemoConvertIn, user: CurrentUser, conn: DbConn):
    return memo_service.convert(conn, user_id(user), str(memo_id), body)

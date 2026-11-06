"""Scheduled jobs invoked by Vercel Cron (see vercel.json)."""

from __future__ import annotations

import hmac
import logging

from fastapi import APIRouter, Request

from ..config import get_settings
from ..db import connect
from ..errors import AppError
from ..notifications import emails
from ..repositories import users
from ..repositories import workspace as repo
from ..weeks import current_week, today, week_start_datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cron", include_in_schema=False)

WEEKLY_REVIEW_REMINDER = "weekly_review_reminder"


def _authorize(request: Request) -> None:
    # Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set
    secret = get_settings().cron_secret
    header = request.headers.get("authorization", "")
    if not secret or not hmac.compare_digest(header, f"Bearer {secret}"):
        raise AppError(401, "Unauthorized")


@router.get("/weekly-review-reminder")
def weekly_review_reminder(request: Request):
    _authorize(request)
    week = current_week()
    sent = failed = 0

    # Housekeeping: expired sessions and spent e-mail tokens (only hashes are stored)
    with connect() as conn:
        purged = users.purge_expired(conn)

    # Commit per user so that one failure does not roll back deliveries already made
    with connect() as conn:
        recipients = users.users_due_weekly_review_reminder(conn, week_start_datetime(today()))

    for user in recipients:
        uid = str(user["id"])
        with connect() as conn:
            if not users.claim_delivery(conn, uid, WEEKLY_REVIEW_REMINDER, week):
                continue
            priorities = repo.list_priorities(conn, uid, week)
            ok = emails.send_weekly_review_reminder(
                user["email"],
                user["name"],
                week=week,
                completed=[p["title"] for p in priorities if p["status"] == "Completed"],
                incomplete=[p["title"] for p in priorities if p["status"] != "Completed"],
            )
            if ok:
                sent += 1
            else:
                users.release_delivery(conn, uid, WEEKLY_REVIEW_REMINDER, week)
                failed += 1

    logger.info("weekly review reminder: week=%s sent=%d failed=%d purged=%s", week, sent, failed, purged)
    return {"week": week, "sent": sent, "failed": failed, "purged": purged}


@router.get("/keepalive")
def keepalive(request: Request):
    """Daily DB touch so a Supabase Free project is not paused for inactivity.

    Read-only by construction: the transaction is READ ONLY (any write would
    fail), uses a short statement timeout, sends no e-mail and changes no data,
    so it has no effect on users. Supabase counts user queries against the
    database as activity, so this reads an application table rather than
    running a bare `select 1`.
    """
    _authorize(request)
    if get_settings().data_backend == "mock":
        return {"ok": True, "skipped": "mock"}
    try:
        with connect() as conn:
            conn.read_only = True
            conn.execute("set local statement_timeout = '5s'")
            conn.execute("select 1 from beyond_todo.users limit 1").fetchall()
    except Exception:
        logger.exception("keepalive: database query failed")
        raise AppError(503, "Database unavailable")
    return {"ok": True}

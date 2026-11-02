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

    logger.info("weekly review reminder: week=%s sent=%d failed=%d", week, sent, failed)
    return {"week": week, "sent": sent, "failed": failed}

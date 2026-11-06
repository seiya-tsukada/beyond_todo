"""Dashboard overview, AI analysis and data export."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from ..deps import CurrentUser, DbConn, user_id
from ..repositories import workspace as repo
from ..schemas import AnalyzeIn, DashboardOverviewOut, InsightsOut
from ..services.insights import AnalysisInput, generate_insights
from ..weeks import current_week

router = APIRouter(prefix="/api")


def _load_analysis_input(conn: DbConn, uid: str, week: str) -> AnalysisInput:
    return AnalysisInput(
        challenges=repo.list_challenges(conn, uid),
        priorities=repo.list_priorities(conn, uid, week),
        interests=repo.list_interests(conn, uid),
        stakeholders=repo.list_stakeholders(conn, uid),
        reviews=repo.list_reviews(conn, uid),
    )


@router.get("/dashboard/overview", response_model=DashboardOverviewOut)
def dashboard_overview(user: CurrentUser, conn: DbConn, week: Optional[str] = Query(None)):
    target_week = week or current_week()
    data = _load_analysis_input(conn, user_id(user), target_week)

    open_challenges = [c for c in data.challenges if c["status"] != "Resolved"]
    exploring = [i for i in data.interests if i["status"] in ("Exploring", "Acting")]
    total_interests = len(data.interests)

    return {
        "challenges": data.challenges,
        "priorities": data.priorities,
        "interests": data.interests,
        "stakeholders": data.stakeholders,
        # Rule-based on page load (fast); Gemini runs on explicit re-analysis
        "aiInsights": generate_insights(data, use_ai=False),
        "latestReview": data.reviews[0] if data.reviews else None,
        "targetWeek": target_week,
        "metrics": {
            "openChallengesCount": len(open_challenges),
            "highImportanceChallengesCount": len([c for c in open_challenges if c["importance"] == "High"]),
            "activePrioritiesCount": len([p for p in data.priorities if p["status"] != "Completed"]),
            "completedPrioritiesCount": len([p for p in data.priorities if p["status"] == "Completed"]),
            "exploringInterestsCount": len(exploring),
            "stakeholderCount": len(data.stakeholders),
            "interestToActionRatio": round(len(exploring) / total_interests * 100) if total_interests else 0,
        },
    }


@router.post("/insights/analyze", response_model=InsightsOut)
def analyze_insights(body: AnalyzeIn, user: CurrentUser, conn: DbConn):
    data = _load_analysis_input(conn, user_id(user), current_week())
    data.user_query = body.userQuery
    return {"insights": generate_insights(data, use_ai=True)}


@router.get("/system/export")
def export_data(user: CurrentUser, conn: DbConn):
    uid = user_id(user)
    payload = {
        "app": "Beyond TODO.",
        "exported_at": datetime.now(timezone.utc),
        "user_id": uid,
        "data": {
            "challenges": repo.list_challenges(conn, uid),
            "priorities": repo.list_priorities(conn, uid),
            "interests": repo.list_interests(conn, uid),
            "stakeholders": repo.list_stakeholders(conn, uid),
            "reviews": repo.list_reviews(conn, uid),
            "decisions": repo.list_decision_logs(conn, uid),
            "memos": repo.list_memos(conn, uid),
        },
    }
    return JSONResponse(
        jsonable_encoder(payload),
        headers={"Content-Disposition": 'attachment; filename="beyond-todo-export.json"'},
    )

"""Static sample data for DATA_BACKEND=mock.

Rows mirror the columns in supabase/migrations so the API returns the same shape
as with PostgreSQL. Nothing here is ever modified: writes return a new or merged
row but are not stored, so every request sees the same data.
"""

from __future__ import annotations

import copy
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from ...weeks import current_week, today, week_bounds

Row = dict[str, Any]

DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"


def _id(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def created_at(days_ago: int) -> datetime:
    return datetime(2026, 11, 2, 9, 0, tzinfo=timezone.utc) - timedelta(days=days_ago)


def _base(n: int, days_ago: int) -> Row:
    ts = created_at(days_ago)
    return {"id": _id(n), "user_id": DEMO_USER_ID, "created_at": ts, "updated_at": ts}


# Column defaults from the migration, used to fill rows created through the API
DEFAULTS: dict[str, Row] = {
    "users": {"title": None, "email_verified_at": None, "notify_weekly_review": True},
    "challenges": {"description": "", "status": "Open", "importance": "High"},
    "priorities": {"challenge_id": None, "description": "", "reason": "", "status": "Not Started"},
    "interests": {"description": "", "category": "General", "status": "Interested", "who": "自分"},
    "stakeholders": {"relationship": "Customer", "description": ""},
    "stakeholder_interests": {"description": "", "importance": "High", "status": "Active"},
    "weekly_reviews": {
        "completed_priorities": [],
        "incomplete_priorities": [],
        "personal_reflection": "",
        "decision_reflection": "",
        "next_week_actions": [],
        "answers": {},
    },
    "decision_logs": {"priority_id": None, "outcome": ""},
    "quick_memos": {"tags": [], "converted_to": None},
}

CHALLENGES: list[Row] = [
    {
        **_base(101, 1),
        "title": "新規顧客のオンボーディング離脱率が高い",
        "description": "初週に設定を終えずに離脱するユーザーが4割いる。",
        "status": "In Progress",
        "importance": "High",
    },
    {
        **_base(102, 5),
        "title": "チーム内のナレッジが属人化している",
        "description": "特定メンバーしか分からない運用手順が多い。",
        "status": "Open",
        "importance": "Medium",
    },
    {
        **_base(103, 20),
        "title": "週次定例が長すぎる",
        "description": "アジェンダを事前共有し30分に短縮した。",
        "status": "Resolved",
        "importance": "Low",
    },
]

# target_week is filled with the current week when read, so the dashboard always has data
PRIORITIES: list[Row] = [
    {
        **_base(201, 1),
        "challenge_id": _id(101),
        "title": "オンボーディング導線のユーザーインタビュー5件",
        "description": "離脱したユーザーに理由をヒアリングする。",
        "reason": "離脱率の改善が今期の最重要KPIのため",
        "status": "In Progress",
    },
    {
        **_base(202, 2),
        "challenge_id": _id(102),
        "title": "運用手順書のたたき台を作る",
        "description": "",
        "reason": "属人化の解消は先送りするほどコストが増えるため",
        "status": "Not Started",
    },
    {
        **_base(203, 3),
        "challenge_id": None,
        "title": "四半期計画のレビュー",
        "description": "",
        "reason": "来週の経営会議に間に合わせるため",
        "status": "Completed",
    },
]

INTERESTS: list[Row] = [
    {
        **_base(301, 4),
        "title": "生成AIを使った問い合わせ一次対応",
        "description": "サポート工数の削減につながるか調べたい。",
        "category": "Technology",
        "status": "Exploring",
        "who": "チーム",
    },
    {
        **_base(302, 10),
        "title": "コーチングの勉強",
        "description": "",
        "category": "Growth",
        "status": "Interested",
        "who": "自分",
    },
]

STAKEHOLDERS: list[Row] = [
    {
        **_base(401, 15),
        "name": "クライアントA社",
        "relationship": "Customer",
        "description": "最大顧客。年度末に契約更新。",
    },
    {
        **_base(402, 15),
        "name": "開発チーム",
        "relationship": "Colleague",
        "description": "",
    },
]

STAKEHOLDER_INTERESTS: list[Row] = [
    {
        **_base(501, 14),
        "stakeholder_id": _id(401),
        "title": "導入初期のサポートを手厚くしてほしい",
        "description": "",
        "importance": "High",
        "status": "Active",
    },
    {
        **_base(502, 7),
        "stakeholder_id": _id(402),
        "title": "仕様変更は早めに共有してほしい",
        "description": "",
        "importance": "Medium",
        "status": "Pending",
    },
]

DECISION_LOGS: list[Row] = [
    {
        "id": _id(701),
        "user_id": DEMO_USER_ID,
        "created_at": created_at(3),
        "priority_id": _id(203),
        "decision": "新機能の開発より既存顧客の定着施策を優先する",
        "reason": "解約率の悪化が売上へのインパクトとして最も大きいため",
        "outcome": "",
    },
]

QUICK_MEMOS: list[Row] = [
    {
        **_base(801, 0),
        "content": "サポート問い合わせの上位3件をFAQ化する",
        "tags": ["課題"],
        "converted_to": None,
    },
    {
        **_base(802, 1),
        "content": "A社の担当者が来月異動するらしい",
        "tags": [],
        "converted_to": None,
    },
]


def reviews() -> list[Row]:
    """One review for last week (dates depend on today)."""
    last_week_start, last_week_end = week_bounds(today() - timedelta(days=7))
    return [
        {
            **_base(601, 2),
            "week_start": last_week_start,
            "week_end": last_week_end,
            "summary": "オンボーディング改善の方向性が固まった週。",
            "completed_priorities": ["四半期計画のレビュー"],
            "incomplete_priorities": ["運用手順書のたたき台を作る"],
            "personal_reflection": "会議が多く、まとまった作業時間が取れなかった。",
            "decision_reflection": "定着施策を優先した判断は妥当だった。",
            "next_week_actions": ["ユーザーインタビューの日程を確定する"],
            "answers": {},
        }
    ]


def priorities() -> list[Row]:
    challenge_titles = {c["id"]: c["title"] for c in CHALLENGES}
    week = current_week()
    return [
        {**p, "target_week": week, "challenge_title": challenge_titles.get(p["challenge_id"])}
        for p in PRIORITIES
    ]


def rows(source: list[Row]) -> list[Row]:
    """Copies of `source`, newest first (like `order by created_at desc`)."""
    return sorted(copy.deepcopy(source), key=lambda r: r["created_at"], reverse=True)


def find(source: list[Row], row_id: str) -> Row | None:
    return next((copy.deepcopy(r) for r in source if r["id"] == str(row_id)), None)


def new_row(table: str, values: Row, user_id: str | None = DEMO_USER_ID) -> Row:
    """What an insert would have returned (not stored)."""
    now = datetime.now(timezone.utc)
    row: Row = {"id": str(uuid.uuid4()), **DEFAULTS.get(table, {}), **values, "created_at": now}
    if table != "decision_logs":
        row["updated_at"] = now
    if user_id is not None:
        row["user_id"] = user_id
    return row


def merged(source: list[Row], row_id: str, values: Row) -> Row | None:
    """What an update would have returned (not stored). None if the row does not exist."""
    row = find(source, row_id)
    if row is None:
        return None
    return {**row, **values, "updated_at": datetime.now(timezone.utc)}

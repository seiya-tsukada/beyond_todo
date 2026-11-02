"""Request bodies. Responses are plain rows (dicts) serialized by FastAPI."""

from __future__ import annotations

from datetime import date
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

ChallengeStatus = Literal["Open", "In Progress", "Resolved"]
Importance = Literal["High", "Medium", "Low"]
PriorityStatus = Literal["Not Started", "In Progress", "Completed"]
InterestStatus = Literal["Interested", "Exploring", "Acting", "Archived"]
Relationship = Literal["Customer", "Partner", "Family", "Colleague", "Other"]
StakeholderInterestStatus = Literal["Active", "Addressed", "Pending"]
MemoTarget = Literal["challenge", "priority", "interest", "stakeholder"]

WEEK_PATTERN = r"^\d{4}-W\d{2}$"


def _title(default: object = ...) -> Any:
    return Field(default=default, min_length=1, max_length=200)


def _week() -> Any:
    return Field(default=None, pattern=WEEK_PATTERN)


def _password() -> Any:
    return Field(min_length=8, max_length=128)


# --- Auth ---
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = _password()
    name: str = Field(min_length=1, max_length=100)
    title: Optional[str] = Field(default=None, max_length=100)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    title: Optional[str] = Field(default=None, max_length=100)
    notify_weekly_review: Optional[bool] = None


class TokenIn(BaseModel):
    token: str = Field(min_length=1, max_length=200)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=1, max_length=200)
    password: str = _password()


# --- Challenges ---
class ChallengeCreate(BaseModel):
    title: str = _title()
    description: str = ""
    status: ChallengeStatus = "Open"
    importance: Importance = "High"


class ChallengeUpdate(BaseModel):
    title: Optional[str] = _title(None)
    description: Optional[str] = None
    status: Optional[ChallengeStatus] = None
    importance: Optional[Importance] = None


# --- Priorities ---
class PriorityCreate(BaseModel):
    title: str = _title()
    description: str = ""
    reason: str = ""
    status: PriorityStatus = "Not Started"
    target_week: Optional[str] = _week()
    challenge_id: Optional[UUID] = None


class PriorityUpdate(BaseModel):
    title: Optional[str] = _title(None)
    description: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[PriorityStatus] = None
    target_week: Optional[str] = _week()
    challenge_id: Optional[UUID] = None


# --- Interests ---
class InterestCreate(BaseModel):
    title: str = _title()
    description: str = ""
    category: str = "General"
    status: InterestStatus = "Interested"
    who: str = "自分"


class InterestUpdate(BaseModel):
    title: Optional[str] = _title(None)
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[InterestStatus] = None
    who: Optional[str] = None


# --- Stakeholders ---
class StakeholderCreate(BaseModel):
    name: str = _title()
    relationship: Relationship = "Customer"
    description: str = ""


class StakeholderUpdate(BaseModel):
    name: Optional[str] = _title(None)
    relationship: Optional[Relationship] = None
    description: Optional[str] = None


class StakeholderInterestCreate(BaseModel):
    title: str = _title()
    description: str = ""
    importance: Importance = "High"
    status: StakeholderInterestStatus = "Active"


class StakeholderInterestUpdate(BaseModel):
    title: Optional[str] = _title(None)
    description: Optional[str] = None
    importance: Optional[Importance] = None
    status: Optional[StakeholderInterestStatus] = None


# --- Weekly reviews ---
class WeeklyReviewCreate(BaseModel):
    week_start: Optional[date] = None
    week_end: Optional[date] = None
    summary: str = Field(min_length=1)
    completed_priorities: list[str] = []
    incomplete_priorities: list[str] = []
    personal_reflection: str = ""
    decision_reflection: str = ""
    next_week_actions: list[str] = []
    answers: dict[str, str] = {}


# --- Decision logs ---
class DecisionLogCreate(BaseModel):
    priority_id: Optional[UUID] = None
    decision: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    outcome: str = ""


# --- Quick memos ---
class QuickMemoCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    tags: list[str] = []


class QuickMemoUpdate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1, max_length=5000)
    tags: Optional[list[str]] = None


class MemoConvertIn(BaseModel):
    targetType: MemoTarget
    title: Optional[str] = None
    description: Optional[str] = None
    reason: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    importance: Optional[Importance] = None
    stakeholder_id: Optional[UUID] = None


class AutoStockIn(BaseModel):
    memo_ids: Optional[list[UUID]] = None


# --- Insights ---
class AnalyzeIn(BaseModel):
    userQuery: Optional[str] = Field(default=None, max_length=2000)

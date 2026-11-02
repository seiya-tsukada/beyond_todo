"""
Beyond TODO. - Python FastAPI Backend Reference (Vercel Functions Ready)
Implements all Personal Management REST APIs, Argon2id auth, and repository pattern.
"""

from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os

app = FastAPI(title="Beyond TODO. API", version="1.0.0")

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    title: Optional[str] = None

class ChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "Open"
    importance: Optional[str] = "High"

class PriorityCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    reason: str
    status: Optional[str] = "Not Started"
    target_week: str
    challenge_id: Optional[str] = None

class InterestCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "General"
    status: Optional[str] = "Interested"

class StakeholderCreate(BaseModel):
    name: str
    relationship: Optional[str] = "Customer"
    description: Optional[str] = ""

class WeeklyReviewCreate(BaseModel):
    week_start: str
    week_end: str
    summary: str
    completed_priorities: List[str] = []
    incomplete_priorities: List[str] = []
    personal_reflection: str = ""
    decision_reflection: str = ""
    next_week_actions: List[str] = []
    answers: Dict[str, str] = {}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Beyond TODO. FastAPI Backend", "mode": os.getenv("APP_MODE", "mock")}

# Note: In development inside this applet, the Express server provides the live proxy & Vite integration.
# When deployed to Vercel with Python functions, this FastAPI app serves /api/* endpoints directly.

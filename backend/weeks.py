"""ISO-week helpers evaluated in the application time zone."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from .config import get_settings


def today() -> date:
    return datetime.now(get_settings().timezone).date()


def week_string(d: date) -> str:
    year, week, _ = d.isocalendar()
    return f"{year}-W{week:02d}"


def current_week() -> str:
    return week_string(today())


def week_bounds(d: date) -> tuple[date, date]:
    """Monday and Sunday of the ISO week containing `d`."""
    monday = d - timedelta(days=d.weekday())
    return monday, monday + timedelta(days=6)


def week_start_datetime(d: date) -> datetime:
    """Start of the ISO week (Monday 00:00) in the application time zone."""
    monday, _ = week_bounds(d)
    return datetime.combine(monday, datetime.min.time(), tzinfo=get_settings().timezone)

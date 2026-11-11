"""Beyond TODO. API (FastAPI). Served by Vercel Python Functions via api/index.py."""

from __future__ import annotations

import logging
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import get_settings
from .db import ping
from .errors import install_error_handlers
from .routers import auth, cron, overview, workspace

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fail fast on a misconfigured deployment (production checks required variables)
_settings = get_settings()
logging.getLogger(__name__).info(
    "Starting in APP_ENV=%s (DATA_BACKEND=%s, MAIL_BACKEND=%s)",
    _settings.app_env,
    _settings.data_backend,
    _settings.mail_backend,
)

app = FastAPI(title="Beyond TODO. API", version="2.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
install_error_handlers(app)

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@app.middleware("http")
async def reject_cross_site_writes(request: Request, call_next):
    """CSRF guard: state-changing requests must come from the same origin as the API.

    The session cookie is SameSite=Lax as well; this blocks the remaining cases.
    """
    origin = request.headers.get("origin")
    if request.method in UNSAFE_METHODS and origin:
        host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        if urlsplit(origin).netloc != host:
            return JSONResponse({"error": "不正なリクエスト元です。"}, status_code=403)
    return await call_next(request)


@app.get("/api/health")
def health():
    s = get_settings()
    return {"status": "ok", "env": s.app_env, "data": s.data_backend, "mail": s.mail_backend}


@app.get("/api/health/ready")
def health_ready():
    """Readiness: 200 only when the database is reachable (`select 1`), else 503.

    Opens a database connection on every call, so the UI keeps using the cheap
    /api/health; this one is for uptime monitors and deploy checks.
    """
    s = get_settings()
    if s.data_backend == "mock":
        return {"status": "ok", "db": "skipped"}
    try:
        ping()
    except Exception:
        logger.exception("health/ready: database check failed")
        return JSONResponse({"status": "error", "db": "unavailable"}, status_code=503)
    return {"status": "ok", "db": "ok"}


app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(overview.router)
app.include_router(cron.router)

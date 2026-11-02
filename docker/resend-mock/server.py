"""Local stand-in for the Resend HTTP API.

Accepts the subset the app uses (POST /emails, POST /emails/batch) and relays
each message over SMTP to Mailpit, where it can be viewed in a browser.
Point the Resend SDK here with RESEND_API_URL. Standard library only.
"""

from __future__ import annotations

import json
import os
import smtplib
import uuid
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SMTP_HOST = os.environ.get("SMTP_HOST", "mailpit")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "1025"))
PORT = int(os.environ.get("PORT", "3000"))


def _as_list(value) -> list[str]:
    if value is None:
        return []
    return [value] if isinstance(value, str) else list(value)


def relay(payload: dict) -> str:
    """Send one Resend-style payload via SMTP and return a Resend-style id."""
    to = _as_list(payload.get("to"))
    if not payload.get("from") or not to or not payload.get("subject"):
        raise ValueError("`from`, `to` and `subject` are required")

    msg = EmailMessage()
    msg["From"] = payload["from"]
    msg["To"] = ", ".join(to)
    if payload.get("cc"):
        msg["Cc"] = ", ".join(_as_list(payload["cc"]))
    if payload.get("reply_to"):
        msg["Reply-To"] = ", ".join(_as_list(payload["reply_to"]))
    msg["Subject"] = payload["subject"]
    msg.set_content(payload.get("text") or "")
    if payload.get("html"):
        msg.add_alternative(payload["html"], subtype="html")

    recipients = to + _as_list(payload.get("cc")) + _as_list(payload.get("bcc"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.send_message(msg, to_addrs=recipients)
    return str(uuid.uuid4())


class Handler(BaseHTTPRequestHandler):
    def _reply(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):  # health check
        self._reply(200, {"status": "ok"}) if self.path == "/health" else self._reply(404, {"message": "Not found"})

    def do_POST(self):
        if not self.headers.get("Authorization", "").startswith("Bearer "):
            return self._reply(401, {"name": "missing_api_key", "message": "Missing API key", "statusCode": 401})
        try:
            payload = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            if self.path == "/emails":
                return self._reply(200, {"id": relay(payload)})
            if self.path == "/emails/batch":
                return self._reply(200, {"data": [{"id": relay(p)} for p in payload]})
            return self._reply(404, {"name": "not_found", "message": "Not found", "statusCode": 404})
        except (ValueError, TypeError, KeyError) as exc:
            return self._reply(422, {"name": "validation_error", "message": str(exc), "statusCode": 422})
        except OSError as exc:
            return self._reply(500, {"name": "application_error", "message": f"SMTP relay failed: {exc}", "statusCode": 500})

    def log_message(self, fmt, *args):
        print(f"[resend-mock] {self.command} {self.path} -> {args[1] if len(args) > 1 else ''}", flush=True)


if __name__ == "__main__":
    print(f"[resend-mock] listening on :{PORT}, relaying to {SMTP_HOST}:{SMTP_PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()

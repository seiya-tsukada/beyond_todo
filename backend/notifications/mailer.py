"""E-mail transport via Resend. Without RESEND_API_KEY, messages are logged instead."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from ..config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str


def send_email(message: EmailMessage) -> bool:
    """Send one e-mail. Returns False (and logs) on failure instead of raising."""
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set; email not sent.\nTo: %s\nSubject: %s\n\n%s",
                       message.to, message.subject, message.text)
        return True

    import resend

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send(
            {
                "from": settings.mail_from,
                "to": [message.to],
                "subject": message.subject,
                "html": message.html,
                "text": message.text,
            }
        )
        return True
    except Exception:
        logger.exception("Failed to send email to %s (%s)", message.to, message.subject)
        return False

import asyncio
import logging
from config import get_settings

logger = logging.getLogger(__name__)


def _send_sync(to: str, subject: str, html: str):
    s = get_settings()
    if not s.resend_api_key:
        logger.warning("Resend not configured — skipping email to %s", to)
        return
    try:
        import resend
        resend.api_key = s.resend_api_key
        from_addr = f"RecruiterHub <{s.email_from}>" if s.email_from else "RecruiterHub <onboarding@resend.dev>"
        resend.Emails.send({"from": from_addr, "to": [to], "subject": subject, "html": html})
        logger.info("Email sent to %s: %s", to, subject)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)


async def send_email(to: str, subject: str, html: str):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_sync, to, subject, html)


def _base_template(title: str, body: str) -> str:
    return f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f7fb;margin:0;padding:20px;">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#1d4ed8;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;font-size:18px;">RecruiterHub</h2>
    </div>
    <div style="padding:28px 24px;">
      <h3 style="color:#1e293b;margin-top:0;">{title}</h3>
      {body}
    </div>
    <div style="background:#f8fafc;padding:12px 24px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">RecruiterHub — מערכת ניהול גיוס</p>
    </div>
  </div>
</body>
</html>
"""


def job_assigned_email(contractor_name: str, job_title: str, job_location: str | None, apply_url: str) -> tuple[str, str]:
    subject = f"משרה חדשה שויכה אליך: {job_title}"
    location_line = f'<p style="color:#64748b;margin:4px 0;">📍 {job_location}</p>' if job_location else ""
    body = f"""
<p style="color:#334155;">שלום <strong>{contractor_name}</strong>,</p>
<p style="color:#334155;">שויכה אליך משרה חדשה במערכת:</p>
<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="color:#1e293b;font-weight:bold;margin:0 0 4px;">{job_title}</p>
  {location_line}
</div>
<p style="color:#334155;">תוכל לשלוח את לינק ההגשה הבא למועמדים:</p>
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;word-break:break-all;">
  <a href="{apply_url}" style="color:#1d4ed8;text-decoration:none;font-size:13px;">{apply_url}</a>
</div>
"""
    return subject, _base_template(subject, body)


def candidate_in_process_email(contractor_name: str, candidate_name: str, job_title: str, score: float | None) -> tuple[str, str]:
    subject = f"מועמד עבר לתהליך גיוס: {candidate_name}"
    score_line = f'<p style="color:#64748b;margin:4px 0;">ציון התאמה: <strong>{round(score)}%</strong></p>' if score else ""
    body = f"""
<p style="color:#334155;">שלום <strong>{contractor_name}</strong>,</p>
<p style="color:#334155;">מועמד שלך עבר לסטטוס <strong style="color:#16a34a;">בתהליך גיוס</strong>:</p>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="color:#1e293b;font-weight:bold;margin:0 0 4px;">👤 {candidate_name}</p>
  <p style="color:#64748b;margin:4px 0;">📋 משרה: {job_title}</p>
  {score_line}
</div>
<p style="color:#334155;">מנהל המערכת מעוניין לקדם את המועמד — ייצור איתך קשר בהמשך.</p>
"""
    return subject, _base_template(subject, body)

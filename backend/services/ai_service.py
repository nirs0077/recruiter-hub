import json
import time
import logging
import anthropic
from config import get_settings

logger = logging.getLogger(__name__)

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        key = get_settings().anthropic_api_key.strip().encode("ascii", errors="ignore").decode("ascii")
        _client = anthropic.Anthropic(api_key=key)
    return _client


def _call_claude(model: str, prompt: str, max_tokens: int = 2048) -> str:
    client = _get_client()
    for attempt in range(4):
        try:
            msg = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return msg.content[0].text.strip()
        except anthropic.APIStatusError as exc:
            if exc.status_code not in (429, 529):
                raise
            wait = 3 * (2 ** attempt)
            if attempt < 3:
                logger.warning("Anthropic %s — retrying in %ss (attempt %d/3)", exc.status_code, wait, attempt + 1)
                time.sleep(wait)
            else:
                raise
    return ""


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return json.loads(text.strip())


def extract_job_from_text(raw_text: str, url: str) -> dict:
    prompt = f"""אתה מנתח משרות עבודה. קרא את הטקסט הבא שחולץ מדף אינטרנט של משרה ואחזר את המידע בJSON בלבד.

URL המשרה: {url}

טקסט הדף:
{raw_text[:8000]}

החזר JSON בדיוק בפורמט הזה (ללא טקסט נוסף):
{{
  "title": "כותרת המשרה",
  "location": "מיקום (עיר/אזור)",
  "hybrid": "היברידי / מלא מהמשרד / מלא מרחוק / לא צוין",
  "description": "תיאור התפקיד - מה עושים בתפקיד (2-4 משפטים)",
  "requirements": "דרישות התפקיד - ניסיון, כישורים, השכלה וכו'"
}}

אם מידע מסוים חסר, השתמש ב-null."""

    text = _call_claude("claude-haiku-4-5-20251001", prompt, max_tokens=1024)
    return _parse_json(text)


def analyze_cv(cv_text: str, job: dict) -> dict:
    prompt = f"""אתה מומחה גיוס בכיר. נתח קורות חיים מול משרה והחזר פרופיל מועמד מלא + הערכת התאמה.

━━━━━━━━━━ פרטי המשרה ━━━━━━━━━━
כותרת: {job.get('title', '')}
מיקום: {job.get('location', '')}
היברידיות: {job.get('hybrid', '')}
תיאור התפקיד: {job.get('description', '')}
דרישות: {job.get('requirements', '')}

━━━━━━━━━━ קורות חיים ━━━━━━━━━━
{cv_text[:6000]}

החזר JSON בלבד (ללא טקסט נוסף) בפורמט הזה:
{{
  "candidate_name": "שם מלא של המועמד — השאר בשפה המקורית (אנגלית/עברית), אל תתרגם",
  "candidate_email": "אימייל אם קיים אחרת null",
  "candidate_phone": "טלפון אם קיים אחרת null",
  "current_title": "התפקיד הנוכחי / האחרון של המועמד",
  "years_of_experience": 12,
  "education": "MBA / תואר ראשון במדעי המחשב / כו' — התואר הגבוה ביותר",
  "has_management_exp": true,
  "companies": ["חברה א", "חברה ב", "חברה ג"],
  "skills": ["Python", "React", "SQL", "ניהול צוות"],
  "recent_roles": ["CTO בחברת X (2021-2024)", "מנהל פיתוח בחברת Y (2018-2021)"],
  "notable_achievement": "משפט אחד על ההישג הבולט ביותר בקריירה — מספרים/השפעה אם קיים",
  "cv_summary": "סיכום מקצועי של 3-4 משפטים על ניסיון, התמחות ועוצמות המועמד",
  "score": 85,
  "fit_summary": "3-5 משפטים על מידת ההתאמה למשרה זו ספציפית — מה מתאים, מה חסר",
  "strengths": ["נקודת חוזק 1", "נקודת חוזק 2", "נקודת חוזק 3"],
  "gaps": ["חסר 1", "חסר 2"],
  "recommendation": "כדאי להגיש"
}}

הערות:
- score: 0-100, אחוז התאמה למשרה זו
- recommendation: "כדאי להגיש" / "לא כדאי להגיש" / "להגיש בתנאים"
- skills: עד 8 כישורים/טכנולוגיות מרכזיים
- companies: עד 5 חברות אחרונות/בולטות
- notable_achievement: משפט אחד בלבד, עם מספרים אם יש"""

    text = _call_claude("claude-sonnet-4-6", prompt, max_tokens=2048)
    return _parse_json(text)

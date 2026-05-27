import logging
import smtplib
import uuid
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from firebase_admin import firestore as fs

from config import get_settings
from firebase_init import get_db
from models.schemas import (
    ApplicationOut,
    ApplicationStatus,
    CheckMatchRequest,
    SendToCiviRequest,
    StatusUpdateRequest,
    SubmitExistingRequest,
    UserRole,
)
from routers.auth import get_current_user
from services.ai_service import analyze_cv
from services.cv_parser import extract_text_from_cv
from services.drive_service import upload_cv_to_drive

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["applications"])

STATUS_LABELS = {
    ApplicationStatus.pending: "ממתין",
    ApplicationStatus.no_answer: "לא ענה",
    ApplicationStatus.in_review: "בבדיקה",
    ApplicationStatus.sent_to_civi: "נשלח אל CIVI",
    ApplicationStatus.sent_to_meeting: "נשלח לפגישה",
    ApplicationStatus.first_interview: "תואם ראיון ראשון",
    ApplicationStatus.second_interview: "תואם ראיון המשך",
    ApplicationStatus.professional_test: "מבחן מקצועי",
    ApplicationStatus.integrity_test: "מבחן אמינות",
    ApplicationStatus.reference_check: "בדיקת ממליצים",
    ApplicationStatus.contract_offer: "הצעה לחוזה",
    ApplicationStatus.signed_contract: "חתם/ה על חוזה",
    ApplicationStatus.started_working: "התחיל/ה לעבוד",
    ApplicationStatus.weak: "מועמד חלש",
    ApplicationStatus.rejected: "נדחה",
    ApplicationStatus.in_process: "בתהליך גיוס",
    ApplicationStatus.known_candidate: "מועמד מוכר לנו כבר",
}


def _app_to_out(doc_id: str, d: dict) -> ApplicationOut:
    return ApplicationOut(
        id=doc_id,
        job_id=d.get("job_id", ""),
        job_title=d.get("job_title"),
        contractor_id=d.get("contractor_id", ""),
        contractor_name=d.get("contractor_name"),
        candidate_id=d.get("candidate_id", ""),
        candidate_name=d.get("candidate_name"),
        candidate_email=d.get("candidate_email"),
        candidate_phone=d.get("candidate_phone"),
        current_title=d.get("current_title"),
        years_of_experience=d.get("years_of_experience"),
        education=d.get("education"),
        cv_summary=d.get("cv_summary"),
        notable_achievement=d.get("notable_achievement"),
        recent_roles=d.get("recent_roles", []),
        skills=d.get("skills", []),
        companies=d.get("companies", []),
        has_management_exp=d.get("has_management_exp"),
        score=d.get("score"),
        status=d.get("status", ApplicationStatus.pending),
        fit_summary=d.get("fit_summary"),
        strengths=d.get("strengths", []),
        gaps=d.get("gaps", []),
        recommendation=d.get("recommendation"),
        notes=d.get("notes"),
        cv_drive_url=d.get("cv_drive_url"),
        civi_sent_at=d.get("civi_sent_at"),
        civi_email_subject=d.get("civi_email_subject"),
        civi_email_html=d.get("civi_email_html"),
        status_history=d.get("status_history", []),
        created_at=d.get("created_at"),
    )


def _extract_folder_id(value: str) -> str:
    """Extract Drive folder ID from a full URL or return as-is."""
    import re
    m = re.search(r"/folders/([a-zA-Z0-9_-]+)", value)
    return m.group(1) if m else value


def _get_app_settings(db) -> dict:
    """Merge Firestore settings on top of env defaults."""
    settings = get_settings()
    defaults = {
        "score_threshold": settings.score_threshold,
        "civi_send_threshold": settings.civi_send_threshold,
        "google_drive_folder_id": settings.google_drive_folder_id,
        "google_drive_credentials_path": settings.google_drive_credentials_path,
    }
    doc = db.collection("settings").document("app_settings").get()
    if doc.exists:
        defaults.update({k: v for k, v in doc.to_dict().items() if v is not None})
    # Always work with the folder ID, not a full URL
    if defaults["google_drive_folder_id"]:
        defaults["google_drive_folder_id"] = _extract_folder_id(defaults["google_drive_folder_id"])
    return defaults


def _get_civi_threshold(db) -> float:
    return _get_app_settings(db)["civi_send_threshold"]


# ── Public submit ─────────────────────────────────────────────────────────────

@router.post("/submit")
async def submit_application(
    job_id: str = Form(...),
    contractor_id: str = Form(...),
    notes: str = Form(""),
    cv_file: UploadFile = File(...),
):
    db = get_db()
    app_settings = _get_app_settings(db)

    job_doc = db.collection("jobs").document(job_id).get()
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_doc.to_dict()
    if contractor_id not in job.get("assigned_contractors", []):
        raise HTTPException(status_code=403, detail="Contractor not assigned to this job")

    contractor_doc = db.collection("users").document(contractor_id).get()
    contractor_name = contractor_doc.to_dict().get("name", "") if contractor_doc.exists else ""

    file_bytes = await cv_file.read()
    cv_text = extract_text_from_cv(file_bytes, cv_file.filename)
    analysis = analyze_cv(cv_text, job)
    score = float(analysis.get("score", 0))
    candidate_email = analysis.get("candidate_email") or ""
    candidate_name = analysis.get("candidate_name") or "לא זוהה"

    status = ApplicationStatus.pending if score >= app_settings["score_threshold"] else ApplicationStatus.weak

    candidate_id = str(uuid.uuid4())
    cv_drive_url = None
    existing_candidate = None

    if candidate_email:
        for ex in db.collection("candidates").where("email", "==", candidate_email).limit(1).stream():
            candidate_id = ex.id
            existing_candidate = ex.to_dict()
            cv_drive_url = existing_candidate.get("cv_drive_url")
            break

    # Upload to Drive only if no existing URL
    if not cv_drive_url and app_settings["google_drive_folder_id"]:
        logger.info("Starting Drive upload: folder=%s contractor=%s file=%s bytes=%d",
                    app_settings["google_drive_folder_id"], contractor_name,
                    cv_file.filename, len(file_bytes))
        cv_drive_url = upload_cv_to_drive(
            app_settings["google_drive_credentials_path"],
            app_settings["google_drive_folder_id"],
            contractor_name,
            cv_file.filename,
            file_bytes,
        )
        logger.info("Drive upload result: %s", cv_drive_url)

    if existing_candidate is None:
        _create_candidate(db, candidate_id, analysis, cv_text, cv_drive_url)
    elif cv_drive_url and not existing_candidate.get("cv_drive_url"):
        db.collection("candidates").document(candidate_id).update({"cv_drive_url": cv_drive_url})

    app_id = str(uuid.uuid4())
    db.collection("applications").document(app_id).set({
        "job_id": job_id,
        "job_title": job.get("title", ""),
        "contractor_id": contractor_id,
        "contractor_name": contractor_name,
        "candidate_id": candidate_id,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "candidate_phone": analysis.get("candidate_phone") or "",
        "current_title": analysis.get("current_title"),
        "years_of_experience": analysis.get("years_of_experience"),
        "education": analysis.get("education"),
        "cv_summary": analysis.get("cv_summary") or "",
        "notable_achievement": analysis.get("notable_achievement"),
        "recent_roles": analysis.get("recent_roles", []),
        "skills": analysis.get("skills", []),
        "companies": analysis.get("companies", []),
        "has_management_exp": analysis.get("has_management_exp", False),
        "score": score,
        "status": status,
        "fit_summary": analysis.get("fit_summary"),
        "strengths": analysis.get("strengths", []),
        "gaps": analysis.get("gaps", []),
        "recommendation": analysis.get("recommendation"),
        "notes": notes,
        "cv_filename": cv_file.filename,
        "cv_drive_url": cv_drive_url,
        "civi_sent_at": None,
        "status_history": [],
        "created_at": datetime.utcnow().isoformat(),
    })

    return {
        "application_id": app_id,
        "score": score,
        "status": status,
        "candidate_name": candidate_name,
        "cv_drive_url": cv_drive_url,
    }


def _create_candidate(db, candidate_id: str, analysis: dict, cv_text: str, cv_drive_url: str | None):
    db.collection("candidates").document(candidate_id).set({
        "name": analysis.get("candidate_name") or "לא זוהה",
        "email": analysis.get("candidate_email") or "",
        "phone": analysis.get("candidate_phone") or "",
        "current_title": analysis.get("current_title"),
        "years_of_experience": analysis.get("years_of_experience"),
        "education": analysis.get("education"),
        "cv_summary": analysis.get("cv_summary") or "",
        "notable_achievement": analysis.get("notable_achievement"),
        "recent_roles": analysis.get("recent_roles", []),
        "skills": analysis.get("skills", []),
        "companies": analysis.get("companies", []),
        "has_management_exp": analysis.get("has_management_exp", False),
        "cv_text": cv_text[:5000],
        "cv_drive_url": cv_drive_url,
        "created_at": datetime.utcnow().isoformat(),
    })


# ── Queries ───────────────────────────────────────────────────────────────────

@router.get("/job/{job_id}", response_model=list[ApplicationOut])
async def get_job_applications(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    query = db.collection("applications").where("job_id", "==", job_id)
    if user["role"] == UserRole.contractor:
        query = query.where("contractor_id", "==", user["uid"])
    return [_app_to_out(d.id, d.to_dict()) for d in query.stream()]


@router.get("/mine", response_model=list[ApplicationOut])
async def get_my_applications(user=Depends(get_current_user)):
    if user["role"] != UserRole.contractor:
        raise HTTPException(status_code=403, detail="Contractors only")
    db = get_db()
    docs = db.collection("applications").where("contractor_id", "==", user["uid"]).stream()
    results = [_app_to_out(d.id, d.to_dict()) for d in docs]
    results.sort(key=lambda a: a.created_at or "", reverse=True)
    return results


@router.get("/{app_id}", response_model=ApplicationOut)
async def get_application(app_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = db.collection("applications").document(app_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    d = doc.to_dict()
    if user["role"] == UserRole.contractor and d.get("contractor_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _app_to_out(doc.id, d)


# ── Status update with note ───────────────────────────────────────────────────

@router.patch("/{app_id}/status")
async def update_status(app_id: str, body: StatusUpdateRequest, user=Depends(get_current_user)):
    db = get_db()
    doc = db.collection("applications").document(app_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    d = doc.to_dict()
    if user["role"] == UserRole.contractor and d.get("contractor_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    now = datetime.utcnow().isoformat()
    history_entries = [{
        "status": body.status,
        "status_label": STATUS_LABELS.get(body.status, body.status),
        "note": body.note or "",
        "target_date": body.target_date or None,
        "changed_by": user["uid"],
        "changed_by_name": user.get("name", ""),
        "timestamp": now,
    }]

    # Auto-note when admin moves to in_process
    if body.status == ApplicationStatus.in_process and user["role"] == UserRole.admin:
        history_entries.append({
            "status": "system",
            "status_label": "הודעת מערכת",
            "note": "יש להגיש מועמד זה למערכת CIVI — לחץ על 'שלח לCIVI' לשליחה ישירה",
            "changed_by": "system",
            "changed_by_name": "מערכת",
            "timestamp": now,
        })

    db.collection("applications").document(app_id).update({
        "status": body.status,
        "status_history": fs.ArrayUnion(history_entries),
    })

    # Email contractor when admin sets in_process
    if body.status == ApplicationStatus.in_process and user["role"] == UserRole.admin:
        import asyncio
        try:
            from services.email_service import send_email, candidate_in_process_email
            contractor_id = d.get("contractor_id", "")
            if contractor_id:
                u_doc = db.collection("users").document(contractor_id).get()
                if u_doc.exists:
                    u = u_doc.to_dict()
                    if u.get("email"):
                        subject, html = candidate_in_process_email(
                            u.get("name", "קבלן"),
                            d.get("candidate_name", "מועמד"),
                            d.get("job_title", "משרה"),
                            d.get("score"),
                        )
                        asyncio.create_task(send_email(u["email"], subject, html))
        except Exception:
            logger.warning("Failed to send in_process email notification", exc_info=True)

    return {"ok": True}


# ── Send to CIVI ──────────────────────────────────────────────────────────────

@router.get("/{app_id}/civi-preview")
async def get_civi_preview(app_id: str, user=Depends(get_current_user)):
    """Return the default subject and html for the CIVI email (for pre-send editing)."""
    db = get_db()
    doc = db.collection("applications").document(app_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404)
    d = doc.to_dict()
    if user["role"] == UserRole.contractor and d.get("contractor_id") != user["uid"]:
        raise HTTPException(status_code=403)
    contractor_doc = db.collection("users").document(d.get("contractor_id", "")).get()
    contractor_name = contractor_doc.to_dict().get("name", "") if contractor_doc.exists else ""
    subject, html = _build_civi_email(d, contractor_name)
    return {"subject": subject, "html": html}


@router.post("/{app_id}/send-to-civi")
async def send_to_civi(app_id: str, body: SendToCiviRequest, user=Depends(get_current_user)):
    db = get_db()
    settings = get_settings()

    doc = db.collection("applications").document(app_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404)
    d = doc.to_dict()

    if user["role"] == UserRole.contractor and d.get("contractor_id") != user["uid"]:
        raise HTTPException(status_code=403)
    if d.get("civi_sent_at"):
        raise HTTPException(status_code=400, detail="מועמד זה כבר נשלח למערכת CIVI")

    score = d.get("score", 0)
    threshold = _get_civi_threshold(db)
    if score < threshold:
        raise HTTPException(
            status_code=400,
            detail=f"ציון המועמד ({score:.0f}%) נמוך מסף השליחה ({threshold:.0f}%)"
        )

    contractor_id = d.get("contractor_id", "")
    contractor_doc = db.collection("users").document(contractor_id).get()
    if not contractor_doc.exists:
        raise HTTPException(status_code=404, detail="קבלן לא נמצא")
    contractor = contractor_doc.to_dict()
    contractor_email = contractor.get("email", "")
    contractor_name = contractor.get("name", "")

    custom_msg = body.custom_message or ""
    subject, html = _build_civi_email(d, contractor_name, custom_msg)
    if body.subject_override and body.subject_override.strip():
        subject = body.subject_override.strip()
    _send_civi_email(settings, contractor_email, contractor_name, subject, html)

    now = datetime.utcnow().isoformat()
    db.collection("applications").document(app_id).update({
        "status": ApplicationStatus.sent_to_civi,
        "civi_sent_at": now,
        "civi_sent_by": user["uid"],
        "civi_email_subject": subject,
        "civi_email_html": html,
        "status_history": fs.ArrayUnion([{
            "status": ApplicationStatus.sent_to_civi,
            "status_label": "נשלח למערכת CIVI",
            "note": f"נשלח למערכת CIVI על ידי {contractor_name}",
            "changed_by": user["uid"],
            "changed_by_name": user.get("name", contractor_name),
            "timestamp": now,
        }]),
    })

    return {"ok": True, "sent_at": now}


def _build_civi_email(d: dict, contractor_name: str, custom_message: str = "") -> tuple[str, str]:
    name = d.get("candidate_name", "")
    job = d.get("job_title", "")
    score = d.get("score", 0)
    email = d.get("candidate_email", "")
    phone = d.get("candidate_phone", "")
    summary = d.get("cv_summary", "")
    fit = d.get("fit_summary", "")
    strengths = "".join(f"<li>{s}</li>" for s in (d.get("strengths") or []))
    gaps = "".join(f"<li>{g}</li>" for g in (d.get("gaps") or []))
    recommendation = d.get("recommendation", "")
    cv_url = d.get("cv_drive_url", "")
    cv_section = f'<p><a href="{cv_url}" style="color:#1d4ed8;">לחץ לצפייה בקורות החיים</a></p>' if cv_url else ""

    custom_section = ""
    if custom_message.strip():
        escaped = custom_message.replace("<", "&lt;").replace(">", "&gt;")
        custom_section = f'<div dir="rtl" style="background:#f0f4ff;border-right:4px solid #1d4ed8;padding:12px 16px;margin-bottom:20px;border-radius:4px;"><p style="margin:0 0 4px;color:#1e3a8a;font-weight:600;font-size:13px;">הערת הסוכן:</p><p style="margin:0;color:#1e40af;font-size:14px;">{escaped}</p></div>'

    subject = f"מועמד חדש: {name} | {job} | ציון {score:.0f}%"
    html = f"""
<div dir="rtl" style="font-family:Arial,sans-serif;max-width:640px;color:#111;">
  <h2 style="color:#1d4ed8;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">מועמד חדש להגשה</h2>
  {custom_section}
  <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;width:120px;">שם</td><td><strong>{name}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">מייל</td><td>{email}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">טלפון</td><td>{phone}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">משרה</td><td>{job}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">ציון התאמה</td><td><strong style="color:#16a34a;font-size:18px;">{score:.0f}%</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">סוכן</td><td>{contractor_name}</td></tr>
  </table>
  {cv_section}
  <h3 style="color:#374151;">פרופיל המועמד</h3><p style="color:#4b5563;">{summary}</p>
  <h3 style="color:#374151;">ניתוח התאמה</h3><p style="color:#4b5563;">{fit}</p>
  <h3 style="color:#16a34a;">חוזקות</h3><ul style="color:#4b5563;">{strengths}</ul>
  <h3 style="color:#dc2626;">פערים</h3><ul style="color:#4b5563;">{gaps}</ul>
  <p><strong>המלצה:</strong> {recommendation}</p>
  <hr style="margin:16px 0;border-color:#e5e7eb;"/>
  <p style="color:#9ca3af;font-size:12px;">מייל זה נשלח ממערכת RecruiterHub מטעם הסוכן: {contractor_name}</p>
</div>"""
    return subject, html


def _send_civi_email(settings, contractor_email: str, contractor_name: str, subject: str, html: str):
    if not settings.smtp_user or not settings.smtp_password:
        logger.info("SMTP not configured — CIVI email skipped (recorded in DB)")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"RecruiterHub <{settings.smtp_user}>"
        msg["Reply-To"] = f"{contractor_name} <{contractor_email}>"
        msg["To"] = settings.civi_email
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, settings.civi_email, msg.as_string())
    except Exception:
        logger.exception("CIVI email send failed")
        raise HTTPException(status_code=500, detail="שגיאה בשליחת המייל לCIVI — הנתונים נשמרו")


# ── Cross-match ───────────────────────────────────────────────────────────────

@router.post("/check-match")
async def check_match(body: CheckMatchRequest, user=Depends(get_current_user)):
    if user["role"] != UserRole.contractor:
        raise HTTPException(status_code=403, detail="Contractors only")
    db = get_db()

    cand_doc = db.collection("candidates").document(body.candidate_id).get()
    if not cand_doc.exists:
        raise HTTPException(status_code=404, detail="מועמד לא נמצא")
    cand = cand_doc.to_dict()

    apps = list(db.collection("applications")
        .where("contractor_id", "==", user["uid"])
        .where("candidate_id", "==", body.candidate_id)
        .limit(1).stream())
    if not apps:
        raise HTTPException(status_code=403, detail="אין לך גישה למועמד זה")

    job_doc = db.collection("jobs").document(body.job_id).get()
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="משרה לא נמצאה")
    job = job_doc.to_dict()
    if user["uid"] not in job.get("assigned_contractors", []):
        raise HTTPException(status_code=403, detail="משרה זו אינה משויכת אליך")

    cv_text = cand.get("cv_text", "")
    if not cv_text:
        raise HTTPException(status_code=400, detail="אין טקסט קורות חיים לניתוח")

    analysis = analyze_cv(cv_text, job)
    score = float(analysis.get("score", 0))

    already_applied = bool(list(db.collection("applications")
        .where("contractor_id", "==", user["uid"])
        .where("candidate_id", "==", body.candidate_id)
        .where("job_id", "==", body.job_id)
        .limit(1).stream()))

    return {
        "score": score,
        "fit_summary": analysis.get("fit_summary"),
        "strengths": analysis.get("strengths", []),
        "gaps": analysis.get("gaps", []),
        "recommendation": analysis.get("recommendation"),
        "can_submit": score >= 80 and not already_applied,
        "already_applied": already_applied,
    }


@router.post("/submit-existing")
async def submit_existing(body: SubmitExistingRequest, user=Depends(get_current_user)):
    if user["role"] != UserRole.contractor:
        raise HTTPException(status_code=403, detail="Contractors only")
    db = get_db()

    cand_doc = db.collection("candidates").document(body.candidate_id).get()
    if not cand_doc.exists:
        raise HTTPException(status_code=404, detail="מועמד לא נמצא")
    cand = cand_doc.to_dict()

    apps = list(db.collection("applications")
        .where("contractor_id", "==", user["uid"])
        .where("candidate_id", "==", body.candidate_id)
        .limit(1).stream())
    if not apps:
        raise HTTPException(status_code=403, detail="אין לך גישה למועמד זה")

    job_doc = db.collection("jobs").document(body.job_id).get()
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="משרה לא נמצאה")
    job = job_doc.to_dict()
    if user["uid"] not in job.get("assigned_contractors", []):
        raise HTTPException(status_code=403, detail="משרה זו אינה משויכת אליך")

    dup = list(db.collection("applications")
        .where("contractor_id", "==", user["uid"])
        .where("candidate_id", "==", body.candidate_id)
        .where("job_id", "==", body.job_id)
        .limit(1).stream())
    if dup:
        raise HTTPException(status_code=400, detail="המועמד כבר הוגש למשרה זו")

    cv_text = cand.get("cv_text", "")
    analysis = analyze_cv(cv_text, job)
    score = float(analysis.get("score", 0))
    settings = get_settings()
    status = ApplicationStatus.pending if score >= settings.score_threshold else ApplicationStatus.weak

    contractor_doc = db.collection("users").document(user["uid"]).get()
    contractor_name = contractor_doc.to_dict().get("name", "") if contractor_doc.exists else ""

    app_id = str(uuid.uuid4())
    db.collection("applications").document(app_id).set({
        "job_id": body.job_id,
        "job_title": job.get("title", ""),
        "contractor_id": user["uid"],
        "contractor_name": contractor_name,
        "candidate_id": body.candidate_id,
        "candidate_name": cand.get("name", ""),
        "candidate_email": cand.get("email", ""),
        "candidate_phone": cand.get("phone", ""),
        "cv_summary": cand.get("cv_summary", ""),
        "recent_roles": cand.get("recent_roles", []),
        "has_management_exp": cand.get("has_management_exp", False),
        "score": score,
        "status": status,
        "fit_summary": analysis.get("fit_summary"),
        "strengths": analysis.get("strengths", []),
        "gaps": analysis.get("gaps", []),
        "recommendation": analysis.get("recommendation"),
        "notes": 'הוגש ידנית ע"י קבלן (מועמד קיים)',
        "cv_drive_url": cand.get("cv_drive_url"),
        "civi_sent_at": None,
        "status_history": [],
        "created_at": datetime.utcnow().isoformat(),
    })

    return {"application_id": app_id, "score": score, "status": status}

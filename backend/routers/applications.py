from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from firebase_init import get_db
from models.schemas import ApplicationOut, ApplicationStatus, UserRole
from routers.auth import get_current_user
from services.cv_parser import extract_text_from_cv
from services.ai_service import analyze_cv
from config import get_settings
from datetime import datetime
import uuid

router = APIRouter(prefix="/applications", tags=["applications"])


def _app_to_out(doc_id: str, d: dict) -> ApplicationOut:
    return ApplicationOut(
        id=doc_id,
        job_id=d.get("job_id", ""),
        job_title=d.get("job_title"),
        contractor_id=d.get("contractor_id", ""),
        contractor_name=d.get("contractor_name"),
        candidate_id=d.get("candidate_id", ""),
        candidate_name=d.get("candidate_name"),
        score=d.get("score"),
        status=d.get("status", ApplicationStatus.pending),
        fit_summary=d.get("fit_summary"),
        strengths=d.get("strengths", []),
        gaps=d.get("gaps", []),
        recommendation=d.get("recommendation"),
        notes=d.get("notes"),
        created_at=d.get("created_at"),
    )


# Public endpoint: candidate submits CV via contractor link
@router.post("/submit")
async def submit_application(
    job_id: str = Form(...),
    contractor_id: str = Form(...),
    notes: str = Form(""),
    cv_file: UploadFile = File(...),
):
    db = get_db()
    settings = get_settings()

    # Validate job exists and contractor is assigned
    job_doc = db.collection("jobs").document(job_id).get()
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_doc.to_dict()
    if contractor_id not in job.get("assigned_contractors", []):
        raise HTTPException(status_code=403, detail="Contractor not assigned to this job")

    # Get contractor name
    contractor_doc = db.collection("users").document(contractor_id).get()
    contractor_name = contractor_doc.to_dict().get("name", "") if contractor_doc.exists else ""

    # Parse CV
    file_bytes = await cv_file.read()
    cv_text = extract_text_from_cv(file_bytes, cv_file.filename)

    # AI analysis
    analysis = analyze_cv(cv_text, job)
    score = float(analysis.get("score", 0))

    # Determine status
    if score >= settings.score_threshold:
        status = ApplicationStatus.pending
    else:
        status = ApplicationStatus.weak

    # Upsert candidate (no file storage — cv_text saved in Firestore)
    candidate_id = str(uuid.uuid4())
    candidate_email = analysis.get("candidate_email") or ""
    candidate_name = analysis.get("candidate_name") or "לא זוהה"

    # Check if candidate already exists by email
    if candidate_email:
        existing = db.collection("candidates").where("email", "==", candidate_email).limit(1).stream()
        found = False
        for ex in existing:
            candidate_id = ex.id
            found = True
            break
        if not found:
            _create_candidate(db, candidate_id, analysis, cv_text)
    else:
        _create_candidate(db, candidate_id, analysis, cv_text)

    # Save application
    app_id = str(uuid.uuid4())
    app_doc = {
        "job_id": job_id,
        "job_title": job.get("title", ""),
        "contractor_id": contractor_id,
        "contractor_name": contractor_name,
        "candidate_id": candidate_id,
        "candidate_name": candidate_name,
        "score": score,
        "status": status,
        "fit_summary": analysis.get("fit_summary"),
        "strengths": analysis.get("strengths", []),
        "gaps": analysis.get("gaps", []),
        "recommendation": analysis.get("recommendation"),
        "notes": notes,
        "cv_filename": cv_file.filename,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("applications").document(app_id).set(app_doc)

    return {
        "application_id": app_id,
        "score": score,
        "status": status,
        "candidate_name": candidate_name,
    }


def _create_candidate(db, candidate_id: str, analysis: dict, cv_text: str):
    db.collection("candidates").document(candidate_id).set({
        "name": analysis.get("candidate_name") or "לא זוהה",
        "email": analysis.get("candidate_email") or "",
        "phone": analysis.get("candidate_phone") or "",
        "cv_summary": analysis.get("cv_summary") or "",
        "recent_roles": analysis.get("recent_roles", []),
        "has_management_exp": analysis.get("has_management_exp", False),
        "cv_text": cv_text[:5000],
        "created_at": datetime.utcnow().isoformat(),
    })


@router.get("/job/{job_id}", response_model=list[ApplicationOut])
async def get_job_applications(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    query = db.collection("applications").where("job_id", "==", job_id)
    if user["role"] == UserRole.contractor:
        query = query.where("contractor_id", "==", user["uid"])
    docs = query.stream()
    return [_app_to_out(d.id, d.to_dict()) for d in docs]


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


@router.patch("/{app_id}/status")
async def update_status(app_id: str, status: ApplicationStatus, user=Depends(get_current_user)):
    import asyncio
    from services.email_service import send_email, candidate_in_process_email
    db = get_db()
    doc = db.collection("applications").document(app_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    d = doc.to_dict()
    if user["role"] == UserRole.contractor and d.get("contractor_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.collection("applications").document(app_id).update({"status": status})

    if status == ApplicationStatus.in_process and d.get("status") != ApplicationStatus.in_process:
        contractor_id = d.get("contractor_id", "")
        if contractor_id:
            user_doc = db.collection("users").document(contractor_id).get()
            if user_doc.exists:
                u = user_doc.to_dict()
                email = u.get("email", "")
                name = u.get("name", "קבלן")
                if email:
                    subject, html = candidate_in_process_email(
                        name,
                        d.get("candidate_name", "מועמד"),
                        d.get("job_title", "משרה"),
                        d.get("score"),
                    )
                    asyncio.create_task(send_email(email, subject, html))

    return {"ok": True}

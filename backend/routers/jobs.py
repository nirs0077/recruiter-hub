from fastapi import APIRouter, HTTPException, Depends
from firebase_init import get_db
from models.schemas import JobCreate, JobUpdate, JobOut, AssignJobRequest, UserRole, JobStatus
from routers.auth import get_current_user, require_admin
from services.scraping_service import fetch_page_text
from services.ai_service import extract_job_from_text
from datetime import datetime
import uuid

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _job_doc_to_out(doc_id: str, d: dict) -> JobOut:
    stored_status = d.get("status")
    is_active = d.get("is_active", True)
    if stored_status in ("active", "frozen", "closed"):
        status = JobStatus(stored_status)
    else:
        status = JobStatus.active if is_active else JobStatus.closed
    return JobOut(
        id=doc_id,
        url=d.get("url", ""),
        title=d.get("title", ""),
        location=d.get("location"),
        hybrid=d.get("hybrid"),
        description=d.get("description"),
        requirements=d.get("requirements"),
        is_active=(status == JobStatus.active),
        status=status,
        created_at=d.get("created_at"),
        assigned_contractors=d.get("assigned_contractors", []),
    )


@router.post("", response_model=JobOut)
async def create_job(body: JobCreate, admin=Depends(require_admin)):
    try:
        raw_text = await fetch_page_text(body.url)
        job_data = extract_job_from_text(raw_text, body.url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract job: {e}")

    db = get_db()
    job_id = str(uuid.uuid4())
    doc = {
        "url": body.url,
        "title": job_data.get("title") or "ללא כותרת",
        "location": job_data.get("location"),
        "hybrid": job_data.get("hybrid"),
        "description": job_data.get("description"),
        "requirements": job_data.get("requirements"),
        "is_active": True,
        "status": "active",
        "assigned_contractors": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("jobs").document(job_id).set(doc)
    return _job_doc_to_out(job_id, doc)


@router.get("", response_model=list[JobOut])
async def list_jobs(user=Depends(get_current_user)):
    db = get_db()
    if user["role"] == UserRole.admin:
        docs = db.collection("jobs").order_by("created_at", direction="DESCENDING").stream()
        return [_job_doc_to_out(d.id, d.to_dict()) for d in docs]
    else:
        # contractor sees only assigned jobs
        docs = (
            db.collection("jobs")
            .where("assigned_contractors", "array_contains", user["uid"])
            .stream()
        )
        return [_job_doc_to_out(d.id, d.to_dict()) for d in docs]


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = db.collection("jobs").document(job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    d = doc.to_dict()
    if user["role"] == UserRole.contractor and user["uid"] not in d.get("assigned_contractors", []):
        raise HTTPException(status_code=403, detail="Not assigned to this job")
    return _job_doc_to_out(doc.id, d)


@router.put("/{job_id}", response_model=JobOut)
async def update_job(job_id: str, body: JobUpdate, admin=Depends(require_admin)):
    db = get_db()
    ref = db.collection("jobs").document(job_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    updates = {k: v for k, v in body.dict().items() if v is not None}
    ref.update(updates)
    updated = ref.get().to_dict()
    return _job_doc_to_out(job_id, updated)


@router.delete("/{job_id}")
async def delete_job(job_id: str, admin=Depends(require_admin)):
    get_db().collection("jobs").document(job_id).delete()
    return {"ok": True}


@router.patch("/{job_id}/status")
async def update_job_status(job_id: str, status: str, admin=Depends(require_admin)):
    if status not in ("active", "frozen", "closed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    db = get_db()
    ref = db.collection("jobs").document(job_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Job not found")
    ref.update({"status": status, "is_active": status == "active"})
    return {"ok": True, "status": status}


@router.post("/assign")
async def assign_jobs(body: AssignJobRequest, admin=Depends(require_admin)):
    db = get_db()
    from google.cloud.firestore_v1 import ArrayUnion
    for job_id in body.job_ids:
        ref = db.collection("jobs").document(job_id)
        ref.update({"assigned_contractors": ArrayUnion(body.contractor_ids)})
    return {"ok": True, "assigned": len(body.job_ids) * len(body.contractor_ids)}


@router.delete("/{job_id}/assign/{contractor_id}")
async def unassign_job(job_id: str, contractor_id: str, admin=Depends(require_admin)):
    db = get_db()
    from google.cloud.firestore_v1 import ArrayRemove
    db.collection("jobs").document(job_id).update(
        {"assigned_contractors": ArrayRemove([contractor_id])}
    )
    return {"ok": True}


@router.get("/by-contractor/{contractor_id}")
async def jobs_by_contractor(contractor_id: str, admin=Depends(require_admin)):
    """All jobs assigned to this contractor, each with their candidates."""
    db = get_db()
    jobs_docs = (
        db.collection("jobs")
        .where("assigned_contractors", "array_contains", contractor_id)
        .stream()
    )

    result = []
    for job_doc in jobs_docs:
        j = job_doc.to_dict()
        # Fetch applications for this job+contractor
        apps = db.collection("applications") \
            .where("job_id", "==", job_doc.id) \
            .where("contractor_id", "==", contractor_id) \
            .stream()

        candidates = []
        for app_doc in apps:
            a = app_doc.to_dict()
            cid = a.get("candidate_id", "")
            # Get candidate details
            cand_doc = db.collection("candidates").document(cid).get()
            cand = cand_doc.to_dict() if cand_doc.exists else {}
            candidates.append({
                "application_id": app_doc.id,
                "candidate_id": cid,
                "name": cand.get("name") or a.get("candidate_name", ""),
                "email": cand.get("email"),
                "phone": cand.get("phone"),
                "score": a.get("score"),
                "status": a.get("status"),
                "recommendation": a.get("recommendation"),
                "fit_summary": a.get("fit_summary"),
                "strengths": a.get("strengths", []),
                "gaps": a.get("gaps", []),
                "created_at": a.get("created_at"),
            })

        candidates.sort(key=lambda c: c.get("score") or 0, reverse=True)
        result.append({
            "id": job_doc.id,
            "title": j.get("title", ""),
            "location": j.get("location"),
            "hybrid": j.get("hybrid"),
            "is_active": j.get("is_active", True),
            "created_at": j.get("created_at"),
            "candidates": candidates,
        })

    result.sort(key=lambda j: j.get("created_at") or "", reverse=True)
    return result


# Public endpoint — no auth needed (for candidate apply page)
@router.get("/public/{job_id}")
async def get_job_public(job_id: str):
    db = get_db()
    doc = db.collection("jobs").document(job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    d = doc.to_dict()
    return {
        "id": doc.id,
        "title": d.get("title", ""),
        "location": d.get("location"),
        "hybrid": d.get("hybrid"),
        "description": d.get("description"),
        "requirements": d.get("requirements"),
    }

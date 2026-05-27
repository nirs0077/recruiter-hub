from fastapi import APIRouter, HTTPException, Depends
from firebase_init import get_db
from models.schemas import CandidateOut, CandidateDetail, UserRole
from routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("/by-contractor/{contractor_id}")
async def candidates_by_contractor(contractor_id: str, admin=Depends(require_admin)):
    """Return all candidates who applied via this contractor, each with their applications."""
    db = get_db()

    # Fetch all applications for this contractor
    apps = list(db.collection("applications").where("contractor_id", "==", contractor_id).stream())

    # Group by candidate_id
    candidate_apps: dict[str, list[dict]] = {}
    for app_doc in apps:
        a = app_doc.to_dict()
        cid = a.get("candidate_id", "")
        if cid not in candidate_apps:
            candidate_apps[cid] = []
        candidate_apps[cid].append({
            "id": app_doc.id,
            "job_id": a.get("job_id"),
            "job_title": a.get("job_title"),
            "score": a.get("score"),
            "status": a.get("status"),
            "recommendation": a.get("recommendation"),
            "fit_summary": a.get("fit_summary"),
            "created_at": a.get("created_at"),
        })

    # Fetch candidate details
    result = []
    for cid, candidate_applications in candidate_apps.items():
        doc = db.collection("candidates").document(cid).get()
        if not doc.exists:
            continue
        d = doc.to_dict()
        result.append({
            "id": cid,
            "name": d.get("name", ""),
            "email": d.get("email"),
            "phone": d.get("phone"),
            "cv_summary": d.get("cv_summary"),
            "recent_roles": d.get("recent_roles", []),
            "has_management_exp": d.get("has_management_exp"),
            "applications": sorted(candidate_applications, key=lambda x: x.get("score") or 0, reverse=True),
        })

    result.sort(key=lambda c: max((a.get("score") or 0 for a in c["applications"]), default=0), reverse=True)
    return result


@router.get("", response_model=list[CandidateOut])
async def list_candidates(admin=Depends(require_admin)):
    db = get_db()

    # Fetch candidates and all applications in parallel-ish (two queries, no N+1)
    docs = list(db.collection("candidates").order_by("created_at", direction="DESCENDING").stream())
    all_apps = list(db.collection("applications").stream())

    # Group applications by candidate_id, sorted by date
    app_map: dict[str, list] = {}
    for app_doc in all_apps:
        a = app_doc.to_dict()
        cid = a.get("candidate_id", "")
        if not cid:
            continue
        app_map.setdefault(cid, []).append({
            "contractor_id": a.get("contractor_id", ""),
            "contractor_name": a.get("contractor_name", ""),
            "job_title": a.get("job_title", ""),
            "created_at": a.get("created_at", ""),
        })

    result = []
    for d in docs:
        data = d.to_dict()
        contractor_history = sorted(app_map.get(d.id, []), key=lambda x: x.get("created_at", ""))
        result.append(CandidateOut(
            id=d.id,
            name=data.get("name", ""),
            email=data.get("email"),
            phone=data.get("phone"),
            cv_summary=data.get("cv_summary"),
            recent_roles=data.get("recent_roles", []),
            has_management_exp=data.get("has_management_exp"),
            created_at=data.get("created_at"),
            contractors=contractor_history,
        ))
    return result


@router.get("/{candidate_id}", response_model=CandidateDetail)
async def get_candidate(candidate_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = db.collection("candidates").document(candidate_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Candidate not found")
    data = doc.to_dict()

    # Fetch all applications for this candidate
    apps_query = db.collection("applications").where("candidate_id", "==", candidate_id)
    if user["role"] == UserRole.contractor:
        apps_query = apps_query.where("contractor_id", "==", user["uid"])

    applications = []
    for app_doc in apps_query.stream():
        a = app_doc.to_dict()
        applications.append({
            "id": app_doc.id,
            "job_id": a.get("job_id"),
            "job_title": a.get("job_title"),
            "score": a.get("score"),
            "status": a.get("status"),
            "fit_summary": a.get("fit_summary"),
            "strengths": a.get("strengths", []),
            "gaps": a.get("gaps", []),
            "recommendation": a.get("recommendation"),
            "contractor_name": a.get("contractor_name"),
            "created_at": a.get("created_at"),
            "cv_drive_url": a.get("cv_drive_url"),
            "civi_sent_at": a.get("civi_sent_at"),
            "status_history": a.get("status_history", []),
        })

    return CandidateDetail(
        id=doc.id,
        name=data.get("name", ""),
        email=data.get("email"),
        phone=data.get("phone"),
        current_title=data.get("current_title"),
        years_of_experience=data.get("years_of_experience"),
        education=data.get("education"),
        cv_summary=data.get("cv_summary"),
        notable_achievement=data.get("notable_achievement"),
        recent_roles=data.get("recent_roles", []),
        skills=data.get("skills", []),
        companies=data.get("companies", []),
        has_management_exp=data.get("has_management_exp"),
        cv_drive_url=data.get("cv_drive_url"),
        created_at=data.get("created_at"),
        applications=applications,
    )

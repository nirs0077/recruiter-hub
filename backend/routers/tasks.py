import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from firebase_init import get_db
from models.schemas import (
    CreateTaskRequest,
    TaskOut,
    TaskStatus,
    TaskType,
    UpdateTaskStatusRequest,
    UserRole,
)
from routers.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_to_out(doc_id: str, d: dict) -> TaskOut:
    return TaskOut(
        id=doc_id,
        title=d.get("title", ""),
        notes=d.get("notes"),
        due_date=d.get("due_date"),
        status=d.get("status", TaskStatus.pending),
        type=d.get("type", TaskType.manual),
        created_by=d.get("created_by", ""),
        created_by_name=d.get("created_by_name"),
        assigned_to=d.get("assigned_to"),
        assigned_to_name=d.get("assigned_to_name"),
        app_id=d.get("app_id"),
        candidate_name=d.get("candidate_name"),
        job_title=d.get("job_title"),
        created_at=d.get("created_at", ""),
    )


def _sort_key(t: TaskOut) -> str:
    return t.due_date or t.created_at


@router.get("/my", response_model=list[TaskOut])
async def get_my_tasks(user=Depends(get_current_user)):
    db = get_db()
    if user["role"] == UserRole.contractor:
        created = [_task_to_out(d.id, d.to_dict()) for d in
                   db.collection("tasks")
                   .where("created_by", "==", user["uid"])
                   .where("type", "==", TaskType.manual)
                   .stream()]
        assigned = [_task_to_out(d.id, d.to_dict()) for d in
                    db.collection("tasks")
                    .where("assigned_to", "==", user["uid"])
                    .stream()]
        seen: set[str] = set()
        tasks = []
        for t in created + assigned:
            if t.id not in seen:
                seen.add(t.id)
                tasks.append(t)
    else:
        tasks = [_task_to_out(d.id, d.to_dict()) for d in
                 db.collection("tasks")
                 .where("created_by", "==", user["uid"])
                 .where("type", "==", TaskType.manual)
                 .stream()]
    tasks.sort(key=_sort_key)
    return tasks


@router.get("/system", response_model=list[TaskOut])
async def get_system_tasks(user=Depends(get_current_user)):
    if user["role"] != UserRole.admin:
        raise HTTPException(status_code=403)
    db = get_db()
    tasks = [_task_to_out(d.id, d.to_dict()) for d in
             db.collection("tasks").where("type", "==", TaskType.auto).stream()]
    tasks.sort(key=_sort_key)
    return tasks


@router.post("", response_model=TaskOut)
async def create_task(body: CreateTaskRequest, user=Depends(get_current_user)):
    db = get_db()
    task_id = str(uuid.uuid4())
    assigned_to = body.assigned_to or user["uid"]
    assigned_to_name = user.get("name", "")
    if body.assigned_to and body.assigned_to != user["uid"]:
        u_doc = db.collection("users").document(body.assigned_to).get()
        if u_doc.exists:
            assigned_to_name = u_doc.to_dict().get("name", "")
    data = {
        "title": body.title,
        "notes": body.notes,
        "due_date": body.due_date,
        "status": TaskStatus.pending,
        "type": TaskType.manual,
        "created_by": user["uid"],
        "created_by_name": user.get("name", ""),
        "assigned_to": assigned_to,
        "assigned_to_name": assigned_to_name,
        "app_id": None,
        "candidate_name": None,
        "job_title": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("tasks").document(task_id).set(data)
    return _task_to_out(task_id, data)


@router.patch("/{task_id}/status")
async def update_task_status(
    task_id: str, body: UpdateTaskStatusRequest, user=Depends(get_current_user)
):
    db = get_db()
    doc = db.collection("tasks").document(task_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404)
    d = doc.to_dict()
    if user["role"] != UserRole.admin and user["uid"] not in [
        d.get("created_by"), d.get("assigned_to")
    ]:
        raise HTTPException(status_code=403)
    db.collection("tasks").document(task_id).update({"status": body.status})
    return {"ok": True}


@router.delete("/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = db.collection("tasks").document(task_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404)
    d = doc.to_dict()
    if user["role"] != UserRole.admin and d.get("created_by") != user["uid"]:
        raise HTTPException(status_code=403)
    db.collection("tasks").document(task_id).delete()
    return {"ok": True}

from fastapi import APIRouter, Depends
from firebase_init import get_db
from models.schemas import SettingsUpdate
from routers.auth import require_admin

router = APIRouter(prefix="/settings", tags=["settings"])

SETTINGS_DOC = "app_settings"


@router.get("")
async def get_settings_doc(admin=Depends(require_admin)):
    db = get_db()
    doc = db.collection("settings").document(SETTINGS_DOC).get()
    if not doc.exists:
        return {"score_threshold": 75.0}
    return doc.to_dict()


@router.put("")
async def update_settings_doc(body: SettingsUpdate, admin=Depends(require_admin)):
    db = get_db()
    updates = {k: v for k, v in body.dict().items() if v is not None}
    db.collection("settings").document(SETTINGS_DOC).set(updates, merge=True)
    return {"ok": True, **updates}

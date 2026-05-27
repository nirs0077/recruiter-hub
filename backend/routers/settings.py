from fastapi import APIRouter, Depends
from firebase_init import get_db
from models.schemas import SettingsUpdate
from routers.auth import require_admin
from config import get_settings as get_env_settings
from services.drive_service import test_drive_connection

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


@router.get("/test-drive")
async def test_drive(admin=Depends(require_admin)):
    """Diagnostic: verify Google Drive connectivity and upload a test file."""
    db = get_db()
    env = get_env_settings()

    doc = db.collection("settings").document(SETTINGS_DOC).get()
    firestore_data = doc.to_dict() if doc.exists else {}

    folder_id = firestore_data.get("google_drive_folder_id") or env.google_drive_folder_id
    cred_path = env.google_drive_credentials_path

    # Strip full URL to folder ID if needed
    import re
    if folder_id:
        m = re.search(r"/folders/([a-zA-Z0-9_-]+)", folder_id)
        if m:
            folder_id = m.group(1)

    return test_drive_connection(cred_path, folder_id)

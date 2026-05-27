"""Google Drive integration: upload CVs to contractor sub-folders."""
import io
import json
import os
import logging

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive"]


def _service(credentials_path: str):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    # Prefer env var JSON (for Render / cloud hosting)
    cred_json = os.environ.get("GOOGLE_DRIVE_CREDENTIALS_JSON")
    if cred_json:
        info = json.loads(cred_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    elif os.path.exists(credentials_path):
        creds = service_account.Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
    else:
        raise RuntimeError("Google Drive credentials not found")
    return build("drive", "v3", credentials=creds)


def _get_or_create_folder(svc, parent_id: str, name: str) -> str:
    safe = name.replace("'", "\\'")
    q = (
        f"name='{safe}' and '{parent_id}' in parents "
        f"and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )
    existing = svc.files().list(q=q, fields="files(id)").execute().get("files", [])
    if existing:
        return existing[0]["id"]
    folder = svc.files().create(
        body={"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]},
        fields="id",
    ).execute()
    return folder["id"]


def _safe_filename(filename: str) -> str:
    """Remove characters that may cause issues in Drive file names."""
    import re
    name = os.path.basename(filename or "cv")
    # Keep only safe chars
    safe = re.sub(r'[^\w.\-_ ]', '_', name)
    return safe or "cv.pdf"


def upload_cv_to_drive(
    credentials_path: str,
    root_folder_id: str,
    contractor_name: str,
    filename: str,
    file_bytes: bytes,
    mime_type: str = "application/octet-stream",
) -> str | None:
    """Upload a CV file under root/contractor_name/ and return a shareable view URL."""
    has_creds = os.environ.get("GOOGLE_DRIVE_CREDENTIALS_JSON") or os.path.exists(credentials_path)
    if not root_folder_id or not has_creds:
        logger.info("Drive upload skipped — no root_folder_id or credentials")
        return None
    try:
        from googleapiclient.http import MediaIoBaseUpload
        svc = _service(credentials_path)
        contractor_folder_id = _get_or_create_folder(svc, root_folder_id, contractor_name)
        safe_name = _safe_filename(filename)
        logger.info("Uploading CV '%s' to Drive folder %s", safe_name, contractor_folder_id)
        media = MediaIoBaseUpload(
            io.BytesIO(file_bytes),
            mimetype=mime_type,
            resumable=False,   # simpler, no chunked upload
        )
        file = svc.files().create(
            body={"name": safe_name, "parents": [contractor_folder_id]},
            media_body=media,
            fields="id",
        ).execute()
        file_id = file["id"]
        svc.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
        ).execute()
        url = f"https://drive.google.com/file/d/{file_id}/view"
        logger.info("Drive upload success: %s", url)
        return url
    except Exception:
        logger.exception("Google Drive upload failed for '%s'", filename)
        return None

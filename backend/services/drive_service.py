"""Google Drive integration: upload CVs to contractor sub-folders."""
import io
import os
import logging

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive"]


def _service(credentials_path: str):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
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


def upload_cv_to_drive(
    credentials_path: str,
    root_folder_id: str,
    contractor_name: str,
    filename: str,
    file_bytes: bytes,
    mime_type: str = "application/octet-stream",
) -> str | None:
    """Upload a CV file under root/contractor_name/ and return a shareable view URL."""
    if not root_folder_id or not os.path.exists(credentials_path):
        return None
    try:
        from googleapiclient.http import MediaIoBaseUpload
        svc = _service(credentials_path)
        contractor_folder_id = _get_or_create_folder(svc, root_folder_id, contractor_name)
        media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mime_type, resumable=True)
        file = svc.files().create(
            body={"name": filename, "parents": [contractor_folder_id]},
            media_body=media,
            fields="id",
        ).execute()
        file_id = file["id"]
        # Share with anyone who has the link
        svc.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
        ).execute()
        return f"https://drive.google.com/file/d/{file_id}/view"
    except Exception:
        logger.exception("Google Drive upload failed for %s", filename)
        return None

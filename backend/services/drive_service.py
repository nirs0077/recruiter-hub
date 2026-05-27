"""Google Drive integration: upload CVs to contractor sub-folders."""
import json
import logging
import os
import re

import requests as _req

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive"]
_DRIVE = "https://www.googleapis.com/drive/v3"
_UPLOAD = "https://www.googleapis.com/upload/drive/v3"


def _get_token(credentials_path: str) -> str:
    """Return a fresh Bearer token using the service-account credentials."""
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request

    cred_json = os.environ.get("GOOGLE_DRIVE_CREDENTIALS_JSON")
    if cred_json:
        info = json.loads(cred_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    elif os.path.exists(credentials_path):
        creds = service_account.Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
    else:
        raise RuntimeError("Google Drive credentials not found")

    creds.refresh(Request())
    if not creds.token:
        raise RuntimeError("Failed to obtain access token from Google")
    return creds.token


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _get_or_create_folder(token: str, parent_id: str, name: str) -> str:
    safe = name.replace("'", "\\'")
    q = (
        f"name='{safe}' and '{parent_id}' in parents "
        f"and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )
    r = _req.get(f"{_DRIVE}/files", headers=_auth(token),
                 params={"q": q, "fields": "files(id)"})
    r.raise_for_status()
    files = r.json().get("files", [])
    if files:
        return files[0]["id"]

    r = _req.post(
        f"{_DRIVE}/files",
        headers={**_auth(token), "Content-Type": "application/json"},
        json={"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]},
    )
    r.raise_for_status()
    return r.json()["id"]


def _safe_filename(filename: str) -> str:
    name = os.path.basename(filename or "cv")
    safe = re.sub(r'[^\w.\-_ ]', '_', name)
    return safe or "cv.pdf"


def _mime_from_filename(filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if name.endswith(".doc"):
        return "application/msword"
    return "application/octet-stream"


def upload_cv_to_drive(
    credentials_path: str,
    root_folder_id: str,
    contractor_name: str,
    filename: str,
    file_bytes: bytes,
    mime_type: str | None = None,
) -> str | None:
    """Upload a CV under root/contractor_name/ and return a shareable view URL."""
    has_creds = os.environ.get("GOOGLE_DRIVE_CREDENTIALS_JSON") or os.path.exists(credentials_path)
    if not root_folder_id or not has_creds:
        logger.info("Drive upload skipped — no root_folder_id or credentials")
        return None
    try:
        token = _get_token(credentials_path)

        contractor_folder_id = _get_or_create_folder(token, root_folder_id, contractor_name)
        safe_name = _safe_filename(filename)
        content_type = mime_type or _mime_from_filename(filename)

        logger.info("Uploading '%s' (%d bytes, %s) → folder %s",
                    safe_name, len(file_bytes), content_type, contractor_folder_id)

        boundary = "drive_cv_upload_boundary"
        metadata = json.dumps({"name": safe_name, "parents": [contractor_folder_id]})
        body = (
            f"--{boundary}\r\n"
            f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
            + metadata
            + f"\r\n--{boundary}\r\n"
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--".encode("utf-8")

        resp = _req.post(
            f"{_UPLOAD}/files",
            params={"uploadType": "multipart", "fields": "id"},
            headers={
                **_auth(token),
                "Content-Type": f"multipart/related; boundary={boundary}",
            },
            data=body,
        )

        if not resp.ok:
            logger.error("Drive upload failed HTTP %s: %s", resp.status_code, resp.text)
            resp.raise_for_status()

        file_id = resp.json()["id"]
        logger.info("Drive file created: %s", file_id)

        perm = _req.post(
            f"{_DRIVE}/files/{file_id}/permissions",
            headers={**_auth(token), "Content-Type": "application/json"},
            json={"type": "anyone", "role": "reader"},
        )
        if not perm.ok:
            logger.warning("Could not set Drive permissions for %s: %s", file_id, perm.text)

        url = f"https://drive.google.com/file/d/{file_id}/view"
        logger.info("Drive upload success → %s", url)
        return url

    except Exception:
        logger.exception("Google Drive upload failed for '%s'", filename)
        return None


def test_drive_connection(credentials_path: str, root_folder_id: str) -> dict:
    """Diagnostic: try to list the root folder and upload a tiny test file."""
    has_creds = os.environ.get("GOOGLE_DRIVE_CREDENTIALS_JSON") or os.path.exists(credentials_path)
    if not root_folder_id:
        return {"ok": False, "step": "config", "error": "google_drive_folder_id not set"}
    if not has_creds:
        return {"ok": False, "step": "config", "error": "No credentials (env var or file)"}
    try:
        token = _get_token(credentials_path)
    except Exception as e:
        return {"ok": False, "step": "auth", "error": str(e)}
    try:
        r = _req.get(f"{_DRIVE}/files/{root_folder_id}",
                     headers=_auth(token), params={"fields": "id,name"})
        if not r.ok:
            return {"ok": False, "step": "read_folder", "error": f"HTTP {r.status_code}: {r.text}"}
        folder_name = r.json().get("name", "?")
    except Exception as e:
        return {"ok": False, "step": "read_folder", "error": str(e)}
    try:
        test_bytes = b"RecruiterHub Drive test"
        url = upload_cv_to_drive(credentials_path, root_folder_id, "_test_", "test.txt", test_bytes, "text/plain")
        if not url:
            return {"ok": False, "step": "upload", "error": "upload_cv_to_drive returned None"}
        return {"ok": True, "folder": folder_name, "test_file_url": url}
    except Exception as e:
        return {"ok": False, "step": "upload", "error": str(e)}

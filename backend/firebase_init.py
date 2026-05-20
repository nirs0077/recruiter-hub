import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from config import get_settings

_initialized = False


def init_firebase():
    global _initialized
    if _initialized:
        return
    settings = get_settings()

    # 1. Env var JSON string (for cloud hosting like Render)
    cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    if cred_json:
        cred = credentials.Certificate(json.loads(cred_json))
    # 2. Local credentials file
    elif os.path.exists(settings.firebase_credentials_path):
        cred = credentials.Certificate(settings.firebase_credentials_path)
    else:
        raise RuntimeError(
            "Firebase credentials not found. "
            "Set FIREBASE_CREDENTIALS_JSON env var or place firebase-credentials.json in the backend folder."
        )

    firebase_admin.initialize_app(cred)
    _initialized = True


def get_db():
    return firestore.client()


def get_auth():
    return auth



from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as fb_auth
from firebase_init import get_db, get_auth
from models.schemas import LoginRequest, CreateUserRequest, UserOut, UserRole, ResetPasswordRequest, RegisterWithInviteRequest
from config import get_settings
import jwt
import uuid
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def create_token(uid: str, role: str) -> str:
    s = get_settings()
    payload = {
        "sub": uid,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=s.access_token_expire_minutes)
    }
    return jwt.encode(payload, s.secret_key, algorithm=s.algorithm)


def decode_token(token: str) -> dict:
    s = get_settings()
    try:
        return jwt.decode(token, s.secret_key, algorithms=[s.algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    db = get_db()
    doc = db.collection("users").document(payload["sub"]).get()
    if not doc.exists:
        raise HTTPException(status_code=401, detail="User not found")
    return {"uid": payload["sub"], "role": payload["role"], **doc.to_dict()}


async def require_admin(user=Depends(get_current_user)):
    if user["role"] != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@router.post("/login")
async def login(body: LoginRequest):
    try:
        firebase_user = fb_auth.get_user_by_email(body.email)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    db = get_db()
    doc = db.collection("users").document(firebase_user.uid).get()
    if not doc.exists:
        raise HTTPException(status_code=401, detail="User not found")

    user_data = doc.to_dict()

    # Firebase Admin SDK can't verify passwords directly — use a custom password field
    if not user_data.get("active", True):
        raise HTTPException(status_code=403, detail="החשבון הושבת. פנה למנהל המערכת")

    import bcrypt
    stored = user_data.get("password_hash", "")
    if not bcrypt.checkpw(body.password.encode(), stored.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(firebase_user.uid, user_data["role"])
    return {
        "token": token,
        "user": UserOut(
            uid=firebase_user.uid,
            email=firebase_user.email,
            name=user_data.get("name", ""),
            role=user_data.get("role"),
            phone=user_data.get("phone"),
        )
    }


@router.post("/users", response_model=UserOut)
async def create_user(body: CreateUserRequest, admin=Depends(require_admin)):
    import bcrypt
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    try:
        firebase_user = fb_auth.create_user(email=body.email, display_name=body.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    db = get_db()
    user_doc = {
        "email": body.email,
        "name": body.name,
        "role": body.role,
        "phone": body.phone,
        "password_hash": hashed,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("users").document(firebase_user.uid).set(user_doc)

    return UserOut(uid=firebase_user.uid, **{k: v for k, v in user_doc.items() if k != "password_hash"})


@router.patch("/users/{uid}/toggle-active")
async def toggle_active(uid: str, admin=Depends(require_admin)):
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    current = doc.to_dict().get("active", True)
    db.collection("users").document(uid).update({"active": not current})
    return {"active": not current}


@router.post("/users/{uid}/reset-password")
async def reset_password(uid: str, body: ResetPasswordRequest, admin=Depends(require_admin)):
    import bcrypt
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="סיסמה חייבת להיות לפחות 6 תווים")
    hashed = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    db.collection("users").document(uid).update({"password_hash": hashed})
    return {"ok": True}


@router.get("/users", response_model=list[UserOut])
async def list_users(admin=Depends(require_admin)):
    db = get_db()
    docs = db.collection("users").stream()
    users = []
    for doc in docs:
        d = doc.to_dict()
        users.append(UserOut(
            uid=doc.id,
            email=d.get("email", ""),
            name=d.get("name", ""),
            role=d.get("role"),
            phone=d.get("phone"),
            created_at=d.get("created_at"),
            active=d.get("active", True),
        ))
    return users


@router.delete("/users/{uid}")
async def delete_user(uid: str, admin=Depends(require_admin)):
    try:
        fb_auth.delete_user(uid)
    except Exception:
        pass
    get_db().collection("users").document(uid).delete()
    return {"ok": True}


@router.post("/invite")
async def create_invite(admin=Depends(require_admin)):
    """Generate a one-time contractor invitation link (valid 7 days)."""
    token = str(uuid.uuid4())
    expires = (datetime.utcnow() + timedelta(days=7)).isoformat()
    get_db().collection("invitations").document(token).set({
        "created_by": admin["uid"],
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires,
        "used": False,
    })
    base_url = get_settings().frontend_url
    return {"invite_url": f"{base_url}/register/{token}", "expires_at": expires}


@router.get("/invite/{token}")
async def validate_invite(token: str):
    """Public — check if invite token is valid."""
    doc = get_db().collection("invitations").document(token).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="קישור הזמנה לא תקף")
    data = doc.to_dict()
    if data.get("used"):
        raise HTTPException(status_code=410, detail="קישור ההזמנה כבר שומש")
    if datetime.utcnow().isoformat() > data.get("expires_at", ""):
        raise HTTPException(status_code=410, detail="קישור ההזמנה פג תוקף")
    return {"valid": True}


@router.post("/register")
async def register_with_invite(body: RegisterWithInviteRequest):
    """Public — contractor self-registration with invite token."""
    import bcrypt
    db = get_db()

    # Validate token
    inv_doc = db.collection("invitations").document(body.token).get()
    if not inv_doc.exists:
        raise HTTPException(status_code=404, detail="קישור הזמנה לא תקף")
    inv = inv_doc.to_dict()
    if inv.get("used"):
        raise HTTPException(status_code=410, detail="קישור ההזמנה כבר שומש")
    if datetime.utcnow().isoformat() > inv.get("expires_at", ""):
        raise HTTPException(status_code=410, detail="קישור ההזמנה פג תוקף")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="סיסמה חייבת להיות לפחות 6 תווים")

    # Create Firebase Auth user
    try:
        firebase_user = fb_auth.create_user(email=body.email, display_name=body.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"כתובת האימייל כבר קיימת במערכת")

    hashed = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.collection("users").document(firebase_user.uid).set({
        "email": body.email,
        "name": body.name,
        "role": "contractor",
        "phone": body.phone or "",
        "password_hash": hashed,
        "active": True,
        "created_at": datetime.utcnow().isoformat(),
    })

    # Mark invite as used
    db.collection("invitations").document(body.token).update({
        "used": True,
        "used_by": firebase_user.uid,
        "used_at": datetime.utcnow().isoformat(),
    })

    token = create_token(firebase_user.uid, "contractor")
    return {
        "token": token,
        "user": UserOut(
            uid=firebase_user.uid,
            email=body.email,
            name=body.name,
            role=UserRole.contractor,
            phone=body.phone,
        )
    }


@router.post("/impersonate/{uid}")
async def impersonate_user(uid: str, admin=Depends(require_admin)):
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    user_data = doc.to_dict()
    token = create_token(uid, user_data["role"])
    return {"token": token, "role": user_data["role"]}


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(
        uid=user["uid"],
        email=user.get("email", ""),
        name=user.get("name", ""),
        role=user.get("role"),
        phone=user.get("phone"),
        created_at=user.get("created_at"),
    )

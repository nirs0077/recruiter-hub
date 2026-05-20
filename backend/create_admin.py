"""
Run this once to create the first admin user.
Usage: python create_admin.py
"""
import sys
import bcrypt
from datetime import datetime
from firebase_init import init_firebase, get_db
from firebase_admin import auth as fb_auth

init_firebase()

ADMIN_EMAIL = "nirs@connectech.co.il"
ADMIN_PASSWORD = "Keshet123!"
ADMIN_NAME = "Nir"

# Delete existing user with this email if exists
try:
    existing = fb_auth.get_user_by_email(ADMIN_EMAIL)
    fb_auth.delete_user(existing.uid)
    get_db().collection("users").document(existing.uid).delete()
    print(f"Deleted existing user: {existing.uid}")
except fb_auth.UserNotFoundError:
    pass

try:
    firebase_user = fb_auth.create_user(email=ADMIN_EMAIL, display_name=ADMIN_NAME)
except Exception as e:
    print(f"Firebase error: {e}")
    sys.exit(1)

hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
get_db().collection("users").document(firebase_user.uid).set({
    "email": ADMIN_EMAIL,
    "name": ADMIN_NAME,
    "role": "admin",
    "password_hash": hashed,
    "created_at": datetime.utcnow().isoformat(),
})
print(f"\nAdmin created successfully!")
print(f"UID: {firebase_user.uid}")
print(f"Email: {ADMIN_EMAIL}")

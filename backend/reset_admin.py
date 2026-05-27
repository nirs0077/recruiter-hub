"""Run once to reset the admin password. Delete this file afterward."""
import sys, bcrypt
from firebase_admin import credentials, firestore, auth as fb_auth
import firebase_admin

cred = credentials.Certificate("firebase-credentials.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

email = input("Admin email: ").strip()
new_password = input("New password: ").strip()

if len(new_password) < 6:
    print("Password must be at least 6 characters.")
    sys.exit(1)

user = fb_auth.get_user_by_email(email)
hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
db.collection("users").document(user.uid).update({"password_hash": hashed})
print(f"Password reset successfully for {email} (uid={user.uid})")

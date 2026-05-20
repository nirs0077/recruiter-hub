# RecruiterHub

מערכת ניהול גיוס - פרסום משרות, ניהול קבלנים, וניתוח קורות חיים ב-AI.

## התקנה

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

1. צור פרויקט Firebase וורד את `firebase-credentials.json` לתיקיית `backend/`
2. העתק `.env.example` ל-`.env` ומלא את הפרטים
3. הרץ:
```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## הגדרת Firebase

1. כנס ל-[Firebase Console](https://console.firebase.google.com)
2. צור פרויקט חדש
3. הפעל **Authentication** (Email/Password)
4. הפעל **Firestore Database**
5. הפעל **Storage**
6. ב-Project Settings > Service Accounts > Generate new private key
7. שמור את הקובץ כ-`backend/firebase-credentials.json`
8. העתק את **storageBucket** (ללא `gs://`) ל-`FIREBASE_STORAGE_BUCKET`

## יצירת Admin ראשון

אחרי שה-backend רץ, הרץ:

```bash
cd backend
python create_admin.py
```

או ישירות דרך ה-API (בקשת POST ידנית עם Postman/curl):
```
POST /auth/users
{ "email": "admin@example.com", "password": "...", "name": "Admin", "role": "admin" }
```

> **הערה:** יצירת המשתמש הראשון דורשת token של admin. לראשון, הוסף את הסקריפט הבא:

```python
# create_admin.py
import asyncio
from firebase_init import init_firebase, get_db, get_auth
from firebase_admin import auth as fb_auth
import bcrypt
from datetime import datetime

init_firebase()

email = "admin@yourdomain.com"
password = "your-password"
name = "Admin"

firebase_user = fb_auth.create_user(email=email, display_name=name)
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
get_db().collection("users").document(firebase_user.uid).set({
    "email": email, "name": name, "role": "admin",
    "password_hash": hashed, "created_at": datetime.utcnow().isoformat()
})
print(f"Admin created: {firebase_user.uid}")
```

## מבנה המערכת

- **Admin**: ניהול משרות, קבלנים, מועמדים, הגדרות
- **קבלן**: רואה משרות ששויכו אליו, יוצר לינקי הגשה, רואה מועמדים שלו
- **מועמד**: נכנס דרך לינק הקבלן, מגיש קו"ח, מקבל ניתוח AI מיידי

## טכנולוגיות

- **Backend**: FastAPI + Firebase Admin SDK + Claude API
- **Frontend**: React + Vite + TailwindCSS
- **DB**: Firebase Firestore
- **Storage**: Firebase Storage
- **AI**: Anthropic Claude (ניתוח קו"ח + חילוץ פרטי משרה)

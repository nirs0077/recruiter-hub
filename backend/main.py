from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_init import init_firebase
from config import get_settings
from routers import auth, jobs, applications, candidates, settings as settings_router

init_firebase()

app = FastAPI(title="RecruiterHub API", version="1.0.0")

s = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[s.frontend_url, "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(candidates.router)
app.include_router(settings_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}

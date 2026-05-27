from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    contractor = "contractor"


class ApplicationStatus(str, Enum):
    pending = "pending"
    in_process = "in_process"
    weak = "weak"
    rejected = "rejected"
    known_candidate = "known_candidate"
    sent_to_civi = "sent_to_civi"


class JobStatus(str, Enum):
    active = "active"
    frozen = "frozen"
    closed = "closed"


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole
    phone: Optional[str] = None


class UserOut(BaseModel):
    uid: str
    email: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    created_at: Optional[str] = None
    active: bool = True


class ResetPasswordRequest(BaseModel):
    password: str


class RegisterWithInviteRequest(BaseModel):
    token: str
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    url: str


class JobUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    hybrid: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[JobStatus] = None


class JobOut(BaseModel):
    id: str
    url: str
    title: str
    location: Optional[str] = None
    hybrid: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    is_active: bool = True
    status: JobStatus = JobStatus.active
    created_at: Optional[str] = None
    assigned_contractors: Optional[List[str]] = []


# ── Job Assignments ────────────────────────────────────────────────────────────

class AssignJobRequest(BaseModel):
    job_ids: List[str]
    contractor_ids: List[str]


# ── Candidates ────────────────────────────────────────────────────────────────

class CandidateOut(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    current_title: Optional[str] = None
    years_of_experience: Optional[int] = None
    education: Optional[str] = None
    cv_summary: Optional[str] = None
    notable_achievement: Optional[str] = None
    recent_roles: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    companies: Optional[List[str]] = []
    has_management_exp: Optional[bool] = None
    cv_drive_url: Optional[str] = None
    created_at: Optional[str] = None
    contractors: Optional[List[dict]] = []


class CandidateDetail(CandidateOut):
    applications: Optional[List[dict]] = []


# ── Applications ──────────────────────────────────────────────────────────────

class ApplicationOut(BaseModel):
    id: str
    job_id: str
    job_title: Optional[str] = None
    contractor_id: str
    contractor_name: Optional[str] = None
    candidate_id: str
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    current_title: Optional[str] = None
    years_of_experience: Optional[int] = None
    education: Optional[str] = None
    cv_summary: Optional[str] = None
    notable_achievement: Optional[str] = None
    recent_roles: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    companies: Optional[List[str]] = []
    has_management_exp: Optional[bool] = None
    score: Optional[float] = None
    status: ApplicationStatus = ApplicationStatus.pending
    fit_summary: Optional[str] = None
    strengths: Optional[List[str]] = []
    gaps: Optional[List[str]] = []
    recommendation: Optional[str] = None
    notes: Optional[str] = None
    cv_drive_url: Optional[str] = None
    civi_sent_at: Optional[str] = None
    status_history: Optional[List[dict]] = []
    created_at: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: ApplicationStatus
    note: Optional[str] = None


class CheckMatchRequest(BaseModel):
    candidate_id: str
    job_id: str


class SubmitExistingRequest(BaseModel):
    candidate_id: str
    job_id: str


# ── Settings ──────────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    score_threshold: Optional[float] = None
    civi_send_threshold: Optional[float] = None
    google_drive_folder_id: Optional[str] = None

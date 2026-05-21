import { useState, useEffect } from "react";
import api from "../../api";
import {
  Plus, Trash2, User, Loader2, Phone, Mail, Eye, EyeOff,
  RotateCcw, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Briefcase, Users, CheckCircle, XCircle, AlertCircle, Clock, Share2, Check
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface ContractorUser {
  uid: string; name: string; email: string; role: string;
  phone?: string; created_at?: string; active: boolean;
}
interface CandidateInJob {
  application_id: string; candidate_id: string;
  name: string; email?: string; phone?: string;
  score?: number; status?: string; recommendation?: string;
  fit_summary?: string; strengths?: string[]; gaps?: string[];
  created_at?: string;
}
interface JobWithCandidates {
  id: string; title: string; location?: string; hybrid?: string;
  is_active: boolean; created_at?: string; candidates: CandidateInJob[];
}
interface AllJob {
  id: string; title: string; location?: string; hybrid?: string;
  is_active: boolean; assigned_contractors: string[];
}
interface CandidateEntry {
  id: string; name: string; email?: string; phone?: string;
  cv_summary?: string; recent_roles?: string[];
  applications: { id: string; job_id: string; job_title?: string; score?: number; status?: string; recommendation?: string; fit_summary?: string }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: "ממתין",    color: "bg-yellow-100 text-yellow-700", icon: <Clock size={11} /> },
  in_process: { label: "בתהליך",  color: "bg-blue-100 text-blue-700",     icon: <AlertCircle size={11} /> },
  weak:       { label: "לא מתאים",color: "bg-gray-100 text-gray-500",     icon: <XCircle size={11} /> },
  rejected:   { label: "נדחה",    color: "bg-red-100 text-red-600",       icon: <XCircle size={11} /> },
};

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const color = score >= 75 ? "text-green-600 bg-green-50 border-green-200"
              : score >= 50 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
              : "text-red-500 bg-red-50 border-red-200";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>{score}%</span>;
}

function StatusBadge({ status }: { status?: string }) {
  const meta = STATUS_META[status ?? ""] ?? { label: status ?? "", color: "bg-gray-100 text-gray-500", icon: null };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${meta.color}`}>
      {meta.icon}{meta.label}
    </span>
  );
}

// ── Candidate row inside job ──────────────────────────────────────────────────
function CandidateInJobRow({ c }: { c: CandidateInJob }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors text-right">
        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
          <User size={13} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{c.name}</p>
          {c.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} />{c.email}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={c.status} />
          <ScoreBadge score={c.score} />
          {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-3 space-y-2 text-xs text-gray-600">
          {c.phone && <p className="flex items-center gap-1"><Phone size={11} />{c.phone}</p>}
          {c.recommendation && (
            <p className="font-medium text-gray-700">המלצה: <span className="font-normal">{c.recommendation}</span></p>
          )}
          {c.fit_summary && <p className="leading-relaxed text-gray-500">{c.fit_summary}</p>}
          {c.strengths && c.strengths.length > 0 && (
            <div>
              <p className="font-medium text-green-700 mb-1">חוזקות:</p>
              <ul className="space-y-0.5">{c.strengths.map((s, i) => <li key={i} className="flex items-start gap-1"><CheckCircle size={10} className="text-green-500 mt-0.5 shrink-0" />{s}</li>)}</ul>
            </div>
          )}
          {c.gaps && c.gaps.length > 0 && (
            <div>
              <p className="font-medium text-red-600 mb-1">חסרים:</p>
              <ul className="space-y-0.5">{c.gaps.map((g, i) => <li key={i} className="flex items-start gap-1"><XCircle size={10} className="text-red-400 mt-0.5 shrink-0" />{g}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Job row inside contractor ─────────────────────────────────────────────────
function JobRow({
  job, assigned, assignedData, onAssign, onUnassign, toggling,
}: {
  job: AllJob;
  assigned: boolean;
  assignedData?: JobWithCandidates;
  onAssign: (jobId: string) => void;
  onUnassign: (jobId: string) => void;
  toggling: boolean;
}) {
  const [open, setOpen] = useState(false);
  const candidates = assignedData?.candidates ?? [];
  const avgScore = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + (c.score ?? 0), 0) / candidates.length)
    : null;

  return (
    <div className={`border rounded-lg overflow-hidden ${assigned ? "border-blue-200" : "border-gray-200 opacity-70"}`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        <div className={`w-2 h-2 rounded-full shrink-0 ${job.is_active ? "bg-green-400" : "bg-gray-300"}`} />
        <Briefcase size={14} className="text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{job.title}</p>
          {(job.location || job.hybrid) && (
            <p className="text-xs text-gray-400">{[job.location, job.hybrid].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {assigned && (
            <>
              <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={12} />{candidates.length}</span>
              {avgScore != null && <ScoreBadge score={avgScore} />}
              <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-600 p-1">
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </>
          )}
          <button
            onClick={() => assigned ? onUnassign(job.id) : onAssign(job.id)}
            disabled={toggling}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              assigned
                ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {toggling ? "..." : assigned ? "הסר שיוך" : "שייך"}
          </button>
        </div>
      </div>
      {open && assigned && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {candidates.length === 0
            ? <p className="text-xs text-gray-400 py-2 text-center">אין מועמדים עדיין</p>
            : <div className="space-y-2">{candidates.map(c => <CandidateInJobRow key={c.application_id} c={c} />)}</div>
          }
        </div>
      )}
    </div>
  );
}

// ── Candidate row (candidate-centric view) ────────────────────────────────────
function CandidateRow({ candidate }: { candidate: CandidateEntry }) {
  const [open, setOpen] = useState(false);
  const best = candidate.applications.length ? Math.max(...candidate.applications.map(a => a.score ?? 0)) : undefined;
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-right">
        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
          <User size={14} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm">{candidate.name}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
            {candidate.email && <span className="flex items-center gap-1"><Mail size={10} />{candidate.email}</span>}
            {candidate.phone && <span className="flex items-center gap-1"><Phone size={10} />{candidate.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">{candidate.applications.length} משרות</span>
          <ScoreBadge score={best} />
          {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
          {candidate.cv_summary && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{candidate.cv_summary}</p>}
          {candidate.applications.map(app => (
            <div key={app.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5">
              <Briefcase size={13} className="text-gray-400 shrink-0" />
              <p className="flex-1 text-sm text-gray-800 min-w-0 truncate">{app.job_title || "משרה"}</p>
              <StatusBadge status={app.status} />
              <ScoreBadge score={app.score} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Contractor card ───────────────────────────────────────────────────────────
function ContractorCard({
  user, onDelete, onToggleActive, onResetPassword,
}: {
  user: ContractorUser;
  onDelete: (uid: string, name: string) => void;
  onToggleActive: (uid: string) => void;
  onResetPassword: (uid: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"jobs" | "candidates">("jobs");
  const [allJobs, setAllJobs] = useState<AllJob[]>([]);
  const [assignedJobsData, setAssignedJobsData] = useState<JobWithCandidates[]>([]);
  const [candidates, setCandidates] = useState<CandidateEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [togglingJob, setTogglingJob] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allJobsRes, assignedRes, candsRes] = await Promise.all([
        api.get("/jobs"),
        api.get(`/jobs/by-contractor/${user.uid}`),
        api.get(`/candidates/by-contractor/${user.uid}`),
      ]);
      setAllJobs(allJobsRes.data);
      setAssignedJobsData(assignedRes.data);
      setCandidates(candsRes.data);
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load contractor data", err);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (expanded) {
      setExpanded(false);
    } else {
      if (!loaded) setLoading(true);
      setExpanded(true);
      if (!loaded) loadData();
    }
  };

  const handleAssign = async (jobId: string) => {
    setTogglingJob(jobId);
    await api.post("/jobs/assign", { job_ids: [jobId], contractor_ids: [user.uid] });
    await loadData();
    setTogglingJob(null);
  };

  const handleUnassign = async (jobId: string) => {
    setTogglingJob(jobId);
    await api.delete(`/jobs/${jobId}/assign/${user.uid}`);
    await loadData();
    setTogglingJob(null);
  };

  const assignedIds = new Set(assignedJobsData.map(j => j.id));
  const totalCandidates = candidates.length;
  const activeAssigned = assignedJobsData.filter(j => j.is_active).length;

  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${!user.active ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${user.active ? "bg-blue-100" : "bg-gray-100"}`}>
          <User size={18} className={user.active ? "text-blue-600" : "text-gray-400"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900">{user.name}</p>
            {!user.active && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">לא פעיל</span>}
            {loaded && (
              <span className="text-xs text-gray-400">
                {activeAssigned} משרות פעילות · {totalCandidates} מועמדים
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1"><Mail size={11} />{user.email}</span>
            {user.phone && <span className="flex items-center gap-1"><Phone size={11} />{user.phone}</span>}
          </div>
        </div>

        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
          {user.role === "admin" ? "מנהל" : "קבלן"}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onResetPassword(user.uid, user.name)} title="איפוס סיסמה"
            className="text-gray-300 hover:text-blue-500 transition-colors p-1.5 rounded-lg hover:bg-blue-50">
            <RotateCcw size={15} />
          </button>
          <button onClick={() => onToggleActive(user.uid)}
            title={user.active ? "השבת" : "הפעל"}
            className={`transition-colors p-1.5 rounded-lg ${user.active ? "text-green-500 hover:text-orange-500 hover:bg-orange-50" : "text-gray-300 hover:text-green-500 hover:bg-green-50"}`}>
            {user.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <button onClick={() => onDelete(user.uid, user.name)} title="מחק"
            className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>

        {user.role === "contractor" && (
          <button onClick={toggle}
            className="flex items-center gap-1.5 text-xs text-blue-600 font-medium border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors shrink-0">
            {loading ? <Loader2 size={13} className="animate-spin" /> : (expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
            {expanded ? "סגור" : "פרטים"}
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && !loading && (
        <div className="border-t border-gray-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50">
            <button
              onClick={() => setTab("jobs")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${tab === "jobs" ? "border-b-2 border-blue-500 text-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Briefcase size={14} />
              משרות ({allJobs.length})
            </button>
            <button
              onClick={() => setTab("candidates")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${tab === "candidates" ? "border-b-2 border-blue-500 text-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Users size={14} />
              מועמדים ({candidates.length})
            </button>
          </div>

          <div className="p-4">
            {/* Jobs tab */}
            {tab === "jobs" && (
              allJobs.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">אין משרות במערכת</p>
                : <div className="space-y-2">
                    {/* Assigned jobs first */}
                    {allJobs.filter(j => assignedIds.has(j.id) && j.is_active).length > 0 && (
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">משויכות</p>
                    )}
                    {allJobs.filter(j => assignedIds.has(j.id) && j.is_active).map(j => (
                      <JobRow key={j.id} job={j} assigned={true}
                        assignedData={assignedJobsData.find(a => a.id === j.id)}
                        onAssign={handleAssign} onUnassign={handleUnassign}
                        toggling={togglingJob === j.id} />
                    ))}

                    {/* Unassigned jobs */}
                    {allJobs.filter(j => !assignedIds.has(j.id) && j.is_active).length > 0 && (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-1">לא משויכות</p>
                    )}
                    {allJobs.filter(j => !assignedIds.has(j.id) && j.is_active).map(j => (
                      <JobRow key={j.id} job={j} assigned={false}
                        onAssign={handleAssign} onUnassign={handleUnassign}
                        toggling={togglingJob === j.id} />
                    ))}

                    {/* Archived */}
                    {allJobs.filter(j => !j.is_active).length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mt-4 mb-1">ארכיון</p>
                        {allJobs.filter(j => !j.is_active).map(j => (
                          <JobRow key={j.id} job={j} assigned={assignedIds.has(j.id)}
                            assignedData={assignedJobsData.find(a => a.id === j.id)}
                            onAssign={handleAssign} onUnassign={handleUnassign}
                            toggling={togglingJob === j.id} />
                        ))}
                      </>
                    )}
                  </div>
            )}

            {/* Candidates tab */}
            {tab === "candidates" && (
              candidates.length === 0
                ? <p className="text-sm text-gray-400 text-center py-6">לא הוגשו מועמדים עדיין</p>
                : <div className="space-y-2">
                    {candidates.map(c => <CandidateRow key={c.id} candidate={c} />)}
                  </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Contractors() {
  const [users, setUsers] = useState<ContractorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "contractor" });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await api.get("/auth/users");
    setUsers(res.data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError("");
    try {
      await api.post("/auth/users", form);
      setForm({ name: "", email: "", password: "", phone: "", role: "contractor" });
      setShowForm(false); setShowFormPassword(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "שגיאה ביצירת משתמש");
    } finally { setCreating(false); }
  };

  const handleDelete = async (uid: string, name: string) => {
    if (!confirm(`למחוק את ${name}?`)) return;
    await api.delete(`/auth/users/${uid}`);
    fetchUsers();
  };

  const handleToggleActive = async (uid: string) => {
    await api.patch(`/auth/users/${uid}/toggle-active`);
    fetchUsers();
  };

  const handleResetPassword = async (uid: string, name: string) => {
    const pw = prompt(`סיסמה חדשה עבור ${name} (לפחות 6 תווים):`);
    if (!pw) return;
    if (pw.length < 6) { alert("סיסמה חייבת להיות לפחות 6 תווים"); return; }
    try {
      await api.post(`/auth/users/${uid}/reset-password`, { password: pw });
      alert("הסיסמה אופסה בהצלחה");
    } catch (err: any) {
      alert(err.response?.data?.detail || "שגיאה באיפוס סיסמה");
    }
  };

  const handleInvite = async () => {
    try {
      const res = await api.post("/auth/invite");
      const url = res.data.invite_url;
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3000);
      const waText = `שלום! הוזמנת להצטרף למערכת RecruiterHub כקבלן.\nלהרשמה לחץ/י על הקישור:\n${url}\n(הקישור תקף ל-7 ימים)`;
      window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");
    } catch (err: any) {
      alert(err.response?.data?.detail || "שגיאה ביצירת הזמנה");
    }
  };

  const contractors = users.filter(u => u.role === "contractor");
  const admins = users.filter(u => u.role === "admin");

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול משתמשים</h1>
          <p className="text-gray-500 text-sm mt-1">{contractors.length} קבלנים, {admins.length} מנהלים</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleInvite}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${inviteCopied ? "border-green-400 text-green-600 bg-green-50" : "border-green-400 text-green-600 hover:bg-green-50"}`}>
            {inviteCopied ? <><Check size={16} />הועתק!</> : <><Share2 size={16} />הזמן קבלן בוואטסאפ</>}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={18} />הוסף ידנית
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">משתמש חדש</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">שם מלא</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">אימייל</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">סיסמה</label>
              <div className="relative">
                <input type={showFormPassword ? "text" : "password"} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-9"
                  required minLength={6} />
                <button type="button" onClick={() => setShowFormPassword(!showFormPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600">
                  {showFormPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">טלפון (אופציונלי)</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">תפקיד</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="contractor">קבלן</option>
                <option value="admin">מנהל</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => { setShowForm(false); setShowFormPassword(false); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">ביטול</button>
            <button type="submit" disabled={creating}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {creating ? "יוצר..." : "צור משתמש"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">קבלנים</h2>
        <div className="grid gap-3">
          {contractors.map(u => (
            <ContractorCard key={u.uid} user={u}
              onDelete={handleDelete} onToggleActive={handleToggleActive} onResetPassword={handleResetPassword} />
          ))}
          {contractors.length === 0 && <p className="text-gray-400 text-sm">אין קבלנים עדיין</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">מנהלים</h2>
        <div className="grid gap-3">
          {admins.map(u => (
            <ContractorCard key={u.uid} user={u}
              onDelete={handleDelete} onToggleActive={handleToggleActive} onResetPassword={handleResetPassword} />
          ))}
        </div>
      </div>
    </div>
  );
}

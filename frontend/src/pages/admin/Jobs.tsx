import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { Plus, MapPin, Wifi, ExternalLink, Loader2, Users, ChevronLeft } from "lucide-react";

interface Job {
  id: string;
  title: string;
  location?: string;
  hybrid?: string;
  is_active: boolean;
  assigned_contractors: string[];
  created_at?: string;
  url: string;
}

interface Contractor {
  uid: string;
  name: string;
  email: string;
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUrl, setAddingUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Assign modal
  const [assignModal, setAssignModal] = useState<Job | null>(null);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [jobsRes, contractorsRes] = await Promise.all([
      api.get("/jobs"),
      api.get("/auth/users"),
    ]);
    setJobs(jobsRes.data);
    setContractors(contractorsRes.data.filter((u: any) => u.role === "contractor"));
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    try {
      const res = await api.post("/jobs", { url: addingUrl });
      setJobs((prev) => [res.data, ...prev]);
      setAddingUrl("");
      setShowAddForm(false);
    } catch (err: any) {
      setAddError(err.response?.data?.detail || "שגיאה בהוספת משרה");
    } finally {
      setAdding(false);
    }
  };

  const openAssign = (job: Job) => {
    setAssignModal(job);
    setSelectedContractors(job.assigned_contractors || []);
  };

  const handleAssign = async () => {
    if (!assignModal) return;
    await api.post("/jobs/assign", {
      job_ids: [assignModal.id],
      contractor_ids: selectedContractors,
    });
    setAssignModal(null);
    fetchAll();
  };

  const toggleContractor = (uid: string) => {
    setSelectedContractors((prev) =>
      prev.includes(uid) ? prev.filter((c) => c !== uid) : [...prev, uid]
    );
  };

  const getContractorName = (uid: string) =>
    contractors.find((c) => c.uid === uid)?.name || uid;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">משרות</h1>
          <p className="text-gray-500 text-sm mt-1">{jobs.length} משרות במערכת</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          הוסף משרה
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">הוסף משרה חדשה</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={addingUrl}
              onChange={(e) => setAddingUrl(e.target.value)}
              placeholder="https://www.jobs.co.il/job/..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {adding ? <><Loader2 size={16} className="animate-spin" />מנתח...</> : "הוסף"}
            </button>
          </div>
          {addError && <p className="text-red-600 text-sm mt-2">{addError}</p>}
          <p className="text-gray-400 text-xs mt-2">* המערכת תחלץ אוטומטית את פרטי המשרה באמצעות AI</p>
        </form>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                  {!job.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">לא פעילה</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {job.location}
                    </span>
                  )}
                  {job.hybrid && (
                    <span className="flex items-center gap-1">
                      <Wifi size={13} />
                      {job.hybrid}
                    </span>
                  )}
                  {job.assigned_contractors?.length > 0 && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Users size={13} />
                      {job.assigned_contractors.map(getContractorName).join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="פתח מקור"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => openAssign(job)}
                  className="text-xs border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  שייך קבלן
                </button>
                <Link
                  to={`/admin/jobs/${job.id}`}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  פרטים
                  <ChevronLeft size={14} />
                </Link>
              </div>
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Briefcase className="mx-auto mb-3 opacity-40" size={40} />
            <p>אין משרות עדיין. הוסף משרה ראשונה!</p>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">שיוך קבלנים למשרה</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{assignModal.title}</p>
            </div>
            <div className="p-5 space-y-2 max-h-64 overflow-y-auto">
              {contractors.map((c) => (
                <label key={c.uid} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedContractors.includes(c.uid)}
                    onChange={() => toggleContractor(c.uid)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </div>
                </label>
              ))}
              {contractors.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">אין קבלנים במערכת</p>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                ביטול
              </button>
              <button onClick={handleAssign} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                שמור שיוך
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Briefcase({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

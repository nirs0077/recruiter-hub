import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import { ArrowRight, MapPin, Wifi, Star, ChevronDown, ChevronUp, User, Loader2 } from "lucide-react";

interface Application {
  id: string;
  candidate_id: string;
  candidate_name: string;
  contractor_name: string;
  score: number;
  status: string;
  fit_summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  created_at: string;
  cv_url?: string;
}

interface Job {
  id: string;
  title: string;
  location?: string;
  hybrid?: string;
  description?: string;
  requirements?: string;
  url: string;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-yellow-100 text-yellow-700" },
  in_process: { label: "בתהליך גיוס", color: "bg-green-100 text-green-700" },
  weak: { label: "מועמד חלש", color: "bg-gray-100 text-gray-500" },
  rejected: { label: "נדחה", color: "bg-red-100 text-red-600" },
};

export default function AdminJobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "strong" | "weak">("strong");

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const fetchData = async () => {
    setLoading(true);
    const [jobRes, appsRes] = await Promise.all([
      api.get(`/jobs/${jobId}`),
      api.get(`/applications/job/${jobId}`),
    ]);
    setJob(jobRes.data);
    setApplications(appsRes.data.sort((a: Application, b: Application) => b.score - a.score));
    setLoading(false);
  };

  const updateStatus = async (appId: string, status: string) => {
    await api.patch(`/applications/${appId}/status?status=${status}`);
    fetchData();
  };

  const filtered = applications.filter((a) => {
    if (filter === "strong") return a.status !== "weak";
    if (filter === "weak") return a.status === "weak";
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  if (!job) return <p className="text-gray-500">משרה לא נמצאה</p>;

  const strongCount = applications.filter((a) => a.status !== "weak").length;
  const weakCount = applications.filter((a) => a.status === "weak").length;

  return (
    <div>
      <Link to="/admin/jobs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowRight size={16} />
        חזרה למשרות
      </Link>

      {/* Job Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          {job.location && <span className="flex items-center gap-1"><MapPin size={14} />{job.location}</span>}
          {job.hybrid && <span className="flex items-center gap-1"><Wifi size={14} />{job.hybrid}</span>}
        </div>
        {job.description && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 mb-1">אודות התפקיד</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
        {job.requirements && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">דרישות</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.requirements}</p>
          </div>
        )}
      </div>

      {/* Applications */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">מועמדים</h2>
        <div className="flex flex-wrap gap-2">
          {(["strong", "weak", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "strong" ? `פוטנציאלים (${strongCount})` : f === "weak" ? `חלשים (${weakCount})` : `הכל (${applications.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div
              className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 flex-wrap"
              onClick={() => setExpanded(expanded === app.id ? null : app.id)}
            >
              {/* Score Circle */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                app.score >= 80 ? "bg-green-100 text-green-700" :
                app.score >= 60 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-600"
              }`}>
                {Math.round(app.score)}%
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    to={`/admin/candidates/${app.candidate_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {app.candidate_name}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel[app.status]?.color || ""}`}>
                    {statusLabel[app.status]?.label || app.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  קבלן: {app.contractor_name} · {new Date(app.created_at).toLocaleDateString("he-IL")}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={app.status}
                  onChange={(e) => { e.stopPropagation(); updateStatus(app.id, e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                >
                  <option value="pending">ממתין</option>
                  <option value="in_process">בתהליך גיוס</option>
                  <option value="weak">מועמד חלש</option>
                  <option value="rejected">נדחה</option>
                </select>
                {expanded === app.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {/* Expanded */}
            {expanded === app.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">סיכום התאמה</p>
                  <p className="text-sm text-gray-600">{app.fit_summary}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-green-700 mb-1">חוזקות</p>
                    <ul className="space-y-1">
                      {app.strengths?.map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                          <Star size={12} className="text-green-500 mt-0.5 shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-600 mb-1">פערים</p>
                    <ul className="space-y-1">
                      {app.gaps?.map((g, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 shrink-0">✗</span>{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                    app.recommendation?.includes("כדאי") && !app.recommendation?.includes("לא")
                      ? "bg-green-100 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}>
                    {app.recommendation}
                  </span>
                  {app.cv_url && (
                    <a href={app.cv_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <User size={14} />הורד קו"ח
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>אין מועמדים בקטגוריה זו</p>
          </div>
        )}
      </div>
    </div>
  );
}

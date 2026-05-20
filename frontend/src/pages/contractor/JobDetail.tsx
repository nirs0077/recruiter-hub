import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import { ArrowRight, Star, ChevronDown, ChevronUp, Loader2, User } from "lucide-react";

interface Application {
  id: string;
  candidate_id: string;
  candidate_name: string;
  score: number;
  status: string;
  fit_summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  notes?: string;
  created_at: string;
  cv_url?: string;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-yellow-100 text-yellow-700" },
  in_process: { label: "בתהליך גיוס", color: "bg-green-100 text-green-700" },
  weak: { label: "מועמד חלש", color: "bg-gray-100 text-gray-500" },
  rejected: { label: "נדחה", color: "bg-red-100 text-red-600" },
};

export default function ContractorJobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/jobs/${jobId}`),
      api.get(`/applications/job/${jobId}`),
    ]).then(([jobRes, appsRes]) => {
      setJob(jobRes.data);
      setApplications(appsRes.data.sort((a: Application, b: Application) => b.score - a.score));
    }).finally(() => setLoading(false));
  }, [jobId]);

  const updateStatus = async (appId: string, status: string) => {
    await api.patch(`/applications/${appId}/status?status=${status}`);
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div>
      <Link to="/contractor" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowRight size={16} />
        חזרה למשרות שלי
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{job?.title}</h1>
      <p className="text-gray-500 text-sm mb-6">{job?.location} · {job?.hybrid}</p>

      <h2 className="text-lg font-bold text-gray-900 mb-4">
        המועמדים שלי ({applications.length})
      </h2>

      <div className="space-y-3">
        {applications.map((app) => (
          <div key={app.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === app.id ? null : app.id)}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                app.score >= 80 ? "bg-green-100 text-green-700" :
                app.score >= 60 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-600"
              }`}>
                {Math.round(app.score)}%
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{app.candidate_name}</p>
                <p className="text-xs text-gray-400">{new Date(app.created_at).toLocaleDateString("he-IL")}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel[app.status]?.color || ""}`}>
                  {statusLabel[app.status]?.label || app.status}
                </span>
                <select
                  value={app.status}
                  onChange={(e) => { e.stopPropagation(); updateStatus(app.id, e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                >
                  <option value="pending">ממתין</option>
                  <option value="in_process">בתהליך גיוס</option>
                  <option value="rejected">נדחה</option>
                </select>
                {expanded === app.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {expanded === app.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">סיכום התאמה</p>
                  <p className="text-sm text-gray-600">{app.fit_summary}</p>
                </div>
                {app.notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">הערות</p>
                    <p className="text-sm text-gray-600">{app.notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
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

        {applications.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>אין מועמדים עדיין. שתף את הלינק כדי לקבל פניות.</p>
          </div>
        )}
      </div>
    </div>
  );
}

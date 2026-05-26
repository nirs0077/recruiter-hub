import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { Star, ChevronDown, ChevronUp, Loader2, Users, ArrowRight } from "lucide-react";

interface Application {
  id: string;
  candidate_name: string;
  job_title?: string;
  job_id: string;
  score: number;
  status: string;
  fit_summary?: string;
  strengths: string[];
  gaps: string[];
  recommendation?: string;
  notes?: string;
  created_at: string;
  cv_url?: string;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending:    { label: "ממתין",         color: "bg-yellow-100 text-yellow-700" },
  in_process: { label: "בתהליך גיוס",  color: "bg-green-100 text-green-700" },
  weak:       { label: "מועמד חלש",    color: "bg-gray-100 text-gray-500" },
  rejected:   { label: "נדחה",         color: "bg-red-100 text-red-600" },
};

export default function AllCandidates() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterJob, setFilterJob] = useState("");

  useEffect(() => {
    api.get("/applications/mine")
      .then((r) => setApps(r.data))
      .finally(() => setLoading(false));
  }, []);

  const jobs = Array.from(new Set(apps.map((a) => a.job_title).filter(Boolean)));

  const filtered = filterJob ? apps.filter((a) => a.job_title === filterJob) : apps;

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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">כל המועמדים שלי</h1>
          <p className="text-gray-500 text-sm mt-1">{apps.length} מועמדים בסה"כ</p>
        </div>

        {jobs.length > 1 && (
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">כל המשרות</option>
            {jobs.map((j) => <option key={j} value={j!}>{j}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="mx-auto mb-3 opacity-40" size={40} />
          <p>אין מועמדים עדיין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div key={app.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}
              >
                {/* Score */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  app.score >= 80 ? "bg-green-100 text-green-700" :
                  app.score >= 60 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-600"
                }`}>
                  {Math.round(app.score)}%
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{app.candidate_name}</p>
                  <p className="text-xs text-gray-400">
                    {app.job_title && <span className="text-blue-500 ml-2">{app.job_title}</span>}
                    {new Date(app.created_at).toLocaleDateString("he-IL")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel[app.status]?.color || ""}`}>
                    {statusLabel[app.status]?.label || app.status}
                  </span>
                  {expanded === app.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {expanded === app.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                  {app.fit_summary && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">סיכום התאמה</p>
                      <p className="text-sm text-gray-600">{app.fit_summary}</p>
                    </div>
                  )}
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
                  {app.recommendation && (
                    <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${
                      app.recommendation.includes("כדאי") && !app.recommendation.includes("לא")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-50 text-red-600"
                    }`}>
                      {app.recommendation}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

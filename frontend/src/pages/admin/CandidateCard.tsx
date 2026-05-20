import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import { ArrowRight, User, Briefcase, Star, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface CandidateDetail {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cv_summary?: string;
  recent_roles?: string[];
  has_management_exp?: boolean;
  applications: Array<{
    id: string;
    job_id: string;
    job_title?: string;
    score: number;
    status: string;
    fit_summary?: string;
    strengths?: string[];
    gaps?: string[];
    recommendation?: string;
    contractor_name?: string;
    created_at?: string;
    cv_url?: string;
  }>;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-yellow-100 text-yellow-700" },
  in_process: { label: "בתהליך גיוס", color: "bg-green-100 text-green-700" },
  weak: { label: "מועמד חלש", color: "bg-gray-100 text-gray-500" },
  rejected: { label: "נדחה", color: "bg-red-100 text-red-600" },
};

export default function CandidateCardPage() {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/candidates/${candidateId}`)
      .then((r) => setCandidate(r.data))
      .finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  if (!candidate) return <p>מועמד לא נמצא</p>;

  const bestScore = Math.max(...(candidate.applications?.map((a) => a.score) || [0]));

  return (
    <div>
      <Link to="/admin/candidates" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowRight size={16} />
        חזרה למועמדים
      </Link>

      {/* Candidate Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <User size={28} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
              {candidate.has_management_exp && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">ניסיון ניהולי</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              {candidate.email && <span>{candidate.email}</span>}
              {candidate.phone && <span>{candidate.phone}</span>}
            </div>
            {candidate.cv_summary && (
              <p className="text-sm text-gray-600 leading-relaxed">{candidate.cv_summary}</p>
            )}
          </div>
          <div className="text-center shrink-0">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg ${
              bestScore >= 80 ? "bg-green-100 text-green-700" :
              bestScore >= 60 ? "bg-yellow-100 text-yellow-700" :
              "bg-red-100 text-red-600"
            }`}>
              {Math.round(bestScore)}%
            </div>
            <p className="text-xs text-gray-400 mt-1">ציון מקסימלי</p>
          </div>
        </div>

        {/* Recent Roles */}
        {candidate.recent_roles && candidate.recent_roles.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">תפקידים אחרונים</p>
            <div className="flex flex-wrap gap-2">
              {candidate.recent_roles.map((role, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full flex items-center gap-1">
                  <Briefcase size={11} />{role}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Applications */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        הגשות ({candidate.applications?.length || 0})
      </h2>

      <div className="space-y-3">
        {candidate.applications?.sort((a, b) => b.score - a.score).map((app) => (
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

              <div className="flex-1">
                <Link
                  to={`/admin/jobs/${app.job_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-gray-900 hover:text-blue-600 text-sm"
                >
                  {app.job_title || "משרה"}
                </Link>
                <p className="text-xs text-gray-400">
                  קבלן: {app.contractor_name} · {app.created_at ? new Date(app.created_at).toLocaleDateString("he-IL") : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel[app.status]?.color || ""}`}>
                  {statusLabel[app.status]?.label || app.status}
                </span>
                {app.recommendation?.includes("כדאי") && !app.recommendation?.includes("לא")
                  ? <CheckCircle size={16} className="text-green-500" />
                  : <XCircle size={16} className="text-red-400" />
                }
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
                <div className="grid grid-cols-2 gap-4">
                  {app.strengths && app.strengths.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-green-700 mb-1">חוזקות</p>
                      <ul className="space-y-1">
                        {app.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                            <Star size={12} className="text-green-500 mt-0.5 shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {app.gaps && app.gaps.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-600 mb-1">פערים</p>
                      <ul className="space-y-1">
                        {app.gaps.map((g, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5 shrink-0">✗</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {app.cv_url && (
                  <a href={app.cv_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                    הורד קורות חיים
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

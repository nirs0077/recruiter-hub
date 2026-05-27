import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight, Briefcase, Star, CheckCircle, XCircle, Loader2,
  Phone, Mail, MessageCircle, FileText, Clock, AlertCircle, Send, ChevronDown, ChevronUp
} from "lucide-react";
import api from "../../api";
import { STATUS_META } from "../../components/ApplicationCard";

const REQUIRES_NOTE = new Set(["known_candidate"]);

interface Application {
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
  cv_drive_url?: string;
  civi_sent_at?: string;
  status_history?: Array<{
    status: string; status_label: string; note: string;
    changed_by: string; changed_by_name: string; timestamp: string;
  }>;
}

interface CandidateDetail {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cv_summary?: string;
  recent_roles?: string[];
  has_management_exp?: boolean;
  cv_drive_url?: string;
  applications: Application[];
}

function toWhatsApp(phone: string, name: string) {
  const d = phone.replace(/\D/g, "");
  const intl = d.startsWith("972") ? d : "972" + (d.startsWith("0") ? d.slice(1) : d);
  const msg = encodeURIComponent(`שלום ${name}, מצאנו לך הזדמנות מעניינת. נשמח לדבר איתך!`);
  return `https://wa.me/${intl}?text=${msg}`;
}

export default function CandidateCardPage() {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [sendingCivi, setSendingCivi] = useState<string | null>(null);
  const [civiError, setCiviError] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get(`/candidates/${candidateId}`)
      .then(r => setCandidate(r.data))
      .finally(() => setLoading(false));
  }, [candidateId]);

  const reload = () => api.get(`/candidates/${candidateId}`).then(r => setCandidate(r.data));

  const handleStatusConfirm = async (appId: string) => {
    const status = pendingStatus[appId];
    const note = noteText[appId] || "";
    if (REQUIRES_NOTE.has(status) && !note.trim()) return;
    setSavingStatus(appId);
    try {
      await api.patch(`/applications/${appId}/status`, { status, note: note.trim() });
      await reload();
      setPendingStatus(p => { const n = { ...p }; delete n[appId]; return n; });
      setNoteText(p => { const n = { ...p }; delete n[appId]; return n; });
    } finally {
      setSavingStatus(null);
    }
  };

  const handleSendCivi = async (appId: string) => {
    setSendingCivi(appId);
    setCiviError(p => ({ ...p, [appId]: "" }));
    try {
      await api.post(`/applications/${appId}/send-to-civi`);
      await reload();
    } catch (e: any) {
      setCiviError(p => ({ ...p, [appId]: e.response?.data?.detail || "שגיאה בשליחה" }));
    } finally {
      setSendingCivi(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );
  if (!candidate) return <p>מועמד לא נמצא</p>;

  const bestScore = Math.max(...(candidate.applications?.map(a => a.score) || [0]));

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/admin/candidates" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowRight size={16} />חזרה למועמדים
      </Link>

      {/* ── Profile header ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-700 font-bold text-2xl">
            {(candidate.name || "?")[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
              {candidate.has_management_exp && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">ניסיון ניהולי</span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              {candidate.email && (
                <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
                  <Mail size={14} />{candidate.email}
                </a>
              )}
              {candidate.phone && (
                <a href={`tel:${candidate.phone}`} className="flex items-center gap-1.5 hover:text-blue-600">
                  <Phone size={14} />{candidate.phone}
                </a>
              )}
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
            }`}>{Math.round(bestScore)}%</div>
            <p className="text-xs text-gray-400 mt-1">ציון מקס׳</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          {candidate.phone && (
            <a href={toWhatsApp(candidate.phone, candidate.name)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg">
              <MessageCircle size={14} />שלח WhatsApp
            </a>
          )}
          {candidate.cv_drive_url && (
            <a href={candidate.cv_drive_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium px-3 py-2 rounded-lg">
              <FileText size={14} />קורות חיים (Drive)
            </a>
          )}
        </div>

        {candidate.recent_roles && candidate.recent_roles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
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

      {/* ── Applications ── */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">הגשות ({candidate.applications?.length || 0})</h2>

      <div className="space-y-3">
        {candidate.applications?.sort((a, b) => b.score - a.score).map(app => {
          const meta = STATUS_META[app.status] ?? { label: app.status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
          const isExpanded = expanded === app.id;
          const pStatus = pendingStatus[app.id];
          const pNote = noteText[app.id] || "";
          const systemNote = (app.status_history || []).filter(h => h.changed_by === "system").slice(-1)[0];

          return (
            <div key={app.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isExpanded ? null : app.id)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  app.score >= 80 ? "bg-green-100 text-green-700" :
                  app.score >= 60 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-600"
                }`}>{Math.round(app.score)}%</div>

                <div className="flex-1">
                  <Link to={`/admin/jobs/${app.job_id}`} onClick={e => e.stopPropagation()}
                    className="font-semibold text-gray-900 hover:text-blue-600 text-sm">
                    {app.job_title || "משרה"}
                  </Link>
                  <p className="text-xs text-gray-400">
                    קבלן: {app.contractor_name} · {app.created_at ? new Date(app.created_at).toLocaleDateString("he-IL") : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {app.civi_sent_at && <Send size={12} className="text-blue-500" />}
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                  {app.recommendation?.includes("כדאי") && !app.recommendation?.includes("לא")
                    ? <CheckCircle size={15} className="text-green-500" />
                    : <XCircle size={15} className="text-red-400" />
                  }
                  {isExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </div>

              {systemNote && app.status === "in_process" && !app.civi_sent_at && (
                <div className="mx-4 mb-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>{systemNote.note}</span>
                </div>
              )}

              {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {app.cv_drive_url && (
                      <a href={app.cv_drive_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-3 py-1.5 rounded-lg">
                        <FileText size={12} />קורות חיים (Drive)
                      </a>
                    )}
                    {app.civi_sent_at && (
                      <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-1.5 rounded-lg">
                        <Send size={12} />נשלח לCICI · {new Date(app.civi_sent_at).toLocaleDateString("he-IL")}
                      </span>
                    )}
                  </div>

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
                              <Star size={11} className="text-green-500 mt-0.5 shrink-0" />{s}
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
                              <span className="text-red-400 mt-0.5 shrink-0">–</span>{g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {app.recommendation && (
                    <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${
                      app.recommendation.includes("כדאי") && !app.recommendation.includes("לא")
                        ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
                    }`}>{app.recommendation}</span>
                  )}

                  {/* Status history */}
                  {(app.status_history || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">היסטוריית סטטוס</p>
                      <div className="space-y-1.5">
                        {[...(app.status_history || [])].reverse().map((h, i) => (
                          <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${
                            h.changed_by === "system" ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${STATUS_META[h.status]?.color || "text-gray-600"}`}>
                                {h.status_label || h.status}
                              </span>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500">{h.changed_by_name}</span>
                              <span className="text-gray-400 mr-auto flex items-center gap-1">
                                <Clock size={10} />{new Date(h.timestamp).toLocaleDateString("he-IL")}
                              </span>
                            </div>
                            {h.note && <p className="text-gray-600 mt-0.5">{h.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status change */}
                  {app.status !== "sent_to_civi" && (
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={pStatus || app.status}
                          onChange={e => setPendingStatus(p => ({ ...p, [app.id]: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white flex-1"
                        >
                          <option value="pending">ממתין</option>
                          <option value="in_process">בתהליך גיוס</option>
                          <option value="rejected">נדחה</option>
                          <option value="known_candidate">מועמד מוכר לנו כבר</option>
                        </select>
                        {pStatus && pStatus !== app.status && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); handleStatusConfirm(app.id); }}
                              disabled={savingStatus === app.id || (REQUIRES_NOTE.has(pStatus) && !pNote.trim())}
                              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >{savingStatus === app.id ? "..." : "אשר"}</button>
                            <button
                              onClick={e => { e.stopPropagation(); setPendingStatus(p => { const n = {...p}; delete n[app.id]; return n; }); }}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >ביטול</button>
                          </>
                        )}
                      </div>
                      {pStatus && pStatus !== app.status && (
                        <textarea
                          value={pNote}
                          onChange={e => setNoteText(p => ({ ...p, [app.id]: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          rows={2}
                          placeholder={REQUIRES_NOTE.has(pStatus) ? "הערה נדרשת *" : "הוסף הערה (אופציונלי)"}
                          className={`w-full text-xs border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                            REQUIRES_NOTE.has(pStatus) && !pNote.trim() ? "border-red-300" : "border-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  )}

                  {/* CIVI send */}
                  {app.status === "in_process" && !app.civi_sent_at && (
                    <div>
                      <button
                        onClick={e => { e.stopPropagation(); handleSendCivi(app.id); }}
                        disabled={sendingCivi === app.id}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-1.5 rounded-lg disabled:opacity-60"
                      >
                        <Send size={12} />{sendingCivi === app.id ? "שולח..." : "שלח לCICI"}
                      </button>
                      {civiError[app.id] && <p className="text-xs text-red-500 mt-1">{civiError[app.id]}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

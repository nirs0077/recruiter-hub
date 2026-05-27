import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Loader2, Users, GitCompare, ChevronDown, ChevronUp,
  Phone, Mail, Briefcase, Star, FileText, MessageCircle, Eye, Send, CalendarDays, Trash2,
  Clock, User
} from "lucide-react";
import api from "../../api";
import type { Application } from "../../components/ApplicationCard";
import { STATUS_META } from "../../components/ApplicationCard";

interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cv_summary?: string;
  recent_roles?: string[];
  has_management_exp?: boolean;
  cv_drive_url?: string;
  applications: Application[];
  bestScore: number;
  firstSeen?: string;
}

function toWhatsApp(phone: string, name: string) {
  const d = phone.replace(/\D/g, "");
  const intl = d.startsWith("972") ? d : "972" + (d.startsWith("0") ? d.slice(1) : d);
  const msg = encodeURIComponent(`שלום ${name}, מצאנו לך הזדמנות מעניינת. נשמח לדבר איתך!`);
  return `https://wa.me/${intl}?text=${msg}`;
}

export default function AllCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(candId: string) {
    setDeleting(true);
    try {
      await api.delete(`/candidates/${candId}`);
      setCandidates(prev => prev.filter(c => c.id !== candId));
      setDeleteConfirm(null);
      setExpanded(null);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    api.get("/applications/mine").then(r => {
      // Group applications by candidate_id
      const map = new Map<string, Candidate>();
      for (const app of r.data as Application[]) {
        const cid = app.candidate_id;
        if (!map.has(cid)) {
          map.set(cid, {
            id: cid,
            name: app.candidate_name || "לא זוהה",
            email: app.candidate_email,
            phone: app.candidate_phone,
            cv_summary: app.cv_summary,
            recent_roles: app.recent_roles,
            has_management_exp: app.has_management_exp,
            cv_drive_url: app.cv_drive_url,
            applications: [],
            bestScore: 0,
          });
        }
        const cand = map.get(cid)!;
        cand.applications.push(app);
        cand.bestScore = Math.max(cand.bestScore, app.score ?? 0);
        if (app.created_at) {
          if (!cand.firstSeen || app.created_at < cand.firstSeen) cand.firstSeen = app.created_at;
        }
      }
      const list = Array.from(map.values()).sort((a, b) => b.bestScore - a.bestScore);
      setCandidates(list);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div>
      <Link to="/contractor" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowRight size={16} />חזרה למשרות שלי
      </Link>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">המועמדים שלי</h1>
          <p className="text-gray-500 text-sm mt-1">{candidates.length} מועמדים</p>
        </div>
        <Link
          to="/contractor/cross-match"
          className="flex items-center gap-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg font-medium transition-colors"
        >
          <GitCompare size={15} />בדיקת התאמה למשרה
        </Link>
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="mx-auto mb-3 opacity-40" size={40} />
          <p>אין מועמדים עדיין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map(cand => {
            const isOpen = expanded === cand.id;
            return (
              <div key={cand.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Candidate header row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : cand.id)}
                >
                  {/* Score */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    cand.bestScore >= 80 ? "bg-green-100 text-green-700" :
                    cand.bestScore >= 60 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-600"
                  }`}>{Math.round(cand.bestScore)}%</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{cand.name}</span>
                      {cand.has_management_exp && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">ניסיון ניהולי</span>
                      )}
                      <span className="text-xs text-gray-400">{cand.applications.length} הגשות</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                      {cand.phone && <span className="flex items-center gap-1"><Phone size={10} />{cand.phone}</span>}
                      {cand.email && <span className="flex items-center gap-1 truncate"><Mail size={10} />{cand.email}</span>}
                      {cand.firstSeen && <span className="flex items-center gap-1"><CalendarDays size={10} />{new Date(cand.firstSeen).toLocaleDateString("he-IL")}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded candidate details */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                    {/* Contact + actions */}
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {cand.phone && (
                          <a href={toWhatsApp(cand.phone, cand.name)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                            <MessageCircle size={12} />שלח WhatsApp
                          </a>
                        )}
                        {cand.email && (
                          <a
                            href={`mailto:${cand.email}?subject=${encodeURIComponent("התעניינות בקורות חיים")}&body=${encodeURIComponent(`שלום ${cand.name},\n\nתודה על שליחת קורות החיים שלך. נחזור אליך בהקדם.\n\nבברכה`)}`}
                            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                            <Send size={12} />שלח מייל
                          </a>
                        )}
                        {cand.cv_drive_url && (
                          <a href={cand.cv_drive_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-3 py-1.5 rounded-lg">
                            <FileText size={12} />קורות חיים (Drive)
                          </a>
                        )}
                      </div>
                      {deleteConfirm === cand.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">למחוק את {cand.name}?</span>
                          <button onClick={() => handleDelete(cand.id)} disabled={deleting}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
                            {deleting ? "מוחק..." : "כן, מחק"}
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg">
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(cand.id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition-colors">
                          <Trash2 size={12} />מחק מועמד
                        </button>
                      )}
                    </div>

                    {/* Profile summary */}
                    {cand.cv_summary && (
                      <p className="text-sm text-gray-700 leading-relaxed">{cand.cv_summary}</p>
                    )}
                    {cand.recent_roles && cand.recent_roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cand.recent_roles.map((r, i) => (
                          <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Briefcase size={10} className="text-gray-400" />{r}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Applications list */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">הגשות</p>
                      <div className="space-y-2">
                        {cand.applications
                          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                          .map(app => {
                            const meta = STATUS_META[app.status] ?? { label: app.status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
                            const appOpen = expandedApp === app.id;
                            return (
                              <div key={app.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                {/* Application summary row */}
                                <div
                                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                                  onClick={e => { e.stopPropagation(); setExpandedApp(appOpen ? null : app.id); }}
                                >
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    (app.score ?? 0) >= 80 ? "bg-green-100 text-green-700" :
                                    (app.score ?? 0) >= 60 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-600"
                                  }`}>{Math.round(app.score ?? 0)}%</div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{app.job_title || "משרה"}</p>
                                    <p className="text-xs text-gray-400">
                                      {app.created_at ? new Date(app.created_at).toLocaleDateString("he-IL") : ""}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                                      {meta.label}
                                    </span>
                                    <Link
                                      to={`/contractor/applications/${app.id}`}
                                      onClick={e => e.stopPropagation()}
                                      className="text-gray-400 hover:text-blue-600"
                                      title="כרטיס מלא"
                                    >
                                      <Eye size={14} />
                                    </Link>
                                    {appOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                  </div>
                                </div>

                                {/* Application analysis */}
                                {appOpen && (
                                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                                    {app.fit_summary && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-1">סיכום התאמה</p>
                                        <p className="text-sm text-gray-700">{app.fit_summary}</p>
                                      </div>
                                    )}
                                    {(app.strengths?.length || app.gaps?.length) ? (
                                      <div className="grid grid-cols-2 gap-3">
                                        {app.strengths && app.strengths.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold text-green-700 mb-1">✓ חוזקות</p>
                                            <ul className="space-y-1">
                                              {app.strengths.map((s, i) => (
                                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                                  <Star size={9} className="text-green-500 mt-0.5 shrink-0" />{s}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {app.gaps && app.gaps.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold text-red-600 mb-1">✗ פערים</p>
                                            <ul className="space-y-1">
                                              {app.gaps.map((g, i) => (
                                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                                  <span className="text-red-400 shrink-0">–</span>{g}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ) : null}
                                    {app.recommendation && (
                                      <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                                        app.recommendation.includes("כדאי") && !app.recommendation.includes("לא")
                                          ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
                                      }`}>{app.recommendation}</span>
                                    )}

                                    {/* Status history */}
                                    {(app.status_history || []).filter((h: any) => h.changed_by !== "system").length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">היסטוריית סטטוס</p>
                                        <div className="space-y-1.5">
                                          {[...(app.status_history || [])].reverse().filter((h: any) => h.changed_by !== "system").map((h: any, i: number) => (
                                            <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
                                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                <User size={11} className="text-gray-400 shrink-0" />
                                                <span className={`font-medium ${STATUS_META[h.status]?.color || "text-gray-600"}`}>
                                                  {h.status_label || h.status}
                                                </span>
                                                <span className="text-gray-400">·</span>
                                                <span className="text-gray-500">{h.changed_by_name}</span>
                                                {h.target_date && (
                                                  <span className="flex items-center gap-1 text-blue-600">
                                                    <CalendarDays size={10} />יעד: {new Date(h.target_date).toLocaleDateString("he-IL")}
                                                  </span>
                                                )}
                                                <span className="text-gray-400 mr-auto flex items-center gap-0.5">
                                                  <Clock size={10} />{new Date(h.timestamp).toLocaleDateString("he-IL")}
                                                </span>
                                              </div>
                                              {h.note && <p className="text-gray-600 mr-4">{h.note}</p>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <Link
                                      to={`/contractor/applications/${app.id}`}
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                      <Eye size={12} />כרטיס מלא עם כל הפרטים ושינוי סטטוס
                                    </Link>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

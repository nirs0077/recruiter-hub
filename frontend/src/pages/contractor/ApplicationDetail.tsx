import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight, User, Phone, Mail, Briefcase, Star,
  FileText, MessageCircle, Send, CheckCircle2, AlertCircle,
  Clock, Loader2, CalendarDays
} from "lucide-react";
import api from "../../api";
import type { Application } from "../../components/ApplicationCard";
import { STATUS_META } from "../../components/ApplicationCard";
import CiviModal from "../../components/CiviModal";

function toWhatsApp(phone: string, name: string, jobTitle: string) {
  const d = phone.replace(/\D/g, "");
  const intl = d.startsWith("972") ? d : "972" + (d.startsWith("0") ? d.slice(1) : d);
  const msg = encodeURIComponent(`שלום ${name}, קיבלנו את קורות החיים שלך למשרת ${jobTitle}. נחזור אליך בקרוב!`);
  return `https://wa.me/${intl}?text=${msg}`;
}

function toMailto(email: string, name: string, jobTitle: string) {
  const subject = encodeURIComponent(`קורות חיים למשרת ${jobTitle}`);
  const body = encodeURIComponent(`שלום ${name},\n\nתודה על שליחת קורות החיים שלך למשרת ${jobTitle}.\nנעיין בקורות החיים שלך ונחזור אליך בהקדם.\n\nבברכה`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export default function ApplicationDetail() {
  const { appId } = useParams();
  const [app, setApp] = useState<Application | null>(null);
  const [civiThreshold, setCiviThreshold] = useState(80);
  const [loading, setLoading] = useState(true);
  const [showCiviModal, setShowCiviModal] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/applications/${appId}`),
      api.get("/settings").catch(() => ({ data: {} })),
    ]).then(([appRes, settingsRes]) => {
      setApp(appRes.data);
      setCiviThreshold(settingsRes.data.civi_send_threshold ?? 80);
    }).finally(() => setLoading(false));
  }, [appId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );
  if (!app) return <p className="text-gray-500">הגשה לא נמצאה</p>;

  const score = app.score ?? 0;
  const meta = STATUS_META[app.status] ?? { label: app.status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
  const canSendCivi = app.status === "civi_requested" && score >= civiThreshold && !app.civi_sent_at;
  const systemNotes = (app.status_history || []).filter(h => h.changed_by === "system");
  const latestSystemNote = systemNotes[systemNotes.length - 1];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link to="/contractor/candidates" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
        <ArrowRight size={16} />חזרה למועמדים
      </Link>

      {/* ── Profile card ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-2xl">
            {(app.candidate_name || "?")[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{app.candidate_name}</h1>
              {app.has_management_exp && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">ניסיון ניהולי</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.bg} ${meta.color}`}>
                {meta.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              {app.candidate_email && (
                <a href={`mailto:${app.candidate_email}`} className="flex items-center gap-1.5 hover:text-blue-600">
                  <Mail size={14} />{app.candidate_email}
                </a>
              )}
              {app.candidate_phone && (
                <a href={`tel:${app.candidate_phone}`} className="flex items-center gap-1.5 hover:text-blue-600">
                  <Phone size={14} />{app.candidate_phone}
                </a>
              )}
            </div>

            {app.cv_summary && (
              <p className="text-sm text-gray-600 leading-relaxed">{app.cv_summary}</p>
            )}
          </div>

          {/* Score */}
          <div className="text-center shrink-0">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg ${
              score >= 80 ? "bg-green-100 text-green-700" :
              score >= 60 ? "bg-yellow-100 text-yellow-700" :
              "bg-red-100 text-red-600"
            }`}>{Math.round(score)}%</div>
            <p className="text-xs text-gray-400 mt-1">ציון התאמה</p>
          </div>
        </div>

        {/* Recent roles */}
        {app.recent_roles && app.recent_roles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">תפקידים אחרונים</p>
            <div className="flex flex-wrap gap-2">
              {app.recent_roles.map((r, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full flex items-center gap-1">
                  <Briefcase size={10} />{r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          {app.candidate_phone && (
            <a
              href={toWhatsApp(app.candidate_phone, app.candidate_name || "", app.job_title || "")}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <MessageCircle size={15} />שלח WhatsApp
            </a>
          )}
          {app.candidate_email && (
            <a
              href={toMailto(app.candidate_email, app.candidate_name || "", app.job_title || "")}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Mail size={15} />שלח מייל
            </a>
          )}
          {app.cv_drive_url && (
            <a
              href={app.cv_drive_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <FileText size={15} />קורות חיים (Drive)
            </a>
          )}
          {app.civi_sent_at && (
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium px-4 py-2 rounded-lg">
              <CheckCircle2 size={15} />נשלח לCIVI · {new Date(app.civi_sent_at).toLocaleDateString("he-IL")}
            </span>
          )}
        </div>
      </div>

      {/* ── System alert ── */}
      {latestSystemNote && app.status === "civi_requested" && !app.civi_sent_at && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <span>{latestSystemNote.note}</span>
        </div>
      )}

      {/* ── AI Analysis ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Star size={16} className="text-yellow-500" />ניתוח AI — {app.job_title}
        </h2>

        {app.fit_summary && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">סיכום התאמה</p>
            <p className="text-sm text-gray-700 leading-relaxed">{app.fit_summary}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {app.strengths && app.strengths.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-green-700 mb-2">✓ חוזקות</p>
              <ul className="space-y-1.5">
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
              <p className="text-sm font-semibold text-red-600 mb-2">✗ פערים</p>
              <ul className="space-y-1.5">
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
          <div className={`inline-block text-sm font-medium px-4 py-1.5 rounded-full ${
            app.recommendation.includes("כדאי") && !app.recommendation.includes("לא")
              ? "bg-green-100 text-green-700"
              : "bg-red-50 text-red-600"
          }`}>
            {app.recommendation}
          </div>
        )}

        {app.notes && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">הערות מועמד</p>
            <p className="text-sm text-gray-600">{app.notes}</p>
          </div>
        )}
      </div>

      {/* ── CIVI Send ── */}
      {canSendCivi && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-indigo-800">שליחה למערכת CIVI</p>
          <p className="text-xs text-indigo-600">מועמד זה מאושר לשליחה. לחיצה תשלח מייל למערכת CIVI ותתעד את השליחה.</p>
          {showCiviModal && app && (
            <CiviModal
              appId={app.id}
              candidateName={app.candidate_name || ""}
              jobTitle={app.job_title || ""}
              onSent={async () => {
                setShowCiviModal(false);
                const updated = await api.get(`/applications/${app.id}`);
                setApp(updated.data);
              }}
              onClose={() => setShowCiviModal(false)}
            />
          )}
          <button
            onClick={() => setShowCiviModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Send size={15} />שלח לCIVI
          </button>
        </div>
      )}

      {/* ── Sent email viewer ── */}
      {app.civi_sent_at && app.civi_email_html && (
        <details className="mt-2">
          <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800 select-none">
            צפה במייל שנשלח ←
          </summary>
          <div className="mt-2 border border-indigo-100 rounded-lg overflow-hidden">
            <div className="bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700 font-medium border-b border-indigo-100">
              נושא: {app.civi_email_subject}
            </div>
            <iframe
              srcDoc={app.civi_email_html}
              sandbox="allow-same-origin"
              className="w-full"
              style={{ height: "400px", border: "none" }}
              title="CIVI email"
            />
          </div>
        </details>
      )}

      {/* ── Status history ── */}
      {(app.status_history || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-bold text-gray-900 mb-3">היסטוריית סטטוס</h2>
          <div className="space-y-2">
            {[...(app.status_history || [])].reverse().map((h, i) => (
              <div key={i} className={`rounded-lg px-3 py-2.5 text-sm border ${
                h.changed_by === "system"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  {h.changed_by === "system"
                    ? <AlertCircle size={13} className="text-amber-500 shrink-0" />
                    : <User size={13} className="text-gray-400 shrink-0" />
                  }
                  <span className={`font-medium ${STATUS_META[h.status]?.color || "text-gray-600"}`}>
                    {h.status_label || h.status}
                  </span>
                  <span className="text-gray-400 text-xs">·</span>
                  <span className="text-gray-500 text-xs">{h.changed_by_name}</span>
                  {(h as any).target_date && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <CalendarDays size={10} />יעד: {new Date((h as any).target_date).toLocaleDateString("he-IL")}
                    </span>
                  )}
                  <span className="text-gray-400 text-xs mr-auto flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(h.timestamp).toLocaleDateString("he-IL")}
                  </span>
                </div>
                {h.note && <p className="text-gray-600 text-xs mt-0.5 mr-5">{h.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown, ChevronUp, Star, Phone, Mail, MessageCircle,
  FileText, Send, AlertCircle, CheckCircle2, Clock, Eye
} from "lucide-react";
import api from "../api";

export interface Application {
  id: string;
  job_id: string;
  job_title?: string;
  contractor_id: string;
  contractor_name?: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  cv_summary?: string;
  recent_roles?: string[];
  has_management_exp?: boolean;
  score?: number;
  status: string;
  fit_summary?: string;
  strengths?: string[];
  gaps?: string[];
  recommendation?: string;
  notes?: string;
  cv_drive_url?: string;
  civi_sent_at?: string;
  status_history?: StatusHistoryEntry[];
  created_at?: string;
}

export interface StatusHistoryEntry {
  status: string;
  status_label: string;
  note: string;
  changed_by: string;
  changed_by_name: string;
  timestamp: string;
}

interface Props {
  app: Application;
  civiThreshold?: number;
  showJobLink?: boolean;
  onStatusChange?: (appId: string, status: string, note: string) => void;
  onCiviSent?: (appId: string) => void;
}

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:         { label: "ממתין",               color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  in_process:      { label: "בתהליך גיוס",         color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  weak:            { label: "מועמד חלש",           color: "text-gray-500",   bg: "bg-gray-50 border-gray-200" },
  rejected:        { label: "נדחה",                color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  known_candidate: { label: "מועמד מוכר לנו כבר", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  sent_to_civi:    { label: "נשלח למערכת CICI",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
};

// Statuses that REQUIRE a note when selected
const REQUIRES_NOTE = new Set(["known_candidate"]);

function toWhatsApp(phone: string, name: string, jobTitle: string): string {
  const d = phone.replace(/\D/g, "");
  const intl = d.startsWith("972") ? d : "972" + (d.startsWith("0") ? d.slice(1) : d);
  const msg = encodeURIComponent(`שלום ${name}, קיבלנו את קורות החיים שלך למשרת ${jobTitle}. נחזור אליך בקרוב!`);
  return `https://wa.me/${intl}?text=${msg}`;
}

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = score >= 80 ? "bg-green-100 text-green-700" : score >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600";
  const dim = size === "lg" ? "w-16 h-16 text-lg" : size === "sm" ? "w-10 h-10 text-xs" : "w-12 h-12 text-sm";
  return (
    <div className={`${dim} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {Math.round(score)}%
    </div>
  );
}

export default function ApplicationCard({ app, civiThreshold = 80, showJobLink = false, onStatusChange, onCiviSent }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [noteText, setNoteText] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingCivi, setSendingCivi] = useState(false);
  const [civiError, setCiviError] = useState("");

  const score = app.score ?? 0;
  const meta = STATUS_META[app.status] ?? { label: app.status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };

  const canSendCivi =
    app.status === "in_process" &&
    score >= civiThreshold &&
    !app.civi_sent_at;

  const systemNotes = (app.status_history || []).filter(h => h.changed_by === "system");
  const latestSystemNote = systemNotes[systemNotes.length - 1];

  const handleStatusSelect = (status: string) => {
    setPendingStatus(status);
    setNoteText("");
    if (!REQUIRES_NOTE.has(status)) {
      // Non-required note statuses still show the note field but don't block
    }
  };

  const confirmStatusChange = async () => {
    if (REQUIRES_NOTE.has(pendingStatus) && !noteText.trim()) return;
    setSavingStatus(true);
    try {
      await api.patch(`/applications/${app.id}/status`, { status: pendingStatus, note: noteText.trim() });
      onStatusChange?.(app.id, pendingStatus, noteText);
      setPendingStatus("");
      setNoteText("");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSendCivi = async () => {
    setSendingCivi(true);
    setCiviError("");
    try {
      await api.post(`/applications/${app.id}/send-to-civi`);
      onCiviSent?.(app.id);
    } catch (e: any) {
      setCiviError(e.response?.data?.detail || "שגיאה בשליחה");
    } finally {
      setSendingCivi(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* ── Row header ── */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <ScoreBadge score={score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{app.candidate_name}</span>
            {app.has_management_exp && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">ניסיון ניהולי</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
            {showJobLink && app.job_title && (
              <Link
                to={`/contractor/jobs/${app.job_id}`}
                onClick={e => e.stopPropagation()}
                className="text-blue-500 hover:underline"
              >
                {app.job_title}
              </Link>
            )}
            {app.candidate_phone && (
              <span className="flex items-center gap-1">
                <Phone size={11} />{app.candidate_phone}
              </span>
            )}
            {app.candidate_email && (
              <span className="flex items-center gap-1 truncate">
                <Mail size={11} />{app.candidate_email}
              </span>
            )}
            <span>{app.created_at ? new Date(app.created_at).toLocaleDateString("he-IL") : ""}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* ── System note banner ── */}
      {latestSystemNote && app.status === "in_process" && !app.civi_sent_at && (
        <div className="mx-4 mb-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <span>{latestSystemNote.note}</span>
        </div>
      )}

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">

          {/* Contact + actions row */}
          <div className="flex flex-wrap gap-2">
            {app.candidate_phone && (
              <a
                href={toWhatsApp(app.candidate_phone, app.candidate_name || "", app.job_title || "")}
                target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <MessageCircle size={13} />שלח WhatsApp
              </a>
            )}
            {app.cv_drive_url && (
              <a
                href={app.cv_drive_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <FileText size={13} />קורות חיים (Drive)
              </a>
            )}
            <Link
              to={`/contractor/applications/${app.id}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Eye size={13} />כרטיס מלא
            </Link>
            {app.civi_sent_at && (
              <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={13} />נשלח לCICI · {new Date(app.civi_sent_at).toLocaleDateString("he-IL")}
              </span>
            )}
          </div>

          {/* Candidate summary */}
          {app.cv_summary && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">פרופיל</p>
              <p className="text-sm text-gray-700 leading-relaxed">{app.cv_summary}</p>
            </div>
          )}

          {/* Recent roles */}
          {app.recent_roles && app.recent_roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {app.recent_roles.map((r, i) => (
                <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Star size={10} className="text-gray-400" />{r}
                </span>
              ))}
            </div>
          )}

          {/* AI analysis */}
          {app.fit_summary && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">סיכום התאמה</p>
              <p className="text-sm text-gray-700">{app.fit_summary}</p>
            </div>
          )}

          {(app.strengths?.length || app.gaps?.length) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1.5">✓ חוזקות</p>
                <ul className="space-y-1">
                  {app.strengths?.map((s, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <Star size={10} className="text-green-500 mt-0.5 shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1.5">✗ פערים</p>
                <ul className="space-y-1">
                  {app.gaps?.map((g, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5 shrink-0">–</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {app.recommendation && (
            <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
              app.recommendation.includes("כדאי") && !app.recommendation.includes("לא")
                ? "bg-green-100 text-green-700"
                : "bg-red-50 text-red-600"
            }`}>
              {app.recommendation}
            </span>
          )}

          {app.notes && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">הערות מועמד</p>
              <p className="text-sm text-gray-600">{app.notes}</p>
            </div>
          )}

          {/* Status history */}
          {(app.status_history || []).filter(h => h.changed_by !== "system").length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">היסטוריית סטטוס</p>
              <div className="space-y-1.5">
                {[...(app.status_history || [])].reverse().filter(h => h.changed_by !== "system").map((h, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-medium ${STATUS_META[h.status]?.color || "text-gray-600"}`}>
                        {h.status_label || h.status}
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{h.changed_by_name}</span>
                      <span className="text-gray-400 mr-auto">
                        <Clock size={10} className="inline mr-0.5" />
                        {new Date(h.timestamp).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                    {h.note && <p className="text-gray-600">{h.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status change + CIVI send */}
          <div className="border-t border-gray-200 pt-3 space-y-2">
            {/* Status selector */}
            {onStatusChange && app.status !== "sent_to_civi" && (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <select
                    value={pendingStatus || app.status}
                    onChange={e => handleStatusSelect(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white flex-1"
                  >
                    <option value="pending">ממתין</option>
                    <option value="in_process">בתהליך גיוס</option>
                    <option value="rejected">נדחה</option>
                    <option value="known_candidate">מועמד מוכר לנו כבר</option>
                  </select>
                  {pendingStatus && pendingStatus !== app.status && (
                    <button
                      onClick={e => { e.stopPropagation(); confirmStatusChange(); }}
                      disabled={savingStatus || (REQUIRES_NOTE.has(pendingStatus) && !noteText.trim())}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingStatus ? "שומר..." : "אשר"}
                    </button>
                  )}
                  {pendingStatus && pendingStatus !== app.status && (
                    <button
                      onClick={e => { e.stopPropagation(); setPendingStatus(""); }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >ביטול</button>
                  )}
                </div>
                {pendingStatus && pendingStatus !== app.status && (
                  <div className="space-y-1">
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      rows={2}
                      placeholder={REQUIRES_NOTE.has(pendingStatus) ? "הערה נדרשת לסטטוס זה *" : "הוסף הערה (אופציונלי)"}
                      className={`w-full text-xs border rounded-lg px-3 py-2 resize-none ${
                        REQUIRES_NOTE.has(pendingStatus) && !noteText.trim()
                          ? "border-red-300 focus:ring-red-400"
                          : "border-gray-200"
                      } focus:outline-none focus:ring-2 focus:ring-blue-300`}
                    />
                    {REQUIRES_NOTE.has(pendingStatus) && !noteText.trim() && (
                      <p className="text-xs text-red-500">יש להוסיף הערה עבור סטטוס זה</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CIVI send button */}
            {canSendCivi && (
              <div className="space-y-1">
                <button
                  onClick={e => { e.stopPropagation(); handleSendCivi(); }}
                  disabled={sendingCivi}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  <Send size={14} />
                  {sendingCivi ? "שולח..." : "שלח לCICI"}
                </button>
                {civiError && <p className="text-xs text-red-500 text-center">{civiError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

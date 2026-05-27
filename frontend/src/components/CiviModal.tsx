import { useState, useEffect } from "react";
import { Send, X, Loader2, Mail, ChevronDown, ChevronUp } from "lucide-react";
import api from "../api";

const CIVI_EMAIL = "talents@connectech.co.il";

interface Props {
  appId: string;
  candidateName: string;
  jobTitle: string;
  onSent: () => void;
  onClose: () => void;
}

export default function CiviModal({ appId, candidateName, jobTitle, onSent, onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [message, setMessage] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    api.get(`/applications/${appId}/civi-preview`)
      .then(r => { setSubject(r.data.subject); setPreviewHtml(r.data.html || ""); })
      .catch(() => {})
      .finally(() => setLoadingPreview(false));
  }, [appId]);

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      await api.post(`/applications/${appId}/send-to-civi`, {
        subject_override: subject.trim() || null,
        custom_message: message.trim() || null,
      });
      onSent();
    } catch (e: any) {
      setError(e.response?.data?.detail || "שגיאה בשליחה");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-900">שליחה למערכת CIVI</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">{candidateName} · {jobTitle}</p>
          <div className="flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            <Mail size={12} className="text-indigo-500 shrink-0" />
            <span className="text-indigo-700">יישלח אל: <strong>{CIVI_EMAIL}</strong></span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 pb-2">
          {loadingPreview ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">נושא המייל</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  הערת סוכן (תופיע בגוף המייל, אופציונלי)
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder="מידע נוסף, סיבת ההמלצה, כל פרט שחשוב להעביר למערכת CIVI..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {previewHtml && (
                <div>
                  <button
                    onClick={() => setShowPreview(v => !v)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium py-1"
                  >
                    {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    תצוגה מקדימה של המייל
                  </button>
                  {showPreview && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={previewHtml}
                        sandbox="allow-same-origin"
                        className="w-full"
                        style={{ height: "320px", border: "none" }}
                        title="CIVI email preview"
                      />
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 shrink-0 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm border border-gray-200 rounded-lg py-2 text-gray-600 hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            onClick={handleSend}
            disabled={sending || loadingPreview}
            className="flex-1 flex items-center justify-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
          >
            <Send size={14} />{sending ? "שולח..." : "שלח לCIVI"}
          </button>
        </div>
      </div>
    </div>
  );
}

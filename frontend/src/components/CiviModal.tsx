import { useState, useEffect } from "react";
import { Send, X, Loader2 } from "lucide-react";
import api from "../api";

interface Props {
  appId: string;
  candidateName: string;
  jobTitle: string;
  onSent: () => void;
  onClose: () => void;
}

export default function CiviModal({ appId, candidateName, jobTitle, onSent, onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/applications/${appId}/civi-preview`)
      .then(r => setSubject(r.data.subject))
      .catch(() => setSubject(""))
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
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-900">שליחה למערכת CIVI</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">{candidateName} · {jobTitle}</p>

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
                rows={4}
                placeholder="מידע נוסף על המועמד, סיבת ההמלצה, כל פרט שחשוב להעביר למערכת CIVI..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        <div className="flex gap-2 mt-5">
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

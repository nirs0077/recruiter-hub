import { useState, useEffect } from "react";
import api from "../../api";
import { Save, Loader2, FolderOpen, Send } from "lucide-react";

export default function AdminSettings() {
  const [threshold, setThreshold] = useState(75);
  const [civiThreshold, setCiviThreshold] = useState(80);
  const [driveFolderId, setDriveFolderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/settings")
      .then(r => {
        setThreshold(r.data.score_threshold ?? 75);
        setCiviThreshold(r.data.civi_send_threshold ?? 80);
        setDriveFolderId(r.data.google_drive_folder_id ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await api.put("/settings", {
      score_threshold: threshold,
      civi_send_threshold: civiThreshold,
      google_drive_folder_id: driveFolderId.trim() || null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">הגדרות מערכת</h1>

      <div className="space-y-5 max-w-lg">

        {/* Score threshold */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1">סף ציון מועמד פוטנציאלי</h2>
          <p className="text-sm text-gray-500 mb-5">
            מועמדים עם ציון מעל הסף יוספו למאגר הפוטנציאלים. מתחת — יסומנו "מועמד חלש".
          </p>
          <div className="flex items-center gap-4 mb-2">
            <input type="range" min={0} max={100} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="flex-1 accent-blue-600" />
            <div className="w-16 text-center">
              <span className="text-2xl font-bold text-blue-600">{threshold}</span>
              <span className="text-sm text-gray-400">%</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>0%</span>
            <div className="flex-1 flex justify-center gap-4">
              <span className="text-red-400">חלש</span>
              <span>→</span>
              <span className="text-green-600">פוטנציאלי</span>
            </div>
            <span>100%</span>
          </div>
        </div>

        {/* CIVI threshold */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Send size={16} className="text-indigo-600" />סף שליחה למערכת CICI
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            רק מועמדים עם ציון גבוה מהסף, שאדמין אישר לתהליך גיוס, ניתן לשלוח לCICI.
          </p>
          <div className="flex items-center gap-4 mb-2">
            <input type="range" min={50} max={100} value={civiThreshold}
              onChange={e => setCiviThreshold(Number(e.target.value))}
              className="flex-1 accent-indigo-600" />
            <div className="w-16 text-center">
              <span className="text-2xl font-bold text-indigo-600">{civiThreshold}</span>
              <span className="text-sm text-gray-400">%</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>50%</span>
            <div className="flex-1 flex justify-center gap-4">
              <span className="text-gray-400">חסום</span>
              <span>→</span>
              <span className="text-indigo-600">מורשה לשליחה</span>
            </div>
            <span>100%</span>
          </div>
        </div>

        {/* Google Drive */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <FolderOpen size={16} className="text-green-600" />תיקיית Google Drive לקורות חיים
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            הכנס את מזהה תיקיית Google Drive. קורות החיים ישמרו שם בתיקיות נפרדות לפי קבלן.
            <br />
            <span className="text-xs text-gray-400 mt-1 block">
              מזהה התיקייה נמצא ב-URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
            </span>
          </p>
          <input
            type="text"
            value={driveFolderId}
            onChange={e => setDriveFolderId(e.target.value)}
            placeholder="לדוגמה: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          {driveFolderId && (
            <a
              href={`https://drive.google.com/drive/folders/${driveFolderId}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-green-600 hover:underline mt-1 inline-block"
            >
              פתח תיקייה ←
            </a>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? "נשמר!" : "שמור הגדרות"}
        </button>
      </div>
    </div>
  );
}

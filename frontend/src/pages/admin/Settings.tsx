import { useState, useEffect } from "react";
import api from "../../api";
import { Save, Loader2 } from "lucide-react";

export default function AdminSettings() {
  const [threshold, setThreshold] = useState(75);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/settings")
      .then((r) => setThreshold(r.data.score_threshold ?? 75))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await api.put("/settings", { score_threshold: threshold });
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

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-lg">
        <h2 className="font-semibold text-gray-800 mb-1">סף ציון מועמד פוטנציאלי</h2>
        <p className="text-sm text-gray-500 mb-5">
          מועמדים עם ציון התאמה מעל הסף יוספו למאגר המועמדים הפוטנציאלים.
          מועמדים מתחת לסף יסומנו כ"מועמד חלש".
        </p>

        <div className="flex items-center gap-4 mb-3">
          <input
            type="range"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <div className="w-16 text-center">
            <span className="text-2xl font-bold text-blue-600">{threshold}</span>
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
          <span>0%</span>
          <div className="flex-1 flex justify-center gap-4">
            <span className="text-red-400">חלש</span>
            <span>→</span>
            <span className="text-green-600">פוטנציאלי</span>
          </div>
          <span>100%</span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? "נשמר!" : "שמור הגדרות"}
        </button>
      </div>
    </div>
  );
}

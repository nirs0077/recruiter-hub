import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";
import { MapPin, Wifi, Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface JobPublic {
  id: string;
  title: string;
  location?: string;
  hybrid?: string;
  description?: string;
  requirements?: string;
}

type Stage = "form" | "loading" | "result";

interface Result {
  score: number;
  status: string;
  candidate_name: string;
}

export default function Apply() {
  const { jobId, contractorId } = useParams();
  const [job, setJob] = useState<JobPublic | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [stage, setStage] = useState<Stage>("form");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    api.get(`/jobs/public/${jobId}`)
      .then((r) => setJob(r.data))
      .catch(() => setJob(null))
      .finally(() => setLoadingJob(false));
  }, [jobId]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("נא לצרף קורות חיים"); return; }
    setError("");
    setStage("loading");

    const formData = new FormData();
    formData.append("job_id", jobId!);
    formData.append("contractor_id", contractorId!);
    formData.append("notes", notes);
    formData.append("cv_file", file);

    try {
      const res = await api.post("/applications/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setStage("result");
    } catch (err: any) {
      setError(err.response?.data?.detail || "שגיאה בהגשה, נסה שוב");
      setStage("form");
    }
  };

  if (loadingJob) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      משרה לא נמצאה או לא פעילה
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Job Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            {job.location && <span className="flex items-center gap-1"><MapPin size={14} />{job.location}</span>}
            {job.hybrid && <span className="flex items-center gap-1"><Wifi size={14} />{job.hybrid}</span>}
          </div>
          {job.description && (
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-1">אודות התפקיד</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>
          )}
          {job.requirements && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">דרישות</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
            </div>
          )}
        </div>

        {/* Form / Loading / Result */}
        {stage === "form" && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">הגשת מועמדות</h2>

            {/* CV Upload */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                קורות חיים <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-blue-400 bg-blue-50" :
                  file ? "border-green-400 bg-green-50" :
                  "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                }`}
                onClick={() => document.getElementById("cv-input")?.click()}
              >
                <input
                  id="cv-input"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={20} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">{file.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">גרור קובץ לכאן או לחץ לבחירה</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">הערות (אופציונלי)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="כל מידע נוסף שתרצה לשתף..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              הגש מועמדות
            </button>
          </form>
        )}

        {stage === "loading" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">מנתח קורות חיים...</h3>
            <p className="text-sm text-gray-500">ה-AI בודק את התאמתך למשרה. זה עשוי לקחת כ-30 שניות.</p>
          </div>
        )}

        {stage === "result" && result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            {result.score >= 75 ? (
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle size={48} className="text-orange-400 mx-auto mb-4" />
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {result.candidate_name}, הגשתך התקבלה!
            </h3>
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full font-bold text-2xl mx-auto mb-4 ${
              result.score >= 80 ? "bg-green-100 text-green-700" :
              result.score >= 60 ? "bg-yellow-100 text-yellow-700" :
              "bg-red-100 text-red-600"
            }`}>
              {Math.round(result.score)}%
            </div>
            <p className="text-gray-500 text-sm">
              {result.score >= 75
                ? "ציון ההתאמה שלך גבוה ותועבר לסינון נוסף."
                : "קורות החיים שלך נשמרו ויישקלו."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

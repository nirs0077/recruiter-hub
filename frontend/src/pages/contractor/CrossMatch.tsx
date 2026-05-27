import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Star, CheckCircle2, AlertCircle, Loader2, Users, Briefcase, Send } from "lucide-react";
import api from "../../api";

interface CandidateOption { id: string; name: string; email: string; }
interface JobOption { id: string; title: string; location?: string; }
interface MatchResult {
  score: number;
  fit_summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  can_submit: boolean;
  already_applied: boolean;
}

export default function CrossMatch() {
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [matching, setMatching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Load unique candidates from my applications
    api.get("/applications/mine").then(r => {
      const seen = new Set<string>();
      const unique: CandidateOption[] = [];
      for (const app of r.data) {
        if (!seen.has(app.candidate_id)) {
          seen.add(app.candidate_id);
          unique.push({ id: app.candidate_id, name: app.candidate_name || "", email: app.candidate_email || "" });
        }
      }
      setCandidates(unique);
    });
    // Load my assigned jobs
    api.get("/jobs/mine").then(r => setJobs(r.data)).catch(() => {
      // fallback: get all active jobs
      api.get("/jobs").then(r => setJobs(r.data.filter((j: any) => j.status === "active")));
    });
  }, []);

  const handleMatch = async () => {
    if (!selectedCandidate || !selectedJob) return;
    setMatching(true);
    setResult(null);
    setError("");
    setSubmitted(false);
    try {
      const r = await api.post("/applications/check-match", {
        candidate_id: selectedCandidate,
        job_id: selectedJob,
      });
      setResult(r.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "שגיאה בבדיקת ההתאמה");
    } finally {
      setMatching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCandidate || !selectedJob || !result?.can_submit) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/applications/submit-existing", {
        candidate_id: selectedCandidate,
        job_id: selectedJob,
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e.response?.data?.detail || "שגיאה בהגשת המועמד");
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 80 ? "bg-green-100 text-green-700" : s >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link to="/contractor" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
        <ArrowRight size={16} />חזרה למשרות שלי
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">בדיקת התאמה</h1>
        <p className="text-gray-500 text-sm mt-1">בדוק התאמה בין מועמד קיים במאגר שלך לבין משרה</p>
      </div>

      {/* Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Users size={14} className="inline mr-1 text-gray-400" />מועמד
          </label>
          <select
            value={selectedCandidate}
            onChange={e => { setSelectedCandidate(e.target.value); setResult(null); setSubmitted(false); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">בחר מועמד...</option>
            {candidates.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ""}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Briefcase size={14} className="inline mr-1 text-gray-400" />משרה
          </label>
          <select
            value={selectedJob}
            onChange={e => { setSelectedJob(e.target.value); setResult(null); setSubmitted(false); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">בחר משרה...</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}{j.location ? ` · ${j.location}` : ""}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleMatch}
          disabled={!selectedCandidate || !selectedJob || matching}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {matching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {matching ? "מנתח התאמה..." : "בדוק התאמה"}
        </button>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={14} />{error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          {/* Score header */}
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shrink-0 ${scoreColor(result.score)}`}>
              {Math.round(result.score)}%
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {result.score >= 80 ? "התאמה גבוהה" : result.score >= 60 ? "התאמה בינונית" : "התאמה נמוכה"}
              </p>
              <p className="text-sm text-gray-500">ציון התאמה AI</p>
              {result.already_applied && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                  מועמד כבר הוגש למשרה זו
                </span>
              )}
            </div>
          </div>

          {result.fit_summary && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">סיכום התאמה</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.fit_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {result.strengths.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2">✓ חוזקות</p>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                      <Star size={11} className="text-green-500 mt-0.5 shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.gaps.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-600 mb-2">✗ פערים</p>
                <ul className="space-y-1.5">
                  {result.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5 shrink-0">–</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {result.recommendation && (
            <span className={`inline-block text-sm font-medium px-4 py-1.5 rounded-full ${
              result.recommendation.includes("כדאי") && !result.recommendation.includes("לא")
                ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
            }`}>
              {result.recommendation}
            </span>
          )}

          {/* Submit action */}
          {submitted ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={16} />המועמד הוגש למשרה בהצלחה!
            </div>
          ) : result.can_submit ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-800">התאמה גבוהה — ניתן להגיש מועמד למשרה</p>
              <p className="text-xs text-blue-600">ייצור הגשה חדשה עבור מועמד זה במשרה שנבחרה.</p>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                <Send size={14} />{submitting ? "מגיש..." : "הגש מועמד למשרה"}
              </button>
            </div>
          ) : !result.already_applied ? (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
              <AlertCircle size={14} className="text-gray-400" />
              ציון ההתאמה ({Math.round(result.score)}%) נמוך מהסף הנדרש (80%) להגשה
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

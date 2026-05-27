import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight, Loader2, MapPin, Laptop, ExternalLink,
  ChevronDown, ChevronUp, ListChecks, FileText
} from "lucide-react";
import api from "../../api";
import type { Application } from "../../components/ApplicationCard";
import ApplicationCard from "../../components/ApplicationCard";

function parseToLines(text: string): string[] {
  return text
    .split(/\n|•|·|✓|►|–|-{2,}/)
    .map(l => l.trim())
    .filter(l => l.length > 4);
}

export default function ContractorJobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState<any>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [civiThreshold, setCiviThreshold] = useState(80);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/jobs/${jobId}`),
      api.get(`/applications/job/${jobId}`),
      api.get("/settings").catch(() => ({ data: {} })),
    ]).then(([jobRes, appsRes, settingsRes]) => {
      setJob(jobRes.data);
      setApps(appsRes.data.sort((a: Application, b: Application) => (b.score ?? 0) - (a.score ?? 0)));
      setCiviThreshold(settingsRes.data.civi_send_threshold ?? 80);
    }).finally(() => setLoading(false));
  }, [jobId]);

  const handleStatusChange = (appId: string, status: string) => {
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const handleCiviSent = (appId: string) => {
    setApps(prev => prev.map(a =>
      a.id === appId ? { ...a, status: "sent_to_civi", civi_sent_at: new Date().toISOString() } : a
    ));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  const reqLines = job?.requirements ? parseToLines(job.requirements) : [];
  const hybridLabel = job?.hybrid && job.hybrid !== "לא צוין" ? job.hybrid : null;

  return (
    <div>
      <Link to="/contractor" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowRight size={16} />חזרה למשרות שלי
      </Link>

      {/* Job info card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-700 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">{job?.title}</h1>
              <div className="flex items-center gap-3 text-blue-100 text-sm flex-wrap">
                {job?.location && (
                  <span className="flex items-center gap-1"><MapPin size={13} />{job.location}</span>
                )}
                {hybridLabel && (
                  <span className="flex items-center gap-1"><Laptop size={13} />{hybridLabel}</span>
                )}
              </div>
            </div>
            {job?.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1.5 rounded-lg shrink-0">
                <ExternalLink size={12} />מקור
              </a>
            )}
          </div>
        </div>

        {/* Collapsible details */}
        <div>
          <button
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <span>פרטי המשרה</span>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDetails && (
            <div className="p-5 space-y-5">
              {job?.description && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-blue-500" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">תיאור התפקיד</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
                </div>
              )}

              {reqLines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks size={14} className="text-indigo-500" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">דרישות המשרה</p>
                  </div>
                  <ul className="space-y-1.5">
                    {reqLines.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!job?.description && reqLines.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">לא נמצא תיאור למשרה זו</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Applications */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">המועמדים שלי ({apps.length})</h2>

      <div className="space-y-3">
        {apps.length === 0 ? (
          <p className="text-center py-12 text-gray-400">אין מועמדים עדיין. שתף את הלינק כדי לקבל פניות.</p>
        ) : (
          apps.map(app => (
            <ApplicationCard
              key={app.id}
              app={app}
              civiThreshold={civiThreshold}
              onStatusChange={handleStatusChange}
              onCiviSent={handleCiviSent}
            />
          ))
        )}
      </div>
    </div>
  );
}

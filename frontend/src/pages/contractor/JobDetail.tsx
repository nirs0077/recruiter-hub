import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import api from "../../api";
import type { Application } from "../../components/ApplicationCard";
import ApplicationCard from "../../components/ApplicationCard";

export default function ContractorJobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState<any>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [civiThreshold, setCiviThreshold] = useState(80);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <Link to="/contractor" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowRight size={16} />חזרה למשרות שלי
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{job?.title}</h1>
      <p className="text-gray-500 text-sm mb-6">{job?.location}{job?.hybrid ? ` · ${job.hybrid}` : ""}</p>

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

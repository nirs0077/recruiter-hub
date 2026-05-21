import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { MapPin, Wifi, Users, ChevronLeft, Loader2, Copy, Check, Share2 } from "lucide-react";
import { useAuth } from "../../AuthContext";

interface Job {
  id: string;
  title: string;
  location?: string;
  hybrid?: string;
  is_active: boolean;
}

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    api.get("/jobs")
      .then((r) => setJobs(r.data))
      .finally(() => setLoading(false));
  }, []);

  const applyLink = (jobId: string) => `${window.location.origin}/apply/${jobId}/${user?.uid}`;

  const copyLink = (jobId: string) => {
    navigator.clipboard.writeText(applyLink(jobId));
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareWhatsApp = (job: Job) => {
    const link = applyLink(job.id);
    const text = `שלום! אני מחפש/ת מועמדים למשרת *${job.title}*${job.location ? ` (${job.location})` : ""}.\nלהגשת קורות חיים לחץ/י כאן:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">המשרות שלי</h1>
        <p className="text-gray-500 text-sm mt-1">{jobs.length} משרות שויכו אליך</p>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {job.location && <span className="flex items-center gap-1"><MapPin size={13} />{job.location}</span>}
                  {job.hybrid && <span className="flex items-center gap-1"><Wifi size={13} />{job.hybrid}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => shareWhatsApp(job)}
                  title="שתף בוואטסאפ"
                  className="flex items-center gap-1.5 text-xs border border-green-300 text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Share2 size={13} />שתף בוואטסאפ
                </button>
                <button
                  onClick={() => copyLink(job.id)}
                  title="העתק לינק הגשה"
                  className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                    copiedId === job.id
                      ? "border-green-300 text-green-600 bg-green-50"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {copiedId === job.id ? <><Check size={13} />הועתק!</> : <><Copy size={13} />העתק לינק</>}
                </button>
                <Link
                  to={`/contractor/jobs/${job.id}`}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  מועמדים<ChevronLeft size={14} />
                </Link>
              </div>
            </div>

            {/* Link preview */}
            <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono truncate">
              {applyLink(job.id)}
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Users className="mx-auto mb-3 opacity-40" size={40} />
            <p>לא שויכו אליך משרות עדיין</p>
          </div>
        )}
      </div>
    </div>
  );
}

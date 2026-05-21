import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { Briefcase, Users, UserCheck, TrendingUp, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ jobs: 0, contractors: 0, candidates: 0, applications: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/jobs"),
      api.get("/auth/users"),
      api.get("/candidates"),
    ]).then(([jobsRes, usersRes, candidatesRes]) => {
      const jobs = jobsRes.data;
      const contractors = usersRes.data.filter((u: any) => u.role === "contractor");
      setStats({
        jobs: jobs.length,
        contractors: contractors.length,
        candidates: candidatesRes.data.length,
        applications: 0,
      });
      setRecentJobs(jobs.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  const statCards = [
    { label: "משרות פעילות", value: stats.jobs, icon: Briefcase, color: "bg-blue-50 text-blue-600", to: "/admin/jobs" },
    { label: "קבלנים", value: stats.contractors, icon: Users, color: "bg-green-50 text-green-600", to: "/admin/contractors" },
    { label: "מועמדים", value: stats.candidates, icon: UserCheck, color: "bg-purple-50 text-purple-600", to: "/admin/candidates" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">לוח בקרה</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">משרות אחרונות</h2>
          <Link to="/admin/jobs" className="text-sm text-blue-600 hover:underline">הכל</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentJobs.map((job) => (
            <Link key={job.id} to={`/admin/jobs/${job.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-800 text-sm">{job.title}</p>
                <p className="text-xs text-gray-400">{job.location} · {job.hybrid}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {job.assigned_contractors?.length || 0} קבלנים
                </span>
                <TrendingUp size={14} className="text-gray-300" />
              </div>
            </Link>
          ))}
          {recentJobs.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">אין משרות עדיין</p>
          )}
        </div>
      </div>
    </div>
  );
}

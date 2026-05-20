import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { User, Loader2, Search, Briefcase, UserCheck } from "lucide-react";

interface ContractorAttribution {
  contractor_id: string;
  contractor_name: string;
  job_title?: string;
  created_at?: string;
}

interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cv_summary?: string;
  has_management_exp?: boolean;
  recent_roles?: string[];
  contractors?: ContractorAttribution[];
}

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/candidates")
      .then((r) => setCandidates(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = candidates.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מאגר מועמדים</h1>
          <p className="text-gray-500 text-sm mt-1">{candidates.length} מועמדים</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש מועמד..."
            className="border border-gray-300 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((c) => (
          <Link key={c.id} to={`/admin/candidates/${c.id}`}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{c.name}</p>
                {c.has_management_exp && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">ניהולי</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
              {c.contractors && c.contractors.length > 0 && (() => {
                const first = c.contractors[0];
                const last = c.contractors[c.contractors.length - 1];
                const isSame = first.contractor_id === last.contractor_id;
                return (
                  <p className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                    <UserCheck size={10} />
                    {isSame
                      ? first.contractor_name
                      : `ראשון: ${first.contractor_name} · אחרון: ${last.contractor_name}`}
                    {c.contractors.length > 1 && <span className="text-gray-400">({c.contractors.length} הגשות)</span>}
                  </p>
                );
              })()}
              {c.cv_summary && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.cv_summary}</p>
              )}
            </div>
            {c.recent_roles && c.recent_roles.length > 0 && (
              <div className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                <Briefcase size={12} />
                <span className="truncate max-w-32">{c.recent_roles[0]}</span>
              </div>
            )}
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <User className="mx-auto mb-3 opacity-40" size={40} />
            <p>לא נמצאו מועמדים</p>
          </div>
        )}
      </div>
    </div>
  );
}

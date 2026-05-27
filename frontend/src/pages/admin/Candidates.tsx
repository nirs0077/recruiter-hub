import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { User, Loader2, Search, Briefcase, UserCheck, CalendarDays, Trash2, X } from "lucide-react";

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
  created_at?: string;
  contractors?: ContractorAttribution[];
}

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [contractorsWarning, setContractorsWarning] = useState<{ id: string; name: string }[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get("/candidates")
      .then((r) => setCandidates(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(force = false) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/candidates/${deleteTarget.id}${force ? "?force=true" : ""}`);
      setCandidates(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      setContractorsWarning(null);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setContractorsWarning(err.response.data.detail.contractors ?? []);
      }
    } finally {
      setDeleting(false);
    }
  }

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
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">מחיקת מועמד</h3>
              <button onClick={() => { setDeleteTarget(null); setContractorsWarning(null); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {contractorsWarning ? (
              <>
                <p className="text-sm text-red-700 font-medium mb-2">המועמד {deleteTarget.name} משויך לקבלנים הבאים:</p>
                <ul className="text-sm text-gray-700 mb-4 space-y-1">
                  {contractorsWarning.map(c => (
                    <li key={c.id} className="flex items-center gap-1.5"><UserCheck size={13} className="text-indigo-500" />{c.name}</li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mb-4">מחיקה תסיר את המועמד וכל ההגשות שלו מכל הקבלנים.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setDeleteTarget(null); setContractorsWarning(null); }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">ביטול</button>
                  <button onClick={() => handleDelete(true)} disabled={deleting}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50">
                    {deleting ? "מוחק..." : "מחק בכל זאת"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-4">האם למחוק את <strong>{deleteTarget.name}</strong> מהמאגר? פעולה זו אינה הפיכה.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">ביטול</button>
                  <button onClick={() => handleDelete(false)} disabled={deleting}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50">
                    {deleting ? "מוחק..." : "מחק"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מאגר מועמדים</h1>
          <p className="text-gray-500 text-sm mt-1">{candidates.length} מועמדים</p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש מועמד..."
            className="w-full border border-gray-300 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4 p-4">
            <Link to={`/admin/candidates/${c.id}`} className="flex items-center gap-4 flex-1 min-w-0">
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
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                  {c.email && <span>{c.email}</span>}
                  {c.created_at && (
                    <span className="flex items-center gap-1">
                      <CalendarDays size={10} />
                      {new Date(c.created_at).toLocaleDateString("he-IL")}
                    </span>
                  )}
                </div>
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
            <button
              onClick={() => { setDeleteTarget({ id: c.id, name: c.name }); setContractorsWarning(null); }}
              className="shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="מחק מועמד"
            >
              <Trash2 size={16} />
            </button>
          </div>
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

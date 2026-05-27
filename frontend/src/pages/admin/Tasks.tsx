import { useState, useEffect } from "react";
import {
  CheckCircle2, Circle, Clock, XCircle, Plus, Loader2,
  CalendarDays, Trash2, ChevronRight, Briefcase, User, ListChecks
} from "lucide-react";
import api from "../../api";

type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";
type TaskType = "manual" | "auto";

interface Task {
  id: string;
  title: string;
  notes?: string;
  due_date?: string;
  status: TaskStatus;
  type: TaskType;
  created_by: string;
  created_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  app_id?: string;
  candidate_name?: string;
  job_title?: string;
  created_at: string;
}

const STATUS_META: Record<TaskStatus, { label: string; icon: typeof Circle; color: string; bg: string }> = {
  pending:     { label: "ממתין",   icon: Circle,       color: "text-gray-500",  bg: "bg-gray-100 border-gray-300" },
  in_progress: { label: "בביצוע", icon: Clock,        color: "text-blue-600",  bg: "bg-blue-50 border-blue-300" },
  done:        { label: "הסתיים", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-300" },
  cancelled:   { label: "בוטל",   icon: XCircle,      color: "text-red-500",   bg: "bg-red-50 border-red-300" },
};

const NEXT_STATUSES: Record<TaskStatus, TaskStatus[]> = {
  pending:     ["in_progress", "cancelled"],
  in_progress: ["done", "cancelled"],
  done:        [],
  cancelled:   [],
};

function isOverdue(task: Task) {
  if (!task.due_date || task.status === "done" || task.status === "cancelled") return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL");
}

interface Contractor { uid: string; name: string; }

interface CreateModalProps {
  contractors: Contractor[];
  onClose: () => void;
  onCreated: (t: Task) => void;
}

function CreateModal({ contractors, onClose, onCreated }: CreateModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) { setError("יש להזין כותרת"); return; }
    setSaving(true);
    setError("");
    try {
      const r = await api.post("/tasks", {
        title: title.trim(),
        notes: notes.trim() || null,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
      });
      onCreated(r.data);
    } catch {
      setError("שגיאה ביצירת משימה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-4">משימה חדשה</h3>
        <div className="space-y-3">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="כותרת המשימה *"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="הערות (אופציונלי)"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">תאריך יעד (אופציונלי)</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          {contractors.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">שייך לקבלן (אופציונלי)</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">לאדמין (לי)</option>
                {contractors.map(c => (
                  <option key={c.uid} value={c.uid}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 text-sm border border-gray-200 rounded-lg py-2 text-gray-600 hover:bg-gray-50">ביטול</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
          >
            {saving ? "שומר..." : "צור משימה"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
}

function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const [updating, setUpdating] = useState(false);
  const meta = STATUS_META[task.status];
  const Icon = meta.icon;
  const overdue = isOverdue(task);
  const nextStatuses = NEXT_STATUSES[task.status];

  const doStatus = async (s: TaskStatus) => {
    setUpdating(true);
    await api.patch(`/tasks/${task.id}/status`, { status: s });
    onStatusChange(task.id, s);
    setUpdating(false);
  };

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${overdue ? "border-red-200" : "border-gray-200"}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`${meta.color} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{task.title}</p>
          {task.notes && <p className="text-xs text-gray-500 mt-0.5">{task.notes}</p>}

          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            {task.due_date && (
              <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                <CalendarDays size={11} />
                {overdue ? "באיחור · " : ""}{formatDate(task.due_date)}
              </span>
            )}
            {task.assigned_to_name && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <User size={10} />{task.assigned_to_name}
              </span>
            )}
            {task.created_by_name && task.type === "auto" && (
              <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                <Briefcase size={10} />נוצר ע"י: {task.created_by_name}
              </span>
            )}
          </div>

          {task.candidate_name && (
            <p className="text-xs text-indigo-700 mt-1.5 flex items-center gap-1">
              <ChevronRight size={11} />{task.candidate_name} | {task.job_title}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1 items-end shrink-0">
          {nextStatuses.map(s => (
            <button
              key={s}
              onClick={() => doStatus(s)}
              disabled={updating}
              className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                s === "done" ? "border-green-300 text-green-700 hover:bg-green-50" :
                s === "in_progress" ? "border-blue-300 text-blue-700 hover:bg-blue-50" :
                "border-red-200 text-red-500 hover:bg-red-50"
              }`}
            >
              {STATUS_META[s].label}
            </button>
          ))}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-gray-300 hover:text-red-400 transition-colors mt-1"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const FILTER_OPTIONS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all",        label: "הכל" },
  { value: "pending",    label: "ממתין" },
  { value: "in_progress",label: "בביצוע" },
  { value: "done",       label: "הסתיים" },
  { value: "cancelled",  label: "בוטל" },
];

function TaskList({
  tasks,
  onStatusChange,
  onDelete,
  onAdd,
}: {
  tasks: Task[];
  onStatusChange: (id: string, s: TaskStatus) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
}) {
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          {overdueCount > 0 && (
            <p className="text-xs text-red-600">{overdueCount} משימות באיחור</p>
          )}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus size={16} />משימה חדשה
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {FILTER_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => setFilter(o.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              filter === o.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {o.label}
            {o.value !== "all" && (
              <span className="mr-1 opacity-70">({tasks.filter(t => t.status === o.value).length})</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">אין משימות</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminTasks() {
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [systemTasks, setSystemTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "system">("my");
  const [showCreate, setShowCreate] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);

  useEffect(() => {
    Promise.all([
      api.get("/tasks/my"),
      api.get("/tasks/system"),
      api.get("/users").catch(() => ({ data: [] })),
    ]).then(([my, sys, users]) => {
      setMyTasks(my.data);
      setSystemTasks(sys.data);
      setContractors((users.data || []).filter((u: any) => u.role === "contractor"));
    }).finally(() => setLoading(false));
  }, []);

  const handleMyStatusChange = (id: string, s: TaskStatus) => {
    setMyTasks(ts => ts.map(t => t.id === id ? { ...t, status: s } : t));
  };

  const handleSysStatusChange = (id: string, s: TaskStatus) => {
    setSystemTasks(ts => ts.map(t => t.id === id ? { ...t, status: s } : t));
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    setMyTasks(ts => ts.filter(t => t.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  const sysOverdue = systemTasks.filter(isOverdue).length;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-5">ניהול משימות</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("my")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "my" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <CheckCircle2 size={16} />משימות שלי
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{myTasks.length}</span>
        </button>
        <button
          onClick={() => setTab("system")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "system" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <ListChecks size={16} />משימות מערכת
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${sysOverdue > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>
            {systemTasks.length}
          </span>
        </button>
      </div>

      {tab === "my" ? (
        <TaskList
          tasks={myTasks}
          onStatusChange={handleMyStatusChange}
          onDelete={handleDelete}
          onAdd={() => setShowCreate(true)}
        />
      ) : (
        <div>
          <p className="text-xs text-gray-500 mb-4">משימות אלו נוצרו אוטומטית בעת שינוי סטטוס עם תאריך יעד</p>
          <TaskList
            tasks={systemTasks}
            onStatusChange={handleSysStatusChange}
          />
        </div>
      )}

      {showCreate && (
        <CreateModal
          contractors={contractors}
          onClose={() => setShowCreate(false)}
          onCreated={t => { setMyTasks(ts => [t, ...ts]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

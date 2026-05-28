import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Briefcase, Users, Settings, LogOut, LayoutDashboard, UserCheck, ListChecks, BookOpen } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";

  const adminLinks = [
    { to: "/admin", label: "לוח בקרה", icon: LayoutDashboard },
    { to: "/admin/jobs", label: "משרות", icon: Briefcase },
    { to: "/admin/contractors", label: "קבלנים", icon: Users },
    { to: "/admin/candidates", label: "מועמדים", icon: UserCheck },
    { to: "/admin/tasks", label: "משימות", icon: ListChecks },
    { to: "/admin/settings", label: "הגדרות", icon: Settings },
    { to: "/admin/guide", label: "מדריך", icon: BookOpen },
  ];

  const contractorLinks = [
    { to: "/contractor", label: "המשרות שלי", icon: Briefcase },
    { to: "/contractor/candidates", label: "המועמדים שלי", icon: UserCheck },
    { to: "/contractor/tasks", label: "משימות", icon: ListChecks },
    { to: "/contractor/guide", label: "מדריך", icon: BookOpen },
  ];

  const links = isAdmin ? adminLinks : contractorLinks;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 bg-white border-l border-gray-200 flex-col shadow-sm fixed top-0 right-0 h-full z-20">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-blue-700">RecruiterHub</h1>
          <p className="text-xs text-gray-500 mt-1 truncate">{user?.name}</p>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {isAdmin ? "מנהל" : "קבלן"}
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
          >
            <LogOut size={18} />
            יציאה
          </button>
          <p className="text-[10px] text-gray-300 text-center px-1">
            v{new Date(__BUILD_TIME__).toLocaleDateString("he-IL")} {new Date(__BUILD_TIME__).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 right-0 left-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={handleLogout} className="p-1 text-gray-500 hover:text-red-500">
          <LogOut size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-base font-bold text-blue-700 leading-tight">RecruiterHub</h1>
          <p className="text-xs text-gray-400 truncate max-w-[160px]">{user?.name}</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 md:mr-56 p-4 md:p-6 max-w-6xl pt-[68px] md:pt-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 right-0 left-0 z-20 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                  active ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <Icon size={20} />
                <span className="mt-0.5 text-[10px] leading-tight text-center">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

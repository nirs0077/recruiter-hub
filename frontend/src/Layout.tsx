import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Briefcase, Users, Settings, LogOut, LayoutDashboard, UserCheck } from "lucide-react";

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
    { to: "/admin/settings", label: "הגדרות", icon: Settings },
  ];

  const contractorLinks = [
    { to: "/contractor", label: "המשרות שלי", icon: Briefcase },
  ];

  const links = isAdmin ? adminLinks : contractorLinks;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-l border-gray-200 flex flex-col shadow-sm fixed top-0 right-0 h-full z-20">
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
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
          >
            <LogOut size={18} />
            יציאה
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 mr-56 p-6 max-w-6xl">
        {children}
      </main>
    </div>
  );
}

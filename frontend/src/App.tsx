import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Layout from "./Layout";

import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminJobs from "./pages/admin/Jobs";
import AdminJobDetail from "./pages/admin/JobDetail";
import Contractors from "./pages/admin/Contractors";
import Candidates from "./pages/admin/Candidates";
import CandidateCardPage from "./pages/admin/CandidateCard";
import AdminSettings from "./pages/admin/Settings";
import ContractorDashboard from "./pages/contractor/Dashboard";
import ContractorJobDetail from "./pages/contractor/JobDetail";
import Apply from "./pages/public/Apply";
import Register from "./pages/public/Register";
import Impersonate from "./pages/Impersonate";

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/apply/:jobId/:contractorId" element={<Apply />} />
      <Route path="/register/:token" element={<Register />} />
      <Route path="/impersonate" element={<Impersonate />} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
      <Route path="/admin/jobs" element={<ProtectedRoute role="admin"><Layout><AdminJobs /></Layout></ProtectedRoute>} />
      <Route path="/admin/jobs/:jobId" element={<ProtectedRoute role="admin"><Layout><AdminJobDetail /></Layout></ProtectedRoute>} />
      <Route path="/admin/contractors" element={<ProtectedRoute role="admin"><Layout><Contractors /></Layout></ProtectedRoute>} />
      <Route path="/admin/candidates" element={<ProtectedRoute role="admin"><Layout><Candidates /></Layout></ProtectedRoute>} />
      <Route path="/admin/candidates/:candidateId" element={<ProtectedRoute role="admin"><Layout><CandidateCardPage /></Layout></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="admin"><Layout><AdminSettings /></Layout></ProtectedRoute>} />

      {/* Contractor */}
      <Route path="/contractor" element={<ProtectedRoute role="contractor"><Layout><ContractorDashboard /></Layout></ProtectedRoute>} />
      <Route path="/contractor/jobs/:jobId" element={<ProtectedRoute role="contractor"><Layout><ContractorJobDetail /></Layout></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={
        user ? <Navigate to={user.role === "admin" ? "/admin" : "/contractor"} replace /> : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "./api";

interface User {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "contractor";
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("impersonate_token") || localStorage.getItem("token");
    if (token) {
      api.get("/auth/me")
        .then((r) => setUser(r.data))
        .catch(() => {
          localStorage.removeItem("token");
          sessionStorage.removeItem("impersonate_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

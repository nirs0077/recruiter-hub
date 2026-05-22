import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Impersonate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const role = params.get("role");
    if (token) {
      sessionStorage.setItem("impersonate_token", token);
      navigate(role === "admin" ? "/admin" : "/contractor", { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="animate-spin text-blue-600 mx-auto mb-3" size={32} />
        <p className="text-gray-500 text-sm">מתחבר כמשתמש...</p>
      </div>
    </div>
  );
}

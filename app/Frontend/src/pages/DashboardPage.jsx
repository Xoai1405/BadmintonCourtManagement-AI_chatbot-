
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div>s
      <h1>Hello Day la dashboard</h1>

      <p>Xin chào, {user?.fullName || "Người dùng"}!</p>

      <button onClick={handleLogout}>
        Đăng xuất
      </button>
    </div>
  );
}

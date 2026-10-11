
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function ProtectedRoute() {
  const { token, isAuthenticated, logout } = useAuth();

  // Chưa có token
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra thời gian hết hạn của JWT
  try {
    const payloadBase64 = token.split(".")[1];

    if (!payloadBase64) {
      throw new Error("JWT không hợp lệ");
    }

    // Giải mã payload của JWT
    const normalizedBase64 = payloadBase64
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(
      atob(normalizedBase64)
    );

    // JWT có exp và đã hết hạn
    if (
      typeof payload.exp === "number" &&
      Date.now() >= payload.exp * 1000
    ) {
      logout();
      return <Navigate to="/login" replace />;
    }
  } catch {
    // Token không đọc được thì xóa phiên đăng nhập
    logout();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

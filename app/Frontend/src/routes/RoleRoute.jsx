import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Kiểm tra cấu trúc JWT và thời hạn Token
function isTokenExpiredOrMalformed(token) {
  if (!token) return true;

  try {
    const parts = token.split(".");

    if (parts.length !== 3 || !parts[1]) {
      return true;
    }

    const normalizedBase64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    // Bổ sung padding cho Base64 nếu cần
    const paddedBase64 = normalizedBase64.padEnd(
      Math.ceil(normalizedBase64.length / 4) * 4,
      "="
    );

    const payload = JSON.parse(atob(paddedBase64));

    // Bắt buộc JWT phải có exp hợp lệ
    if (
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp)
    ) {
      return true;
    }

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export default function RoleRoute({ allowedRoles = [] }) {
  const { token, user, isAuthenticated, logout } = useAuth();

  const tokenInvalid = isTokenExpiredOrMalformed(token);

  // Không thực hiện logout trực tiếp trong quá trình render
  useEffect(() => {
    if ((tokenInvalid || !user) && (token || user)) {
      logout();
    }
  }, [tokenInvalid, token, user, logout]);

  // 1. Kiểm tra Authentication
  if (!isAuthenticated || !token || !user || tokenInvalid) {
    return <Navigate to="/login" replace />;
  }

  // 2. Kiểm tra Authorization
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Cho phép truy cập
  return <Outlet />;
}
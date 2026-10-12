
import { createContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../api/authApi";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Khôi phục token đã lưu khi ứng dụng khởi động
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  // Khôi phục thông tin người dùng
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  // Đăng xuất
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  }, []);

  // Lắng nghe sự kiện phiên đăng nhập không còn hợp lệ
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener(
      "auth:unauthorized",
      handleUnauthorized
    );

    return () => {
      window.removeEventListener(
        "auth:unauthorized",
        handleUnauthorized
      );
    };
  }, [logout]);

  // Đăng nhập
  const login = async (credentials) => {
    const data = await authApi.login(credentials);

    if (!data?.token) {
      throw new Error("Backend không trả về access token");
    }

    const userData = {
      id: data.id,
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      role: data.role,
    };

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userData));

    setToken(data.token);
    setUser(userData);

    return userData;
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

import "./App.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage.jsx";
import CourtList from "./pages/CourtList";
import CourtDetail from "./pages/CourtDetail";
import BookingConfirm from "./pages/BookingConfirm.jsx"; // Import trang Xác nhận đặt sân
import DashboardPage from "./pages/DashboardPage.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import { Navigate, Route, Routes } from "react-router-dom";

function App() {
  return (
    <Routes>
      {/* 1. Các trang public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Trang chủ - Danh sách sân */}
      <Route path="/" element={<CourtList />} />
      
      {/* Xem chi tiết 1 sân cụ thể */}
      <Route path="/court/:id" element={<CourtDetail />} />

      {/* Trang xác nhận đặt sân & Modal thành công (SCRUM-35) */}
      <Route path="/court/:id/confirm" element={<BookingConfirm />} />

      {/* 2. Các trang cần đăng nhập (Protected Routes) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* 3. Bắt lỗi 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
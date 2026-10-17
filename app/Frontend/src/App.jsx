import "./App.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage.jsx";
import CourtList from "./pages/CourtList";
import CourtDetail from "./pages/CourtDetail";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import { Navigate, Route, Routes } from "react-router-dom"; // Đã bỏ import BrowserRouter

function App() {
  return (
    <Routes>
      {/* 1. Các trang public (Ai cũng xem được) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      
      

      {/* 2. Các trang cần đăng nhập (Protected Routes) */}
      <Route element={<ProtectedRoute />}>
      <Route path="/court/:id" element={<CourtDetail />} />
        <Route path="/dashboard" element={<DashboardPage />} />
       
      <Route path="/" element={<CourtList />} />
      
      
      </Route>

      {/* 3. Bắt lỗi 404 - Đường dẫn không tồn tại */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
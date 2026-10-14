
import "./App.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CourtManagementPage from "./pages/admin/CourtManagementPage.jsx";
import PriceManagementPage from "./pages/admin/PriceManagementPage.jsx";
import DiscountManagementPage from "./pages/admin/DiscountManagementPage.jsx";
import StaffManagementPage from "./pages/admin/StaffManagementPage.jsx";
import CustomerManagementPage from "./pages/admin/CustomerManagementPage.jsx";
import ReportsPage from "./pages/admin/ReportsPage.jsx";
import FaqChatbotPage from "./pages/admin/FaqChatbotPage.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";
function App() {
    return (

    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* Các trang quản lý dùng chung sidebar; nội dung từng trang nằm trong Outlet. */}
      <Route element={<AdminLayout />}>
        <Route path="/courts" element={<CourtManagementPage />} />
        <Route path="/prices" element={<PriceManagementPage />} />
        <Route path="/discounts" element={<DiscountManagementPage />} />
        <Route path="/staff" element={<StaffManagementPage />} />
        <Route path="/customers" element={<CustomerManagementPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/faq-chatbot" element={<FaqChatbotPage />} />
      </Route>

      <Route
        path="/register"
        element={<RegisterPage />}
      />
     
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>

    );
}

export default App;

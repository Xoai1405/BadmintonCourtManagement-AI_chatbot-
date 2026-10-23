import "./App.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage.jsx";
import CourtList from "./pages/CourtList";
import CourtDetail from "./pages/CourtDetail";
import BookingConfirm from "./pages/BookingConfirm.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CourtManagementPage from "./pages/admin/CourtManagementPage.jsx";
import PriceManagementPage from "./pages/admin/PriceManagementPage.jsx";
import DiscountManagementPage from "./pages/admin/DiscountManagementPage.jsx";
import StaffManagementPage from "./pages/admin/StaffManagementPage.jsx";
import CustomerManagementPage from "./pages/admin/CustomerManagementPage.jsx";
import ReportsPage from "./pages/admin/ReportsPage.jsx";
import FaqChatbotPage from "./pages/admin/FaqChatbotPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import FeaturePlaceholderPage from "./pages/FeaturePlaceholderPage.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import SingleBookingDetail from "./pages/SingleBookingDetail.jsx"; // [ĐÃ THÊM] Import component chi tiết
import AdminLayout from "./components/layout/AdminLayout.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import StaffLayout from "./components/layout/StaffLayout.jsx";
import BookingLookupPage from "./pages/staff/BookingLookupPage.jsx";
import BookingDetailPage from "./pages/staff/BookingDetailPage.jsx";
import { Navigate, Route, Routes } from "react-router-dom";

function App() {
  return (
    <Routes>
      {/* 1. Các trang public (Ai cũng xem được) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Panel nhân viên mở trực tiếp, không yêu cầu đăng nhập. */}
      <Route element={<StaffLayout />}>
        <Route path="/staff/create-booking" element={null} />
        <Route path="/staff/bookings" element={<BookingLookupPage />} />
        <Route path="/staff/bookings/:id" element={<BookingDetailPage />} />
      </Route>
      
      {/* 2. Các trang cần đăng nhập (Protected Routes) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/courts/:id" element={<CourtDetail />} />
        <Route path="/courts/:id/confirm" element={<BookingConfirm />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/" element={<CourtList />} />
        <Route path="/recurring-bookings" element={<FeaturePlaceholderPage title="Lịch cố định" description="Quản lý các lịch đặt sân định kỳ của bạn." />} />
        
        {/* Quản lý Booking */}
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/my-bookings/:id" element={<SingleBookingDetail />} />
        
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Panel quản lý mở trực tiếp, không yêu cầu đăng nhập. */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Navigate to="/courts" replace />} />
        <Route path="/courts" element={<CourtManagementPage />} />
        <Route path="/prices" element={<PriceManagementPage />} />
        <Route path="/discounts" element={<DiscountManagementPage />} />
        <Route path="/staff" element={<StaffManagementPage />} />
        <Route path="/customers" element={<CustomerManagementPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/faq-chatbot" element={<FaqChatbotPage />} />
      </Route>

      {/* 3. Bắt lỗi 404 - Đường dẫn không tồn tại */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

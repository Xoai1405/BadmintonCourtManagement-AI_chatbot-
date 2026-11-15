import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import RoleRoute from "./RoleRoute";

import StaffLayout from "../components/layout/StaffLayout";
import ManagerLayout from "../components/layout/ManagerLayout";
// Auth
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import VerifyEmailPage from "../pages/auth/VerifyEmailPage";
import CheckEmailPage from "../pages/auth/CheckEmailPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";

// Customer
import CourtList from "../pages/customer/CourtList";
import CourtDetail from "../pages/customer/CourtDetail";
import BookingConfirm from "../pages/customer/BookingConfirm";
import DashboardPage from "../pages/customer/DashboardPage";
import RecurringBooking from "../pages/customer/RecurringBooking";
import MyBookings from "../pages/customer/MyBookings";
import SingleBookingDetail from "../pages/customer/SingleBookingDetail";
import ProfilePage from "../pages/customer/ProfilePage";
import CustomerLayout from "../components/layout/CustomerLayout";

// Staff
import BookingLookupPage from "../pages/staff/BookingLookupPage";
import BookingDetailPage from "../pages/staff/BookingDetailPage";
import StaffBookingCreate from "../pages/staff/StaffBookingCreate";

// Manager
import CourtManagementPage from "../pages/manager/CourtManagementPage";
import PriceManagementPage from "../pages/manager/PriceManagementPage";
import DiscountManagementPage from "../pages/manager/DiscountManagementPage";
import StaffManagementPage from "../pages/manager/StaffManagementPage";
import CustomerManagementPage from "../pages/manager/CustomerManagementPage";
import ReportsPage from "../pages/manager/ReportsPage";
import FaqChatbotPage from "../pages/manager/FaqChatbotPage";
import ServiceManagementPage from "../pages/manager/ServiceManagementPage";

// System
import UnauthorizedPage from "../pages/system/UnauthorizedPage";

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const defaultRoutes = {
    CUSTOMER: "/customer/courts",
    STAFF: "/staff/bookings",
    MANAGER: "/manager/courts",
  };

  return <Navigate to={defaultRoutes[user.role] || "/unauthorized"} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* CUSTOMER AREA */}
      <Route element={<RoleRoute allowedRoles={["CUSTOMER"]} />}>
        <Route element={<CustomerLayout />}>
          <Route path="/customer/courts" element={<CourtList />} />

          <Route path="/customer/courts/:id" element={<CourtDetail />} />

          <Route
            path="/customer/courts/:id/confirm"
            element={<BookingConfirm />}
          />

          <Route path="/customer/dashboard" element={<DashboardPage />} />

          <Route
            path="/customer/recurring-bookings"
            element={<RecurringBooking />}
          />

          <Route path="/customer/bookings" element={<MyBookings />} />

          <Route
            path="/customer/bookings/:id"
            element={<SingleBookingDetail />}
          />

          <Route path="/customer/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* STAFF AREA */}
      <Route element={<RoleRoute allowedRoles={["STAFF", "MANAGER"]} />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff/bookings" element={<BookingLookupPage />} />
          <Route path="/staff/bookings/:id" element={<BookingDetailPage />} />
          <Route
            path="/staff/create-booking"
            element={<StaffBookingCreate />}
          />
        </Route>
      </Route>

      {/* MANAGER AREA */}
      <Route element={<RoleRoute allowedRoles={["MANAGER"]} />}>
        <Route element={<ManagerLayout />}>
          <Route path="/manager/courts" element={<CourtManagementPage />} />
          <Route path="/manager/prices" element={<PriceManagementPage />} />
          <Route
            path="/manager/discounts"
            element={<DiscountManagementPage />}
          />
          <Route path="/manager/staff" element={<StaffManagementPage />} />
          <Route
            path="/manager/customers"
            element={<CustomerManagementPage />}
          />
          <Route path="/manager/reports" element={<ReportsPage />} />
          <Route path="/manager/faq-chatbot" element={<FaqChatbotPage />} />
          <Route path="/manager/services" element={<ServiceManagementPage />} />
        </Route>
      </Route>

      {/* SYSTEM */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route path="/" element={<HomeRedirect />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

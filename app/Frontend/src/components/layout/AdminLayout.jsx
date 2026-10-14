import { useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../../AdminLayout.css";
import SmashFlowLogo from "../../assets/Logo.png";

// Mỗi mục có đường dẫn riêng; NavLink tự xác định mục đang mở theo URL.
const menuItems = [
  { icon: "🗄️", label: "Danh sách sân", path: "/courts" },
  { icon: "💸", label: "Bảng giá", path: "/prices" },
  { icon: "🏷️", label: "Chiết khấu", path: "/discounts" },
  { icon: "👨‍💼", label: "Nhân viên", path: "/staff" },
  { icon: "👥", label: "Khách hàng", path: "/customers" },
  { icon: "📊", label: "Báo cáo", path: "/reports" },
  { icon: "🤖", label: "FAQ Chatbot", path: "/faq-chatbot" },
];

// Danh sách sân ban đầu để rỗng; dữ liệu thêm qua form hiện chỉ là dữ liệu mock.
const mockCourts = [];

// Giá mẫu giữ theo mức giá của màn Court ban đầu; hai màn dùng chung dữ liệu.
// Giờ thường: 06:00–17:00; giờ cao điểm: 17:00–22:00. Chưa lưu vào database.
const mockPriceConfigs = [
  { priceConfigId: 1, courtType: "STANDARD_OUTDOOR", startTime: "06:00", endTime: "17:00", pricePerHour: 100000, isPeakHour: false },
  { priceConfigId: 2, courtType: "STANDARD_OUTDOOR", startTime: "17:00", endTime: "22:00", pricePerHour: 150000, isPeakHour: true },
  { priceConfigId: 3, courtType: "VIP_INDOOR", startTime: "06:00", endTime: "17:00", pricePerHour: 250000, isPeakHour: false },
  { priceConfigId: 4, courtType: "VIP_INDOOR", startTime: "17:00", endTime: "22:00", pricePerHour: 350000, isPeakHour: true },
  { priceConfigId: 5, courtType: "STANDARD_INDOOR", startTime: "06:00", endTime: "17:00", pricePerHour: 90000, isPeakHour: false },
  { priceConfigId: 6, courtType: "STANDARD_INDOOR", startTime: "17:00", endTime: "22:00", pricePerHour: 190000, isPeakHour: true },
];

export default function AdminLayout() {
  // Giữ state ở layout để chuyển menu rồi quay lại không mất các sân vừa thêm.
  // State vẫn được khởi tạo lại khi tải lại trang hoặc rời khỏi khu vực quản lý.
  const [courts, setCourts] = useState(mockCourts);
  const nextCourtId = useRef(Math.max(0, ...mockCourts.map((court) => court.courtId)) + 1);

  // Cấp ID tại nơi sở hữu bộ đếm, thay vì để trang con sửa trực tiếp ref của layout.
  const allocateCourtId = () => nextCourtId.current++;

  const [priceConfigs, setPriceConfigs] = useState(mockPriceConfigs);
  const nextPriceConfigId = useRef(Math.max(0, ...mockPriceConfigs.map((config) => config.priceConfigId)) + 1);
  const allocatePriceConfigId = () => nextPriceConfigId.current++;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <img src={SmashFlowLogo} alt="SmashFlow" className="admin-logo" />
          <span className="admin-sidebar-title">Panel Quản lý</span>
        </div>

        <nav aria-label="Menu quản lý" className="admin-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `admin-nav-item${isActive ? " admin-nav-item--active" : ""}`
              }
            >
              <span aria-hidden="true" className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-brand">
            <span className="admin-brand-smash">Smash</span>
            <span className="admin-brand-flow">Flow</span>
          </div>
          <p className="admin-user">Đăng nhập: Quản lý — BảoDZ</p>
        </div>
      </aside>

      {/* Nội dung route hiện tại; trang chưa triển khai trả về null để phần này trống. */}
      <main className="admin-main">
        <Outlet context={{ courts, setCourts, allocateCourtId, priceConfigs, setPriceConfigs, allocatePriceConfigId }} />
      </main>
    </div>
  );
}

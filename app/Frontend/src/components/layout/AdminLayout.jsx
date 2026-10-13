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

export default function AdminLayout() {
  // Giữ state ở layout để chuyển menu rồi quay lại không mất các sân vừa thêm.
  // State vẫn được khởi tạo lại khi tải lại trang hoặc rời khỏi khu vực quản lý.
  const [courts, setCourts] = useState(mockCourts);
  const nextCourtId = useRef(Math.max(0, ...mockCourts.map((court) => court.courtId)) + 1);

  // Cấp ID tại nơi sở hữu bộ đếm, thay vì để trang con sửa trực tiếp ref của layout.
  const allocateCourtId = () => nextCourtId.current++;

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
        <Outlet context={{ courts, setCourts, allocateCourtId }} />
      </main>
    </div>
  );
}

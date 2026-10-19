import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.css";
import SmashFlowLogo from "../../assets/Logo.png";
import { adminApi } from "../../api/adminApi.js";
import { priceConfigApi } from "../../api/priceConfigApi.js";
import { businessHourApi } from "../../api/businessHourApi.js";
import ChatbotButton from "../ChatbotButton.jsx";

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

export default function AdminLayout() {
  // Layout giữ kết quả mock API để sân và bảng giá dùng chung dữ liệu khi chuyển menu.
  const [courts, setCourts] = useState([]);
  const [priceConfigs, setPriceConfigs] = useState([]);
  const [businessHourConfig, setBusinessHourConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Không cập nhật state sau khi layout unmount; hỗ trợ StrictMode.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.getCourts(),
      priceConfigApi.getAll(),
      businessHourApi.get(),
    ])
      .then(([courtList, priceList, businessHours]) => {
        if (cancelled) return;
        setCourts(courtList);
        setPriceConfigs(priceList);
        setBusinessHourConfig(businessHours);
      })
      .catch((error) => { if (!cancelled) setLoadError(error.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
        {isLoading ? <p role="status">Đang tải dữ liệu quản lý…</p>
          : loadError ? <p role="alert">{loadError}</p>
          : <Outlet context={{
            courts,
            setCourts,
            priceConfigs,
            setPriceConfigs,
            businessHourConfig,
            setBusinessHourConfig,
          }} />}
      </main>
      <ChatbotButton />
    </div>
  );
}

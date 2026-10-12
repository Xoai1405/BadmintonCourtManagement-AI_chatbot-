import "../AdminLayout.css";

const menuItems = [
  { icon: "🗄️", label: "Danh sách sân", active: true },
  { icon: "💸", label: "Bảng giá" },
  { icon: "🏷️", label: "Chiết khấu" },
  { icon: "👨‍💼", label: "Nhân viên" },
  { icon: "👥", label: "Khách hàng" },
  { icon: "📊", label: "Báo cáo" },
  { icon: "🤖", label: "FAQ Chatbot" },
];

const courts = [
  {
    id: 1,
    name: "Sân 01",
    type: "Standard_Outdoor",
    basePrice: 100000,
    peakPrice: 150000,
    status: "ACTIVE",
  },
  {
    id: 2,
    name: "Sân VIP 02",
    type: "VIP_Indoor",
    basePrice: 250000,
    peakPrice: 350000,
    status: "MAINTENANCE",
  },
  {
    id: 3,
    name: "Sân 03",
    type: "Standard_Indoor",
    basePrice: 90000,
    peakPrice: 190000,
    status: "CLOSED",
  },
];

const statusStyles = {
  ACTIVE: {
    label: "Hoạt động",
    className: "court-status--active",
  },
  MAINTENANCE: {
    label: "Bảo trì",
    className: "court-status--maintenance",
  },
  CLOSED: {
    label: "Đóng",
    className: "court-status--closed",
  },
};

const priceFormatter = new Intl.NumberFormat("vi-VN");

export default function CourtManagementPage() {
  return (
    <div className="admin-layout">
      {/* Sidebar bên trái */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo-placeholder">
            LOGO
          </div>

          <span className="admin-sidebar-title">
            Panel Quản lý
          </span>
        </div>

        <nav aria-label="Menu quản lý" className="admin-nav">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-current={item.active ? "page" : undefined}
              className={`admin-nav-item${item.active ? " admin-nav-item--active" : ""}`}
            >
              <span aria-hidden="true" className="admin-nav-icon">
                {item.icon}
              </span>

              <span className="admin-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-brand">
            <span className="admin-brand-smash">Smash</span>
            <span className="admin-brand-flow">Flow</span>
          </div>

          <p className="admin-user">
            Đăng nhập: Quản lý — BảoDZ
          </p>
        </div>
      </aside>

      {/* Nội dung trang */}
      <main className="admin-main">
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-title">
              Quản lý sân
            </h1>

            <p className="admin-page-description">
              Quản lý thông tin và trạng thái vận hành của từng sân
            </p>
          </div>

          <button
            type="button"
            className="admin-primary-button"
          >
            + Thêm sân
          </button>
        </header>

        {/* Bảng có thể cuộn ngang trên màn hình nhỏ */}
        <div className="court-table-wrapper">
          <table className="court-table">
            <thead>
              <tr>
                <th scope="col">
                  Tên sân
                </th>
                <th scope="col">
                  Loại
                </th>
                <th scope="col">
                  Giá cơ bản
                </th>
                <th scope="col">
                  Giá giờ cao điểm
                </th>
                <th scope="col">
                  Trạng thái
                </th>
                <th scope="col">
                  <span className="admin-visually-hidden">Thao tác</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {courts.map((court) => {
                const status = statusStyles[court.status];
                const isClosed = court.status === "CLOSED";

                return (
                  <tr key={court.id}>
                    <td>
                      {court.name}
                    </td>

                    <td>
                      {court.type}
                    </td>

                    <td>
                      {priceFormatter.format(court.basePrice)}đ/Giờ
                    </td>

                    <td>
                      {priceFormatter.format(court.peakPrice)}đ/Giờ
                    </td>

                    <td>
                      <span
                        className={`court-status ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    <td>
                      <div className="court-actions">
                        <button
                          type="button"
                          aria-label={`Xóa ${court.name}`}
                          className="court-action-button court-action-button--delete"
                        >
                          Xóa
                        </button>

                        <button
                          type="button"
                          aria-label={`Sửa ${court.name}`}
                          className="court-action-button"
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          aria-label={`${
                            isClosed ? "Kích hoạt" : "Ẩn"
                          } ${court.name}`}
                          className={
                            isClosed
                              ? "court-action-button court-action-button--activate"
                              : "court-action-button"
                          }
                        >
                          {isClosed ? "Kích hoạt" : "Ẩn"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

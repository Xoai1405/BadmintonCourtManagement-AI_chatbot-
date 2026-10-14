import { useRef, useState } from "react";
import { History, Search } from "lucide-react";

// Tạo lịch sử mẫu để số lần đặt và chi tiêu trong bảng khớp với popup.
// Khi có API, thay dữ liệu mẫu này bằng danh sách khách hàng và lịch sử từ backend.
const createMockBookings = (customerId, count, amount) =>
  Array.from({ length: count }, (_, index) => ({
    id: `MOCK-${customerId}-${index + 1}`,
    date: `${String(13 - index).padStart(2, "0")}/10/2026`,
    court: "Sân 01",
    time: "18:00 – 20:00",
    amount,
  }));

const mockCustomers = [
  {
    id: 1,
    fullName: "Nguyễn Văn A",
    phone: "0909 123 456",
    email: "c.le@email.com",
    status: "ACTIVE",
    bookings: createMockBookings(1, 12, 200000),
  },
  {
    id: 2,
    fullName: "Trần Thị B",
    phone: "0909 456 789",
    email: "PVD42@email.com",
    status: "LOCKED",
    bookings: createMockBookings(2, 5, 220000),
  },
];

const emptyFilters = { name: "", phone: "", email: "" };
const moneyFormatter = new Intl.NumberFormat("vi-VN");
const formatMoney = (amount) => `${moneyFormatter.format(amount)}đ`;
const getSpending = (customer) =>
  customer.bookings.reduce((total, booking) => total + booking.amount, 0);

// Chuẩn hóa tên để tìm được cả khi nhập không dấu; SĐT bỏ khoảng trắng/dấu ngăn cách.
const normalizeName = (value) => value.trim().toLocaleLowerCase("vi-VN")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const normalizePhone = (value) => value.replace(/[\s().+-]/g, "");
const statusLabels = { ACTIVE: "Active", LOCKED: "Locked" };

export default function CustomerManagementPage() {
  // Tách dữ liệu đang nhập khỏi bộ lọc đã áp dụng: chỉ lọc khi bấm Tìm kiếm/Enter.
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const historyDialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  const visibleCustomers = mockCustomers.filter((customer) =>
    normalizeName(customer.fullName).includes(normalizeName(appliedFilters.name)) &&
    normalizePhone(customer.phone).includes(normalizePhone(appliedFilters.phone.trim())) &&
    customer.email.toLowerCase().includes(appliedFilters.email.trim().toLowerCase())
  );

  const updateFilter = (field, value) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  };

  // Native dialog giữ focus trong popup, hỗ trợ Escape và trả focus về nút mở.
  const openHistory = (customer) => {
    setSelectedCustomer(customer);
    historyDialogRef.current.showModal();
    closeButtonRef.current.focus();
  };

  return (
    <section className="customer-page" aria-labelledby="customer-page-title">
      {/* Giữ bố cục bản mẫu: tiêu đề, hàng tìm kiếm, rồi bảng khách hàng. */}
      <header className="admin-page-header customer-page-header">
        <h1 id="customer-page-title" className="admin-page-title">Quản lý khách hàng</h1>
      </header>

      {/* Ba trường nằm cùng hàng với nút tìm kiếm; email cho phép tìm một phần. */}
      <form className="customer-search-form" onSubmit={handleSearch} role="search" aria-label="Tìm khách hàng">
        <label htmlFor="customer-name" className="customer-filter-field">
          Tên khách hàng
          <input id="customer-name" name="name" type="text" placeholder="Nguyễn Văn A"
            value={filters.name} onChange={(event) => updateFilter("name", event.target.value)} />
        </label>
        <label htmlFor="customer-phone" className="customer-filter-field">
          SĐT
          <input id="customer-phone" name="phone" type="tel" placeholder="0909 xxx xxx"
            value={filters.phone} onChange={(event) => updateFilter("phone", event.target.value)} />
        </label>
        <label htmlFor="customer-email" className="customer-filter-field">
          Email
          <input id="customer-email" name="email" type="text" inputMode="email" placeholder="XXXXX@email.com"
            value={filters.email} onChange={(event) => updateFilter("email", event.target.value)} />
        </label>
        <button type="submit" className="customer-search-button">
          <Search size={21} aria-hidden="true" />Tìm kiếm
        </button>
      </form>

      {/* SĐT và Email là hai cột riêng, đúng thứ tự của bảng trong ảnh. */}
      <div className="admin-table-wrapper" tabIndex={0} role="region" aria-label="Danh sách khách hàng, có thể cuộn ngang">
        <table className="admin-table customer-table">
          <thead>
            <tr>
              <th scope="col">Họ tên</th>
              <th scope="col">SĐT</th>
              <th scope="col">Email</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Số lần đặt</th>
              <th scope="col">Chi tiêu</th>
              <th scope="col"><span className="admin-visually-hidden">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.fullName}</td>
                <td>{customer.phone}</td>
                <td>{customer.email}</td>
                <td>
                  <span className={`customer-status customer-status--${customer.status.toLowerCase()}`}>
                    <span aria-hidden="true" />{statusLabels[customer.status]}
                  </span>
                </td>
                <td>{customer.bookings.length}</td>
                <td>{formatMoney(getSpending(customer))}</td>
                <td>
                  <button type="button" className="admin-action-button customer-history-button"
                    aria-label={`Xem lịch sử của ${customer.fullName}`} onClick={() => openHistory(customer)}>
                    <History size={15} aria-hidden="true" />Xem lịch sử
                  </button>
                </td>
              </tr>
            ))}
            {visibleCustomers.length === 0 && (
              <tr><td colSpan={7} className="customer-empty" role="status">
                Không tìm thấy khách hàng. Hãy đổi thông tin tìm kiếm hoặc để trống các ô rồi tìm lại.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Popup chỉ xuất hiện khi xem lịch sử; dữ liệu minh họa chưa được lưu vào database. */}
      <dialog ref={historyDialogRef} className="customer-history-dialog"
        aria-labelledby="customer-history-title" aria-describedby="customer-history-note"
        onClose={() => setSelectedCustomer(null)}>
        <h2 id="customer-history-title">Lịch sử đặt sân</h2>
        <p id="customer-history-note" className="customer-history-note">Dữ liệu mẫu, chưa kết nối backend.</p>
        {selectedCustomer && (
          <>
            <p className="customer-history-name">{selectedCustomer.fullName}</p>
            <p className="customer-history-summary">
              {selectedCustomer.bookings.length} lần đặt · Chi tiêu: {formatMoney(getSpending(selectedCustomer))}
            </p>
            <div className="admin-table-wrapper">
              <table className="admin-table customer-history-table" aria-label={`Lịch sử của ${selectedCustomer.fullName}`}>
                <thead>
                  <tr><th scope="col">Ngày</th><th scope="col">Sân</th><th scope="col">Khung giờ</th><th scope="col">Chi tiêu</th></tr>
                </thead>
                <tbody>
                  {selectedCustomer.bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.date}</td><td>{booking.court}</td>
                      <td>{booking.time}</td><td>{formatMoney(booking.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <footer className="customer-history-actions">
          <button ref={closeButtonRef} type="button" className="admin-action-button customer-history-button"
            onClick={() => historyDialogRef.current.close()}>Đóng</button>
        </footer>
      </dialog>
    </section>
  );
}

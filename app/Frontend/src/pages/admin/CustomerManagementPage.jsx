import { useEffect, useRef, useState } from "react";
import { History, Search } from "lucide-react";
import { adminApi } from "../../api/adminApi.js";
import BookingHistory from "../../components/booking/BookingHistory.jsx";

const emptyFilters = { name: "", phone: "", email: "" };
const moneyFormatter = new Intl.NumberFormat("vi-VN");
const formatMoney = (amount) => `${moneyFormatter.format(amount)}đ`;
const statusLabels = { ACTIVE: "Active", LOCKED: "Locked" };

export default function CustomerManagementPage() {
  // Danh sách và bộ lọc đi qua mock API; không lọc ngay trong lúc đang nhập.
  const [filters, setFilters] = useState(emptyFilters);
  const [visibleCustomers, setVisibleCustomers] = useState([]);
  const [isPending, setIsPending] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const historyDialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const bookingHistoryRef = useRef(null);

  // Tải danh sách ban đầu; không cập nhật state khi trang đã unmount.
  useEffect(() => {
    let cancelled = false;
    adminApi.getCustomers()
      .then((customers) => { if (!cancelled) setVisibleCustomers(customers); })
      .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setIsPending(false); });
    return () => { cancelled = true; };
  }, []);

  const updateFilter = (field, value) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (isPending) return;
    setIsPending(true);
    setRequestError("");
    try {
      setVisibleCustomers(await adminApi.getCustomers(filters));
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  // Tải lịch sử bằng request riêng. Native dialog giữ focus và hỗ trợ Escape.
  const openHistory = async (customer) => {
    if (isPending) return;
    setIsPending(true);
    setRequestError("");
    try {
      const bookings = await adminApi.getCustomerBookings(customer.id);
      if (!historyDialogRef.current) return;
      setSelectedCustomer({ ...customer, bookings });
      historyDialogRef.current.showModal();
      closeButtonRef.current.focus();
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsPending(false);
    }
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
        <button disabled={isPending} type="submit" className="customer-search-button">
          <Search size={21} aria-hidden="true" />Tìm kiếm
        </button>
      </form>

      {/* Chỉ hiển thị thông báo khi đang chờ hoặc request gặp lỗi. */}
      {isPending && <p role="status" className="admin-notice">Đang tải dữ liệu khách hàng…</p>}
      {requestError && <p role="alert" className="court-form-error">{requestError}</p>}

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
                <td>{customer.bookingCount}</td>
                <td>{formatMoney(customer.totalSpending)}</td>
                <td>
                  <button disabled={isPending} type="button" className="admin-action-button customer-history-button"
                    aria-label={`Xem lịch sử của ${customer.fullName}`} onClick={() => openHistory(customer)}>
                    <History size={15} aria-hidden="true" />Xem lịch sử
                  </button>
                </td>
              </tr>
            ))}
            {visibleCustomers.length === 0 && !isPending && !requestError && (
              <tr><td colSpan={7} className="customer-empty" role="status">
                Không tìm thấy khách hàng. Hãy đổi thông tin tìm kiếm hoặc để trống các ô rồi tìm lại.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Popup lịch sử giữ bố cục bản mẫu: tiêu đề, tab, bộ lọc và từng dòng booking. */}
      <dialog ref={historyDialogRef} className="customer-history-dialog"
        aria-labelledby="customer-history-title"
        onCancel={(event) => {
          // Escape đóng bộ lọc của component chung trước, lần sau mới đóng popup.
          if (bookingHistoryRef.current?.dismissOpenFilter()) event.preventDefault();
        }}
        onClose={() => setSelectedCustomer(null)}>
        <h2 id="customer-history-title">
          {selectedCustomer
            ? `Lịch sử: ${selectedCustomer.fullName} - ${selectedCustomer.phone} - ${selectedCustomer.email}`
            : "Lịch sử khách hàng"}
        </h2>

        {/* API vẫn thuộc trang admin; component dùng chung nhận dữ liệu qua props. */}
        {selectedCustomer && <BookingHistory key={selectedCustomer.id} ref={bookingHistoryRef}
          bookings={selectedCustomer.bookings} variant="modal" scrollContainerRef={historyDialogRef}
          loadBookingDetail={(bookingId) => adminApi.getCustomerBookingDetail(selectedCustomer.id, bookingId)} />}

        <footer className="customer-history-actions">
          <button ref={closeButtonRef} type="button" className="customer-history-close"
            onClick={() => historyDialogRef.current.close()}>Đóng</button>
        </footer>
      </dialog>
    </section>
  );
}

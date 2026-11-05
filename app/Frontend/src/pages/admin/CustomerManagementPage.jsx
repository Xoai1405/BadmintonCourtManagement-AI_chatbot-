import { useEffect, useId, useRef, useState } from "react";
import { History, Mail, Phone, Search, X } from "lucide-react";
import { adminApi } from "../../api/adminApi.js";
import BookingHistory from "../../components/booking/BookingHistory.jsx";

const emptyFilters = { name: "", phone: "", email: "" };
const moneyFormatter = new Intl.NumberFormat("vi-VN");
const formatMoney = (amount) => `${moneyFormatter.format(amount)}đ`;
const statusLabels = { ACTIVE: "Active", LOCKED: "Locked" };
const normalizeSuggestion = (value, field) => field === "phone"
  ? value.replace(/[\s().+-]/g, "")
  : value.trim().toLocaleLowerCase("vi-VN").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

// Mỗi ô gợi ý độc lập, cùng cách tương tác như ô tìm khách bên màn staff.
function CustomerSearchInput({ field, label, placeholder, value, customers, onChange }) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const customerField = field === "name" ? "fullName" : field;
  const term = normalizeSuggestion(value, field);
  const seen = new Set();
  const suggestions = term ? customers.filter((customer) => {
    const candidate = normalizeSuggestion(customer[customerField] ?? "", field);
    if (!candidate.includes(term) || seen.has(candidate)) return false;
    seen.add(candidate);
    return true;
  }).slice(0, 6) : [];
  const expanded = isOpen && suggestions.length > 0;
  const choose = (customer) => {
    onChange(customer[customerField]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="customer-filter-field">
      <label htmlFor={listId}>{label}</label>
      <div className="customer-autocomplete">
        <input id={listId} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
          aria-controls={expanded ? `${listId}-options` : undefined}
          aria-activedescendant={expanded && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          autoComplete="off" type={field === "phone" ? "tel" : "text"}
          inputMode={field === "email" ? "email" : undefined} placeholder={placeholder} value={value}
          onChange={(event) => { onChange(event.target.value); setActiveIndex(-1); setIsOpen(true); }}
          onFocus={() => { setIsOpen(true); setActiveIndex(-1); }}
          onClick={() => setIsOpen(true)}
          onBlur={() => { setIsOpen(false); setActiveIndex(-1); }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.length) {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((previous) => !expanded || previous < 0
                ? (event.key === "ArrowDown" ? 0 : suggestions.length - 1)
                : (previous + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
            } else if (event.key === "Enter") {
              if (expanded && activeIndex >= 0) { event.preventDefault(); choose(suggestions[activeIndex]); }
              else setIsOpen(false);
            } else if (event.key === "Escape" && isOpen) {
              event.preventDefault(); setIsOpen(false); setActiveIndex(-1);
            }
          }} />
        {expanded && <ul id={`${listId}-options`} className="customer-suggestions" role="listbox" aria-label={`Gợi ý ${label.toLocaleLowerCase("vi-VN")}`}>
          {suggestions.map((customer, index) => <li id={`${listId}-option-${index}`} key={customer.id}
            role="option" aria-selected={activeIndex === index} className={activeIndex === index ? "is-active" : ""}
            onPointerDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)}
            onClick={() => choose(customer)}>
            <Search size={16} aria-hidden="true" />
            <span><strong>{customer[customerField]}</strong><small>{field === "name" ? customer.phone : customer.fullName}</small></span>
          </li>)}
        </ul>}
      </div>
    </div>
  );
}

export default function CustomerManagementPage() {
  // Danh sách và bộ lọc đi qua mock API; không lọc ngay trong lúc đang nhập.
  const [filters, setFilters] = useState(emptyFilters);
  const [customerDirectory, setCustomerDirectory] = useState([]);
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
      .then((customers) => {
        if (!cancelled) {
          setCustomerDirectory(customers);
          setVisibleCustomers(customers);
        }
      })
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

      {/* Ba trường nằm cùng hàng; từng ô gợi ý độc lập như màn tra cứu booking của staff. */}
      <form className="customer-search-form" onSubmit={handleSearch} role="search" aria-label="Tìm khách hàng">
        <CustomerSearchInput field="name" label="Tên khách hàng" placeholder="Nguyễn Văn A"
          value={filters.name} customers={customerDirectory} onChange={(value) => updateFilter("name", value)} />
        <CustomerSearchInput field="phone" label="SĐT" placeholder="0909 xxx xxx"
          value={filters.phone} customers={customerDirectory} onChange={(value) => updateFilter("phone", value)} />
        <CustomerSearchInput field="email" label="Email" placeholder="XXXXX@email.com"
          value={filters.email} customers={customerDirectory} onChange={(value) => updateFilter("email", value)} />
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
        <header className="customer-history-heading">
          <div className="customer-history-title-wrap">
            <span className="customer-history-title-icon" aria-hidden="true"><History size={22} /></span>
            <div>
              <span className="customer-history-eyebrow">Quản lý khách hàng</span>
              <h2 id="customer-history-title">Lịch sử đặt sân</h2>
            </div>
          </div>
          {selectedCustomer && <div className="customer-history-identity" aria-label="Thông tin khách hàng">
            <strong>{selectedCustomer.fullName}</strong>
            <span><Phone size={14} aria-hidden="true" />{selectedCustomer.phone}</span>
            <span><Mail size={14} aria-hidden="true" />{selectedCustomer.email}</span>
          </div>}
        </header>

        {/* API vẫn thuộc trang admin; component dùng chung nhận dữ liệu qua props. */}
        {selectedCustomer && <BookingHistory key={selectedCustomer.id} ref={bookingHistoryRef}
          bookings={selectedCustomer.bookings} variant="modal" scrollContainerRef={historyDialogRef}
          loadBookingDetail={(bookingId) => adminApi.getCustomerBookingDetail(selectedCustomer.id, bookingId)} />}

        <footer className="customer-history-actions">
          <button ref={closeButtonRef} type="button" className="customer-history-close"
            onClick={() => historyDialogRef.current.close()}><X size={16} aria-hidden="true" />Đóng</button>
        </footer>
      </dialog>
    </section>
  );
}

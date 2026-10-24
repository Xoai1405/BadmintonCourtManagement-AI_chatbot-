import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, ClipboardList, Search } from "lucide-react";
import BookingMultiSelect from "../../components/booking/BookingMultiSelect.jsx";
import DateRangePicker from "../../components/booking/DateRangePicker.jsx";
import { Link } from "react-router-dom";
import { bookingApi, bookingStatusLabel, formatBookingDate, formatBookingDays, formatBookingMoney, staffBookingStatuses, staffBookingTypes, staffRecurringStatuses } from "../../api/bookingApi.js";

const emptyFilters = { name: "", phone: "", email: "", courtIds: [], fromDate: "", toDate: "" };
const allStatusOptions = [
  ...staffBookingStatuses.filter((item) => item.value !== "ALL").map((item) => ({ ...item, value: `SINGLE:${item.value}`, type: "SINGLE", group: "Đặt sân lẻ" })),
  ...staffRecurringStatuses.map((item) => ({ ...item, value: `RECURRING:${item.value}`, type: "RECURRING", group: "Lịch cố định" })),
];
const paymentOptions = [{ value: "UNPAID", label: "Chưa thanh toán" }, { value: "PAID", label: "Đã thanh toán" }];

const normalizeSuggestion = (value, field) => field === "phone"
  ? value.replace(/[\s().+-]/g, "")
  : value.trim().toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

function CustomerSearchInput({ field, label, placeholder = label, value, customers, onChange, onFocus }) {
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
    <div className="staff-customer-autocomplete">
      <input role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off" type={field === "phone" ? "tel" : "text"}
        inputMode={field === "email" ? "email" : undefined} placeholder={placeholder} value={value}
        onChange={(event) => { onChange(event.target.value); setActiveIndex(-1); setIsOpen(true); }}
        onFocus={() => { setIsOpen(true); setActiveIndex(-1); onFocus(); }}
        onClick={() => setIsOpen(true)} onBlur={() => { setIsOpen(false); setActiveIndex(-1); }}
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
      {expanded && <ul id={listId} className="staff-customer-suggestions" role="listbox" aria-label={`Gợi ý ${label.toLocaleLowerCase("vi-VN")}`}>
        {suggestions.map((customer, index) => <li id={`${listId}-${index}`} key={customer.id}
          role="option" aria-selected={activeIndex === index} className={activeIndex === index ? "is-active" : ""}
          onPointerDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(customer)}>
          <Search size={16} aria-hidden="true" />
          <span><strong>{customer[customerField]}</strong><small>{field === "name" ? customer.phone : customer.fullName}</small></span>
        </li>)}
      </ul>}
    </div>
  );
}

export default function BookingLookupPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [query, setQuery] = useState(emptyFilters);
  const [statuses, setStatuses] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState([]);
  const [bookingType, setBookingType] = useState("ALL");
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCourtOpen, setIsCourtOpen] = useState(false);
  const courtFilterRef = useRef(null);
  const courtButtonRef = useRef(null);
  const [isDateOpen, setIsDateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([bookingApi.getStaffBookings(query), bookingApi.getStaffBookingOptions()])
      .then(([items, options]) => { if (!cancelled) { setBookings(items); setCourts(options.courts); setCustomers(options.customers); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  useEffect(() => {
    if (!isCourtOpen) return;
    const closeOutside = (event) => {
      if (!courtFilterRef.current?.contains(event.target)) setIsCourtOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [isCourtOpen]);

  const updateFilter = (field, value) => setFilters((previous) => ({ ...previous, [field]: value }));
  const search = (event) => {
    event.preventDefault();
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
      return;
    }
    setIsCourtOpen(false);
    setIsDateOpen(false);
    setError(""); setIsLoading(true); setQuery({ ...filters, courtIds: [...filters.courtIds] });
  };
  const reset = () => {
    setFilters(emptyFilters); setStatuses([]); setPaymentStatuses([]); setBookingType("ALL");
    setIsCourtOpen(false);
    setIsDateOpen(false);
    setError(""); setIsLoading(true); setQuery({ ...emptyFilters });
  };
  const statusOptions = allStatusOptions.filter((item) => bookingType === "ALL" || item.type === bookingType);
  const visible = bookings.filter((booking) => (bookingType === "ALL" || booking.type === bookingType)
    && (!statuses.length || statuses.includes(`${booking.type}:${booking.status}`))
    && (!paymentStatuses.length || paymentStatuses.length === paymentOptions.length
      || (booking.type === "SINGLE" && paymentStatuses.includes(booking.paymentStatus))));
  const selectedCourts = courts.filter((court) => filters.courtIds.includes(String(court.id)));
  const courtLabel = !selectedCourts.length ? "Sân: Tất cả" : selectedCourts.length === 1
    ? selectedCourts[0].name : `Sân: ${selectedCourts.length} đã chọn`;
  const toggleCourt = (id) => setFilters((previous) => ({ ...previous,
    courtIds: previous.courtIds.includes(id) ? previous.courtIds.filter((courtId) => courtId !== id)
      : [...previous.courtIds, id],
  }));

  return (
    <section className="staff-lookup-page" aria-labelledby="staff-lookup-title">
      <h1 id="staff-lookup-title" className="staff-lookup-heading">Tra cứu booking</h1>

      <form className="staff-lookup-search" role="search" aria-label="Tìm booking" onSubmit={search}>
        {[{ field: "name", label: "Tên khách hàng" }, { field: "phone", label: "Số điện thoại", placeholder: "SĐT" }, { field: "email", label: "Email" }].map((input) =>
          <CustomerSearchInput key={input.field} {...input} value={filters[input.field]} customers={customers}
            onChange={(value) => updateFilter(input.field, value)}
            onFocus={() => { setIsCourtOpen(false); setIsDateOpen(false); }} />)}
        <div className="staff-court-filter" ref={courtFilterRef} onKeyDown={(event) => {
          if (event.key === "Escape" && isCourtOpen) {
            event.stopPropagation(); setIsCourtOpen(false); courtButtonRef.current.focus();
          }
        }}>
          <button ref={courtButtonRef} className="staff-court-trigger" type="button" aria-label={`Chọn sân. ${courtLabel}`} aria-expanded={isCourtOpen} aria-controls="staff-court-options" disabled={isLoading} title={selectedCourts.length ? selectedCourts.map((court) => court.name).join(", ") : "Tất cả sân"} onClick={() => setIsCourtOpen((previous) => !previous)}>
            <span>{courtLabel}</span><ChevronDown size={17} aria-hidden="true" />
          </button>
          {isCourtOpen && <div id="staff-court-options" className="staff-court-options" role="group" aria-label="Chọn nhiều sân">
            <button type="button" className="staff-court-all" onClick={() => updateFilter("courtIds", [])}>Tất cả sân{!filters.courtIds.length && <Check size={16} aria-hidden="true" />}</button>
            <div className="staff-court-option-list">{courts.map((court) => <label className="staff-court-option" key={court.id}>
              <input type="checkbox" checked={filters.courtIds.includes(String(court.id))} onChange={() => toggleCourt(String(court.id))} /><span>{court.name}</span>
            </label>)}</div>
          </div>}
        </div>
        <DateRangePicker className="staff-date-filter" startDate={filters.fromDate} endDate={filters.toDate}
          isOpen={isDateOpen} onOpen={() => { setIsCourtOpen(false); setIsDateOpen(true); }}
          onClose={() => setIsDateOpen(false)} onChange={({ startDate, endDate }) => {
            setFilters((previous) => ({ ...previous, fromDate: startDate, toDate: endDate }));
          }} />
        <button className="staff-lookup-search-button" type="submit" disabled={isLoading}><Search size={34} aria-hidden="true" /><span>{isLoading ? "Đang tìm…" : "Tìm kiếm"}</span></button>
      </form>

      <div className="staff-lookup-toolbar">
        <div className="staff-lookup-tabs" role="group" aria-label="Loại đặt sân">
          {staffBookingTypes.map((item) => <button type="button" key={item.value} className={bookingType === item.value ? "is-active" : ""} aria-pressed={bookingType === item.value}
            onClick={() => { setBookingType(item.value); setStatuses([]); setPaymentStatuses([]); }}>{item.label}{" "}<span className="staff-lookup-tab-count">{isLoading ? "…" : error ? "–" : bookings.filter((booking) => item.value === "ALL" || booking.type === item.value).length}</span></button>)}
        </div>
        <div className="staff-lookup-selects">
          <BookingMultiSelect label="Trạng thái" accessibleLabel="Lọc trạng thái booking" options={statusOptions} values={statuses} onChange={setStatuses} />
          <BookingMultiSelect label="Thanh toán" accessibleLabel="Lọc thanh toán" options={paymentOptions} values={paymentStatuses} onChange={setPaymentStatuses}
            disabled={bookingType === "RECURRING"} allLabel={bookingType === "RECURRING" ? "Từng buổi" : "Tất cả"}
            hint="Lọc thanh toán của đặt sân lẻ. Với lịch cố định, xem thanh toán từng buổi trong Chi tiết." />
        </div>
      </div>

      {error && <p className="staff-alert staff-alert-error" role="alert">{error}</p>}
      <div className="staff-lookup-table-frame">
        <div className="staff-lookup-table-scroll" role="region" aria-label="Bảng booking" tabIndex={0} aria-busy={isLoading}>
          <div className="staff-lookup-table-canvas">
            <table className="staff-lookup-table">
              <colgroup><col className="staff-col-code" /><col className="staff-col-customer" /><col className="staff-col-court" /><col className="staff-col-date" /><col className="staff-col-status" /><col className="staff-col-payment" /><col className="staff-col-money" /><col className="staff-col-actions" /></colgroup>
              <thead><tr><th scope="col">Mã</th><th scope="col">Khách</th><th scope="col">Sân</th><th scope="col">Ngày/Giờ</th><th scope="col">Trạng thái</th><th scope="col">Thanh toán</th><th scope="col">Tổng tiền</th><th scope="col"><span className="staff-sr-only">Thao tác</span></th></tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={8}><div className="staff-empty" role="status"><span className="staff-loading-dot" />Đang tải danh sách booking…</div></td></tr>
                  : error ? <tr><td colSpan={8}><div className="staff-empty"><ClipboardList size={30} /><strong>Chưa thể hiển thị danh sách</strong><span>Kiểm tra bộ lọc và tìm kiếm lại.</span></div></td></tr>
                    : !visible.length ? <tr><td colSpan={8}><div className="staff-empty"><Search size={30} /><strong>Không tìm thấy booking</strong><span>Thử thay đổi thông tin tìm kiếm hoặc đặt lại bộ lọc.</span><button type="button" className="staff-button" onClick={reset}>Đặt lại bộ lọc</button></div></td></tr>
                      : visible.map((booking) => {
                        const isRecurring = booking.type === "RECURRING";
                        return <tr key={booking.id}>
                        <td><Link className="staff-lookup-code" to={`/staff/bookings/${booking.id}`} title={booking.code} aria-label={booking.code}>{isRecurring ? `Gói ${booking.code}` : `BK…${String(booking.id).padStart(2, "0")}`}</Link>
                          <span className={`staff-booking-kind${isRecurring ? " is-recurring" : ""}`}>{isRecurring ? "Lịch cố định" : "Đặt sân lẻ"}</span></td>
                        <td title={`${booking.customer.fullName} - ${booking.customer.phone} - ${booking.customer.email}`}><strong className="staff-lookup-customer-name">{booking.customer.fullName}</strong><span className="staff-lookup-customer-contact">{booking.customer.phone} · {booking.customer.email}</span></td>
                        <td>{booking.courtName}</td>
                        <td><span className="staff-lookup-date"><time dateTime={booking.startDate}>{formatBookingDate(booking.startDate)}</time>{isRecurring && <> – <time dateTime={booking.endDate}>{formatBookingDate(booking.endDate)}</time></>}</span>
                          <span className="staff-lookup-time">{booking.startTime} – {booking.endTime}</span>{isRecurring && <span className="staff-lookup-repeat">{formatBookingDays(booking.daysOfWeek)} · {booking.sessionCount} buổi</span>}</td>
                        <td><span className={`staff-badge staff-badge-${booking.status.toLowerCase()}`}>{bookingStatusLabel(booking.status)}</span></td>
                        <td>{isRecurring ? <span className="staff-package-payment"><strong>{booking.paidSessionCount}/{booking.sessionCount} đã thu</strong><small>Theo từng buổi</small></span>
                          : <span className={`staff-payment-label ${booking.paymentStatus === "PAID" ? "is-paid" : ""}`}>{booking.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}</span>}</td>
                        <td>{formatBookingMoney(booking.amount)}{isRecurring && <small className="staff-lookup-money-note">Tiền sân gói</small>}</td>
                        <td><Link className="staff-lookup-detail-link" to={`/staff/bookings/${booking.id}`} aria-label={`Chi tiết ${isRecurring ? "gói" : "booking"} ${booking.code}`}>Chi tiết</Link></td>
                      </tr>; })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

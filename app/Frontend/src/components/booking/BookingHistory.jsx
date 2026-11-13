import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Clock3, Search } from "lucide-react";
import DateRangePicker from "./DateRangePicker.jsx";
import SingleBookingDetail from "./SingleBookingDetail.jsx";
import RecurringBookingDetail from "./RecurringBookingDetail.jsx";
import { CustomerBookingDetailLayout, CustomerRecurringBookingDetailLayout } from "../../pages/SingleBookingDetail.jsx";
import "./booking.css";

const moneyFormatter = new Intl.NumberFormat("vi-VN");
const formatMoney = (amount) => `${moneyFormatter.format(amount)}đ`;
const emptyHistoryFilters = { startDate: "", endDate: "", courtIds: [], statuses: [], search: "" };
const historyTabs = [
  { id: "ALL", label: "Tất cả" },
  { id: "SINGLE", label: "Đặt sân lẻ" },
  { id: "RECURRING", label: "Lịch cố định" },
  { id: "UNPAID", label: "Chưa thanh toán" },
  { id: "PAID", label: "Đã thanh toán" },
];
const bookingStatuses = {
  PENDING: { label: "Chờ xác nhận", tone: "yellow" },
  CONFIRMED: { label: "Đã xác nhận", tone: "green" },
  CHECKED_IN: { label: "Đã check in", tone: "blue" },
  COMPLETED: { label: "Hoàn thành", tone: "gray" },
  ACTIVE: { label: "Đang hoạt động", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
  NO_SHOW: { label: "Không đến", tone: "purple" },
};
// Giá trị lọc gồm cả loại lịch và trạng thái: hai nhóm có thể cùng có Hoàn thành/Đã hủy.
const historyStatusGroups = [
  { type: "SINGLE", label: "Trạng thái đặt sân lẻ", statuses: ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"] },
  { type: "RECURRING", label: "Trạng thái lịch cố định", statuses: ["ACTIVE", "COMPLETED", "CANCELLED"] },
];
const historyStatusOptions = [
  ...historyStatusGroups.flatMap((group) => group.statuses.map((status) => ({
    value: `${group.type}:${status}`, type: group.type, status, ...bookingStatuses[status],
  }))),
];
// OR trong mỗi bộ lọc; sân và trạng thái kết hợp bằng AND. Mảng rỗng nghĩa là tất cả.
const matchesHistoryStatus = (booking, values) => !values.length || values.includes(`${booking.type}:${booking.status}`);
const formatDate = (date) => date.split("-").reverse().join("/");
const normalizeSearch = (value) => value.trim().toLocaleLowerCase("vi-VN")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
// Trạng thái thanh toán chỉ áp dụng cho đặt sân lẻ, kể cả khi dữ liệu lịch cố định có trường này.
const matchesTab = (booking, tab) => tab === "ALL" || booking.type === tab ||
  (booking.type === "SINGLE" && booking.paymentStatus === tab);
const getDuration = (booking) => {
  const toMinutes = (time) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
  return ((toMinutes(booking.endTime) - toMinutes(booking.startTime)) / 60).toLocaleString("vi-VN");
};

// Dùng chung menu nhiều lựa chọn cho sân và trạng thái, không thêm thư viện.
// Bản nháp chỉ được đưa vào bộ lọc khi bấm Áp dụng; đóng menu sẽ bỏ thay đổi chưa áp dụng.
function HistoryMultiSelect({ id, label, allLabel, itemLabel, options, groups = [], values, isOpen, onOpen, onClose, onApply }) {
  const [draftValues, setDraftValues] = useState([]);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const summary = values.length === 0 ? allLabel : values.length === 1
    ? options.find((option) => option.value === values[0])?.label : `Đã chọn ${values.length} ${itemLabel}`;

  const close = () => { onClose(); triggerRef.current?.focus(); };
  const toggleOpen = () => {
    if (isOpen) { close(); return; }
    setDraftValues([...values]);
    onOpen();
  };
  const toggleValue = (value) => {
    setDraftValues((previous) => previous.includes(value)
      ? previous.filter((item) => item !== value) : [...previous, value]);
  };

  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event) => { if (!rootRef.current?.contains(event.target)) onClose(); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) optionRefs.current[0]?.focus();
  }, [isOpen]);

  const handleKeyDown = (event) => {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); close();
    } else if (event.target.type === "checkbox" && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const count = options.length + 1;
      const index = optionRefs.current.indexOf(event.target);
      const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1
        : (index + (event.key === "ArrowDown" ? 1 : count - 1)) % count;
      optionRefs.current[next]?.focus();
    }
  };

  const renderOption = (option) => {
    const index = options.findIndex((item) => item.value === option.value) + 1;
    const checked = draftValues.includes(option.value);
    return <label key={option.value} className={`booking-status-option${checked ? " booking-status-option--selected" : ""}`}>
      <input ref={(node) => { optionRefs.current[index] = node; }} type="checkbox"
        checked={checked} onChange={() => toggleValue(option.value)}
        aria-label={option.type ? `${option.label} — ${option.type === "SINGLE" ? "Đặt sân lẻ" : "Lịch cố định"}` : option.label} />
      <span className="booking-status-option-label">{option.label}</span>
    </label>;
  };

  return <div ref={rootRef} className="booking-status-picker" onKeyDown={handleKeyDown}
    onBlur={(event) => {
      // Tab ra khỏi menu cũng hủy bản nháp; Tab bên trong vẫn tới được nút Áp dụng.
      // Bấm label có thể tạm đưa focus về dialog cha trước khi chuyển tới checkbox.
      // Không đóng ở bước trung gian này, để cả chữ/khoảng trống đều chọn được.
      const nextTarget = event.relatedTarget;
      if (isOpen && nextTarget && !event.currentTarget.contains(nextTarget)
        && !nextTarget.contains(event.currentTarget)) onClose();
    }}>
    <button id={`${id}-trigger`} ref={triggerRef} type="button" className="booking-status-trigger"
      aria-label={`${label}: ${summary}`} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={`${id}-options`}
      onClick={toggleOpen} onKeyDown={(event) => {
        if (!isOpen && ["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); toggleOpen(); }
      }}>
      <span>{summary}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {isOpen && <div id={`${id}-options`} role="dialog" aria-label={label} className="booking-status-popover">
      <div className="booking-multiselect-options">
        <label className={`booking-status-option${draftValues.length === 0 ? " booking-status-option--selected" : ""}`}>
          <input ref={(node) => { optionRefs.current[0] = node; }} type="checkbox"
            checked={draftValues.length === 0} onChange={() => setDraftValues([])} />
          <span className="booking-status-option-label">{allLabel}</span>
        </label>
        {groups.length ? groups.map((group) => <fieldset key={group.type} className="booking-multiselect-group">
          <legend className="booking-status-group-title">{group.label}</legend>
          {options.filter((option) => option.type === group.type).map(renderOption)}
        </fieldset>) : options.map(renderOption)}
      </div>
      <footer className="booking-multiselect-footer">
        <span aria-live="polite">{draftValues.length ? `Đã chọn ${draftValues.length} ${itemLabel}` : allLabel}</span>
        <button type="button" aria-label={`Áp dụng ${label.toLocaleLowerCase("vi-VN")}`}
          onClick={() => { onApply([...draftValues]); close(); }}>Áp dụng</button>
      </footer>
    </div>}
  </div>;
}


// Component dùng chung cho admin và Booking của tôi: trang truyền dữ liệu và hàm tải chi tiết.
// variant="modal" dùng trong popup; mặc định "page" dành cho nội dung trang khách hàng.
// loadBookingDetail(bookingId) trả Promise chi tiết; component không phụ thuộc adminApi.
// loadSessionDetail là tùy chọn. Callback Hủy trả chi tiết cập nhật; Hủy/Đổi buổi trả { session, package }.
// Chỉ hiện thao tác khi trang truyền callback, nên admin và khách hàng dùng cùng giao diện theo quyền riêng.
export default function BookingHistory({ ref, bookings = [], loadBookingDetail, variant = "page", scrollContainerRef, customerView = false,
  loadSessionDetail, onCancelBooking, onCancelRecurring, onCancelSession, onRescheduleSession }) {
  const instanceId = useId();
  const historyRootRef = useRef(null);
  const outerScrollRef = scrollContainerRef || historyRootRef;
  const [historyTab, setHistoryTab] = useState("ALL");
  const [historyFilters, setHistoryFilters] = useState(emptyHistoryFilters);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef(null);
  const [activeHistoryPicker, setActiveHistoryPicker] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [bookingOverrides, setBookingOverrides] = useState({});
  const sessionReturnRef = useRef(null);
  const sessionPositionRef = useRef({ view: 0, outer: 0 });
  const historyBookings = bookings.map(booking => bookingOverrides[booking.id] || booking);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailError, setDetailError] = useState("");
  const detailRequestRef = useRef(0);
  const tabRefs = useRef([]);
  const historyListRef = useRef(null);
  const detailReturnRef = useRef(null);
  const historyPositionRef = useRef({ list: 0, dialog: 0 });

  const courtOptions = [...new Map(historyBookings.map((booking) => [booking.courtId, booking.courtName])).entries()]
    .map(([value, label]) => ({ value, label }));
  const historyStartDate = historyFilters.startDate;
  const historyEndDate = historyFilters.endDate;

  // Gộp tab và các bộ lọc; lịch cố định khớp khi khoảng ngày có giao nhau.
  const visibleBookings = historyBookings.filter((booking) => matchesTab(booking, historyTab) &&
    (!historyStartDate || booking.endDate >= historyStartDate) &&
    (!historyEndDate || booking.startDate <= historyEndDate) &&
    (!historyFilters.courtIds.length || historyFilters.courtIds.includes(booking.courtId)) &&
    matchesHistoryStatus(booking, historyFilters.statuses) &&
    normalizeSearch(`${booking.code} ${booking.courtName}`).includes(normalizeSearch(historyFilters.search))
  );

  const resetDetails = () => {
    // Bỏ qua response cũ khi đổi bộ lọc hoặc đóng popup trong lúc đang tải chi tiết.
    detailRequestRef.current += 1;
    setSelectedSession(null);
    setSessionDetail(null);
    sessionReturnRef.current = null;
    setSelectedBooking(null);
    setBookingDetail(null);
    setDetailLoadingId(null);
    setDetailError("");
  };
  const selectHistoryTab = (tab) => { setHistoryTab(tab); resetDetails(); };
  const updateHistoryFilter = (field, value) => {
    setHistoryFilters((previous) => ({ ...previous, [field]: value }));
    resetDetails();
  };

  const openHistoryPicker = (picker) => {
    setIsDatePickerOpen(false);
    setActiveHistoryPicker(picker);
  };

  // Tab hỗ trợ chuột và phím trái/phải/Home/End, giữ focus ở tab đang chọn.
  const handleTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % historyTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index + historyTabs.length - 1) % historyTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = historyTabs.length - 1;
    else return;
    event.preventDefault();
    selectHistoryTab(historyTabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  const openBookingDetail = async (booking, trigger) => {
    const requestId = ++detailRequestRef.current;
    if (trigger) {
      detailReturnRef.current = trigger;
      historyPositionRef.current = { list: historyListRef.current?.scrollTop ?? 0, dialog: outerScrollRef.current?.scrollTop ?? 0 };
    }
    setIsDatePickerOpen(false); setActiveHistoryPicker(null);
    setSelectedBooking(booking); setSelectedSession(null); setSessionDetail(null);
    setBookingDetail(null); setDetailError(""); setDetailLoadingId(booking.id);
    try {
      const detail = await loadBookingDetail(booking.id);
      if (requestId === detailRequestRef.current) setBookingDetail(detail);
    } catch (error) { if (requestId === detailRequestRef.current) setDetailError(error.message); }
    finally { if (requestId === detailRequestRef.current) setDetailLoadingId(null); }
  };

  // Giữ component gói trong DOM khi xem buổi, nên bộ lọc và trang hiện tại không bị reset.
  const openSessionDetail = async (session, trigger) => {
    const requestId = ++detailRequestRef.current;
    if (trigger) {
      sessionReturnRef.current = trigger;
      sessionPositionRef.current = { view: historyRootRef.current?.querySelector(".recurring-booking-detail")?.scrollTop ?? 0,
        outer: outerScrollRef.current?.scrollTop ?? 0 };
    }
    setSelectedSession(session); setSessionDetail(null); setDetailError("");
    setDetailLoadingId(session.id);
    try {
      const result = loadSessionDetail ? await loadSessionDetail(selectedBooking.id, session.id)
        : { ...session, customer: bookingDetail.customer };
      if (requestId === detailRequestRef.current) setSessionDetail(result);
    } catch (error) { if (requestId === detailRequestRef.current) setDetailError(error.message); }
    finally { if (requestId === detailRequestRef.current) setDetailLoadingId(null); }
  };
  const backToPackage = () => {
    detailRequestRef.current += 1;
    setSelectedSession(null); setSessionDetail(null); setDetailError(""); setDetailLoadingId(null);
  };
  useEffect(() => {
    if (selectedSession || !sessionReturnRef.current || !selectedBooking) return;
    const view = historyRootRef.current?.querySelector(".recurring-booking-detail");
    if (view) view.scrollTop = sessionPositionRef.current.view;
    if (outerScrollRef.current) outerScrollRef.current.scrollTop = sessionPositionRef.current.outer;
    if (sessionReturnRef.current.isConnected) sessionReturnRef.current.focus({ preventScroll: true });
    else historyRootRef.current?.querySelector(".recurring-sessions select")?.focus();
    sessionReturnRef.current = null;
  }, [selectedSession, selectedBooking, outerScrollRef]);

  // Callback của trang trả dữ liệu cập nhật; khi không trả, tải lại bằng callback đọc chi tiết.
  const changeBooking = async (callback, input) => {
    const requestId = detailRequestRef.current;
    const result = await callback(selectedBooking.id, input);
    const updated = result || await loadBookingDetail(selectedBooking.id);
    if (requestId === detailRequestRef.current) {
      setBookingDetail(updated); setSelectedBooking(updated);
      setBookingOverrides(previous => ({ ...previous, [updated.id]: updated }));
    }
  };
  const changeSession = async (callback, input) => {
    const requestId = detailRequestRef.current;
    const result = await callback(selectedBooking.id, selectedSession.id, input);
    const group = result?.package || await loadBookingDetail(selectedBooking.id);
    const session = result?.session || group.sessions.find(item => item.id === selectedSession.id);
    if (requestId === detailRequestRef.current) {
      setBookingDetail(group); setSelectedBooking(group); setSelectedSession(session); setSessionDetail(session);
      setBookingOverrides(previous => ({ ...previous, [group.id]: group }));
    }
  };

  useEffect(() => {
    if (selectedBooking || !detailReturnRef.current) return;
    if (historyListRef.current) historyListRef.current.scrollTop = historyPositionRef.current.list;
    if (outerScrollRef.current) outerScrollRef.current.scrollTop = historyPositionRef.current.dialog;
    if (detailReturnRef.current.isConnected) detailReturnRef.current.focus({ preventScroll: true });
    else historyListRef.current?.focus({ preventScroll: true });
    detailReturnRef.current = null;
  }, [selectedBooking, outerScrollRef]);


  // Vô hiệu hóa response khi đóng popup/unmount, kể cả request đang chạy.
  useEffect(() => () => { detailRequestRef.current += 1; }, []);

  // Popup cha chỉ cần biết có bộ lọc con để đóng trước khi xử lý Escape.
  useImperativeHandle(ref, () => ({
    dismissOpenFilter() {
      if (isDatePickerOpen) { datePickerRef.current?.close(); return true; }
      if (activeHistoryPicker) {
        historyRootRef.current?.querySelector(`[id="${instanceId}-${activeHistoryPicker}-trigger"]`)?.focus();
        setActiveHistoryPicker(null);
        return true;
      }
      return false;
    },
  }));

  return <div ref={historyRootRef} className={`booking-history booking-history--${variant}`}>
        {selectedBooking?.type === "SINGLE" && bookingDetail && <CustomerBookingDetailLayout embedded onBack={resetDetails}
          booking={{ ...selectedBooking, ...bookingDetail, imageUrl: bookingDetail.imageUrl || selectedBooking.imageUrl,
            courtFee: Number(bookingDetail.courtFee ?? bookingDetail.courtPrice ?? selectedBooking.amount ?? 0),
            serviceFee: Number(bookingDetail.serviceFee ?? bookingDetail.servicePrice ?? 0),
            amount: Number(bookingDetail.amount ?? bookingDetail.totalAmount ?? selectedBooking.amount ?? 0),
            createdTime: bookingDetail.createdTime || "", holdExpiresAt: bookingDetail.holdExpiresAt || bookingDetail.expireAt || "",
            paymentMethod: bookingDetail.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản" : bookingDetail.paymentMethod,
            confirmedBy: bookingDetail.confirmedBy || bookingDetail.paidByStaffName || "", courtDescription: bookingDetail.courtDescription || "" }} />}
        {selectedBooking?.type === "SINGLE" && !bookingDetail && <SingleBookingDetail id={`${instanceId}-single-detail`} booking={selectedBooking} detail={bookingDetail}
          status={bookingStatuses[bookingDetail?.status || selectedBooking.status]} isLoading={detailLoadingId !== null} error={detailError}
          onRetry={() => openBookingDetail(selectedBooking)} onBack={resetDetails} customerView={customerView}
          backLabel={customerView ? "Quay lại booking của tôi" : "Quay lại Xem lịch sử"}
          onCancel={onCancelBooking ? input => changeBooking(onCancelBooking, input) : undefined} />}
        {selectedSession && sessionDetail && <CustomerBookingDetailLayout embedded onBack={backToPackage}
          booking={{ ...selectedSession, ...sessionDetail, imageUrl: sessionDetail.imageUrl || selectedBooking.imageUrl,
            courtFee: Number(sessionDetail.courtFee ?? sessionDetail.courtPrice ?? selectedSession.amount ?? 0),
            serviceFee: Number(sessionDetail.serviceFee ?? sessionDetail.servicePrice ?? 0), amount: Number(sessionDetail.amount ?? sessionDetail.totalAmount ?? selectedSession.amount ?? 0),
            createdTime: sessionDetail.createdTime || "", holdExpiresAt: sessionDetail.holdExpiresAt || sessionDetail.expireAt || "",
            paymentMethod: sessionDetail.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản" : sessionDetail.paymentMethod,
            confirmedBy: sessionDetail.confirmedBy || sessionDetail.paidByStaffName || "", courtDescription: sessionDetail.courtDescription || "" }} />}
        {selectedSession && !sessionDetail && <SingleBookingDetail key={selectedSession.id} booking={selectedSession} detail={sessionDetail}
          status={bookingStatuses[sessionDetail?.status || selectedSession.status]} isLoading={detailLoadingId !== null} error={detailError}
          onRetry={() => openSessionDetail(selectedSession)} onBack={backToPackage} customerView={customerView}
          backLabel={`Quay lại chi tiết lịch cố định ${selectedBooking.code}`}
          onCancel={onCancelSession && bookingDetail?.status === "ACTIVE" ? input => changeSession(onCancelSession, input) : undefined}
          onReschedule={onRescheduleSession && bookingDetail?.status === "ACTIVE" ? input => changeSession(onRescheduleSession, input) : undefined} />}
        {/* Khi đang mở một buổi trong gói, chỉ render chi tiết buổi. Nếu vẫn giữ
            layout gói ở đây, cả hai detail sẽ nằm chồng trong dialog Admin. */}
        {selectedBooking?.type === "RECURRING" && bookingDetail && !selectedSession && <CustomerRecurringBookingDetailLayout embedded onBack={resetDetails}
          booking={{ ...selectedBooking, ...bookingDetail, imageUrl: bookingDetail.imageUrl || selectedBooking.imageUrl,
            customerName: bookingDetail.customerName || selectedBooking.customer?.fullName || "", amount: Number(bookingDetail.amount ?? bookingDetail.totalAmount ?? selectedBooking.amount ?? 0),
            paymentMethod: bookingDetail.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản" : bookingDetail.paymentMethod,
            daysLabel: bookingDetail.daysLabel || (bookingDetail.daysOfWeek || selectedBooking.daysOfWeek || []).join(", "),
            discountPercent: Number(bookingDetail.discountPercent ?? selectedBooking.discountPercent ?? 0), settledSessionCount: bookingDetail.settledSessionCount ?? selectedBooking.settledSessionCount ?? 0,
            sessionCount: bookingDetail.sessionCount ?? selectedBooking.sessionCount ?? 0 }} sessions={bookingDetail.sessions || selectedBooking.sessions || []}
          onViewSession={(session) => openSessionDetail(session)} />}
        {selectedBooking?.type === "RECURRING" && !bookingDetail && !selectedSession && <RecurringBookingDetail id={`${instanceId}-recurring-detail`}
          booking={selectedBooking} detail={bookingDetail} status={bookingStatuses[bookingDetail?.status || selectedBooking.status]}
          statuses={bookingStatuses} isLoading={detailLoadingId === selectedBooking.id} error={selectedSession ? "" : detailError}
          onRetry={() => openBookingDetail(selectedBooking)} onBack={resetDetails} onViewSession={openSessionDetail}
          hidden={Boolean(selectedSession)} customerView={customerView}
          backLabel={customerView ? "Quay lại booking của tôi" : "Quay lại Xem lịch sử"}
          onCancel={onCancelRecurring ? input => changeBooking(onCancelRecurring, input) : undefined} />}

        <div className="booking-history-shell" hidden={Boolean(selectedBooking)}>
          <div className="booking-history-content">
            <div className="booking-history-tabs" role="tablist" aria-label="Loại lịch sử đặt sân">
              {historyTabs.map((tab, index) => (
                <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }}
                  id={`${instanceId}-tab-${tab.id}`} type="button" role="tab"
                  aria-selected={historyTab === tab.id} aria-controls={`${instanceId}-panel`}
                  tabIndex={historyTab === tab.id ? 0 : -1}
                  className={`booking-history-tab${historyTab === tab.id ? " booking-history-tab--active" : ""}`}
                  onClick={() => selectHistoryTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)}>
                  {tab.label}<span>{historyBookings.filter((booking) => matchesTab(booking, tab.id)).length}</span>
                </button>
              ))}
            </div>

            <div className="booking-history-controls" aria-label="Bộ lọc lịch sử">
              {/* Một ô khoảng ngày mở lịch riêng; chỉ nút Áp dụng mới lọc dữ liệu. */}
              <DateRangePicker ref={datePickerRef} startDate={historyStartDate} endDate={historyEndDate}
                isOpen={isDatePickerOpen} onOpen={() => { setActiveHistoryPicker(null); setIsDatePickerOpen(true); }}
                onClose={() => setIsDatePickerOpen(false)} onChange={(range) => {
                  setHistoryFilters((previous) => ({ ...previous, ...range })); resetDetails();
                }} />
              {/* Mỗi menu có bản nháp riêng, giữ lựa chọn đã áp dụng khi mở lại. */}
              <HistoryMultiSelect id={`${instanceId}-courts`} label="Lọc theo sân" allLabel="Tất cả sân" itemLabel="sân"
                options={courtOptions} values={historyFilters.courtIds} isOpen={activeHistoryPicker === "courts"}
                onOpen={() => openHistoryPicker("courts")} onClose={() => setActiveHistoryPicker(null)}
                onApply={(values) => updateHistoryFilter("courtIds", values)} />
              <HistoryMultiSelect id={`${instanceId}-statuses`} label="Lọc trạng thái booking" allLabel="Tất cả trạng thái" itemLabel="trạng thái"
                options={historyStatusOptions} groups={historyStatusGroups} values={historyFilters.statuses}
                isOpen={activeHistoryPicker === "statuses"} onOpen={() => openHistoryPicker("statuses")}
                onClose={() => setActiveHistoryPicker(null)} onApply={(values) => updateHistoryFilter("statuses", values)} />
              <div className="booking-history-search">
                <Search size={18} aria-hidden="true" />
                <label htmlFor={`${instanceId}-search`} className="booking-visually-hidden">Tìm mã booking, mã gói hoặc tên sân</label>
                <input id={`${instanceId}-search`} type="search" placeholder="Tìm theo mã booking, tên sân…"
                  value={historyFilters.search} onChange={(event) => updateHistoryFilter("search", event.target.value)} />
              </div>
            </div>
            <div ref={historyListRef} id={`${instanceId}-panel`} role="tabpanel" tabIndex={0}
              aria-labelledby={`${instanceId}-tab-${historyTab}`} className="booking-history-list">
              {visibleBookings.map((booking) => {
                const awaitingPayment = (booking.type === "RECURRING" ? booking.status === "ACTIVE" : booking.status === "PENDING")
                  && booking.paymentStatus === "UNPAID";
                const awaitingConfirmation = booking.type === "RECURRING" && booking.status === "ACTIVE"
                  && booking.paymentStatus === "PAID" && !booking.paidBy;
                const status = awaitingPayment ? { label: "Chờ thanh toán", tone: "yellow" }
                  : awaitingConfirmation ? { label: "Chờ xác nhận", tone: "yellow" } : bookingStatuses[booking.status];
                const isRecurring = booking.type === "RECURRING";
                const statusClass = {
                  yellow: "bg-amber-50 text-amber-700", green: "bg-emerald-50 text-emerald-600",
                  blue: "bg-blue-50 text-blue-600", gray: "bg-gray-100 text-gray-600",
                  red: "bg-red-50 text-red-500", purple: "bg-red-50 text-red-500",
                }[status.tone] || "bg-gray-100 text-gray-600";
                const settlement = booking.paymentStatus === "SETTLED"
                  ? { label: "Đã kết toán", className: "border-emerald-500 text-emerald-600" }
                  : booking.paymentStatus === "PAID"
                    ? { label: "Chưa kết toán", className: "border-amber-500 text-amber-600" }
                    : { label: "Chưa thanh toán", className: "border-amber-500 text-amber-600" };
                return (
                  <article key={booking.id} aria-label={`${isRecurring ? "Gói" : "Booking"} ${booking.code}`}
                    className="grid grid-cols-1 items-start gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-[#00C475] hover:shadow-sm lg:grid-cols-[minmax(190px,1.35fr)_minmax(75px,0.55fr)_minmax(115px,0.8fr)_minmax(175px,1.25fr)_minmax(165px,1.15fr)_minmax(160px,1.1fr)] lg:gap-3">
                    <div className="flex min-w-0 items-start gap-4">
                      {booking.imageUrl ? <img src={booking.imageUrl} alt={booking.courtName} className="h-[60px] w-[85px] rounded-lg object-cover" />
                        : <div className="flex h-[60px] w-[85px] items-center justify-center rounded-lg bg-gray-100 text-center text-xs text-gray-400">Chưa có ảnh</div>}
                      <div className="min-w-0"><p className="mb-0.5 text-[11px] text-gray-400">{isRecurring ? "Mã gói" : "Mã booking"}</p>
                        <p className="break-all text-[13px] font-bold text-gray-800">{booking.code}</p>
                        <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${isRecurring ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>{isRecurring ? "Lịch cố định" : "Đặt sân lẻ"}</span></div>
                    </div>
                    <div className="min-w-0"><p className="mb-0.5 text-[11px] text-gray-400">Sân</p><p className="text-[13px] font-bold text-gray-800">{booking.courtName}</p><p className="text-[12px] text-gray-500">({booking.courtLocation})</p></div>
                    <div className="min-w-0"><p className="mb-0.5 text-[11px] text-gray-400">{isRecurring ? "Thời gian" : "Ngày chơi"}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-600"><CalendarDays size={13} className="shrink-0 text-gray-400" />{formatDate(booking.startDate)}{isRecurring && ` - ${formatDate(booking.endDate)}`}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-600"><Clock3 size={13} className="shrink-0 text-gray-400" />{booking.startTime} - {booking.endTime}</div>
                      <p className="mt-0.5 text-[11px] text-gray-500">({isRecurring ? `${booking.sessionCount} buổi` : `${getDuration(booking)} giờ`})</p></div>
                    <div className="min-w-0"><p className="mb-2 text-[11px] text-gray-400">Trạng thái booking</p><span className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold ${statusClass}`}>{status.label}</span></div>
                    <div className="min-w-0"><p className="mb-2 text-[11px] text-gray-400">{isRecurring ? "Kết toán theo buổi" : "Trạng thái kết toán"}</p><span className={`inline-block rounded-full border px-3 py-1 text-[11px] font-semibold ${settlement.className}`}>{isRecurring ? `${booking.settledSessionCount ?? 0}/${booking.sessionCount ?? 0} buổi` : settlement.label}</span></div>
                    <div className="flex h-full min-w-0 items-start justify-between gap-3 lg:col-start-6 lg:justify-end"><div className="min-w-0 shrink-0 text-left md:text-right"><p className="mb-0.5 text-[11px] text-gray-400">Tổng tiền</p><p className="text-[14px] font-bold text-gray-800">{formatMoney(booking.amount)}</p></div>
                      <button type="button" className="shrink-0 self-center whitespace-nowrap rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-[#00C475] transition-colors hover:bg-emerald-50"
                        aria-label={`Xem chi tiết ${isRecurring ? "gói" : "booking"} ${booking.code}`} aria-controls={isRecurring ? `${instanceId}-recurring-detail` : `${instanceId}-single-detail`}
                        disabled={detailLoadingId !== null} onClick={(event) => openBookingDetail(booking, event.currentTarget)}>Xem chi tiết</button></div>
                  </article>
                );
              })}
              {visibleBookings.length === 0 && <p role="status" className="booking-history-empty">Không có lịch sử phù hợp với bộ lọc đã chọn.</p>}
            </div>
          </div>
        </div>

  </div>;
}

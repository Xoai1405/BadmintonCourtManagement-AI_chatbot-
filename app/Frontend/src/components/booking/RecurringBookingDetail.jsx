import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, Coins, FileText, Grid2X2, Layers, Tag, Trash2, UserRound } from "lucide-react";
import { BookingOverview } from "./SingleBookingDetail.jsx";
import BookingStatusNotice from "./BookingStatusNotice.jsx";
import "./booking.css";

const date = (value) => value.split("-").reverse().join("/");
const money = (value) => `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
const weekDays = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 7: "CN" };
function PackageField({ icon: Icon, label, children }) {
  return <div className="single-booking-field"><dt><Icon size={16} aria-hidden="true" /><span>{label}</span></dt><dd>{children}</dd></div>;
}

export default function RecurringBookingDetail({ id, booking, detail, status, statuses, isLoading, error, onRetry, onBack,
  onViewSession, onCancel, customerView = false, backLabel = "Quay lại Xem lịch sử", hidden = false }) {
  const instanceId = useId();
  const headingRef = useRef(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const record = detail || booking;
  const sessions = detail?.sessions ?? [];
  const filtered = sessions.filter(session => !filter || session.status === filter || session.paymentStatus === filter);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pageCount);
  const visible = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);
  const remaining = sessions.filter(session => ["PENDING", "CONFIRMED"].includes(session.status));
  const canCancel = remaining.length > 0 && remaining.every(session =>
    Date.parse(`${session.startDate}T${session.startTime}:00+07:00`) - now >= 2 * 60 * 60 * 1000);

  useEffect(() => { headingRef.current?.focus(); }, [booking.id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const cancelPackage = async event => {
    event.preventDefault();
    if (actionPending) return;
    setActionPending(true); setActionError("");
    try { await onCancel({ reason: reason.trim() }); setShowCancel(false); }
    catch (failure) { setActionError(failure.message); }
    finally { setActionPending(false); }
  };

  return <section id={id || `${instanceId}-detail`} hidden={hidden} className="single-booking-detail recurring-booking-detail" aria-labelledby={`${instanceId}-title`}>
    <div className="single-booking-detail-grid recurring-booking-grid">
      <div className="recurring-booking-left">
    <button type="button" className="single-booking-back-link" disabled={actionPending} onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />{backLabel}</button>
    <h3 id={`${instanceId}-title`} ref={headingRef} tabIndex={-1}>Chi tiết đặt sân cố định</h3>
    {customerView && <p className="booking-detail-subtitle">Theo dõi thông tin booking của bạn</p>}
      <BookingOverview booking={record} status={status} />
      </div>
      <div className="single-booking-information" aria-busy={isLoading}>
        {isLoading && <p role="status" className="single-booking-load-state">Đang tải chi tiết lịch cố định…</p>}
        {error && <div role="alert" className="single-booking-load-state single-booking-load-state--error"><p>{error}</p>
          <button type="button" className="booking-history-detail-button" onClick={onRetry}>Thử lại</button></div>}
        {detail && <>
          <section aria-labelledby={`${instanceId}-info`}>
            <h4 id={`${instanceId}-info`}><FileText size={25} aria-hidden="true" />Thông tin booking</h4>
            <div className="single-booking-info-columns">
              <dl>
                <PackageField icon={CalendarDays} label="Mã gói"><strong>{detail.code}</strong></PackageField>
                <PackageField icon={UserRound} label="Khách hàng"><strong>{detail.customer.fullName}</strong></PackageField>
                <PackageField icon={Grid2X2} label="Sân"><strong>{detail.courtName}</strong></PackageField>
                <PackageField icon={Layers} label="Loại sân"><strong>{detail.courtTypeLabel}</strong></PackageField>
              </dl>
              <dl>
                <PackageField icon={CalendarDays} label="Thời gian áp dụng"><strong>{date(detail.startDate)} - {date(detail.endDate)}</strong></PackageField>
                <PackageField icon={CalendarDays} label="Các thứ trong tuần"><strong>{detail.daysOfWeek.map(day => weekDays[day]).join(", ")}</strong></PackageField>
                <PackageField icon={Clock3} label="Khung giờ cố định"><strong>{detail.startTime} - {detail.endTime}</strong></PackageField>
                <PackageField icon={CalendarDays} label="Số buổi trong gói"><strong>{detail.sessionCount} buổi</strong></PackageField>
                <PackageField icon={Tag} label="Tỷ lệ chiết khấu"><span className="booking-badge booking-badge--green">{detail.discountPercent}%</span></PackageField>
                <PackageField icon={Coins} label="Tổng tiền gói (sau giảm giá)"><strong className="recurring-package-total">{money(detail.amount)}</strong></PackageField>
              </dl>
            </div>
          </section>

          {/* Gói không có PAID/UNPAID: trạng thái và thanh toán thuộc từng buổi trong bảng. */}
          <section className="recurring-sessions" aria-labelledby={`${instanceId}-sessions`}>
            <header><div><h4 id={`${instanceId}-sessions`}><FileText size={25} aria-hidden="true" />Danh sách các buổi trong gói</h4>
              <p>Mỗi buổi tương ứng với 1 lượt check in/thanh toán riêng biệt.</p></div>
              <label><span className="booking-visually-hidden">Lọc trạng thái buổi</span>
                <select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}>
                  <option value="">Tất cả trạng thái</option>
                  {["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"].map(value => <option key={value} value={value}>{statuses[value].label}</option>)}
                  <option value="UNPAID">Chưa thanh toán</option><option value="PAID">Đã thanh toán</option>
                </select>
              </label>
            </header>
            <div className="recurring-sessions-table-wrapper" role="region" aria-label="Danh sách buổi, có thể cuộn ngang" tabIndex={0}>
              <table className="recurring-sessions-table"><thead><tr>
                <th scope="col">#</th><th scope="col">Ngày chơi</th><th scope="col">Thứ</th><th scope="col">Khung giờ</th>
                <th scope="col">Trạng thái buổi</th><th scope="col">Trạng thái thanh toán</th><th scope="col">Thao tác</th>
              </tr></thead><tbody>
                {visible.map((session, index) => <tr key={session.id}>
                  <td>{(activePage - 1) * pageSize + index + 1}</td><td>{date(session.startDate)}</td>
                  <td>{new Date(`${session.startDate}T00:00:00Z`).getUTCDay() === 0 ? "CN" : `Thứ ${new Date(`${session.startDate}T00:00:00Z`).getUTCDay() + 1}`}</td>
                  <td>{session.startTime} - {session.endTime}</td>
                  <td><span className={`booking-badge booking-badge--${statuses[session.status].tone}`}>{statuses[session.status].label}</span></td>
                  <td><span className={`booking-badge booking-badge--${session.paymentStatus === "PAID" ? "green" : "yellow"}`}>{session.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}</span></td>
                  <td><button type="button" className="booking-history-detail-button" aria-label={`Xem chi tiết buổi ${session.code}`}
                    disabled={actionPending} onClick={event => onViewSession(session, event.currentTarget)}>Xem chi tiết</button></td>
                </tr>)}
                {visible.length === 0 && <tr><td colSpan={7} className="booking-history-empty" role="status">Không có buổi phù hợp.</td></tr>}
              </tbody></table>
            </div>
            <nav className="recurring-pagination" aria-label="Phân trang các buổi">
              <button type="button" disabled={activePage === 1} aria-label="Trang trước" onClick={() => setPage(activePage - 1)}><ChevronLeft size={14} aria-hidden="true" /></button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(value => <button key={value} type="button"
                aria-label={`Trang ${value}`} aria-current={value === activePage ? "page" : undefined} onClick={() => setPage(value)}>{value}</button>)}
              <button type="button" disabled={activePage === pageCount} aria-label="Trang sau" onClick={() => setPage(activePage + 1)}><ChevronRight size={14} aria-hidden="true" /></button>
            </nav>
          </section>
        </>}
        <footer className="single-booking-info-footer booking-detail-actions">
          <button type="button" className="single-booking-back-button" disabled={actionPending} onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />Quay lại</button>
          {detail && record.status === "ACTIVE" && onCancel && <button type="button" className="booking-cancel-button" disabled={actionPending || !canCancel}
            onClick={() => { setShowCancel(true); setActionError(""); }}><Trash2 size={17} aria-hidden="true" /><span>Hủy lịch cố định<small>(hủy toàn bộ các buổi còn lại)</small></span></button>}
          <BookingStatusNotice status={record.status} cancellationReason={record.cancellationReason} isPackage customerView={customerView} />
        </footer>
        {showCancel && <form className="booking-action-form" onSubmit={cancelPackage} aria-label="Hủy lịch cố định">
          <label>Lý do hủy<textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
          {actionError && <p role="alert">{actionError}</p>}
          <div><button type="button" className="single-booking-back-button" disabled={actionPending} onClick={() => setShowCancel(false)}>Bỏ qua</button>
            <button type="submit" className="booking-cancel-button" disabled={actionPending}>{actionPending ? "Đang xử lý…" : "Xác nhận hủy"}</button></div>
        </form>}
      </div>
    </div>
  </section>;
}

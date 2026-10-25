import { useRef, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import BookingMultiSelect from "../../components/booking/BookingMultiSelect.jsx";
import { bookingStatusLabel, formatBookingDate, formatBookingDays, formatBookingMoney, staffBookingStatuses } from "../../api/bookingApi.js";

const sessionFilterOptions = [
  ...staffBookingStatuses.filter((item) => item.value !== "ALL").map((item) => ({ ...item, group: "Trạng thái" })),
  { value: "UNPAID", label: "Chưa thanh toán", group: "Thanh toán" },
  { value: "PAID", label: "Đã thanh toán", group: "Thanh toán" },
];

export default function RecurringBookingDetail({ booking, busy, error, notice, onCancel }) {
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");
  const dialogRef = useRef(null);
  const sessions = booking.sessions;
  const statusFilters = filters.filter((value) => !["UNPAID", "PAID"].includes(value));
  const paymentFilters = filters.filter((value) => ["UNPAID", "PAID"].includes(value));
  const filtered = sessions.filter((session) => (!statusFilters.length || statusFilters.includes(session.status))
    && (!paymentFilters.length || paymentFilters.includes(session.paymentStatus)));
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pageCount);
  const visible = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);
  const remaining = sessions.filter((session) => ["PENDING", "CONFIRMED"].includes(session.status));
  const cancelBlocked = sessions.some((session) => session.status === "CHECKED_IN") || remaining.some((session) => session.paymentStatus === "PAID");

  return <section className="staff-booking-detail staff-recurring-detail" aria-labelledby="staff-recurring-title">
    <Link to="/staff/bookings" className="staff-back-link"><ArrowLeft size={15} />Quay lại danh sách</Link>
    <header className="staff-page-heading staff-detail-heading">
      <h1 id="staff-recurring-title">Gói <span className="staff-detail-code">{booking.code}</span></h1>
      <span className={`staff-badge staff-badge-${booking.status.toLowerCase()}`}>{bookingStatusLabel(booking.status)}</span>
    </header>
    <div className="staff-feedback" aria-live="polite">{notice && <p className="staff-alert staff-alert-success" role="status"><Check size={17} />{notice}</p>}{(error || validationError) && <p className="staff-alert staff-alert-error" role="alert"><CircleAlert size={17} />{error || validationError}</p>}</div>
    <div className="staff-detail-grid staff-recurring-grid">
      <section className="staff-card staff-info-card staff-detail-card" aria-labelledby="staff-recurring-info">
        <h2 id="staff-recurring-info" className="staff-sr-only">Thông tin gói</h2>
        <dl className="staff-info-list staff-detail-info-list">
          <div><dt>Khách</dt><dd>{booking.customer.fullName} – {booking.customer.phone}{booking.customer.email && ` – ${booking.customer.email}`}</dd></div>
          <div><dt>Sân / Giờ</dt><dd>{booking.courtName} – {booking.startTime}–{booking.endTime}</dd></div>
          <div><dt>Thời gian</dt><dd>{formatBookingDate(booking.startDate)} – {formatBookingDate(booking.endDate)}</dd></div>
          <div><dt>Lịch lặp</dt><dd>{formatBookingDays(booking.daysOfWeek)} · {booking.sessionCount} buổi</dd></div>
          <div><dt>Tiến độ</dt><dd>{booking.completedSessionCount}/{booking.sessionCount} buổi hoàn thành · {booking.paidSessionCount}/{booking.sessionCount} buổi đã thu</dd></div>
          <div><dt>Nhân viên thực hiện</dt><dd>{booking.staffName}</dd></div>
        </dl>
        {booking.status === "CANCELLED" && <div className="staff-cancelled-note"><h3>Lý do hủy gói</h3><p>{booking.cancellationReason}</p></div>}
        {booking.status === "ACTIVE" && remaining.length > 0 && <form className="staff-cancel-section" onSubmit={(event) => {
          event.preventDefault();
          if (!reason.trim()) { setValidationError("Vui lòng nhập lý do hủy gói."); return; }
          setValidationError(""); dialogRef.current.showModal();
        }}>
          <button type="submit" className="staff-button staff-button-danger" disabled={busy || cancelBlocked}>Hủy các buổi còn lại</button>
          <label className="staff-field staff-detail-cancel-field" htmlFor="staff-package-cancel-reason">Lý do hủy <span>(bắt buộc khi hủy các buổi còn lại)</span>
            <textarea id="staff-package-cancel-reason" required maxLength={500} rows={5} value={reason} placeholder="Nhập lý do hủy lịch…" disabled={busy || cancelBlocked} onChange={(event) => setReason(event.target.value)} />
          </label><small className="staff-detail-reason-count">{reason.length}/500 ký tự · {remaining.length} buổi có thể hủy</small>
          {cancelBlocked && <p className="staff-help">Cần xử lý buổi đang nhận sân hoặc hoàn tiền các buổi đã thu trước khi hủy gói.</p>}
        </form>}
      </section>
      <section className="staff-card staff-services-card staff-detail-card" aria-labelledby="staff-recurring-sessions-title">
        <h2 id="staff-recurring-sessions-title" className="staff-detail-card-title">Các buổi trong gói</h2>
        <p className="staff-detail-card-note">Mở chi tiết để xử lý dịch vụ và thu tiền từng buổi.</p>
        <div className="staff-recurring-session-toolbar"><span>{filtered.length} buổi</span>
          <BookingMultiSelect label="Buổi" accessibleLabel="Lọc buổi trong gói" options={sessionFilterOptions}
            values={filters} onChange={(values) => { setFilters(values); setPage(1); }} allLabel="Tất cả các buổi" hideLabel />
        </div>
        <div className="staff-recurring-session-scroll" role="region" aria-label="Các buổi trong gói, có thể cuộn ngang" tabIndex={0}>
          <table className="staff-recurring-session-table"><thead><tr><th scope="col">Buổi</th><th scope="col">Ngày / Giờ</th><th scope="col">Trạng thái</th><th scope="col">Thanh toán</th><th scope="col">Tổng tiền</th><th scope="col"><span className="staff-sr-only">Thao tác</span></th></tr></thead><tbody>
            {visible.map((session) => <tr key={session.id}>
              <td>{sessions.indexOf(session) + 1}</td><td><strong>{formatBookingDate(session.startDate)}</strong><small>{session.startTime} – {session.endTime}</small></td>
              <td><span className={`staff-badge staff-badge-${session.status.toLowerCase()}`}>{bookingStatusLabel(session.status)}</span></td>
              <td><span className={`staff-payment-label${session.paymentStatus === "PAID" ? " is-paid" : ""}`}>{session.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}</span></td>
              <td>{formatBookingMoney(session.amount)}</td><td><Link className="staff-lookup-detail-link" to={`/staff/bookings/${session.id}`} aria-label={`Chi tiết buổi ${session.code}`}>Chi tiết</Link></td>
            </tr>)}
            {!visible.length && <tr><td colSpan={6}><p className="staff-help">Không có buổi phù hợp với bộ lọc.</p></td></tr>}
          </tbody></table>
        </div>
        <nav className="staff-recurring-pagination" aria-label="Phân trang các buổi"><span>Trang {activePage}/{pageCount}</span>
          <button type="button" className="staff-button" aria-label="Trang buổi trước" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}><ChevronLeft size={16} /></button>
          <button type="button" className="staff-button" aria-label="Trang buổi sau" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)}><ChevronRight size={16} /></button>
        </nav>
        <div className="staff-bill staff-package-bill"><h3 className="staff-sr-only">Tổng tiền sân gói</h3><dl>
          <div><dt>Ưu đãi tiền sân mỗi buổi</dt><dd>{booking.discountPercent}%</dd></div>
          <div className="staff-bill-total"><dt>TỔNG TIỀN SÂN GÓI</dt><dd>{formatBookingMoney(booking.amount)}</dd></div>
        </dl><p className="staff-detail-card-note">Đã trừ ưu đãi, chưa gồm dịch vụ từng buổi.</p></div>
      </section>
    </div>
    <dialog ref={dialogRef} className="staff-dialog" aria-labelledby="staff-package-confirm-title" aria-describedby="staff-package-confirm-description">
      <div className="staff-dialog-icon is-danger"><CircleAlert size={25} /></div><h2 id="staff-package-confirm-title">Hủy các buổi còn lại?</h2>
      <p id="staff-package-confirm-description">Hủy {remaining.length} buổi đang chờ hoặc đã xác nhận trong gói {booking.code}. Lý do: {reason.trim()}</p>
      <div className="staff-dialog-actions"><button type="button" className="staff-button" autoFocus onClick={() => dialogRef.current.close()}>Quay lại</button><button type="button" className="staff-button staff-button-danger-solid" disabled={busy} onClick={() => { onCancel(reason.trim()); dialogRef.current.close(); }}>Xác nhận hủy gói</button></div>
    </dialog>
  </section>;
}

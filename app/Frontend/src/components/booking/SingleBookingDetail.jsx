import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, CircleDollarSign, Clock3, CreditCard, Crown, FileText, Grid2X2, Hourglass, Layers, Trash2, UserRound } from "lucide-react";
import BookingStatusNotice from "./BookingStatusNotice.jsx";
import "./booking.css";

const moneyFormatter = new Intl.NumberFormat("vi-VN");
const money = (value) => `${moneyFormatter.format(value)}đ`;
const date = (value) => value ? value.split("-").reverse().join("/") : "–";
// Mock giữ ngày/giờ tại sân; hiển thị dd/mm/yyyy, không đổi múi giờ khi đọc timestamp.
const dateTime = (value) => {
  if (!value) return "–";
  const [day, time] = value.split("T");
  return `${date(day)}${time ? ` • ${time.slice(0, 5)}` : ""}`;
};
const duration = (booking) => {
  const minutes = (time) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
  return ((minutes(booking.endTime) - minutes(booking.startTime)) / 60).toLocaleString("vi-VN");
};

function DetailField({ icon: Icon, label, children }) {
  return <div className="single-booking-field">
    <dt><Icon size={16} aria-hidden="true" /><span>{label}</span></dt><dd>{children}</dd>
  </div>;
}

// Khối ảnh/thông tin sân dùng chung cho booking lẻ, gói và từng buổi trong gói.
export function BookingOverview({ booking, status }) {
  const isPackage = booking.type === "RECURRING";
  const paid = booking.paymentStatus === "PAID";
  const paymentBadge = <span className={`booking-badge booking-badge--${paid ? "green" : "yellow"}`}>{paid ? "Đã thanh toán" : "Chưa thanh toán"}</span>;
  return (
      <aside className="single-booking-overview" aria-label="Thông tin sân đã đặt">
        <img className="single-booking-image" src={booking.imageUrl} alt={`Ảnh minh họa ${booking.courtName}`} />
        <div className="single-booking-code-row">
          <div><span className="single-booking-label">{isPackage ? "Mã gói" : "Mã booking"}</span><strong>{booking.code}</strong></div>
          <span className={`booking-type booking-type--${booking.type === "SINGLE" ? "single" : "recurring"}`}>{booking.type === "SINGLE" ? "Đặt sân lẻ" : "Lịch cố định"}</span>
        </div>
        <div className="single-booking-court">
          {booking.type === "SESSION" && <div className="booking-parent-package"><span className="single-booking-label">Thuộc gói</span><strong>{booking.packageCode}</strong></div>}
          <h4>{booking.courtName}</h4><p>{booking.courtLocation}</p>
          <div className="single-booking-description">
            {booking.isVip ? <Crown size={21} aria-hidden="true" /> : <FileText size={19} aria-hidden="true" />}
            <span>{booking.courtDescription}</span>
          </div>
        </div>
        <div className="single-booking-statuses">
          <div><span className="single-booking-label"><Clock3 size={18} aria-hidden="true" />{isPackage ? "Trạng thái gói" : "Trạng thái booking"}</span>
            <span className={`booking-badge booking-badge--${status.tone}`}>{status.label}</span></div>
          <div><span className="single-booking-label"><CreditCard size={18} aria-hidden="true" />{isPackage ? "Đã thanh toán" : "Trạng thái thanh toán"}</span>{isPackage ? <span className="booking-badge booking-badge--green">{booking.paidSessionCount ?? "–"}/{booking.sessionCount}</span> : paymentBadge}</div>
        </div>
      </aside>
  );
}

export default function SingleBookingDetail({ id, booking, detail, status, isLoading, error, onRetry, onBack, onCancel, onReschedule, backLabel = "Quay lại Xem lịch sử", customerView = false }) {
  const headingRef = useRef(null);
  const instanceId = useId();
  const record = detail || booking;
  const isSession = record.type === "SESSION";
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [reschedule, setReschedule] = useState({ day: date(booking.startDate), startTime: booking.startTime, endTime: booking.endTime });
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const changeableStatus = ["PENDING", "CONFIRMED"].includes(record.status);
  const beforeDeadline = Date.parse(`${record.startDate}T${record.startTime}:00+07:00`) - now >= 2 * 60 * 60 * 1000;
  const paid = record.paymentStatus === "PAID";
  const submitAction = async (event) => {
    event.preventDefault();
    if (actionPending) return;
    setActionError("");
    setActionPending(true);
    try {
      if (action === "cancel") await onCancel({ reason: reason.trim() });
      else {
        const parts = reschedule.day.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!parts) throw new Error("Nhập ngày theo dd/mm/yyyy.");
        await onReschedule({ startDate: `${parts[3]}-${parts[2]}-${parts[1]}`, startTime: reschedule.startTime, endTime: reschedule.endTime });
      }
      setAction(null);
    } catch (failure) { setActionError(failure.message); }
    finally { setActionPending(false); }
  };
  const paymentBadge = <span className={`booking-badge booking-badge--${paid ? "green" : "yellow"}`}>
    {paid ? "Đã thanh toán" : "Chưa thanh toán"}
  </span>;

  useEffect(() => { headingRef.current?.focus(); }, [booking.id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  return <section id={id || `${instanceId}-detail`} className="single-booking-detail" aria-labelledby={`${instanceId}-title`}>
    <button type="button" className="single-booking-back-link" disabled={actionPending} onClick={onBack}>
      <ArrowLeft size={15} aria-hidden="true" />{backLabel}
    </button>
    <h3 id={`${instanceId}-title`} ref={headingRef} tabIndex={-1}>{isSession ? "Chi tiết buổi đặt sân" : "Chi tiết đặt sân lẻ"}</h3>
    {customerView && <p className="booking-detail-subtitle">{isSession ? "Theo dõi thông tin buổi trong gói đặt lịch cố định của bạn" : "Theo dõi thông tin booking của bạn"}</p>}

    <div className="single-booking-detail-grid">
      <BookingOverview booking={record} status={status} />

      <div className="single-booking-information" aria-busy={isLoading}>
        {isLoading && <p role="status" className="single-booking-load-state">Đang tải chi tiết booking…</p>}
        {error && <div role="alert" className="single-booking-load-state single-booking-load-state--error">
          <p>{error}</p><button type="button" className="booking-history-detail-button" onClick={onRetry}>Thử lại</button>
        </div>}
        {detail && <>
          <section aria-labelledby={`${instanceId}-info`}>
            <h4 id={`${instanceId}-info`}><FileText size={25} aria-hidden="true" />Thông tin booking</h4>
            <div className="single-booking-info-columns">
              <dl>
                <DetailField icon={CalendarDays} label="Mã booking"><strong>{detail.code}</strong></DetailField>
                <DetailField icon={CalendarDays} label="Ngày chơi">{date(detail.startDate)}</DetailField>
                <DetailField icon={Clock3} label="Khung giờ">{detail.startTime} - {detail.endTime}</DetailField>
                <DetailField icon={Hourglass} label="Thời lượng">{duration(detail)} giờ</DetailField>
              </dl>
              <dl>
                <DetailField icon={Grid2X2} label="Sân"><strong>{detail.courtName}</strong></DetailField>
                <DetailField icon={Layers} label="Loại sân"><strong>{detail.courtTypeLabel}</strong></DetailField>
                <DetailField icon={CalendarDays} label="Ngày tạo">{dateTime(`${detail.createdAt}T${detail.createdTime}`)}</DetailField>
                <DetailField icon={Clock3} label="Hết hạn giữ chỗ">{dateTime(detail.holdExpiresAt)}</DetailField>
              </dl>
            </div>
          </section>

          {/* Chưa thanh toán thì phương thức/thời điểm/người xác nhận hiển thị dấu gạch. */}
          <section className="single-booking-payment" aria-labelledby={`${instanceId}-payment`}>
            <h4 id={`${instanceId}-payment`}><CircleDollarSign size={25} aria-hidden="true" />Chi tiết thanh toán</h4>
            <div className="single-booking-info-columns">
              <dl className="single-booking-costs">
                <div><dt>Tiền sân</dt><dd>{money(detail.courtFee)}</dd></div>
                {isSession && <div><dt>Ưu đãi lịch cố định ({detail.discountPercent}%)</dt><dd>-{money(detail.discountAmount)}</dd></div>}
                <div><dt>Dịch vụ phát sinh</dt><dd>{money(detail.serviceFee)}</dd></div>
                <div className="single-booking-total"><dt>Tổng tiền</dt><dd>{money(detail.amount)}</dd></div>
              </dl>
              <dl>
                <DetailField icon={CreditCard} label="Trạng thái thanh toán">{paymentBadge}</DetailField>
                <DetailField icon={CreditCard} label="Phương thức">{paid ? detail.paymentMethod || "–" : "–"}</DetailField>
                <DetailField icon={Clock3} label="Thanh toán lúc">{paid ? dateTime(detail.paidAt) : "–"}</DetailField>
                <DetailField icon={UserRound} label="Xác nhận bởi">{paid ? detail.confirmedBy || "–" : "–"}</DetailField>
              </dl>
            </div>
          </section>
        </>}
        {detail && <BookingStatusNotice status={record.status} cancellationReason={record.cancellationReason} customerView={customerView} />}
        <footer className="single-booking-info-footer booking-detail-actions">
          <button type="button" className="single-booking-back-button" disabled={actionPending} onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />Quay lại</button>
          {detail && changeableStatus && onReschedule && <button type="button" className="booking-reschedule-button" disabled={actionPending || !beforeDeadline}
            onClick={() => {
              setReschedule({ day: date(record.startDate), startTime: record.startTime, endTime: record.endTime });
              setAction("reschedule"); setActionError("");
            }}><CalendarDays size={17} aria-hidden="true" />Dời lịch buổi này</button>}
          {detail && changeableStatus && onCancel && <button type="button" className="booking-cancel-button" disabled={actionPending || !beforeDeadline}
            onClick={() => { setAction("cancel"); setActionError(""); }}><Trash2 size={17} aria-hidden="true" />Hủy booking</button>}
          {changeableStatus && (onCancel || onReschedule) && <small>Khách hàng chỉ có thể hủy hoặc đổi lịch trước giờ chơi ít nhất 2 tiếng.</small>}
        </footer>
        {/* Form thao tác chỉ xuất hiện khi trang sử dụng cung cấp callback tương ứng. */}
        {action && <form className="booking-action-form" onSubmit={submitAction} aria-label={action === "cancel" ? "Hủy booking" : "Dời lịch buổi này"}>
          {action === "cancel" ? <label>Lý do hủy<textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
            : <div className="booking-reschedule-fields">
              <label>Ngày chơi (dd/mm/yyyy)<input required placeholder="dd/mm/yyyy" inputMode="numeric" value={reschedule.day} onChange={event => setReschedule(previous => ({ ...previous, day: event.target.value }))} /></label>
              <label>Giờ bắt đầu<input required type="time" value={reschedule.startTime}
                onInput={event => setReschedule(previous => ({ ...previous, startTime: event.target.value }))}
                onChange={event => setReschedule(previous => ({ ...previous, startTime: event.target.value }))} /></label>
              <label>Giờ kết thúc<input required type="time" value={reschedule.endTime}
                onInput={event => setReschedule(previous => ({ ...previous, endTime: event.target.value }))}
                onChange={event => setReschedule(previous => ({ ...previous, endTime: event.target.value }))} /></label>
            </div>}
          {actionError && <p role="alert">{actionError}</p>}
          <div><button type="button" className="single-booking-back-button" disabled={actionPending} onClick={() => setAction(null)}>Bỏ qua</button>
            <button type="submit" className={action === "cancel" ? "booking-cancel-button" : "booking-reschedule-button"} disabled={actionPending}>{actionPending ? "Đang xử lý…" : action === "cancel" ? "Xác nhận hủy" : "Xác nhận đổi lịch"}</button></div>
        </form>}
      </div>
    </div>
  </section>;
}

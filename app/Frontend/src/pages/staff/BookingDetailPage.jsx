import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, Check, CheckCheck, CircleAlert, CreditCard } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { bookingApi, bookingStatusLabel, bookingWorkflowLabel, formatBookingDate, formatBookingMoney, settlementLabel, settlementStatus } from "../../api/bookingApi.js";
import { useAuth } from "../../hooks/useAuth";
import RecurringBookingDetail from "./RecurringBookingDetail.jsx";
import RescheduleBookingModal from "../../components/booking/RescheduleBookingModal.jsx";
import { canRescheduleBooking, useNow } from "../../utils/bookingTime";

const actions = [
  { status: "CONFIRMED", label: "Xác nhận", from: "PENDING" },
  { status: "CHECKED_IN", label: "Check-In", from: "CONFIRMED" },
  { status: "NO_SHOW", label: "No-Show", from: "CONFIRMED" },
  { status: "COMPLETED", label: "Hoàn thành", from: "CHECKED_IN" },
];

export default function BookingDetailPage() {
  const { id } = useParams();
  return <BookingDetail key={id} id={id} />;
}

function BookingDetail({ id }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const dialogRef = useRef(null);
  const reasonRef = useRef(null);
  const activeIdRef = useRef(null);
  const busyRef = useRef(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const now = useNow();

  useEffect(() => {
    let cancelled = false;
    activeIdRef.current = id;
    Promise.all([bookingApi.getStaffBookingDetail(id), bookingApi.getStaffBookingOptions()])
      .then(([detail, options]) => { if (!cancelled) { setBooking(detail); setServices(options.services); } })
      .catch((err) => { if (!cancelled) setLoadError({ id, message: err.message }); });
    return () => { cancelled = true; activeIdRef.current = null; };
  }, [id]);

  const mutate = async (operation, message, onSuccess) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const updated = await operation();
      if (activeIdRef.current !== id) return;
      setBooking(updated); setNotice(message); onSuccess?.();
    } catch (err) {
      if (activeIdRef.current === id) setError(err.message);
    } finally {
      busyRef.current = false;
      if (activeIdRef.current === id) setBusy(false);
    }
  };
  const openConfirmation = (type, status) => {
    setConfirmation({ type, status });
    dialogRef.current.showModal();
  };
  const requestCancel = () => {
    if (!reason.trim()) { setError("Vui lòng nhập lý do hủy booking."); reasonRef.current.focus(); return; }
    setError(""); openConfirmation("cancel", "CANCELLED");
  };
  const confirmAction = () => {
    const input = { staffName: user?.fullName || booking.staffName, reason };
    const payment = confirmation.type === "payment";
    const operation = payment ? () => bookingApi.collectStaffBookingPayment(id, input)
      : () => bookingApi.updateStaffBookingStatus(id, confirmation.status, input);
    mutate(operation, payment ? "Đã xác nhận thu đủ tiền, booking đã kết toán." : `Đã cập nhật booking: ${bookingStatusLabel(confirmation.status).toLowerCase()}.`);
    dialogRef.current.close();
  };
  const reschedule = async (payload) => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const updated = await bookingApi.rescheduleStaffBooking(id, payload);
      if (activeIdRef.current === id) {
        setBooking(updated);
        setNotice("Đã dời lịch booking.");
      }
      return true;
    } catch (err) {
      if (activeIdRef.current === id) setError(err.message);
      // Modal cần nhận lỗi để hiển thị ngay trong popup, thay vì chỉ hiện ở trang nền.
      throw err;
    } finally {
      busyRef.current = false;
      if (activeIdRef.current === id) setBusy(false);
    }
  };

  if (loadError?.id === id) return <section className="staff-card staff-error-page" role="alert"><CircleAlert size={32} /><h1>Không thể mở booking</h1><p>{loadError.message}</p><Link className="staff-button" to="/staff/bookings"><ArrowLeft size={16} />Quay lại danh sách</Link></section>;
  if (!booking || String(booking.id) !== id) return <div className="staff-empty staff-card" role="status"><span className="staff-loading-dot" />Đang tải chi tiết booking…</div>;

  if (booking.type === "RECURRING") return <RecurringBookingDetail booking={booking} busy={busy} error={error} notice={notice}
    onConfirm={() => mutate(() => bookingApi.confirmStaffRecurringBooking(id), "Đã xác nhận gói: tất cả các buổi đã được xác nhận và thanh toán tiền sân.")}
    onCancel={(reason) => mutate(() => bookingApi.cancelStaffRecurringBooking(id, { reason }), "Đã hủy gói lịch cố định.")} />;

  const terminal = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.status);
  // paid: đã thanh toán tiền sân (nhân viên đã xác nhận). settled: đã kết toán (thu đủ tiền / no-show).
  const paid = ["PAID", "SETTLED"].includes(booking.paymentStatus);
  const settled = booking.paymentStatus === "SETTLED";
  const settlement = settlementStatus(booking);
  const isSession = booking.type === "SESSION";
  const packageActive = !isSession || booking.packageStatus === "ACTIVE";
  // BR-16: chỉ thêm dịch vụ khi đang chơi và chưa kết toán
  const canEditServices = booking.status === "CHECKED_IN" && !settled && packageActive;
  // Nhân viên có thể chủ động hủy booking/buổi chưa check-in (ví dụ sân hư hoặc bảo trì).
  // Với khoản đã thu, backend giữ lại paymentStatus để xử lý hoàn tiền riêng.
  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status) && packageActive;
  // Nút "Dời lịch": booking lẻ Chờ xác nhận / Đã xác nhận, tự ẩn khi còn <= 1 tiếng trước giờ chơi
  const canReschedule = canRescheduleBooking(booking, now);
  // Chỉ thu đủ tiền sau khi khách check-in
  const canCollect = booking.status === "CHECKED_IN" && !settled && packageActive;
  const duration = ((Number(booking.endTime.slice(0, 2)) * 60 + Number(booking.endTime.slice(3)))
    - (Number(booking.startTime.slice(0, 2)) * 60 + Number(booking.startTime.slice(3)))) / 60;

  return (
    <section className="staff-booking-detail" aria-labelledby="staff-detail-title">
      <Link to={isSession ? `/staff/bookings/${booking.packageId}` : "/staff/bookings"} className="staff-back-link"><ArrowLeft size={15} />{isSession ? `Quay lại gói ${booking.packageCode}` : "Quay lại danh sách"}</Link>
      <header className="staff-page-heading staff-detail-heading">
        <div><h1 id="staff-detail-title">{isSession ? "Buổi" : "Booking"} <span className="staff-detail-code">{booking.code}</span></h1>{isSession && <p className="staff-detail-context">Thuộc gói lịch cố định {booking.packageCode}</p>}</div>
        <span className={`staff-badge staff-badge-${booking.status.toLowerCase()}`}>{bookingWorkflowLabel(booking)}</span>
      </header>
      <div className="staff-feedback" aria-live="polite">{notice && <p className="staff-alert staff-alert-success" role="status"><Check size={17} />{notice}</p>}{error && <p className="staff-alert staff-alert-error" role="alert"><CircleAlert size={17} />{error}</p>}</div>

      <div className="staff-detail-grid">
        <section className="staff-card staff-info-card staff-detail-card" aria-labelledby="staff-info-title">
          <h2 id="staff-info-title" className="staff-sr-only">{isSession ? "Thông tin buổi đặt" : "Thông tin booking"}</h2>
          <dl className="staff-info-list staff-detail-info-list">
            <div><dt>Khách</dt><dd>{booking.customer.fullName} – {booking.customer.phone}{booking.customer.email && ` – ${booking.customer.email}`}</dd></div>
            <div><dt>Sân / Giờ</dt><dd style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>{booking.courtName} – {formatBookingDate(booking.startDate)} – {booking.startTime}–{booking.endTime}</div>
              {canReschedule && <button type="button" className="staff-button staff-reschedule-button" disabled={busy} onClick={() => setRescheduleOpen(true)}><CalendarClock size={14} />Dời lịch</button>}
            </dd></div>
            <div><dt>Thanh toán</dt><dd style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className={`staff-payment-label ${paid ? "is-paid" : ""}`}>{paid ? "Đã thanh toán tiền sân" : "Chưa thanh toán tiền sân"}</span>
              {paid && <span>Phương thức: <strong>{booking.paymentMethod || "–"}</strong></span>}
            </dd></div>
            <div><dt>Kết toán</dt><dd>{settlement
              ? <span className={`staff-payment-label ${settlement === "SETTLED" ? "is-paid" : ""}`}>{settlementLabel(settlement)}</span>
              : "–"}</dd></div>
            <div><dt>Nhân viên thực hiện</dt><dd>{booking.staffName}</dd></div>
          </dl>
          <div className="staff-workflow" role="group" aria-label="Xử lý booking">
            <div className="staff-actions">{actions.map(({ status, label, from }) => {
              // Buổi trong gói được xác nhận 1 lần ở trang gói
              const enabled = packageActive && booking.status === from && (status !== "COMPLETED" || settled)
                && !(isSession && status === "CONFIRMED");
              return <button key={status} type="button" className={`staff-button staff-detail-action${enabled && status !== "NO_SHOW" ? " staff-button-primary" : ""}`} disabled={busy || !enabled}
                title={!enabled ? "Thao tác chưa phù hợp với trạng thái hiện tại" : undefined}
                onClick={() => status === "NO_SHOW" ? openConfirmation("status", status) : mutate(() => bookingApi.updateStaffBookingStatus(id, status, { staffName: user?.fullName || booking.staffName }), `Đã cập nhật booking: ${bookingStatusLabel(status).toLowerCase()}.`)}>{label}</button>;
            })}</div>
            {isSession && booking.status === "PENDING" && <p className="staff-help">Buổi thuộc gói lịch cố định, hãy xác nhận tại trang gói {booking.packageCode}.</p>}
            {booking.status === "CHECKED_IN" && !settled && <p className="staff-help">Bấm “Xác nhận thu đủ tiền” để có thể hoàn thành booking.</p>}
          </div>
          {booking.status === "CANCELLED" ? (
              <div className="staff-cancelled-note">
                <h3>Lý do hủy</h3>
                <p>{booking.cancellationReason}</p>
              </div>
          ) : canCancel ? (
              <div className="staff-cancel-section">
                <button type="button" className="staff-button staff-button-danger" disabled={busy} onClick={requestCancel}>
                  Hủy booking
                </button>
                <label className="staff-field staff-detail-cancel-field" htmlFor="staff-cancel-reason">
                  Lý do hủy <span>(bắt buộc khi bấm “Hủy booking”)</span>
                  <textarea
                      id="staff-cancel-reason"
                      ref={reasonRef}
                      rows={5}
                      maxLength={500}
                      placeholder="Nhập lý do hủy booking…"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      disabled={busy}
                  />
                </label>
                <small className="staff-detail-reason-count">{reason.length}/500 ký tự</small>
              </div>
          ) : isSession && !terminal ? (
              <p className="staff-help staff-refund-note">Hủy buổi thuộc gói tại trang gói {booking.packageCode}.</p>
          ) : (
              <p className="staff-help staff-refund-note">Booking đã nhận sân hoặc đã kết thúc, các thao tác xử lý đã được khóa.</p>
          )}
        </section>

        <section className="staff-card staff-services-card staff-detail-card" aria-labelledby="staff-services-title">
          <h2 id="staff-services-title" className="staff-detail-card-title">Dịch vụ đi kèm</h2>
          <form className="staff-service-form" onSubmit={(event) => { event.preventDefault(); mutate(() => bookingApi.addStaffBookingService(id, serviceId, quantity), "Đã thêm dịch vụ vào booking.", () => { setServiceId(""); setQuantity(1); }); }}>
            <label className="staff-field"><span className="staff-sr-only">Dịch vụ</span><select aria-label="Dịch vụ" required value={serviceId} onChange={(event) => setServiceId(event.target.value)} disabled={!canEditServices || busy}>
              <option value="">Chọn dịch vụ (Nước / vợt / phụ phí)</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatBookingMoney(service.unitPrice)}</option>)}
            </select></label>
            <label className="staff-detail-quantity"><span aria-hidden="true">SL:</span><input aria-label="Số lượng" type="number" min={1} max={99} step={1} required value={quantity} disabled={!canEditServices || busy} onChange={(event) => setQuantity(event.target.value)} /></label>
            <button type="submit" className="staff-button staff-detail-add" disabled={!canEditServices || busy || !serviceId}>+ Thêm</button>
          </form>
          <div className="staff-service-table-scroll"><table className="staff-service-table"><thead><tr><th scope="col">Dịch vụ</th><th scope="col">SL</th><th scope="col">Thành tiền</th><th scope="col"><span className="staff-sr-only">Xóa dịch vụ</span></th></tr></thead><tbody>
            {booking.services.length ? booking.services.map((service) => <tr key={service.serviceId}>
              <td title={`${formatBookingMoney(service.unitPrice)} / đơn vị`}>{service.name}</td><td>{service.quantity}</td><td>{formatBookingMoney(service.subtotal)}</td>
              <td><button type="button" className="staff-button staff-detail-remove" aria-label={`Xóa ${service.name}`} disabled={!canEditServices || busy} onClick={() => mutate(() => bookingApi.removeStaffBookingService(id, service.serviceId), "Đã xóa dịch vụ khỏi booking.")}>Xóa</button></td>
            </tr>) : <tr><td colSpan={4}><div className="staff-service-empty">Chưa có dịch vụ đi kèm</div></td></tr>}
          </tbody></table></div>
          {!canEditServices && <p className="staff-help">{settled ? "Dịch vụ đã chốt sau khi kết toán." : terminal ? "Booking đã kết thúc, không thể thay đổi dịch vụ." : "Chỉ thêm dịch vụ khi khách đã check-in."}</p>}

          <div className="staff-bill"><h3 className="staff-sr-only">Tổng thanh toán</h3><dl>
            <div><dt>Tiền sân <span>({duration.toLocaleString("vi-VN")} giờ)</span></dt><dd>{formatBookingMoney(booking.courtFee)}</dd></div>
            {isSession && (booking.discountAmount > 0
              ? <div><dt>Ưu đãi lịch cố định ({booking.discountPercent}%)</dt><dd>−{formatBookingMoney(booking.discountAmount)}</dd></div>
              : booking.discountPercent > 0 && <div><dt>Ưu đãi lịch cố định</dt><dd>Đã trừ {booking.discountPercent}% vào tiền sân</dd></div>)}
            <div><dt>Dịch vụ đi kèm</dt><dd>{formatBookingMoney(booking.serviceFee)}</dd></div>
            <div className="staff-bill-total"><dt>TỔNG CỘNG</dt><dd>{formatBookingMoney(booking.amount)}</dd></div>
          </dl></div>
          {settled ? <div className="staff-paid-receipt"><span><CheckCheck size={17} /><strong>{booking.status === "NO_SHOW" ? "Đã kết toán (bùng lịch)" : `Đã thu đủ ${formatBookingMoney(booking.amount)}`}</strong></span><p>{booking.paymentMethod} · {booking.paidBy}</p><small>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(booking.paidAt))}</small></div>
            : <div className="staff-payment-section">
              <button className="staff-button staff-button-primary staff-collect-button" style={{ gridColumn: "1 / -1", justifySelf: "end" }} type="button" disabled={!canCollect || busy} onClick={() => openConfirmation("payment")}>Xác nhận thu đủ tiền</button>
              {!canCollect && <p className="staff-help">{["PENDING", "CONFIRMED"].includes(booking.status) ? "Khách check-in rồi mới có thể thu tiền." : "Booking này không thể thu tiền."}</p>}
            </div>}
        </section>
      </div>

      {rescheduleOpen && <RescheduleBookingModal booking={booking} onClose={() => setRescheduleOpen(false)} onConfirm={reschedule} />}
      <dialog ref={dialogRef} className="staff-dialog" aria-labelledby="staff-confirm-title" aria-describedby="staff-confirm-description" onCancel={() => setConfirmation(null)} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current.close(); }}>
        <div className={`staff-dialog-icon${confirmation?.type === "cancel" ? " is-danger" : ""}`}>{confirmation?.type === "payment" ? <CreditCard size={25} /> : <CircleAlert size={25} />}</div>
        <h2 id="staff-confirm-title">{confirmation?.type === "payment" ? "Xác nhận đã thu đủ tiền?" : confirmation?.type === "cancel" ? "Hủy booking này?" : "Đánh dấu khách không đến?"}</h2>
        <p id="staff-confirm-description">{confirmation?.type === "payment" ? <>Xác nhận đã nhận đủ <strong>{formatBookingMoney(booking.amount)}</strong>. Booking sẽ chuyển sang Đã kết toán và dịch vụ được chốt.</> : confirmation?.type === "cancel" ? <>Booking <strong>{booking.code}</strong> sẽ bị hủy với lý do: {reason.trim()}</> : <>Booking <strong>{booking.code}</strong> sẽ chuyển sang No-show. Chỉ xác nhận khi khách hàng không đến nhận sân.</>}</p>
        <div className="staff-dialog-actions"><button type="button" className="staff-button" autoFocus onClick={() => dialogRef.current.close()}>Quay lại</button><button type="button" className={`staff-button ${confirmation?.type === "cancel" ? "staff-button-danger-solid" : "staff-button-primary"}`} disabled={busy} onClick={confirmAction}>{confirmation?.type === "cancel" ? "Xác nhận hủy" : "Xác nhận"}</button></div>
      </dialog>
    </section>
  );
}


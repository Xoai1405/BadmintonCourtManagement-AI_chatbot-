import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, CircleAlert, CreditCard } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { bookingApi, bookingStatusLabel, formatBookingDate, formatBookingMoney } from "../../api/bookingApi.js";
import { useAuth } from "../../hooks/useAuth";
import RecurringBookingDetail from "./RecurringBookingDetail.jsx";

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
  const [paymentMethod, setPaymentMethod] = useState("Tiền mặt");
  const [confirmation, setConfirmation] = useState(null);
  const dialogRef = useRef(null);
  const reasonRef = useRef(null);
  const activeIdRef = useRef(null);
  const busyRef = useRef(false);

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
    const input = { staffName: user?.fullName || booking.staffName, reason, paymentMethod };
    const payment = confirmation.type === "payment";
    const operation = payment ? () => bookingApi.collectStaffBookingPayment(id, input)
      : () => bookingApi.updateStaffBookingStatus(id, confirmation.status, input);
    mutate(operation, payment ? "Đã xác nhận thu tiền thành công." : `Đã cập nhật booking: ${bookingStatusLabel(confirmation.status).toLowerCase()}.`);
    dialogRef.current.close();
  };

  if (loadError?.id === id) return <section className="staff-card staff-error-page" role="alert"><CircleAlert size={32} /><h1>Không thể mở booking</h1><p>{loadError.message}</p><Link className="staff-button" to="/staff/bookings"><ArrowLeft size={16} />Quay lại danh sách</Link></section>;
  if (!booking || String(booking.id) !== id) return <div className="staff-empty staff-card" role="status"><span className="staff-loading-dot" />Đang tải chi tiết booking…</div>;

  if (booking.type === "RECURRING") return <RecurringBookingDetail booking={booking} busy={busy} error={error} notice={notice}
    onCancel={(reason) => mutate(() => bookingApi.cancelStaffRecurringBooking(id, { reason, staffName: user?.fullName || booking.staffName }), "Đã hủy các buổi còn lại trong gói.")} />;

  const terminal = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.status);
  const paid = booking.paymentStatus === "PAID";
  const isSession = booking.type === "SESSION";
  const packageActive = !isSession || booking.packageStatus === "ACTIVE";
  const canEditServices = !paid && !terminal && packageActive;
  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status) && !paid && packageActive;
  const canCollect = ["CONFIRMED", "CHECKED_IN"].includes(booking.status) && !paid && packageActive;
  const duration = ((Number(booking.endTime.slice(0, 2)) * 60 + Number(booking.endTime.slice(3)))
    - (Number(booking.startTime.slice(0, 2)) * 60 + Number(booking.startTime.slice(3)))) / 60;

  return (
    <section className="staff-booking-detail" aria-labelledby="staff-detail-title">
      <Link to={isSession ? `/staff/bookings/${booking.packageId}` : "/staff/bookings"} className="staff-back-link"><ArrowLeft size={15} />{isSession ? `Quay lại gói ${booking.packageCode}` : "Quay lại danh sách"}</Link>
      <header className="staff-page-heading staff-detail-heading">
        <div><h1 id="staff-detail-title">{isSession ? "Buổi" : "Booking"} <span className="staff-detail-code">{booking.code}</span></h1>{isSession && <p className="staff-detail-context">Thuộc gói lịch cố định {booking.packageCode}</p>}</div>
        <span className={`staff-badge staff-badge-${booking.status.toLowerCase()}`}>{bookingStatusLabel(booking.status)}</span>
      </header>
      <div className="staff-feedback" aria-live="polite">{notice && <p className="staff-alert staff-alert-success" role="status"><Check size={17} />{notice}</p>}{error && <p className="staff-alert staff-alert-error" role="alert"><CircleAlert size={17} />{error}</p>}</div>

      <div className="staff-detail-grid">
        <section className="staff-card staff-info-card staff-detail-card" aria-labelledby="staff-info-title">
          <h2 id="staff-info-title" className="staff-sr-only">{isSession ? "Thông tin buổi đặt" : "Thông tin booking"}</h2>
          <dl className="staff-info-list staff-detail-info-list">
            <div><dt>Khách</dt><dd>{booking.customer.fullName} – {booking.customer.phone}{booking.customer.email && ` – ${booking.customer.email}`}</dd></div>
            <div><dt>Sân / Giờ</dt><dd>{booking.courtName} – {formatBookingDate(booking.startDate)} – {booking.startTime}–{booking.endTime}</dd></div>
            <div><dt>Thanh toán</dt><dd><span className={`staff-payment-label ${paid ? "is-paid" : ""}`}>{paid ? "Đã thanh toán" : "Chưa thanh toán"}</span></dd></div>
            <div><dt>Nhân viên thực hiện</dt><dd>{booking.staffName}</dd></div>
          </dl>
          <div className="staff-workflow" role="group" aria-label="Xử lý booking">
            <div className="staff-actions">{actions.map(({ status, label, from }) => {
              const enabled = packageActive && booking.status === from && (status !== "COMPLETED" || paid);
              return <button key={status} type="button" className={`staff-button staff-detail-action${enabled && status !== "NO_SHOW" ? " staff-button-primary" : ""}`} disabled={busy || !enabled}
                title={!enabled ? "Thao tác chưa phù hợp với trạng thái hiện tại" : undefined}
                onClick={() => status === "NO_SHOW" ? openConfirmation("status", status) : mutate(() => bookingApi.updateStaffBookingStatus(id, status, { staffName: user?.fullName || booking.staffName }), `Đã cập nhật booking: ${bookingStatusLabel(status).toLowerCase()}.`)}>{label}</button>;
            })}</div>
            {booking.status === "CHECKED_IN" && !paid && <p className="staff-help">Xác nhận thu tiền để có thể hoàn thành booking.</p>}
          </div>
          {booking.status === "CANCELLED" ? <div className="staff-cancelled-note"><h3>Lý do hủy</h3><p>{booking.cancellationReason}</p></div>
            : canCancel ? <div className="staff-cancel-section">
              <button type="button" className="staff-button staff-button-danger" disabled={busy} onClick={requestCancel}>Hủy booking</button>
              <label className="staff-field staff-detail-cancel-field" htmlFor="staff-cancel-reason">Lý do hủy <span>(bắt buộc khi bấm “Hủy booking”)</span>
                <textarea id="staff-cancel-reason" ref={reasonRef} rows={5} maxLength={500} placeholder="Nhập lý do hủy booking…" value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} />
              </label><small className="staff-detail-reason-count">{reason.length}/500 ký tự</small>
            </div>
              : paid && !terminal ? <p className="staff-help staff-refund-note">Booking đã thu tiền. Cần xử lý hoàn tiền trước khi hủy.</p> : <p className="staff-help staff-refund-note">Booking đã kết thúc, các thao tác xử lý đã được khóa.</p>}
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
          {!canEditServices && <p className="staff-help">{paid ? "Dịch vụ đã chốt sau khi thanh toán." : "Booking đã kết thúc, không thể thay đổi dịch vụ."}</p>}

          <div className="staff-bill"><h3 className="staff-sr-only">Tổng thanh toán</h3><dl>
            <div><dt>Tiền sân <span>({duration.toLocaleString("vi-VN")} giờ)</span></dt><dd>{formatBookingMoney(booking.courtFee)}</dd></div>
            {isSession && <div><dt>Ưu đãi lịch cố định ({booking.discountPercent}%)</dt><dd>−{formatBookingMoney(booking.discountAmount)}</dd></div>}
            <div><dt>Dịch vụ đi kèm</dt><dd>{formatBookingMoney(booking.serviceFee)}</dd></div>
            <div className="staff-bill-total"><dt>TỔNG CỘNG</dt><dd>{formatBookingMoney(booking.amount)}</dd></div>
          </dl></div>
          {paid ? <div className="staff-paid-receipt"><span><CheckCheck size={17} /><strong>Đã thu {formatBookingMoney(booking.amount)}</strong></span><p>{booking.paymentMethod} · {booking.paidBy}</p><small>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(booking.paidAt))}</small></div>
            : <div className="staff-payment-section">
              <label className="staff-field">Phương thức thanh toán<select value={paymentMethod} disabled={!canCollect || busy} onChange={(event) => setPaymentMethod(event.target.value)}><option>Tiền mặt</option><option>Chuyển khoản</option></select></label>
              <button className="staff-button staff-button-primary staff-collect-button" type="button" disabled={!canCollect || busy} onClick={() => openConfirmation("payment")}>Xác nhận đã thu tiền</button>
              {!canCollect && <p className="staff-help">{booking.status === "PENDING" ? "Xác nhận booking trước khi thu tiền." : "Booking này không thể thu tiền."}</p>}
            </div>}
        </section>
      </div>

      <dialog ref={dialogRef} className="staff-dialog" aria-labelledby="staff-confirm-title" aria-describedby="staff-confirm-description" onCancel={() => setConfirmation(null)} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current.close(); }}>
        <div className={`staff-dialog-icon${confirmation?.type === "cancel" ? " is-danger" : ""}`}>{confirmation?.type === "payment" ? <CreditCard size={25} /> : <CircleAlert size={25} />}</div>
        <h2 id="staff-confirm-title">{confirmation?.type === "payment" ? "Xác nhận đã thu tiền?" : confirmation?.type === "cancel" ? "Hủy booking này?" : "Đánh dấu khách không đến?"}</h2>
        <p id="staff-confirm-description">{confirmation?.type === "payment" ? <>Xác nhận đã nhận đủ <strong>{formatBookingMoney(booking.amount)}</strong> qua {paymentMethod.toLowerCase()}. Dịch vụ sẽ được chốt sau khi thanh toán.</> : confirmation?.type === "cancel" ? <>Booking <strong>{booking.code}</strong> sẽ bị hủy với lý do: {reason.trim()}</> : <>Booking <strong>{booking.code}</strong> sẽ chuyển sang No-show. Chỉ xác nhận khi khách hàng không đến nhận sân.</>}</p>
        <div className="staff-dialog-actions"><button type="button" className="staff-button" autoFocus onClick={() => dialogRef.current.close()}>Quay lại</button><button type="button" className={`staff-button ${confirmation?.type === "cancel" ? "staff-button-danger-solid" : "staff-button-primary"}`} disabled={busy} onClick={confirmAction}>{confirmation?.type === "cancel" ? "Xác nhận hủy" : "Xác nhận"}</button></div>
      </dialog>
    </section>
  );
}


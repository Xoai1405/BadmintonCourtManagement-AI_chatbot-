import { CircleCheck, CircleX, Clock3, Info } from "lucide-react";
import "./booking.css";

// Thông báo dùng chung; gói chỉ hiển thị lý do hủy, không có trạng thái thanh toán riêng.
export default function BookingStatusNotice({ status, cancellationReason, isPackage = false, customerView = false }) {
  const subject = isPackage ? "Gói lịch cố định" : "Booking";
  const owner = customerView ? " của bạn" : "";
  const notices = {
    PENDING: { tone: "warning", icon: Clock3, text: `${subject}${owner} sẽ tự động hủy nếu không được nhân viên xác nhận trước thời điểm hết hạn giữ chỗ.` },
    CONFIRMED: { tone: "info", icon: Info, text: `${subject}${owner} đã được xác nhận. Vui lòng đến đúng giờ để sử dụng sân.` },
    CHECKED_IN: { tone: "info", icon: CircleCheck, text: `${subject}${owner} đã check in và đang sử dụng sân.` },
    COMPLETED: { tone: "success", icon: CircleCheck, text: `${subject}${owner} đã hoàn thành. Cảm ơn bạn đã sử dụng sân.` },
    CANCELLED: { tone: "danger", icon: CircleX, text: `${subject}${owner} đã bị hủy.${isPackage ? "" : " Khung giờ này đã được mở lại và có thể đặt bởi người khác."}` },
    NO_SHOW: { tone: "danger", icon: CircleX, text: `${subject}${owner} được ghi nhận không đến sử dụng sân.` },
  };
  const notice = notices[status];
  if (!notice || (isPackage && status !== "CANCELLED")) return null;
  const Icon = notice.icon;
  return <div className={`booking-status-notice booking-status-notice--${notice.tone}`} role="status">
    <Icon size={22} aria-hidden="true" /><div>{notice.text}
      {status === "CANCELLED" && cancellationReason && <p>Lý do hủy: <strong>{cancellationReason}</strong></p>}
    </div>
  </div>;
}

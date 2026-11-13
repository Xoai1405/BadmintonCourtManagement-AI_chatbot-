import { useEffect, useState } from "react";

// Quy tắc dời lịch (chỉ hiển thị phía FE):
// - Chỉ booking lẻ (type SINGLE), trạng thái Chờ xác nhận / Đã xác nhận (đã thanh toán hay chưa đều được)
// - Nút biến mất khi chỉ còn <= 1 tiếng trước giờ chơi
export const RESCHEDULE_MIN_MINUTES_BEFORE = 60;
const RESCHEDULABLE_STATUSES = ["PENDING", "CONFIRMED"];

// "2026-11-12" + "17:00" -> Date theo giờ máy người dùng
export const toBookingDateTime = (date, time) => {
  if (!date || !time) return null;
  const [year, month, day] = String(date).split("-").map(Number);
  const [hour, minute] = String(time).split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

export const canRescheduleBooking = (booking, now = new Date()) => {
  if (!booking || booking.type !== "SINGLE") return false;
  if (!RESCHEDULABLE_STATUSES.includes(booking.status)) return false;
  const start = toBookingDateTime(booking.startDate, booking.startTime);
  if (!start) return false;
  return start.getTime() - now.getTime() > RESCHEDULE_MIN_MINUTES_BEFORE * 60 * 1000;
};

// Giờ hiện tại, tự cập nhật theo chu kỳ để nút tự ẩn khi tới mốc 1 tiếng (không cần F5)
export const useNow = (intervalMs = 30000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};

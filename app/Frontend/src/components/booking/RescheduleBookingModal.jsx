import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, CalendarDays, Clock, FileText, Hourglass, Info, X } from "lucide-react";
import { courtApi } from "../../api/CourtApi";
import { RESCHEDULE_MIN_MINUTES_BEFORE, toBookingDateTime } from "../../utils/bookingTime";

// Popup dời lịch dùng chung cho trang khách (Booking của tôi) và trang nhân viên.
// Chỉ có UI: giờ trống lấy từ API availability (chỉ đọc). Nút "Xác nhận dời lịch"
// chưa gọi API nào vì backend chưa làm chức năng dời lịch.
// booking cần: courtId, courtName, startDate (YYYY-MM-DD), startTime, endTime (HH:mm);
// imageUrl, courtDescription, type không bắt buộc.

const toMinutes = (time) => {
  const [h, m] = String(time).slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} giờ ${m} phút`;
  if (h) return `${h} giờ`;
  return `${m} phút`;
};

export default function RescheduleBookingModal({ booking, onClose }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [newStartTime, setNewStartTime] = useState("");

  const currentStart = toMinutes(booking.startTime);
  const currentEnd = toMinutes(booking.endTime);
  const durationMinutes = currentEnd - currentStart;

  // Lấy lịch trống của sân trong ngày chơi hiện tại
  useEffect(() => {
    let ignore = false;
    if (!booking.courtId) {
      setLoading(false);
      setLoadError("Không xác định được sân của booking.");
      return undefined;
    }
    courtApi.getAvailability(booking.courtId, booking.startDate)
      .then((data) => { if (!ignore) setSlots(data?.slots ?? []); })
      .catch((err) => { if (!ignore) setLoadError(err.message || "Không tải được lịch trống."); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [booking.courtId, booking.startDate]);

  // Esc để đóng + khóa cuộn trang phía sau
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Giờ bắt đầu mới hợp lệ: đủ ô trống liên tiếp cho cả thời lượng, cách hiện tại hơn 1 tiếng.
  // Ô đang bị chính booking này chiếm được coi là trống (cho phép dời lệch 30 phút).
  const availableStartTimes = useMemo(() => {
    if (durationMinutes <= 0) return [];
    const free = new Map(slots.map((slot) => {
      const start = toMinutes(slot.startTime);
      const ownSlot = start >= currentStart && start < currentEnd;
      return [start, slot.status === "AVAILABLE" || (ownSlot && slot.status === "BOOKED")];
    }));
    const minStart = Date.now() + RESCHEDULE_MIN_MINUTES_BEFORE * 60 * 1000;

    return slots
      .map((slot) => toMinutes(slot.startTime))
      .filter((start) => {
        if (start === currentStart) return false;
        const startAt = toBookingDateTime(booking.startDate, toHHMM(start));
        if (!startAt || startAt.getTime() <= minStart) return false;
        for (let t = start; t < start + durationMinutes; t += 30) {
          if (!free.get(t)) return false;
        }
        return true;
      })
      .map(toHHMM);
  }, [slots, currentStart, currentEnd, durationMinutes, booking.startDate]);

  const newEndTime = newStartTime ? toHHMM(toMinutes(newStartTime) + durationMinutes) : "";
  const description = (booking.courtDescription || "").replace(/[()]/g, "");

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-[550px] flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn"
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shrink-0">
              <CalendarClock size={22} strokeWidth={2} />
            </div>
            <div>
              <h2 id="reschedule-title" className="text-lg font-bold text-gray-800 m-0">Dời lịch buổi đặt sân</h2>
              <p className="text-[13px] text-gray-500 m-0">Chọn khung giờ mới trong cùng một ngày</p>
            </div>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-1 rounded-md transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Thông tin booking gốc */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
              <FileText size={16} className="text-[#00C475]" /> Thông tin booking
            </h3>
            <div className="border border-gray-200 rounded-xl p-4 flex gap-4 items-center">
              <div className="flex gap-3 items-center w-[45%] border-r border-gray-100 pr-4">
                {booking.imageUrl && (
                  <img src={booking.imageUrl} alt={booking.courtName} className="w-[70px] h-[50px] object-cover rounded-md shrink-0" />
                )}
                <div>
                  <p className="font-bold text-gray-800 text-sm m-0">{booking.courtName}</p>
                  {description && <p className="text-[11px] text-gray-500 m-0">{description}</p>}
                </div>
              </div>
              <div className="flex-1 space-y-1.5 text-[12px]">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-gray-400" />
                  <span className="text-gray-500 w-20">Ngày chơi</span>
                  <span className="font-bold text-gray-800">{booking.startDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-500 w-20">Khung giờ</span>
                  <span className="font-bold text-gray-800">{booking.startTime} - {booking.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hourglass size={14} className="text-gray-400" />
                  <span className="text-gray-500 w-20">Thời lượng</span>
                  <span className="font-bold text-gray-800">{formatDuration(durationMinutes)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chọn giờ mới */}
          <div>
            <div className="mb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 m-0">
                <Clock size={16} className="text-[#00C475]" /> Chọn khung giờ mới
              </h3>
              <p className="text-[12px] text-gray-500 ml-6 mt-0.5 mb-0">
                Chọn giờ bắt đầu mới. Hệ thống sẽ tự động hiển thị giờ kết thúc dựa trên thời lượng
              </p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 mb-4 flex items-center gap-2 w-fit">
              <Hourglass size={14} className="text-[#00C475] shrink-0" />
              <p className="text-xs text-emerald-700 m-0">
                Thời lượng buổi chơi: <span className="font-bold">{formatDuration(durationMinutes)}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="reschedule-start" className="block text-[13px] font-bold text-gray-800 mb-2">
                  Giờ bắt đầu mới <span className="text-red-500">*</span>
                </label>
                <select
                  id="reschedule-start"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  disabled={loading || availableStartTimes.length === 0}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-[13px] text-gray-600 outline-none hover:border-[#00C475] focus:border-[#00C475] disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>
                    {loading ? "Đang tải..." : availableStartTimes.length === 0 ? "Không còn giờ trống" : "--:--"}
                  </option>
                  {availableStartTimes.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reschedule-end" className="block text-[13px] font-bold text-gray-800 mb-2">Giờ kết thúc</label>
                <input
                  id="reschedule-end"
                  type="text"
                  value={newEndTime}
                  readOnly
                  placeholder="--:--"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-[13px] text-gray-500 outline-none cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {loadError && <p className="text-xs text-red-500 mt-2 mb-0">{loadError}</p>}
          </div>

          {/* Lưu ý */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <ul className="text-xs text-blue-800/90 leading-relaxed list-disc pl-4 space-y-1 m-0">
              <li>Bạn chỉ có thể dời lịch trong ngày <strong>{booking.startDate}</strong>.</li>
              <li>Thời lượng buổi chơi sẽ được giữ nguyên ({formatDuration(durationMinutes)}).</li>
              <li>Chỉ hiển thị các khung giờ còn trống, bắt đầu sau thời điểm hiện tại hơn 1 tiếng.</li>
              {booking.type === "SESSION" && (
                <li>Sau khi dời lịch, các buổi khác trong gói lịch cố định sẽ không bị ảnh hưởng.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          {/* Chưa có API dời lịch: nút chưa thực hiện thao tác nào */}
          <button
            type="button"
            disabled={!newStartTime}
            className={`px-6 py-2 rounded-lg text-[13px] font-bold text-white transition-colors ${!newStartTime ? "bg-[#00C475]/50 cursor-not-allowed" : "bg-[#00C475] hover:bg-[#00B068]"}`}
          >
            Xác nhận dời lịch
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

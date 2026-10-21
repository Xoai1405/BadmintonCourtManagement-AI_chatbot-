import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  LayoutGrid,
  MessageCircle,
} from "lucide-react";

import Navbar from "../components/Navbar";
import { bookingApi } from "../api/bookingApi";
import { getCourtTypeLabel } from "../utils/CourtUtils";

export default function BookingConfirm() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Dữ liệu chỉ tồn tại khi điều hướng từ CourtDetail.
  // Nếu refresh/truy cập trực tiếp URL, state sẽ mất và quay lại chọn giờ.
  const bookingData = location.state;

  const courtId = Number(bookingData?.courtId);
  const bookingDate = bookingData?.bookingDate;
  const startTime = bookingData?.startTime;
  const endTime = bookingData?.endTime;

  const hasValidBookingData = Boolean(
    courtId && bookingDate && startTime && endTime,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  useEffect(() => {
    if (!hasValidBookingData) {
      navigate(`/court/${id}`, { replace: true });
    }
  }, [hasValidBookingData, id, navigate]);

  // Không render màn mock nếu người dùng vào URL trực tiếp.
  if (!hasValidBookingData) {
    return null;
  }

  // court và selectedSlots chỉ phục vụ hiển thị preview.
  // Backend không tin dữ liệu này để tạo booking.
  const court = bookingData.court ?? {
    id: courtId,
    name: `Sân ${courtId}`,
    courtType: null,
  };

  const selectedSlots = Array.isArray(bookingData.selectedSlots)
    ? bookingData.selectedSlots
    : [];

  const slotCount = selectedSlots.length;
  const durationHours = slotCount * 0.5;

  // Hỗ trợ cả state cũ totalPrice lẫn state mới previewTotalPrice.
  const previewTotalPrice = Number(
    bookingData.previewTotalPrice ?? bookingData.totalPrice ?? 0,
  );

  const unitPrice = Number(
    court.priceNormalHour ?? court.basePrice ?? court.price_normal_hour ?? 0,
  );

  // Gọi backend để tạo Booking.
  // axiosClient tự gửi Bearer token qua interceptor.
  const handleConfirmBooking = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError("");

      const booking = await bookingApi.create({
        courtId,
        bookingDate,
        startTime,
        endTime,
      });

      // bookingResult là dữ liệu thật backend trả về:
      // bookingCode, totalAmount, expireAt, PENDING...
      setBookingResult(booking);
      setShowSuccessModal(true);
    } catch (error) {
      // Bao gồm 409 khi một khách khác vừa giữ/đặt cùng khung giờ.
      setSubmitError(
        error.message || "Không thể tạo đặt sân. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sau khi backend tạo booking, giá backend tính là giá chính thức.
  const confirmedTotal = Number(
    bookingResult?.totalAmount ?? previewTotalPrice,
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 mt-8">
        <button
          type="button"
          onClick={() => navigate(`/court/${courtId}`)}
          className="flex items-center gap-1 text-[13px] text-[#00C475] font-medium mb-4 hover:underline"
        >
          <ArrowLeft size={14} />
          Quay lại đặt sân
        </button>

        <h1 className="text-[22px] font-bold text-gray-800 mb-6">
          Đặt sân - {court.name}
        </h1>

        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />

            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800">
                Xác nhận không thành công
              </h3>

              <p className="text-sm text-red-600 mt-1">{submitError}</p>

              <button
                type="button"
                onClick={() => navigate(`/court/${courtId}`)}
                className="mt-3 px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors shadow-sm"
              >
                ← Quay lại chọn khung giờ khác
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Xác nhận đặt sân
            </h2>

            <p className="text-sm text-gray-400">
              Vui lòng kiểm tra lại thông tin trước khi đặt sân
            </p>
          </div>

          <div className="flex flex-col">
            <div className="flex items-start gap-4 py-5 border-b border-gray-100">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#00C475] shrink-0">
                <LayoutGrid size={24} strokeWidth={1.5} />
              </div>

              <div className="flex-1 grid grid-cols-2 gap-4 items-center h-12">
                <span className="text-gray-500 font-medium">Sân</span>

                <div>
                  <p className="font-bold text-gray-800">{court.name}</p>

                  <p className="text-sm text-gray-500 mt-0.5">
                    {getCourtTypeLabel(court.courtType)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 py-5 border-b border-gray-100">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#00C475] shrink-0">
                <CalendarClock size={24} strokeWidth={1.5} />
              </div>

              <div className="flex-1 grid grid-cols-2 gap-4 items-center h-12">
                <span className="text-gray-500 font-medium">Thời gian</span>

                <div>
                  <p className="font-bold text-gray-800">
                    {startTime} - {endTime}
                  </p>

                  <p className="text-sm text-gray-500 mt-0.5">
                    {bookingDate}
                    {slotCount > 0 && (
                      <>
                        {" "}
                        · {slotCount} khung · {durationHours} giờ
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 py-5">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#00C475] shrink-0">
                <Banknote size={24} strokeWidth={1.5} />
              </div>

              <div className="flex-1 grid grid-cols-2 gap-4 items-center h-12">
                <span className="text-gray-500 font-bold uppercase tracking-wide">
                  Tổng tiền dự kiến
                </span>

                <div>
                  <p className="font-bold text-xl text-[#00C475]">
                    {previewTotalPrice.toLocaleString("vi-VN")}đ
                  </p>

                  {unitPrice > 0 && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Giá hiển thị có thể thay đổi theo giờ cao điểm
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={() => navigate(`/court/${courtId}`)}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors bg-[#00C475] hover:bg-[#00B068] disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận đặt sân"}
            </button>
          </div>
        </div>
      </div>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00C475] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#00B068] transition-colors">
        <MessageCircle size={28} />
      </button>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[460px] p-8 text-center">
            <div className="w-16 h-16 bg-[#00C475] text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-3">
              Gửi yêu cầu đặt sân thành công
            </h2>

            <span className="inline-block bg-orange-50 text-orange-500 border border-orange-100 px-4 py-1 rounded-full text-[13px] font-semibold mb-8">
              Đang giữ chỗ
            </span>

            <div className="space-y-4 text-sm mb-8">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Mã booking</span>
                <span className="font-bold text-gray-800">
                  {bookingResult?.bookingCode}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Sân</span>
                <span className="font-bold text-gray-800">{court.name}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Thời gian</span>
                <span className="font-bold text-gray-800">
                  {bookingDate} · {startTime} - {endTime}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500">Tổng tiền</span>
                <span className="font-bold text-[#00C475] text-base">
                  {confirmedTotal.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3.5 mb-8 flex items-start gap-3 text-left">
              <Clock size={18} className="text-orange-500 shrink-0 mt-0.5" />

              <p className="text-[13px] text-orange-600/90 leading-relaxed">
                Đơn đặt sân đang được giữ chỗ trong 10 phút. Vui lòng hoàn tất
                thanh toán trước thời điểm hết hạn.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/dashboard"
                className="w-full py-3 bg-[#00C475] text-white rounded-lg text-sm font-semibold hover:bg-[#00B068] transition-colors"
              >
                Xem chi tiết booking
              </Link>

              <Link
                to="/"
                className="w-full py-3 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Về danh sách sân
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

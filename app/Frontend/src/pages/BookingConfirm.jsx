import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Banknote, 
  LayoutGrid, 
  Check, 
  AlertCircle, 
  MessageCircle,
  AlertTriangle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { mockCourts } from '../mocks/apiContract';

export default function BookingConfirm() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Lấy dữ liệu truyền từ trang CourtDetail (hoặc dùng dữ liệu mẫu nếu truy cập trực tiếp link)
  const court = mockCourts.find(c => c.id === parseInt(id)) || mockCourts[1];
  const bookingData = location.state || {
    courtId: court.id,
    courtName: court.name,
    courtType: court.type,
    date: '20/09/2026',
    timeRange: '18:30 - 20:00',
    slotCount: 3,
    totalHours: 1.5,
    basePrice: court.basePrice,
    totalPrice: 375000,
    selectedSlotIds: [26, 27, 28]
  };

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const [bookingCode, setBookingCode] = useState('#BK20260920-014');

  // Hàm xử lý khi nhấn "Xác nhận đặt sân"
  const handleConfirmBooking = () => {
    setConflictError('');

    // 1. Kiểm tra trùng lịch từ dữ liệu các khung giờ đã đặt trước đó
    const savedBookings = JSON.parse(localStorage.getItem('smashflow_booked_slots') || '[]');
    const isConflicted = bookingData.selectedSlotIds.some(slotId =>
      savedBookings.some(
        b => b.courtId === bookingData.courtId && b.date === bookingData.date && b.slotId === slotId
      )
    );

    if (isConflicted) {
      setConflictError(
        'Khung giờ bạn chọn vừa có người khác đặt hoặc bị trùng lịch trên hệ thống! Vui lòng quay lại và chọn khung giờ khác.'
      );
      return;
    }

    // 2. Lưu các khung giờ vừa đặt để đánh dấu đã có chủ
    const newBookedSlots = bookingData.selectedSlotIds.map(slotId => ({
      courtId: bookingData.courtId,
      date: bookingData.date,
      slotId
    }));
    localStorage.setItem(
      'smashflow_booked_slots',
      JSON.stringify([...savedBookings, ...newBookedSlots])
    );

    // 3. Tạo mã booking và mở Modal thành công
    const randomNum = Math.floor(100 + Math.random() * 900);
    const formattedDate = bookingData.date.split('/').reverse().join('');
    setBookingCode(`#BK${formattedDate}-${randomNum}`);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20 relative">
      {/* 1. Thanh điều hướng dùng chung */}
      <Navbar />

      {/* 2. Nội dung chính */}
      <div className="max-w-5xl mx-auto px-4 mt-8">
        {/* Nút quay lại */}
        <Link
          to={`/court/${court.id}`}
          className="inline-flex items-center gap-1.5 text-[#00C475] font-medium hover:underline mb-3 text-sm"
        >
          <ArrowLeft size={16} /> Quay lại đặt sân
        </Link>

        {/* Tiêu đề trang */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Đặt sân - {bookingData.courtName}
        </h1>

        {/* Thông báo lỗi trùng lịch (Hiển thị khi phát hiện xung đột lịch đặt) */}
        {conflictError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-800">Lỗi trùng lịch đặt sân</h4>
                <p className="text-sm text-red-600 mt-0.5">{conflictError}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/court/${court.id}`)}
              className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 shrink-0 transition-colors"
            >
              Chọn lại giờ
            </button>
          </div>
        )}

        {/* Khung Card Xác nhận đặt sân */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800">Đặt sân</h2>
            <p className="text-sm text-gray-500 mt-1">
              Vui lòng kiểm tra lại thông tin trước khi đặt sân
            </p>
          </div>

          {/* Danh sách thông tin kiểm tra */}
          <div className="divide-y divide-gray-100 border-b border-gray-100">
            {/* Dòng 1: Sân */}
            <div className="py-5 flex items-center">
              <div className="w-48 sm:w-64 flex items-center gap-4 shrink-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00C475]">
                  <LayoutGrid size={22} />
                </div>
                <span className="text-sm text-gray-500 font-medium">Sân</span>
              </div>
              <div>
                <p className="text-base font-bold text-gray-800">{bookingData.courtName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{bookingData.courtType}</p>
              </div>
            </div>

            {/* Dòng 2: Thời gian */}
            <div className="py-5 flex items-center">
              <div className="w-48 sm:w-64 flex items-center gap-4 shrink-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00C475]">
                  <Calendar size={22} />
                </div>
                <span className="text-sm text-gray-500 font-medium">Thời gian</span>
              </div>
              <div>
                <p className="text-base font-bold text-gray-800">{bookingData.timeRange}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {bookingData.slotCount} khung · {bookingData.totalHours} giờ ({bookingData.date})
                </p>
              </div>
            </div>

            {/* Dòng 3: TỔNG TIỀN */}
            <div className="py-5 flex items-center">
              <div className="w-48 sm:w-64 flex items-center gap-4 shrink-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00C475]">
                  <Banknote size={22} />
                </div>
                <span className="text-sm text-gray-500 font-semibold uppercase">TỔNG TIỀN</span>
              </div>
              <div>
                <p className="text-xl font-bold text-[#00C475]">
                  {bookingData.totalPrice.toLocaleString('vi-VN')}đ
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ({bookingData.basePrice.toLocaleString('vi-VN')}đ/giờ)
                </p>
              </div>
            </div>
          </div>

          {/* Nút bấm hành động */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => navigate(`/court/${court.id}`)}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmBooking}
              className="px-8 py-2.5 rounded-lg bg-[#00C475] text-white text-sm font-semibold hover:bg-[#00a863] transition-colors shadow-sm"
            >
              Xác nhận đặt sân
            </button>
          </div>
        </div>
      </div>

      {/* 3. MODAL ĐẶT SÂN THÀNH CÔNG */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Icon Check Xanh */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[#00C475] flex items-center justify-center text-white">
                  <Check size={24} strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Tiêu đề & Badge trạng thái */}
            <h3 className="text-lg font-bold text-gray-800 text-center">
              Gửi yêu cầu đặt sân thành công
            </h3>
            <div className="flex justify-center mt-2 mb-6">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold">
                Chờ xác nhận
              </span>
            </div>

            {/* Chi tiết Booking */}
            <div className="border-t border-gray-100 pt-4 space-y-3 text-sm mb-5">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Mã booking</span>
                <span className="font-bold text-gray-800">{bookingCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Sân</span>
                <span className="font-bold text-gray-800">{bookingData.courtName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Thời gian</span>
                <span className="font-bold text-gray-800">{bookingData.timeRange}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Tổng tiền</span>
                <span className="font-bold text-[#00C475] text-base">
                  {bookingData.totalPrice.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Khung lưu ý màu vàng nhạt */}
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5 mb-6">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Booking sẽ tự động hủy nếu không được nhân viên xác nhận trước thời điểm hết hạn giữ chỗ. Bạn sẽ nhận thông báo khi booking được xác nhận.
              </p>
            </div>

            {/* 2 Nút điều hướng trong Modal */}
            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/my-bookings')}
                className="w-full py-2.5 rounded-lg bg-[#00C475] text-white text-sm font-semibold hover:bg-[#00a863] transition-colors"
              >
                Xem chi tiết booking
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Về danh sách sân
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nút Chatbot */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00C475] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#00B068] transition-colors">
        <MessageCircle size={28} />
      </button>
    </div>
  );
}
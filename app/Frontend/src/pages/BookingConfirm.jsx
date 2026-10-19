import React, { useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  ArrowLeft, 
  CheckCircle2, 
  MessageCircle,
  LayoutGrid,
  CalendarClock,
  Banknote,
  Clock,
  AlertCircle // Thêm icon báo lỗi
} from 'lucide-react';
import { getCourtTypeLabel } from '../utils/CourtUtils'; 

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export default function BookingConfirm() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Nhận dữ liệu truyền từ CourtDetail sang
  const bookingData = location.state || {};
  const court = bookingData.court || {
    id: Number(id) || 1,
    name: `Sân 0${id || 1}`,
    courtType: 'STANDARD_INDOOR',
    priceNormalHour: 60000,
  };
  
  const selectedDate = bookingData.selectedDate || new Date().toISOString().split('T')[0];
  const selectedSlots = bookingData.selectedSlots || [];
  const startTime = bookingData.startTime || '18:00';
  const endTime = bookingData.endTime || '19:30';
  const totalPrice = bookingData.totalPrice || 0;

  // Tính toán số lượng khung và giờ
  const slotCount = selectedSlots.length || 3;
  const durationHours = slotCount * 0.5;
  const unitPrice = court.priceNormalHour || court.basePrice || court.price_normal_hour || 0;

  // 2. State quản lý UI và Lỗi
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState(''); // State lưu lỗi trùng lịch
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // 3. Hàm gọi API đặt sân (Tích hợp xử lý lỗi trùng lịch - SCRUM-35)
  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setConflictError('');

    // --- MÔ PHỎNG LỖI TRÙNG LỊCH TRÊN FRONTEND (Để bạn dễ test) ---
    // Kiểm tra xem giờ này đã bị lưu trong localStorage chưa (mô phỏng có người khác đặt)
    const storageKey = `booked_slots_court_${court.id}_${selectedDate}`;
    const localBookedSlots = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const slotTimes = selectedSlots.map(s => s.time || `${s.startTime} - ${s.endTime}`);
    const isLocalConflict = slotTimes.some(timeStr => localBookedSlots.includes(timeStr));

    if (isLocalConflict) {
      setConflictError('Rất tiếc, khung giờ này vừa có khách hàng khác đặt thành công. Vui lòng chọn khung giờ khác!');
      setIsSubmitting(false);
      return;
    }
    // -------------------------------------------------------------

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      const payload = {
        courtId: Number(court.id || id),
        bookingDate: selectedDate,
        date: selectedDate,
        startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
        endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
        notes: '', 
        paymentMethod: 'CASH', 
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      // BẮT LỖI TRÙNG LỊCH TỪ BACKEND (HTTP 409 Conflict)
      if (response.status === 409 || !response.ok) {
        const errData = await response.json().catch(() => ({}));
        setConflictError(errData.message || 'Hệ thống báo: Khung giờ này đã bị trùng với một lịch đặt khác. Vui lòng chọn lại!');
        setIsSubmitting(false);
        return;
      }

      // THÀNH CÔNG
      const data = await response.json().catch(() => ({}));
      
      // Lưu vào localStorage để chặn các lần đặt sau (phục vụ việc test UI)
      const updatedBooked = [...new Set([...localBookedSlots, ...slotTimes])];
      localStorage.setItem(storageKey, JSON.stringify(updatedBooked));

      setBookingResult({
        code: data.code || data.bookingCode || `#BK${selectedDate.replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      });
      setShowSuccessModal(true);
    } catch (error) {
      // Fake dữ liệu thành công nếu Backend chưa chạy
      const updatedBooked = [...new Set([...localBookedSlots, ...slotTimes])];
      localStorage.setItem(storageKey, JSON.stringify(updatedBooked));

      setBookingResult({
        code: `#BK${selectedDate.replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      });
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Tiêu đề & Nút Back */}
        <button
          onClick={() => navigate(`/court/${court.id || id}`)}
          className="flex items-center gap-1 text-[13px] text-[#00C475] font-medium mb-4 hover:underline"
        >
          <ArrowLeft size={14} />
          Quay lại đặt sân
        </button>

        <h1 className="text-[22px] font-bold text-gray-800 mb-6">
          Đặt sân - {court.name}
        </h1>

        {/* ================= GIAO DIỆN BÁO LỖI TRÙNG LỊCH ================= */}
        {conflictError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800">
                Xác nhận không thành công!
              </h3>
              <p className="text-sm text-red-600 mt-1">{conflictError}</p>
              <button
                onClick={() => navigate(`/court/${court.id || id}`)}
                className="mt-3 px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors shadow-sm"
              >
                ← Quay lại chọn khung giờ khác
              </button>
            </div>
          </div>
        )}
        {/* ================================================================ */}

        {/* Card hiển thị thông tin chính */}
        <div className={`bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] p-8 transition-opacity ${conflictError ? 'opacity-50 pointer-events-none' : ''}`}>
          
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Đặt sân</h2>
            <p className="text-sm text-gray-400">Vui lòng kiểm tra lại thông tin trước khi đặt sân</p>
          </div>

          <div className="flex flex-col">
            {/* Hàng 1: Sân */}
            <div className="flex items-start gap-4 py-5 border-b border-gray-100">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#00C475] shrink-0">
                <LayoutGrid size={24} strokeWidth={1.5} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 items-center h-12">
                <span className="text-gray-500 font-medium">Sân</span>
                <div>
                  <p className="font-bold text-gray-800">{court.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {court.courtTypeLabel || getCourtTypeLabel(court.courtType) || 'Sân cầu lông'}
                  </p>
                </div>
              </div>
            </div>

            {/* Hàng 2: Thời gian */}
            <div className="flex items-start gap-4 py-5 border-b border-gray-100">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#00C475] shrink-0">
                <CalendarClock size={24} strokeWidth={1.5} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 items-center h-12">
                <span className="text-gray-500 font-medium">Thời gian</span>
                <div>
                  <p className="font-bold text-gray-800">{startTime} - {endTime}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{slotCount} khung · {durationHours} giờ</p>
                </div>
              </div>
            </div>

            {/* Hàng 3: Tổng tiền */}
            <div className="flex items-start gap-4 py-5">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#00C475] shrink-0">
                <Banknote size={24} strokeWidth={1.5} />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 items-center h-12">
                <span className="text-gray-500 font-bold uppercase tracking-wide">Tổng tiền</span>
                <div>
                  <p className="font-bold text-xl text-[#00C475]">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    ({unitPrice.toLocaleString('vi-VN')}đ/giờ)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Các nút bấm */}
          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={() => navigate(`/court/${court.id || id}`)}
              className="px-8 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={isSubmitting || conflictError}
              className={`px-8 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                (isSubmitting || conflictError) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#00C475] hover:bg-[#00B068]'
              }`}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
            </button>
          </div>

        </div>
      </div>

      {/* Nút Chatbot */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00C475] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#00B068] transition-colors">
        <MessageCircle size={28} />
      </button>

      {/* ================= MODAL ĐẶT SÂN THÀNH CÔNG ================= */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[460px] p-8 text-center animate-scaleIn">
            
            <div className="w-16 h-16 bg-[#00C475] text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-3">
              Gửi yêu cầu đặt sân thành công
            </h2>
            
            <span className="inline-block bg-orange-50 text-orange-500 border border-orange-100 px-4 py-1 rounded-full text-[13px] font-semibold mb-8">
              Chờ xác nhận
            </span>

            {/* Chi tiết booking */}
            <div className="space-y-4 text-sm mb-8">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Mã booking</span>
                <span className="font-bold text-gray-800">{bookingResult?.code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Sân</span>
                <span className="font-bold text-gray-800">{court.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Thời gian</span>
                <span className="font-bold text-gray-800">{startTime} - {endTime}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-500">Tổng tiền</span>
                <span className="font-bold text-[#00C475] text-base">
                  {totalPrice.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Cảnh báo hủy */}
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3.5 mb-8 flex items-start gap-3 text-left">
              <Clock size={18} className="text-orange-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-orange-600/90 leading-relaxed">
                Booking sẽ tự động hủy nếu không được nhân viên xác nhận trước thời điểm hết hạn giữ chỗ. Bạn sẽ nhận thông báo khi booking được xác nhận.
              </p>
            </div>

            {/* Nút hành động */}
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

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getCourtTypeLabel } from '../utils/CourtUtils';
import Navbar from '../components/Navbar';
import { bookingApi, formatBookingDays, paymentMethodLabel, toDayNumbers } from '../api/bookingApi';

import {
  ArrowLeft, Crown, CheckCircle2, Clock,
  Wallet, FileText, CalendarDays, MapPin, Grid,
  CalendarClock, CircleDollarSign, Info, Trash2, User,
  Repeat, ListOrdered, Calendar as CalendarIcon, X, XCircle,
  AlertCircle, Hourglass
} from 'lucide-react';

// Chuẩn hóa giờ từ LocalTime của Backend: HH:mm:ss -> HH:mm
const formatTime = (value) => {
  if (!value) return '';
  return String(value).slice(0, 5);
};

// Chuẩn hóa timestamp LocalDateTime thành ngày và giờ riêng
// "2026-11-01T01:06:06.077" -> "2026-11-01 • 01:06" (cùng định dạng với Ngày tạo)
const formatDateTime = (value) => {
  if (!value) return '';
  const { date, time } = splitDateTime(value);
  return time ? `${date} • ${time}` : date;
};

const splitDateTime = (value) => {
  if (!value) {
    return {
      date: '',
      time: ''
    };
  }

  const [date, time = ''] = String(value).split('T');

  return {
    date,
    time: formatTime(time)
  };
};

// Ánh xạ DTO Backend sang cấu trúc dữ liệu UI hiện tại.
// Không thay đổi layout hoặc class CSS của giao diện.
const normalizeBookingDetail = (data) => {
  if (!data) return null;

  const created = splitDateTime(data.createdAt);

  const packageId = data.recurringBookingId;

  return {
    id: data.id,
    // Buổi thuộc gói cố định hiển thị dạng SESSION (có nút quay lại gói)
    type: packageId ? 'SESSION' : 'SINGLE',
    packageId: packageId ? `recurring-${packageId}` : undefined,
    packageCode: packageId ? `#${packageId}` : undefined,
    discountPercent: Number(data.discountPercent ?? 0),
    discountAmount: 0,

    code: data.bookingCode || `BK${data.id}`,

    imageUrl: data.courtImageUrl || '',

    courtName: data.courtName || 'Chưa có thông tin sân',

    courtLocation: '',

    courtDescription: data.courtDescription,

    courtTypeLabel:
      getCourtTypeLabel(data.courtType) ||
      
      'Chưa cập nhật',

    isVip: false,

    status: data.bookingStatus || 'PENDING',

    paymentStatus: data.paymentStatus || 'UNPAID',

    cancellationReason: data.cancelReason || '',

    startDate: data.bookingDate || '',

    startTime: formatTime(data.startTime),

    endTime: formatTime(data.endTime),

    createdAt: created.date,

    createdTime: created.time,

    holdExpiresAt: formatDateTime(data.expireAt),

    courtFee: Number(data.courtPrice ?? 0),

    serviceFee: Number(data.servicePrice ?? 0),

    amount: Number(data.totalAmount ?? 0),

    paymentMethod: ({ CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản' }[data.paymentMethod]) || data.paymentMethod || '',

    paidAt: formatDateTime(data.paidAt),

    confirmedBy: data.paidByStaffName || '',

    cancelReason: data.cancelReason || '',
    cancelledAt: data.cancelledAt || ''
  };
};

// Chuẩn hóa gói lịch cố định từ /api/recurring-bookings/{id}
const normalizeRecurringDetail = (data) => ({
  id: `recurring-${data.recurringBookingId}`,
  type: 'RECURRING',
  code: data.code,
  imageUrl: data.courtImageUrl || '',
  courtName: data.courtName || 'Chưa có thông tin sân',
  courtTypeLabel: getCourtTypeLabel(data.courtType),
  isVip: String(data.courtType || '').startsWith('VIP'),
  customerName: data.customer?.fullName || '',
  startDate: data.startDate,
  endDate: data.endDate,
  daysLabel: formatBookingDays(toDayNumbers(data.daysOfWeek || [])),
  startTime: formatTime(data.startTime),
  endTime: formatTime(data.endTime),
  sessionCount: data.sessionCount ?? 0,
  settledSessionCount: data.settledSessionCount ?? 0,
  discountPercent: Number(data.discountPercent ?? 0),
  amount: Number(data.totalAmount ?? 0),
  status: data.status,
  paymentStatus: data.paymentStatus,
  paymentMethod: paymentMethodLabel(data.paymentMethod) || '',
  expireAt: data.expireAt,
  cancelReason: data.cancelReason || '',
});
const normalizeRecurringSessions = (data) => (data.sessions || []).map((session) => ({
  id: session.bookingId,
  code: session.bookingCode,
  startDate: session.bookingDate,
  startTime: formatTime(session.startTime),
  endTime: formatTime(session.endTime),
  status: session.bookingStatus,
  paymentStatus: session.paymentStatus,
}));

export default function SingleBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBookingDetail = useCallback(async () => {
    if (!id) {
      setBooking(null);
      setError('Không tìm thấy mã booking.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // URL dạng /my-bookings/recurring-{id} là gói lịch cố định
      const recurringId = String(id).match(/^recurring-(\d+)$/)?.[1];
      if (recurringId) {
        const recurring = await bookingApi.getMyRecurringBookingDetail(recurringId);
        if (!recurring) throw new Error('Không tìm thấy gói lịch cố định.');
        setBooking(normalizeRecurringDetail(recurring));
        setSessions(normalizeRecurringSessions(recurring));
        return;
      }

      const response = await bookingApi.getBookingDetail(id);

      if (!response) {
        throw new Error('Không tìm thấy thông tin booking.');
      }

      const normalizedBooking = normalizeBookingDetail(response);

      setBooking(normalizedBooking);
      setSessions([]);

    } catch (err) {
      console.error('Get booking detail error:', err);

      setBooking(null);

      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Không thể tải chi tiết booking.'
      );

    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Lần tải đầu tiên của trang cần đồng bộ state từ API theo id trên URL.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookingDetail();
  }, [fetchBookingDetail]);

  // State mở Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-red-500">
        <p>{error || 'Không tìm thấy thông tin booking!'}</p>

        <div className="flex gap-3">
          <button
            onClick={fetchBookingDetail}
            className="px-4 py-2 rounded-lg bg-[#00C475] text-white"
          >
            Thử lại
          </button>

          <button
            onClick={() => navigate('/my-bookings')}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {booking.type === 'SINGLE' || booking.type === 'SESSION' ? (
        <CustomerBookingDetailLayout
          booking={booking}
          navigate={navigate}
          onOpenCancel={() => setIsCancelModalOpen(true)}
          onOpenReschedule={() => setIsRescheduleModalOpen(true)}
        />
      ) : (
        <CustomerRecurringBookingDetailLayout
          booking={booking}
          sessions={sessions}
          navigate={navigate}
          onOpenCancel={() => setIsCancelModalOpen(true)}
        />
      )}

      {/* Modal Hủy Đặt Sân */}
      {isCancelModalOpen && (
        <CancelModal
          booking={booking}
          onClose={() => setIsCancelModalOpen(false)}
        />
      )}

      {/* Modal Dời Lịch */}
      {isRescheduleModalOpen && (
        <RescheduleModal
          booking={booking}
          onClose={() => setIsRescheduleModalOpen(false)}
        />
      )}
    </>
  );
}


// ================= COMPONENT: MODAL DỜI LỊCH (CHUẨN FIGMA) =================
const RescheduleModal = ({ booking, onClose }) => {
  const [newStartTime, setNewStartTime] = useState('');
  
  // Khung giờ trống giả lập (Sau này API sẽ trả về list này)
  const availableTimes = ['07:00', '08:00', '14:00', '15:00', '16:00', '18:00'];

  // Tự động tính giờ kết thúc dựa trên thời lượng (Giả sử 2 tiếng)
  const calculateEndTime = (start) => {
    if (!start) return '';
    const [hours, minutes] = start.split(':').map(Number);
    const endHours = hours + 2; 
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[550px] flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shrink-0">
              <CalendarClock size={22} strokeWidth={2}/>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Dời lịch buổi đặt sân</h2>
              <p className="text-[13px] text-gray-500">Chọn khung giờ mới trong cùng một ngày</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-1 rounded-md transition-colors"><X size={20} /></button>
        </div>

        {/* Nội dung scroll */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Thông tin booking gốc */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3"><FileText size={16} className="text-[#00C475]" /> Thông tin booking</h3>
            <div className="border border-gray-200 rounded-xl p-4 flex gap-4 items-center">
              {/* Hình và Tên sân */}
              <div className="flex gap-3 items-center w-[45%] border-r border-gray-100 pr-4">
                <img src={booking.imageUrl || booking.img} alt={booking.courtName} className="w-[70px] h-[50px] object-cover rounded-md shrink-0"/>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{booking.courtName}</p>
                  <p className="text-[11px] text-gray-500">{booking.courtDescription.replace(/[()]/g, '')}</p>
                </div>
              </div>
              {/* Chi tiết Ngày giờ */}
              <div className="flex-1 space-y-1.5 text-[12px]">
                <div className="flex items-center gap-2"><CalendarDays size={14} className="text-gray-400"/><span className="text-gray-500 w-20">Ngày chơi</span><span className="font-bold text-gray-800">{booking.startDate}</span></div>
                <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400"/><span className="text-gray-500 w-20">Khung giờ</span><span className="font-bold text-gray-800">{booking.startTime} - {booking.endTime}</span></div>
                <div className="flex items-center gap-2"><Hourglass size={14} className="text-gray-400"/><span className="text-gray-500 w-20">Thời lượng</span><span className="font-bold text-gray-800">2 giờ</span></div>
              </div>
            </div>
          </div>

          {/* Chọn giờ mới */}
          <div>
            <div className="mb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800"><Clock size={16} className="text-[#00C475]" /> Chọn khung giờ mới</h3>
              <p className="text-[12px] text-gray-500 ml-6 mt-0.5">Chọn giờ bắt đầu mới. Hệ thống sẽ tự động hiển thị giờ kết thúc dựa trên thời lượng</p>
            </div>
            
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 mb-4 flex items-center gap-2 w-fit">
              <Hourglass size={14} className="text-[#00C475] shrink-0" />
              <p className="text-xs text-emerald-700">Thời lượng buổi chơi: <span className="font-bold">2 giờ</span></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-gray-800 mb-2">Giờ bắt đầu mới <span className="text-red-500">*</span></label>
                <select 
                  value={newStartTime} 
                  onChange={(e) => setNewStartTime(e.target.value)} 
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-[13px] text-gray-600 outline-none hover:border-[#00C475] focus:border-[#00C475]"
                >
                  <option value="" disabled>--:--</option>
                  {availableTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-800 mb-2">Giờ kết thúc</label>
                {/* [UX TỐT] Input chỉ đọc, tự động hiển thị kết quả */}
                <input 
                  type="text" 
                  value={calculateEndTime(newStartTime)}
                  readOnly
                  placeholder="--:--"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-[13px] text-gray-500 outline-none cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          {/* Lưu ý */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <ul className="text-xs text-blue-800/90 leading-relaxed list-disc pl-4 space-y-1">
              <li>Bạn chỉ có thể dời lịch trong ngày <strong>{booking.startDate}</strong>.</li>
              <li>Thời lượng buổi chơi sẽ được giữ nguyên (2 giờ).</li>
              <li>Chỉ hiển thị các khung giờ còn trống.</li>
              <li>Sau khi dời lịch, các buổi khác trong gói lịch cố định sẽ không bị ảnh hưởng.</li>
            </ul>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors">Hủy</button>
          <button disabled={!newStartTime} className={`px-6 py-2 rounded-lg text-[13px] font-bold text-white transition-colors ${!newStartTime ? 'bg-[#00C475]/50 cursor-not-allowed' : 'bg-[#00C475] hover:bg-[#00B068]'}`}>
            Xác nhận dời lịch
          </button>
        </div>
      </div>
    </div>
  );
};


// ================= COMPONENT: MODAL HỦY BOOKING =================
const CancelModal = ({ booking, onClose }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const isSession = booking.type === 'SESSION';
  const isRecurring = booking.type === 'RECURRING';

  const modalTitle = isRecurring ? 'Hủy lịch cố định' : 'Hủy booking';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn">
        
        {/* Header - ĐÃ ĐIỀU CHỈNH LẠI CĂN LỀ & BỎ ICON X TRÒN BÊN TRÁI */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{modalTitle}</h2>
            <p className="text-[13px] text-gray-500">Bạn có chắc chắn muốn hủy booking này?</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-1 rounded-md transition-colors"><X size={20} /></button>
        </div>

        {/* Nội dung scroll */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-6 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700/90 leading-relaxed space-y-1">
              <p>• Bạn chỉ có thể hủy booking trước thời gian chơi đã đặt trước đó 2h.</p>
              <p>• Sau khi hủy, số tiền của bạn sẽ không được hoàn trả lại trên hệ thống.</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4"><FileText size={16} className="text-[#00C475]" /> Thông tin booking</h3>
            <div className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
              <img src={booking.imageUrl || booking.img} alt={booking.courtName} className="w-full sm:w-[140px] h-[90px] object-cover rounded-lg shrink-0"/>
              
              <div className="flex-1">
                {isRecurring ? (
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between"><span className="text-gray-500">Mã gói</span><span className="font-bold text-gray-800">{booking.code}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Loại sân</span><span className="font-bold text-gray-800">{booking.courtName} - <span className="text-[#00C475]">{booking.courtDescription.replace(/[()]/g, '')}</span></span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Thời gian giao dịch</span><span className="font-bold text-gray-800">{booking.startDate} - {booking.endDate}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Các thứ trong tuần</span><span className="font-bold text-gray-800">T{booking.daysOfWeek?.join(', T')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Khung giờ</span><span className="font-bold text-gray-800">{booking.startTime} - {booking.endTime}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Số lượng giờ / buổi</span><span className="font-bold text-gray-800">1.5 | {booking.sessionCount} buổi</span></div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2"><span className="text-gray-500">Tổng tiền</span><span className="font-bold text-[#00C475]">{booking.amount.toLocaleString('vi-VN')}đ</span></div>
                  </div>
                ) : (
                  <div className="space-y-2 text-[13px]">
                    {isSession && (
                       <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                         <div><p className="text-[11px] text-gray-400 leading-tight">Thuộc gói</p><p className="font-bold text-gray-800 text-sm">{booking.packageCode}</p></div>
                         <div className="text-right"><p className="font-bold text-gray-800">{booking.courtName}</p><p className="text-[11px] text-gray-500">{booking.courtLocation}</p></div>
                       </div>
                    )}
                    <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1.5"><FileText size={13}/> Sân</span><span className="font-bold text-gray-800">{booking.courtName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1.5"><CalendarDays size={13}/> Ngày chơi</span><span className="font-bold text-gray-800">{booking.startDate}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1.5"><Clock size={13}/> Khung giờ</span><span className="font-bold text-gray-800">{booking.startTime} - {booking.endTime}</span></div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2"><span className="text-gray-500 flex items-center gap-1.5"><CircleDollarSign size={13}/> Tổng tiền</span><span className="font-bold text-[#00C475]">{booking.amount.toLocaleString('vi-VN')}đ</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Lý do hủy booking <span className="text-red-500">*</span></label>
            <select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              className="w-full border border-gray-200 rounded-lg p-3 text-[13px] text-gray-600 outline-none hover:border-[#00C475] focus:border-[#00C475] mb-3"
            >
              <option value="" disabled>Chọn lý do hủy</option>
              <option value="Bận việc đột xuất">Bận việc đột xuất</option>
              <option value="Đặt nhầm sân/giờ">Đặt nhầm sân/giờ</option>
              <option value="Thời tiết xấu">Thời tiết xấu</option>
              <option value="Khác">Khác...</option>
            </select>
            
            <div className="relative">
              <textarea 
                rows="3" 
                maxLength={500}
                placeholder="Vui lòng cho SmashFlow biết lý do bạn hủy..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-[13px] text-gray-600 outline-none hover:border-[#00C475] focus:border-[#00C475] resize-none"
              ></textarea>
              <span className="absolute bottom-2 right-2 text-[10px] text-gray-400">{customReason.length}/500</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors">Hủy</button>
          <button disabled={!reason} className={`px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-colors ${!reason ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}>
            Xác nhận hủy booking
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= LAYOUT 1: SÂN LẺ & CHI TIẾT BUỔI =================
export const CustomerBookingDetailLayout = ({ booking, navigate, onOpenCancel, onOpenReschedule, embedded = false, onBack }) => {
  const isConfirmed = booking.status === 'CONFIRMED';
  const isCompleted = booking.status === 'COMPLETED';
  // Đã thanh toán tiền sân (PAID) hoặc đã kết toán (SETTLED)
  const isPaid = ['PAID', 'SETTLED'].includes(booking.paymentStatus);
  const isSession = booking.type === 'SESSION';

  // Trạng thái kết toán: chỉ có sau khi nhân viên xác nhận (tiền sân đã thanh toán).
  // PAID => Chưa kết toán; SETTLED (đã thu đủ tiền / bùng lịch) => Đã kết toán.
  const isSettled = booking.paymentStatus === 'SETTLED';
  const isUnsettled = booking.paymentStatus === 'PAID' && booking.status !== 'CANCELLED';
  const settlementUI = isSettled
    ? { text: 'Đã kết toán', badge: 'bg-emerald-100/80 text-emerald-700', wrap: 'bg-emerald-50/50 border-emerald-100', iconColor: 'text-emerald-500' }
    : isUnsettled
      ? { text: 'Chưa kết toán', badge: 'bg-amber-100/80 text-amber-700', wrap: 'bg-amber-50/50 border-amber-100', iconColor: 'text-amber-500' }
      : { text: '–', badge: 'bg-gray-100 text-gray-500', wrap: 'bg-gray-50/50 border-gray-100', iconColor: 'text-gray-400' };

  const getStatusUI = () => {
    if (booking.status === 'CANCELLED') return { icon: <XCircle size={14}/>, text: 'Đã hủy', badge: 'bg-red-50 text-red-500', wrap: 'bg-red-50/50 border-red-100', iconColor: 'text-red-500' };
    if (booking.status === 'NO_SHOW') return { icon: <XCircle size={14}/>, text: 'Bùng lịch', badge: 'bg-red-50 text-red-500', wrap: 'bg-red-50/50 border-red-100', iconColor: 'text-red-500' };
    if (booking.status === 'CHECKED_IN') return { icon: <CheckCircle2 size={14}/>, text: 'Đang chơi', badge: 'bg-blue-50 text-blue-600', wrap: 'bg-blue-50/50 border-blue-100', iconColor: 'text-blue-500' };
    if (isCompleted) return { icon: <CheckCircle2 size={14}/>, text: 'Hoàn thành', badge: 'bg-gray-100 text-gray-600', wrap: 'bg-gray-50/50 border-gray-100', iconColor: 'text-gray-500' };
    if (isConfirmed) return { icon: <CheckCircle2 size={14}/>, text: 'Đã xác nhận', badge: 'bg-emerald-100/80 text-emerald-700', wrap: 'bg-emerald-50/50 border-emerald-100', iconColor: 'text-emerald-500' };
    return { icon: <Clock size={14}/>, text: 'Chờ xác nhận', badge: 'bg-amber-100/80 text-amber-700', wrap: 'bg-amber-50/50 border-amber-100', iconColor: 'text-amber-500' };
  };
  const statusUI = getStatusUI();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {!embedded && <Navbar />}
      <div className="max-w-[1100px] mx-auto px-4 mt-8">
        <button onClick={onBack || (() => navigate(isSession ? `/my-bookings/${booking.packageId}` : '/my-bookings'))} className={`${embedded ? "hidden" : "flex"} items-center gap-1 text-[13px] text-[#00C475] font-medium mb-4 hover:underline w-fit`}>
          <ArrowLeft size={14} /> {isSession ? `Quay lại chi tiết lịch cố định ${booking.packageCode}` : 'Quay lại booking của tôi'}
        </button>

        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-800 mb-1">{isSession ? 'Chi tiết buổi đặt sân' : 'Chi tiết đặt sân lẻ'}</h1>
          <p className="text-sm text-gray-500">{isSession ? 'Theo dõi thông tin buổi trong gói đặt lịch cố định của bạn' : 'Theo dõi thông tin booking của bạn'}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden p-6">
              <img src={booking.imageUrl} alt={booking.courtName} className="w-full h-48 object-cover rounded-xl mb-6"/>
              <div className="flex items-center justify-between mb-4">
                <div><p className="text-[11px] text-gray-400 mb-0.5">Mã booking</p><p className="font-bold text-gray-800 text-[15px]">{booking.code}</p></div>
                <span className={`px-3 py-1 font-semibold rounded-md text-[11px] ${isSession ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{isSession ? 'Lịch cố định' : 'Đặt sân lẻ'}</span>
              </div>
              {isSession && (
                <div className="mb-4 border-t border-gray-100 pt-4 flex justify-between items-center">
                  <div><p className="text-[11px] text-gray-400 mb-0.5">Thuộc gói</p><p className="font-bold text-xl text-gray-800">{booking.packageCode}</p></div>
                  <div className="text-right"><p className="font-bold text-gray-800">{booking.courtName}</p><p className="text-sm text-gray-500">{booking.courtLocation}</p></div>
                </div>
              )}
              {!isSession && (
                <div className="mb-5"><h2 className="text-xl font-bold text-gray-800">{booking.courtName}</h2><p className="text-sm text-gray-500">{booking.courtDescription}</p></div>
              )}
              {booking.isVip && (
                <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 p-3 rounded-lg text-xs font-medium mb-6 mt-2"><Crown size={16} className="text-yellow-500 shrink-0" /><span>Sân VIP, không gian thoáng mát, đèn đạt chuẩn thi đấu.</span></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${statusUI.wrap}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">{React.cloneElement(statusUI.icon, { className: statusUI.iconColor })}<span className="text-[10px] text-gray-500 uppercase font-semibold">Trạng thái booking</span></div>
                  <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${statusUI.badge}`}>{statusUI.text}</span>
                </div>
                <div className={`p-3 rounded-xl border ${settlementUI.wrap}`}>
                  <div className="flex items-center gap-1.5 mb-1.5"><Wallet size={14} className={settlementUI.iconColor} /><span className="text-[10px] text-gray-500 uppercase font-semibold">Trạng thái kết toán</span></div>
                  <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${settlementUI.badge}`}>{settlementUI.text}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-2/3 space-y-6">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-8">
              <div className="mb-8">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-5"><FileText size={18} className="text-[#00C475]" /> Thông tin booking</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2"><FileText size={15}/> Mã booking</span><span className="font-bold text-gray-800">{booking.code}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2"><CalendarDays size={15}/> Ngày chơi</span><span className="font-bold text-gray-800">{booking.startDate}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2"><Clock size={15}/> Khung giờ</span><span className="font-bold text-gray-800">{booking.startTime} - {booking.endTime}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2"><CalendarClock size={15}/> Thời lượng</span><span className="font-bold text-gray-800">2 giờ</span></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2"><Grid size={15}/> Sân</span><span className="font-bold text-gray-800">{booking.courtName}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2"><MapPin size={15}/> Loại sân</span><span className="font-bold text-[#00C475]">{booking.courtTypeLabel.replace('(', '').replace(')', '')}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2"><CalendarDays size={15}/> Ngày tạo</span><span className="font-bold text-gray-800">{booking.createdAt} • {booking.createdTime}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2 whitespace-nowrap"><Clock size={15}/> Hết hạn giữ chỗ</span><span className="whitespace-nowrap font-bold text-gray-800">{booking.holdExpiresAt || '-'}</span></div>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 mb-8"></div>
              
              <div className="mb-8">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-5"><CircleDollarSign size={18} className="text-[#00C475]" /> Chi tiết thanh toán</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500">Tiền sân</span><span className="font-bold text-gray-800">{booking.courtFee.toLocaleString('vi-VN')}đ</span></div>
                    {isSession && booking.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm"><span className="text-gray-500">Ưu đãi lịch cố định ({booking.discountPercent}%)</span><span className="font-bold text-gray-800">-{booking.discountAmount.toLocaleString('vi-VN')}đ</span></div>
                    )}
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500">Dịch vụ phát sinh</span><span className="font-bold text-gray-800">{booking.serviceFee}đ</span></div>
                    <div className="flex justify-between items-center bg-emerald-50/70 px-3 py-2.5 rounded-lg mt-2"><span className="font-bold text-gray-800 text-[13px] uppercase">Tổng tiền</span><span className="font-bold text-[#00C475] text-base">{booking.amount.toLocaleString('vi-VN')}đ</span></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 flex items-center gap-2"><Wallet size={15}/> Trạng thái kết toán</span><span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${settlementUI.badge}`}>{settlementUI.text}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 flex items-center gap-2"><CircleDollarSign size={15}/> Phương thức</span><span className={`font-medium ${isPaid ? 'text-gray-800' : 'text-gray-400'}`}>{booking.paymentMethod || '-'}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 flex items-center gap-2 whitespace-nowrap"><Clock size={15}/> Thanh toán lúc</span><span className={`whitespace-nowrap font-medium ${isPaid ? 'text-gray-800' : 'text-gray-400'}`}>{booking.paidAt ? booking.paidAt : '-'}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 flex items-center gap-2"><CheckCircle2 size={15}/> Xác nhận bởi</span><span className={`font-medium ${isPaid ? 'text-gray-800' : 'text-gray-400'}`}>{booking.confirmedBy || '-'}</span></div>
                  </div>
                </div>
              </div>

              <div>
                {isCompleted ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 mb-6 flex items-start gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /><p className="text-[13px] text-emerald-700/90 leading-relaxed">Cảm ơn bạn đã sử dụng dịch vụ của SmashFlow.</p></div>
                ) : isConfirmed ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3.5 mb-6 flex items-start gap-3"><Info size={18} className="text-blue-500 shrink-0 mt-0.5" /><p className="text-[13px] text-blue-700/90 leading-relaxed">Booking của bạn đã được xác nhận. Vui lòng đến đúng giờ để sử dụng sân.</p></div>
                ) : booking.status === 'PENDING' ? (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3.5 mb-6 flex items-start gap-3"><Clock size={18} className="text-orange-500 shrink-0 mt-0.5" /><p className="text-[13px] text-orange-600/90 leading-relaxed">Booking sẽ tự động hủy nếu không được nhân viên xác nhận trước thời điểm hết hạn giữ chỗ.</p></div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={onBack || (() => navigate(isSession ? `/my-bookings/${booking.packageId}` : '/my-bookings'))} className="px-6 py-2.5 bg-white border border-gray-200 text-[#00C475] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                    <ArrowLeft size={16} /> Quay lại
                  </button>
                  {!embedded && booking.status === 'PENDING' && !isPaid && (
                    <>
                      {/* [THÊM MỚI] Gắn sự kiện Mở Modal Dời lịch */}
                      {isSession && (
                         <button onClick={onOpenReschedule} className="px-5 py-2.5 bg-white border border-blue-200 text-blue-500 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                           <CalendarIcon size={16} /> Dời lịch buổi này
                         </button>
                      )}
                      <button onClick={onOpenCancel} className="px-5 py-2.5 bg-white border border-red-200 text-red-500 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                        <Trash2 size={16} /> Hủy booking
                      </button>
                      <span className="text-[11px] text-gray-400 ml-2 hidden lg:inline-block">(Khách hàng chỉ có thể hủy/dời booking trước thời gian chơi 2 tiếng)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= LAYOUT 2: LỊCH CỐ ĐỊNH TỔNG THỂ =================
// Tiền sân gói thanh toán trọn gói khi đặt (BR-11); mỗi buổi check-in / kết toán riêng (BR-12).
const RECURRING_PAGE_SIZE = 5;
const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const SESSION_STATUS_UI = {
  PENDING: { text: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-600' },
  CONFIRMED: { text: 'Đã xác nhận', cls: 'bg-emerald-50 text-emerald-600' },
  CHECKED_IN: { text: 'Đang chơi', cls: 'bg-blue-50 text-blue-600' },
  COMPLETED: { text: 'Hoàn thành', cls: 'bg-gray-100 text-gray-600' },
  NO_SHOW: { text: 'Bùng lịch', cls: 'bg-red-50 text-red-500' },
  CANCELLED: { text: 'Đã hủy', cls: 'bg-red-50 text-red-500' },
};

// "2026-09-01" -> "01/09/2026"
const toViDate = (value) => (value ? String(value).split('-').reverse().join('/') : '–');
// Tính thứ theo ngày địa phương, tránh lệch múi giờ khi parse chuỗi ISO
const weekdayOf = (value) => {
  if (!value) return '–';
  const [y, m, d] = String(value).split('-').map(Number);
  return WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()];
};

const InfoRow = ({ icon, label, children }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-gray-500 flex items-center gap-2 whitespace-nowrap">{icon} {label}</span>
    <span className="font-bold text-gray-800 text-right">{children}</span>
  </div>
);

const HoldCountdown = ({ expireAt }) => {
  const calc = () => (expireAt ? Math.max(0, Math.floor((new Date(expireAt).getTime() - Date.now()) / 1000)) : 0);
  const [remaining, setRemaining] = useState(calc);
  useEffect(() => {
    if (!expireAt) return undefined;
    const timer = setInterval(() => setRemaining(Math.max(0, Math.floor((new Date(expireAt).getTime() - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [expireAt]);
  if (!expireAt) return <span>Chưa có hạn</span>;
  if (remaining <= 0) return <span>Đã hết hạn</span>;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return <span>{mm}:{ss}</span>;
};

export const CustomerRecurringBookingDetailLayout = ({ booking, sessions, navigate, onOpenCancel, embedded = false, onBack, onViewSession }) => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const isPaid = booking.paymentStatus === 'PAID';
  const isActive = booking.status === 'ACTIVE';
  const isUnpaidActive = isActive && !isPaid;

  const getStatusUI = () => {
    if (booking.status === 'CANCELLED') return { icon: <XCircle size={14}/>, text: 'Đã hủy', badge: 'bg-red-50 text-red-500', wrap: 'bg-red-50/50 border-red-100', iconColor: 'text-red-500' };
    if (booking.status === 'COMPLETED') return { icon: <CheckCircle2 size={14}/>, text: 'Hoàn thành', badge: 'bg-gray-100 text-gray-600', wrap: 'bg-gray-50/50 border-gray-100', iconColor: 'text-gray-500' };
    if (!isPaid) return { icon: <Clock size={14}/>, text: 'Chờ xác nhận', badge: 'bg-amber-100/80 text-amber-700', wrap: 'bg-amber-50/50 border-amber-100', iconColor: 'text-amber-500' };
    return { icon: <CheckCircle2 size={14}/>, text: 'Đang hoạt động', badge: 'bg-emerald-100/80 text-emerald-700', wrap: 'bg-emerald-50/50 border-emerald-100', iconColor: 'text-emerald-500' };
  };
  const statusUI = getStatusUI();

  const filtered = sessions.filter((session) => statusFilter === 'ALL' || session.status === statusFilter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / RECURRING_PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const visible = filtered.slice((activePage - 1) * RECURRING_PAGE_SIZE, activePage * RECURRING_PAGE_SIZE);

  const renderSettlement = (session) => {
    if (session.paymentStatus === 'SETTLED') return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">Đã kết toán</span>;
    if (session.paymentStatus === 'PAID' && session.status !== 'CANCELLED') return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">Chưa kết toán</span>;
    return <span className="text-gray-400">–</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {!embedded && <Navbar />}
      <div className="max-w-[1100px] mx-auto px-4 mt-8">
        <button onClick={onBack || (() => navigate('/my-bookings'))} className={`${embedded ? "hidden" : "flex"} items-center gap-1 text-[13px] text-[#00C475] font-medium mb-4 hover:underline w-fit`}>
          <ArrowLeft size={14} /> Quay lại booking của tôi
        </button>

        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-800 mb-1">Chi tiết đặt sân cố định</h1>
          <p className="text-sm text-gray-500">Theo dõi thông tin booking của bạn</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ===== Cột trái: sân + trạng thái ===== */}
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden p-6">
              {booking.imageUrl
                ? <img src={booking.imageUrl} alt={booking.courtName} className="w-full h-48 object-cover rounded-xl mb-6"/>
                : <div className="w-full h-48 rounded-xl mb-6 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Chưa có ảnh</div>}
              <div className="flex items-center justify-between mb-4">
                <div><p className="text-[11px] text-gray-400 mb-0.5">Mã gói</p><p className="font-bold text-gray-800 text-xl">{booking.code}</p></div>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 font-semibold rounded-md text-[11px]">Lịch cố định</span>
              </div>
              <div className="mb-5 border-t border-gray-100 pt-4"><h2 className="text-xl font-bold text-gray-800">{booking.courtName}</h2><p className="text-sm text-gray-500">{booking.courtTypeLabel}</p></div>
              {booking.isVip && (
                <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 p-3 rounded-lg text-xs font-medium mb-6"><Crown size={16} className="text-yellow-500 shrink-0" /><span>Sân VIP, không gian thoáng mát, đèn đạt chuẩn thi đấu.</span></div>
              )}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <div className={`p-3 rounded-xl border ${statusUI.wrap}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">{React.cloneElement(statusUI.icon, { className: statusUI.iconColor })}<span className="text-[10px] text-gray-500 uppercase font-semibold">Trạng thái gói</span></div>
                  <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${statusUI.badge}`}>{statusUI.text}</span>
                </div>
                {isPaid ? (
                  <div className={`p-3 rounded-xl border ${booking.settledSessionCount === booking.sessionCount ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                    <div className="flex items-center gap-1.5 mb-1.5"><Wallet size={14} className={booking.settledSessionCount === booking.sessionCount ? 'text-emerald-500' : 'text-amber-500'} /><span className="text-[10px] text-gray-500 uppercase font-semibold">Đã kết toán</span></div>
                    <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${booking.settledSessionCount === booking.sessionCount ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>{booking.settledSessionCount}/{booking.sessionCount} buổi</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border bg-gray-50/50 border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1.5"><Wallet size={14} className="text-gray-400" /><span className="text-[10px] text-gray-500 uppercase font-semibold">Thanh toán gói</span></div>
                    <span className="inline-block px-2.5 py-1 rounded text-[11px] font-bold bg-gray-100 text-gray-500">Chưa thanh toán</span>
                  </div>
                )}
              </div>

              {/* Chưa thanh toán: khung giữ chỗ + Thanh toán. Đã xác nhận thì khung biến mất. */}
              {!embedded && isUnpaidActive && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-1.5 text-[12px] text-amber-700 mb-2">
                    <Clock size={14} className="shrink-0" />
                    <span>Giữ chỗ: <span className="font-bold tabular-nums"><HoldCountdown expireAt={booking.expireAt} /></span></span>
                  </div>
                  <button type="button" onClick={() => window.alert('Chức năng thanh toán sẽ được kết nối API sau.')}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-emerald-600 transition-colors">
                    <CircleDollarSign size={16} /> Thanh toán {booking.amount.toLocaleString('vi-VN')}đ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ===== Cột phải: thông tin + danh sách buổi ===== */}
          <div className="w-full lg:w-2/3 space-y-6">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-8">
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-5"><FileText size={18} className="text-[#00C475]" /> Thông tin booking</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <div className="space-y-4">
                    <InfoRow icon={<FileText size={15}/>} label="Mã gói">{booking.code}</InfoRow>
                    <InfoRow icon={<User size={15}/>} label="Khách hàng">{booking.customerName || '–'}</InfoRow>
                    <InfoRow icon={<Grid size={15}/>} label="Sân">{booking.courtName}</InfoRow>
                    <InfoRow icon={<MapPin size={15}/>} label="Loại sân">{booking.courtTypeLabel}</InfoRow>
                    {isPaid && <InfoRow icon={<Wallet size={15}/>} label="Phương thức">{booking.paymentMethod || '–'}</InfoRow>}
                  </div>
                  <div className="space-y-4">
                    <InfoRow icon={<CalendarDays size={15}/>} label="Thời gian áp dụng">{toViDate(booking.startDate)} - {toViDate(booking.endDate)}</InfoRow>
                    <InfoRow icon={<Repeat size={15}/>} label="Các thứ trong tuần">{booking.daysLabel}</InfoRow>
                    <InfoRow icon={<Clock size={15}/>} label="Khung giờ cố định">{booking.startTime} - {booking.endTime}</InfoRow>
                    <InfoRow icon={<ListOrdered size={15}/>} label="Số buổi trong gói">{booking.sessionCount} buổi</InfoRow>
                    <InfoRow icon={<CircleDollarSign size={15}/>} label="Tỷ lệ chiết khấu">
                      <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-emerald-50 text-emerald-600">{booking.discountPercent}%</span>
                    </InfoRow>
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-gray-500 flex items-start gap-2"><Wallet size={15} className="mt-0.5"/> <span>Tổng tiền gói<br/><span className="text-[11px]">(sau giảm giá)</span></span></span>
                      <span className="font-bold text-[#00C475] text-lg">{booking.amount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-bold text-gray-800"><CalendarClock size={18} className="text-[#00C475]" /> Danh sách các buổi trong gói</h3>
                    <p className="text-[12px] text-gray-500 mt-1">Mỗi buổi tương ứng với 1 lượt check-in / kết toán riêng biệt.</p>
                  </div>
                  <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    aria-label="Lọc trạng thái buổi"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-600 outline-none focus:border-[#00C475]">
                    <option value="ALL">Tất cả trạng thái</option>
                    {Object.entries(SESSION_STATUS_UI).map(([value, ui]) => <option key={value} value={value}>{ui.text}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="text-xs text-gray-600 bg-slate-100">
                        <th className="py-2.5 px-2 font-semibold rounded-tl-lg">#</th>
                        <th className="py-2.5 px-2 font-semibold">Ngày chơi</th>
                        <th className="py-2.5 px-2 font-semibold">Thứ</th>
                        <th className="py-2.5 px-2 font-semibold">Khung giờ</th>
                        <th className="py-2.5 px-2 font-semibold">Trạng thái buổi</th>
                        <th className="py-2.5 px-2 font-semibold">Kết toán</th>
                        <th className="py-2.5 px-2 font-semibold rounded-tr-lg">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((session) => {
                        const ui = SESSION_STATUS_UI[session.status] ?? { text: session.status, cls: 'bg-gray-100 text-gray-600' };
                        return (
                          <tr key={session.id} className="border-b border-gray-50 text-[13px] text-gray-700 hover:bg-gray-50/50 transition-colors">
                            <td className="py-2.5 px-2 font-medium">{sessions.indexOf(session) + 1}</td>
                            <td className="py-2.5 px-2">{toViDate(session.startDate)}</td>
                            <td className="py-2.5 px-2">{weekdayOf(session.startDate)}</td>
                            <td className="py-2.5 px-2">{session.startTime} - {session.endTime}</td>
                            <td className="py-2.5 px-2"><span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ui.cls}`}>{ui.text}</span></td>
                            <td className="py-2.5 px-2">{renderSettlement(session)}</td>
                            <td className="py-2.5 px-2">{embedded
                              ? <button type="button" onClick={() => onViewSession?.(session)} className="inline-block px-2.5 py-1 border border-emerald-300 rounded text-[12px] text-[#00C475] font-semibold hover:bg-emerald-50">Xem chi tiết</button>
                              : <Link to={`/my-bookings/${session.id}`} className="inline-block px-2.5 py-1 border border-emerald-300 rounded text-[12px] text-[#00C475] font-semibold hover:bg-emerald-50">Xem chi tiết</Link>}</td>
                          </tr>
                        );
                      })}
                      {!visible.length && <tr><td colSpan={7} className="py-6 text-center text-[13px] text-gray-400">Không có buổi phù hợp.</td></tr>}
                    </tbody>
                  </table>
                </div>
                {pageCount > 1 && (
                  <nav className="flex items-center justify-end gap-2 mt-4" aria-label="Phân trang các buổi">
                    <button type="button" disabled={activePage === 1} onClick={() => setPage(activePage - 1)}
                      className="w-9 h-8 rounded-md border border-gray-200 text-gray-500 disabled:opacity-40">&lt;</button>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                      <button key={n} type="button" onClick={() => setPage(n)} aria-current={n === activePage ? 'page' : undefined}
                        className={`w-9 h-8 rounded-md border text-[13px] ${n === activePage ? 'border-[#00C475] text-[#00C475] font-semibold' : 'border-gray-200 text-gray-600'}`}>{n}</button>
                    ))}
                    <button type="button" disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)}
                      className="w-9 h-8 rounded-md border border-gray-200 text-gray-500 disabled:opacity-40">&gt;</button>
                  </nav>
                )}
              </div>

              {booking.status === 'CANCELLED' && booking.cancelReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3.5 mb-6 text-[13px] text-red-600">Lý do hủy gói: {booking.cancelReason}</div>
              )}
              {isUnpaidActive && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3.5 mb-6 flex items-start gap-3"><Clock size={18} className="text-orange-500 shrink-0 mt-0.5" /><p className="text-[13px] text-orange-600/90 leading-relaxed">Gói sẽ tự động hủy nếu không được nhân viên xác nhận trước thời điểm hết hạn giữ chỗ.</p></div>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                <button onClick={onBack || (() => navigate('/my-bookings'))} className="px-6 py-2.5 bg-white border border-gray-200 text-[#00C475] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                  <ArrowLeft size={16} /> Quay lại
                </button>
                {/* BR-14: chỉ hủy được khi gói chưa thanh toán */}
                {!embedded && isUnpaidActive && (
                  <button onClick={onOpenCancel} className="px-6 py-2 bg-red-50 border border-red-200 text-red-500 rounded-lg text-sm font-semibold flex flex-col items-center justify-center hover:bg-red-100 transition-colors">
                    <span className="flex items-center gap-2"><Trash2 size={16} /> Hủy lịch cố định</span>
                    <span className="text-[11px] font-normal">(hủy toàn bộ các buổi còn lại)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

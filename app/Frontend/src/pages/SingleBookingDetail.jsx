import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { mockBookings, mockRecurringSessions } from '../mocks/apiContract';
import { 
  ArrowLeft, MessageCircle, Crown, CheckCircle2, Clock, 
  Wallet, FileText, CalendarDays, MapPin, Grid, 
  CalendarClock, CircleDollarSign, Info, Trash2, User, Repeat, ListOrdered, Calendar as CalendarIcon, X, AlertCircle, Hourglass
} from 'lucide-react';

export default function SingleBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // State mở Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  useEffect(() => {
    const foundBooking = mockBookings.find(b => b.id === Number(id) || b.code === id) || mockRecurringSessions.find(s => s.id === id);
    if (foundBooking && foundBooking.type === 'RECURRING') {
      const foundSessions = mockRecurringSessions.filter(s => s.packageId === foundBooking.id);
      setSessions(foundSessions);
    }
    setTimeout(() => {
      setBooking(foundBooking);
      setLoading(false);
    }, 300);
  }, [id]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>;
  if (!booking) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">Không tìm thấy thông tin booking!</div>;

  return (
    <>
      {booking.type === 'SINGLE' || booking.type === 'SESSION' ? (
        <SingleLayout 
          booking={booking} 
          navigate={navigate} 
          onOpenCancel={() => setIsCancelModalOpen(true)}
          onOpenReschedule={() => setIsRescheduleModalOpen(true)}
        />
      ) : (
        <RecurringLayout 
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

      {/* [THÊM MỚI] Modal Dời Lịch */}
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
                  <p className="text-[11px] text-gray-500">{booking.courtTypeLabel.replace(/[()]/g, '')}</p>
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
                    <div className="flex justify-between"><span className="text-gray-500">Loại sân</span><span className="font-bold text-gray-800">{booking.courtName} - <span className="text-[#00C475]">{booking.courtTypeLabel.replace(/[()]/g, '')}</span></span></div>
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
const SingleLayout = ({ booking, navigate, onOpenCancel, onOpenReschedule }) => {
  const isConfirmed = booking.status === 'CONFIRMED';
  const isCompleted = booking.status === 'COMPLETED';
  const isPaid = booking.paymentStatus === 'PAID';
  const isSession = booking.type === 'SESSION';

  const getStatusUI = () => {
    if (isCompleted) return { icon: <CheckCircle2 size={14}/>, text: 'Hoàn thành', badge: 'bg-gray-100 text-gray-600', wrap: 'bg-gray-50/50 border-gray-100', iconColor: 'text-gray-500' };
    if (isConfirmed) return { icon: <CheckCircle2 size={14}/>, text: 'Đã xác nhận', badge: 'bg-emerald-100/80 text-emerald-700', wrap: 'bg-emerald-50/50 border-emerald-100', iconColor: 'text-emerald-500' };
    return { icon: <Clock size={14}/>, text: 'Chờ xác nhận', badge: 'bg-amber-100/80 text-amber-700', wrap: 'bg-amber-50/50 border-amber-100', iconColor: 'text-amber-500' };
  };
  const statusUI = getStatusUI();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />
      <div className="max-w-[1100px] mx-auto px-4 mt-8">
        <button onClick={() => navigate(isSession ? `/my-bookings/${booking.packageId}` : '/my-bookings')} className="flex items-center gap-1 text-[13px] text-[#00C475] font-medium mb-4 hover:underline w-fit">
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
                <div className="mb-5"><h2 className="text-xl font-bold text-gray-800">{booking.courtName}</h2><p className="text-sm text-gray-500">{booking.courtTypeLabel}</p></div>
              )}
              {booking.isVip && (
                <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 p-3 rounded-lg text-xs font-medium mb-6 mt-2"><Crown size={16} className="text-yellow-500 shrink-0" /><span>Sân VIP, không gian thoáng mát, đèn đạt chuẩn thi đấu.</span></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${statusUI.wrap}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">{React.cloneElement(statusUI.icon, { className: statusUI.iconColor })}<span className="text-[10px] text-gray-500 uppercase font-semibold">Trạng thái booking</span></div>
                  <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${statusUI.badge}`}>{statusUI.text}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isPaid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                  <div className="flex items-center gap-1.5 mb-1.5"><Wallet size={14} className={isPaid ? "text-emerald-500" : "text-amber-500"} /><span className="text-[10px] text-gray-500 uppercase font-semibold">Trạng thái thanh toán</span></div>
                  <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${isPaid ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>{isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
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
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-500 flex items-center gap-2"><Clock size={15}/> Hết hạn giữ chỗ</span><span className="font-bold text-gray-800">{booking.holdExpiresAt.replace('T', ' • ').slice(0, -3)}</span></div>
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
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 flex items-center gap-2"><Wallet size={15}/> Trạng thái thanh toán</span><span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${isPaid ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>{isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 flex items-center gap-2"><CircleDollarSign size={15}/> Phương thức</span><span className={`font-medium ${isPaid ? 'text-gray-800' : 'text-gray-400'}`}>{booking.paymentMethod || '-'}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 flex items-center gap-2"><Clock size={15}/> Thanh toán lúc</span><span className={`font-medium ${isPaid ? 'text-gray-800' : 'text-gray-400'}`}>{booking.paidAt ? booking.paidAt.replace('T', ' • ').slice(0, -3) : '-'}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-500 flex items-center gap-2"><CheckCircle2 size={15}/> Xác nhận bởi</span><span className={`font-medium ${isPaid ? 'text-gray-800' : 'text-gray-400'}`}>{booking.confirmedBy || '-'}</span></div>
                  </div>
                </div>
              </div>

              <div>
                {isCompleted ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 mb-6 flex items-start gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /><p className="text-[13px] text-emerald-700/90 leading-relaxed">Cảm ơn bạn đã sử dụng dịch vụ của SmashFlow.</p></div>
                ) : isConfirmed ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3.5 mb-6 flex items-start gap-3"><Info size={18} className="text-blue-500 shrink-0 mt-0.5" /><p className="text-[13px] text-blue-700/90 leading-relaxed">Booking của bạn đã được xác nhận. Vui lòng đến đúng giờ để sử dụng sân.</p></div>
                ) : (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3.5 mb-6 flex items-start gap-3"><Clock size={18} className="text-orange-500 shrink-0 mt-0.5" /><p className="text-[13px] text-orange-600/90 leading-relaxed">Booking sẽ tự động hủy nếu không được nhân viên xác nhận trước thời điểm hết hạn giữ chỗ.</p></div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => navigate(isSession ? `/my-bookings/${booking.packageId}` : '/my-bookings')} className="px-6 py-2.5 bg-white border border-gray-200 text-[#00C475] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                    <ArrowLeft size={16} /> Quay lại
                  </button>
                  {!isCompleted && (
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
const RecurringLayout = ({ booking, sessions, navigate, onOpenCancel }) => {
  const isActive = booking.status === 'ACTIVE';
  const isCompleted = booking.status === 'COMPLETED';

  const getStatusUI = () => {
    if (isCompleted) return { icon: <CheckCircle2 size={14}/>, text: 'Hoàn thành', badge: 'bg-gray-100 text-gray-600', wrap: 'bg-gray-50/50 border-gray-100', iconColor: 'text-gray-500' };
    return { icon: <Repeat size={14}/>, text: 'Đang hoạt động', badge: 'bg-emerald-100/80 text-emerald-700', wrap: 'bg-emerald-50/50 border-emerald-100', iconColor: 'text-emerald-500' };
  };
  const statusUI = getStatusUI();

  const getDayOfWeek = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[d.getDay()];
  };

  const renderSessionStatus = (status) => {
    switch(status) {
      case 'COMPLETED': return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[11px] font-semibold">Hoàn thành</span>;
      case 'CONFIRMED': return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[11px] font-semibold">Đã xác nhận</span>;
      case 'CANCELLED': return <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-[11px] font-semibold">Đã hủy</span>;
      default: return <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[11px] font-semibold">Chờ xác nhận</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />
      <div className="max-w-[1100px] mx-auto px-4 mt-8">
        <button onClick={() => navigate('/my-bookings')} className="flex items-center gap-1 text-[13px] text-[#00C475] font-medium mb-4 hover:underline w-fit">
          <ArrowLeft size={14} /> Quay lại booking của tôi
        </button>

        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-800 mb-1">Chi tiết đặt sân cố định</h1>
          <p className="text-sm text-gray-500">Theo dõi thông tin booking của bạn</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden p-6">
              <img src={booking.imageUrl} alt={booking.courtName} className="w-full h-48 object-cover rounded-xl mb-6"/>
              <div className="flex items-center justify-between mb-4">
                <div><p className="text-[11px] text-gray-400 mb-0.5">Mã gói</p><p className="font-bold text-gray-800 text-[15px]">{booking.code}</p></div>
                <span className="px-3 py-1 bg-purple-50 text-purple-600 font-semibold rounded-md text-[11px]">Lịch cố định</span>
              </div>
              <div className="mb-5"><h2 className="text-xl font-bold text-gray-800">{booking.courtName}</h2><p className="text-sm text-gray-500">{booking.courtTypeLabel}</p></div>
              {booking.isVip && (
                <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 p-3 rounded-lg text-xs font-medium mb-6"><Crown size={16} className="text-yellow-500 shrink-0" /><span>Sân VIP, không gian thoáng mát, đèn đạt chuẩn thi đấu.</span></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${statusUI.wrap}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">{React.cloneElement(statusUI.icon, { className: statusUI.iconColor })}<span className="text-[10px] text-gray-500 uppercase font-semibold">Trạng thái</span></div>
                  <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${statusUI.badge}`}>{statusUI.text}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isCompleted ? 'bg-gray-50/50 border-gray-100' : 'bg-amber-50/50 border-amber-100'}`}>
                  <div className="flex items-center gap-1.5 mb-1.5"><Wallet size={14} className={isCompleted ? "text-gray-500" : "text-amber-500"} /><span className="text-[10px] text-gray-500 uppercase font-semibold">Thanh toán</span></div>
                  <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${isCompleted ? 'bg-gray-100/80 text-gray-700' : 'bg-amber-100/80 text-amber-700'}`}>{isCompleted ? 'Hoàn thành' : 'Thanh toán từng buổi'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-2/3 space-y-6">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-8">
              
              <div className="mb-6">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-5"><FileText size={18} className="text-[#00C475]" /> Thông tin booking</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><FileText size={15}/> Mã gói</span><span className="font-bold text-gray-800">{booking.code}</span></div>
                    <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><User size={15}/> Khách hàng</span><span className="font-bold text-gray-800">Nguyễn Văn A</span></div>
                    <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><MapPin size={15}/> Loại sân</span><span className="font-bold text-[#00C475]">{booking.courtTypeLabel.replace('(', '').replace(')', '')}</span></div>
                    <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><Grid size={15}/> Sân</span><span className="font-bold text-gray-800">{booking.courtName}</span></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><CalendarDays size={15}/> Thời gian</span><span className="font-bold text-gray-800">{booking.startDate} - {booking.endDate}</span></div>
                    <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><Repeat size={15}/> Tần suất</span><span className="font-bold text-gray-800">T{booking.daysOfWeek?.join(', T')}</span></div>
                    <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><Clock size={15}/> Khung giờ</span><span className="font-bold text-gray-800">{booking.startTime} - {booking.endTime}</span></div>
                    <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><ListOrdered size={15}/> Số buổi</span><span className="font-bold text-gray-800">{booking.sessionCount} buổi</span></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center bg-emerald-50/70 px-4 py-3 rounded-xl mb-8">
                <span className="font-bold text-gray-800 text-[13px] uppercase">Tổng tiền gói</span>
                <span className="font-bold text-[#00C475] text-lg">{booking.amount.toLocaleString('vi-VN')}đ</span>
              </div>

              <div className="mb-8">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-4"><CalendarClock size={18} className="text-[#00C475]" /> Danh sách các buổi trong gói</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase bg-gray-50/50">
                        <th className="py-3 px-2 font-semibold rounded-tl-lg">#</th>
                        <th className="py-3 px-2 font-semibold">Ngày chơi</th>
                        <th className="py-3 px-2 font-semibold">Thứ</th>
                        <th className="py-3 px-2 font-semibold">Khung giờ</th>
                        <th className="py-3 px-2 font-semibold">Trạng thái</th>
                        <th className="py-3 px-2 font-semibold text-right rounded-tr-lg">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session, idx) => (
                        <tr key={session.id} className="border-b border-gray-50 text-[13px] text-gray-700 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-2 font-medium">{idx + 1}</td>
                          <td className="py-3 px-2">{session.startDate}</td>
                          <td className="py-3 px-2 font-medium">{getDayOfWeek(session.startDate)}</td>
                          <td className="py-3 px-2">{session.startTime} - {session.endTime}</td>
                          <td className="py-3 px-2">{renderSessionStatus(session.status)}</td>
                          <td className="py-3 px-2 text-right">
                             <Link to={`/my-bookings/${session.id}`} className="text-[#00C475] font-semibold hover:underline">Xem chi tiết</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                <button onClick={() => navigate('/my-bookings')} className="px-6 py-2.5 bg-white border border-gray-200 text-[#00C475] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                  <ArrowLeft size={16} /> Quay lại
                </button>
                {isActive && (
                  <button onClick={onOpenCancel} className="px-6 py-2.5 bg-white border border-red-200 text-red-500 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                    <Trash2 size={16} /> Hủy lịch cố định
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
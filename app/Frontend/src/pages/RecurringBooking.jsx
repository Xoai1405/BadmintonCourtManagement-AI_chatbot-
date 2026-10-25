import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ChevronDown, CalendarDays, Clock, MapPin, Search, Calendar as CalendarIcon, Info, CheckCircle2, AlertCircle, MessageCircle, X, Wallet } from 'lucide-react';

export default function RecurringBooking() {
  const navigate = useNavigate();

  // State các trường dữ liệu
  const [selectedCourt, setSelectedCourt] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State quản lý Trạng thái màn hình & Validation (Giả lập UI)
  // Các trạng thái có thể là: 'IDLE' (Chưa kiểm tra), 'CONFLICT' (Bị trùng lịch), 'AVAILABLE' (Hợp lệ)
  const [validationStatus, setValidationStatus] = useState('IDLE');
  
  // State quản lý Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Danh sách Tên sân (Mock combobox)
  const courtOptions = [
    { id: '1', name: 'Sân VIP 02' },
    { id: '2', name: 'Sân 01' },
    { id: '3', name: 'Sân 03' },
    { id: '4', name: 'Sân 04' }
  ];

  // Danh sách Thứ trong tuần
  const weekDays = [
    { id: 1, label: 'T2', name: 'Thứ 2' },
    { id: 2, label: 'T3', name: 'Thứ 3' },
    { id: 3, label: 'T4', name: 'Thứ 4' },
    { id: 4, label: 'T5', name: 'Thứ 5' },
    { id: 5, label: 'T6', name: 'Thứ 6' },
    { id: 6, label: 'T7', name: 'Thứ 7' },
    { id: 0, label: 'CN', name: 'Chủ nhật' }
  ];

  const handleDayToggle = (dayId) => {
    setSelectedDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId].sort()
    );
  };

  // Hàm giả lập logic Kiểm tra lịch (Validate) khi bấm nút
  const handleValidate = () => {
    // Điều kiện bắt buộc để kiểm tra
    if (!selectedCourt || !selectedTime || selectedDays.length === 0 || !startDate || !endDate) {
      alert("Vui lòng nhập đầy đủ thông tin để kiểm tra lịch trống!");
      return;
    }

    // [Giả lập] Nếu chọn Thứ 3 (id=2), hệ thống báo Trùng lịch. Còn lại thì Hợp lệ.
    if (selectedDays.includes(2)) {
      setValidationStatus('CONFLICT');
    } else {
      setValidationStatus('AVAILABLE');
    }
  };

  // Hàm xử lý Đặt lịch (Chỉ chạy khi Available)
  const handleSubmitBooking = () => {
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />

      <div className="max-w-[1000px] mx-auto px-4 mt-8">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Đăng ký lịch cố định</h1>
          <p className="text-sm text-gray-500">Đặt lịch chơi cố định theo tuần hoặc tháng để hưởng chiết khấu</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* ================= CỘT TRÁI: FORM ĐIỀN THÔNG TIN ================= */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-8">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {/* Combobox Chọn Sân */}
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Sân <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00C475]" />
                    <select 
                      value={selectedCourt} 
                      onChange={(e) => setSelectedCourt(e.target.value)} 
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl h-[46px] pl-10 pr-10 text-[14px] text-gray-800 font-semibold outline-none focus:border-[#00C475] focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="" disabled>Chọn sân...</option>
                      {courtOptions.map(court => (
                        <option key={court.id} value={court.name}>{court.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Combobox Chọn Khung giờ */}
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Khung giờ <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00C475]" />
                    <select 
                      value={selectedTime} 
                      onChange={(e) => setSelectedTime(e.target.value)} 
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl h-[46px] pl-10 pr-10 text-[14px] text-gray-800 font-semibold outline-none focus:border-[#00C475] focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="" disabled>Chọn khung giờ</option>
                      <option value="17:00 - 19:00">17:00 - 19:00</option>
                      <option value="18:30 - 20:00">18:30 - 20:00</option>
                      <option value="19:00 - 21:00">19:00 - 21:00</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Chọn Thứ trong tuần */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">Chọn thứ trong tuần <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap items-center gap-3">
                  {weekDays.map(day => (
                    <button
                      key={day.id}
                      onClick={() => handleDayToggle(day.id)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border transition-all ${
                        selectedDays.includes(day.id) 
                          ? 'bg-[#00C475] text-white border-[#00C475] shadow-md' 
                          : 'bg-white text-gray-500 border-gray-200 hover:border-[#00C475] hover:text-[#00C475]'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chọn Ngày bắt đầu / kết thúc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Từ ngày <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl h-[46px] pl-10 pr-4 text-[14px] text-gray-800 font-semibold outline-none focus:border-[#00C475] focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Đến ngày <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl h-[46px] pl-10 pr-4 text-[14px] text-gray-800 font-semibold outline-none focus:border-[#00C475] focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ================= CỘT PHẢI: TỔNG KẾT VÀ HÀNH ĐỘNG ================= */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-6 sticky top-28">
              <h2 className="text-lg font-bold text-gray-800 mb-5 pb-4 border-b border-gray-100">Đặt lịch</h2>
              
              {/* Box Cảnh báo Trạng thái (Validation Alert) */}
              <div className="mb-6">
                {validationStatus === 'IDLE' && (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3.5 flex gap-3 items-start">
                    <Info size={18} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-600/90 leading-relaxed">Vui lòng chọn sân, khung giờ, khoảng thời gian và các thứ bạn muốn để kiểm tra lịch trống.</p>
                  </div>
                )}
                
                {validationStatus === 'CONFLICT' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex gap-3 items-start shadow-sm">
                    <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-700/90 leading-relaxed">
                      <p className="font-bold mb-1">Đã có khách đặt khung giờ này vào ngày:</p>
                      <ul className="list-disc pl-4 space-y-0.5 font-medium">
                        <li>Thứ 3 (15/10/2026)</li>
                        <li>Thứ 3 (22/10/2026)</li>
                      </ul>
                    </div>
                  </div>
                )}

                {validationStatus === 'AVAILABLE' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex gap-3 items-start shadow-sm">
                    <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700/90 leading-relaxed font-medium">Không có ngày nào bị trùng lịch. Sẵn sàng xác nhận đăng ký lịch!</p>
                  </div>
                )}
              </div>

              {/* Chi tiết tính tiền giả lập */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-500 flex items-center gap-2"><CalendarIcon size={16}/> Số buổi</span>
                  <span className="font-bold text-gray-800">12 Buổi</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-500 flex items-center gap-2"><Info size={16}/> Chiết khấu</span>
                  <span className="font-bold text-gray-800">10%</span>
                </div>
                <div className="flex justify-between items-center text-[13px] pt-4 border-t border-gray-100">
                  <span className="text-gray-500 flex items-center gap-2 font-medium"><Wallet size={16}/> Tổng tiền chu kỳ</span>
                  <span className="font-bold text-[#00C475] text-[17px]">2.340.000đ</span>
                </div>
              </div>

              {/* Nút Hành động */}
              {validationStatus === 'AVAILABLE' ? (
                <button 
                  onClick={handleSubmitBooking}
                  className="w-full bg-[#00C475] text-white py-3.5 rounded-xl font-bold hover:bg-[#00B068] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Xác nhận đặt lịch
                </button>
              ) : (
                <button 
                  onClick={handleValidate}
                  className="w-full bg-gray-100 text-gray-400 py-3.5 rounded-xl font-bold hover:bg-gray-200 hover:text-gray-600 transition-colors shadow-sm"
                >
                  Kiểm tra lịch
                </button>
              )}

            </div>
          </div>
        </div>
      </div>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00C475] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#00B068] transition-colors z-40">
        <MessageCircle size={28} />
      </button>

      {/* ================= MODAL THÀNH CÔNG ================= */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] flex flex-col p-8 items-center text-center animate-scaleIn relative">
            <button onClick={() => setIsSuccessModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition-colors"><X size={20} /></button>
            
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5 mt-2">
              <CheckCircle2 size={36} className="text-[#00C475]" />
            </div>
            
            <h2 className="text-xl font-extrabold text-gray-800 mb-1">Gửi yêu cầu đặt lịch cố định thành công</h2>
            <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full mb-6 mt-2">Chờ xác nhận</span>

            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6 text-left text-[13px] space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Sân</span><span className="font-bold text-gray-800">{selectedCourt || 'Sân VIP 02'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Khung giờ</span><span className="font-bold text-gray-800">{selectedTime || '19:00 - 21:00'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Thời gian giao dịch</span><span className="font-bold text-gray-800">{startDate || '01/10/2026'} - {endDate || '31/12/2026'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số buổi</span><span className="font-bold text-gray-800">12 Buổi</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Chiết khấu</span><span className="font-bold text-gray-800">10%</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-3"><span className="text-gray-500 font-bold">Tổng tiền chu kỳ</span><span className="font-bold text-[#00C475] text-[15px]">2.340.000đ</span></div>
            </div>

            <div className="bg-orange-50/70 border border-orange-100 rounded-lg p-3 flex gap-3 items-start mb-6 text-left w-full">
               <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
               <p className="text-[11px] text-orange-700/90 leading-relaxed">Booking sẽ tự động hủy nếu không được nhân viên xác nhận trước thời điểm hết hạn giữ chỗ. Bạn sẽ nhận thông báo khi booking được xác nhận.</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button onClick={() => navigate('/my-bookings')} className="w-full bg-[#00C475] text-white py-3 rounded-xl font-bold hover:bg-[#00B068] transition-colors text-sm">
                Xem chi tiết booking
              </button>
              <button onClick={() => setIsSuccessModalOpen(false)} className="w-full bg-white border border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm">
                Về danh sách sân
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ChevronDown, CalendarDays, Clock, MapPin, Calendar as CalendarIcon, Info, CheckCircle2, AlertCircle, MessageCircle, X, Wallet } from 'lucide-react'; 
// Nhớ kiểm tra đường dẫn import courtApi cho khớp với cấu trúc thư mục của bạn
import { courtApi } from '../api/CourtApi'; 

export default function RecurringBooking() {
  const navigate = useNavigate();

  // State các trường dữ liệu
  const [selectedCourt, setSelectedCourt] = useState(''); // Lưu ID của sân
  const [selectedDays, setSelectedDays] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('18:30');
  const [endTime, setEndTime] = useState('20:00');
  
  // State UI
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [validationStatus, setValidationStatus] = useState('IDLE');
  const [isConflictExpanded, setIsConflictExpanded] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  
  // State chứa dữ liệu thật từ Backend
  const [courts, setCourts] = useState([]);
  const [conflictDates, setConflictDates] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // 1. Gọi API lấy danh sách sân bằng courtApi (Cách chuẩn Clean Code)
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const data = await courtApi.getAllCourt();
        setCourts(data);
      } catch (err) {
        console.error("Lỗi tải danh sách sân:", err);
      }
    };
    fetchCourts();
  }, []);

  // 2. Hàm tự động sinh danh sách giờ từ 04:00 đến 23:00
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 4; h <= 23; h++) {
      const hour = h.toString().padStart(2, '0');
      slots.push(`${hour}:00`);
      if (h !== 23) {
        slots.push(`${hour}:30`);
      }
    }
    return slots;
  };
  const timeOptions = generateTimeSlots();

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

  const calculateDuration = (start, end) => {
    if (!start || !end) return '';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let totalMins = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMins <= 0) return 'Giờ không hợp lệ';
    
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
  };

  // Hàm lấy tên sân từ ID để hiển thị trong Modal Thành Công
  const getSelectedCourtName = () => {
    const court = courts.find(c => c.id.toString() === selectedCourt.toString());
    return court ? court.name : 'Chưa chọn sân';
  };

  // 3. Xử lý Validate Kiểm tra lịch trống (Chỗ này gọi API Validation sau)
  const handleValidate = async () => {
    if (!selectedCourt || !startTime || !endTime || selectedDays.length === 0 || !startDate || !endDate) {
      alert("Vui lòng nhập đầy đủ thông tin để kiểm tra lịch trống!");
      return;
    }
    
    // Tạm thời mock giả lập logic trùng lịch để test giao diện
    if (selectedDays.includes(2)) {
      setConflictDates([
        { date: '13/10/2026', day: 'Thứ 3', time: `${startTime} - ${endTime}` },
        { date: '27/10/2026', day: 'Thứ 3', time: `${startTime} - ${endTime}` }
      ]);
      setValidationStatus('CONFLICT');
      setIsConflictExpanded(false); 
    } else {
      setTotalAmount(2340000); 
      setValidationStatus('AVAILABLE');
    }
  };

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
          {/* ================= CỘT TRÁI: FORM ================= */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-8">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {/* Combobox Sân */}
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Sân <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00C475]" />
                    <select 
                      value={selectedCourt} 
                      onChange={(e) => {
                        setSelectedCourt(e.target.value);
                        setValidationStatus('IDLE'); // Đổi sân thì reset trạng thái kiểm tra
                      }} 
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl h-[46px] pl-10 pr-10 text-[14px] text-gray-800 font-semibold outline-none focus:border-[#00C475] focus:bg-white transition-colors cursor-pointer shadow-sm"
                    >
                      <option value="" disabled>Chọn sân...</option>
                      {courts && courts.length > 0 ? (
                        courts.map(court => (
                          <option 
                            key={court.id} 
                            value={court.id}
                            disabled={court.status && court.status !== 'ACTIVE'}
                            className={court.status && court.status !== 'ACTIVE' ? 'text-gray-400 bg-gray-100' : 'text-gray-800'}
                          >
                            {court.name} {court.status && court.status !== 'ACTIVE' ? '(Đang bảo trì)' : ''}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Đang tải danh sách sân...</option>
                      )}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Combobox Khung giờ */}
                <div className="relative">
                  <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">Khung giờ</label>
                  <div 
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className={`relative w-full bg-white border rounded-xl h-[46px] pl-10 pr-10 flex items-center text-[14px] text-gray-800 font-bold cursor-pointer transition-colors shadow-sm ${showTimePicker ? 'border-[#00C475]' : 'border-gray-200'}`}
                  >
                    <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00C475]" />
                    <span className="flex-1 truncate">{startTime && endTime ? `${startTime} - ${endTime}` : 'Chọn khung giờ'}</span>
                    <ChevronDown size={16} className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${showTimePicker ? 'rotate-180' : ''}`} />
                  </div>

                  {showTimePicker && (
                    <div className="absolute top-[72px] left-0 w-full bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-100 p-4 z-20 animate-fadeIn">
                      <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-gray-400 mb-1">Giờ bắt đầu</label>
                          <div className="relative">
                            <select 
                              value={startTime} 
                              onChange={(e) => setStartTime(e.target.value)} 
                              className="w-full appearance-none border border-gray-200 rounded-lg p-2.5 text-[13px] font-bold text-gray-700 outline-none focus:border-[#00C475] cursor-pointer"
                            >
                              {timeOptions.map(time => (
                                <option key={`start-${time}`} value={time}>{time}</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-gray-400 mb-1">Giờ kết thúc</label>
                          <div className="relative">
                            <select 
                              value={endTime} 
                              onChange={(e) => setEndTime(e.target.value)} 
                              className="w-full appearance-none border border-gray-200 rounded-lg p-2.5 text-[13px] font-bold text-gray-700 outline-none focus:border-[#00C475] cursor-pointer"
                            >
                              {timeOptions.map(time => (
                                <option key={`end-${time}`} value={time}>{time}</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg mb-4">
                         <Info size={14} className="text-[#00C475]"/> 
                         Thời lượng: {calculateDuration(startTime, endTime)}
                      </div>
                      <button onClick={() => setShowTimePicker(false)} className="w-full bg-[#00C475] text-white py-2.5 rounded-lg text-[13px] font-bold hover:bg-[#00B068] transition-colors">
                        Áp dụng
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chọn Thứ trong tuần */}
              <div className="mb-8">
                <label className="block text-[12px] font-bold text-gray-700 mb-3 tracking-wide">Chọn thứ trong tuần</label>
                <div className="flex flex-wrap items-center gap-3">
                  {weekDays.map(day => (
                    <button
                      key={day.id}
                      onClick={() => handleDayToggle(day.id)}
                      className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-sm font-bold border transition-all ${
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

              {/* Chọn Ngày */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[12px] font-bold text-gray-700 mb-2 tracking-wide flex items-center gap-1.5"><CalendarDays size={14}/> Từ ngày</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl h-[46px] px-4 text-[14px] text-gray-800 font-semibold outline-none focus:border-[#00C475] transition-colors shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-700 mb-2 tracking-wide flex items-center gap-1.5"><CalendarDays size={14}/> Đến ngày</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl h-[46px] px-4 text-[14px] text-gray-800 font-semibold outline-none focus:border-[#00C475] transition-colors shadow-sm"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ================= CỘT PHẢI: BILLING ================= */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-6 sticky top-28">
              <h2 className="text-[17px] font-extrabold text-gray-800 mb-5 pb-4 border-b border-gray-100">Đặt lịch</h2>
              
              <div className="mb-6 space-y-3">
                {validationStatus === 'IDLE' && (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3.5 flex gap-2 items-start">
                    <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] font-medium text-orange-600/90 leading-relaxed">Vui lòng chọn sân, khung giờ, thứ trong tuần và khoảng thời gian để xem chi tiết.</p>
                  </div>
                )}
                
                {validationStatus === 'CONFLICT' && (
                  <div className="border border-red-200 rounded-xl overflow-hidden shadow-sm transition-all">
                    <div 
                      className="bg-red-50 p-3.5 flex gap-3 items-start cursor-pointer hover:bg-red-100/50 transition-colors"
                      onClick={() => setIsConflictExpanded(!isConflictExpanded)}
                    >
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[13px] text-red-600 font-bold mb-0.5">Có {conflictDates.length} buổi bị trùng lịch</p>
                        <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium select-none">
                          Xem chi tiết <ChevronDown size={12} className={`transition-transform duration-200 ${isConflictExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                    
                    {isConflictExpanded && (
                      <div className="bg-red-50/40 p-3 border-t border-red-100">
                        <ul className="space-y-2">
                          {conflictDates.map((conflict, index) => (
                            <li key={index} className="flex justify-between items-center text-[12px] text-red-700 bg-red-100/60 px-3 py-2.5 rounded-lg">
                              <span className="font-bold">{conflict.date} ({conflict.day})</span>
                              <span className="font-medium text-red-600/80">{conflict.time}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {validationStatus === 'AVAILABLE' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex gap-2 items-start shadow-sm">
                    <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] font-medium text-blue-700/90 leading-relaxed">Không có ngày nào bị trùng lịch. Sẵn sàng xác nhận đăng ký lịch!</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-500 flex items-center gap-2"><CalendarIcon size={16}/> Số buổi</span>
                  <span className="font-bold text-gray-800">{validationStatus === 'IDLE' ? '-' : '13 Buổi'}</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-500 flex items-center gap-2"><Info size={16}/> Chiết khấu</span>
                  <span className="font-bold text-gray-800">{validationStatus === 'IDLE' ? '-' : '10%'}</span>
                </div>
                <div className="flex justify-between items-center text-[13px] pt-4 border-t border-gray-100">
                  <span className="text-gray-500 flex items-center gap-2 font-medium"><Wallet size={16}/> Tổng tiền chu kỳ</span>
                  <span className="font-bold text-[#00C475] text-[17px]">{validationStatus === 'IDLE' ? '-' : `${totalAmount.toLocaleString()}đ`}</span>
                </div>
              </div>

              {validationStatus === 'AVAILABLE' ? (
                <button 
                  onClick={handleSubmitBooking}
                  className="w-full bg-[#00C475] text-white py-3.5 rounded-xl font-bold hover:bg-[#00B068] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  Xác nhận →
                </button>
              ) : validationStatus === 'CONFLICT' ? (
                <button 
                  disabled
                  className="w-full bg-gray-200 text-gray-400 py-3.5 rounded-xl font-bold cursor-not-allowed"
                >
                  Xác nhận →
                </button>
              ) : (
                <button 
                  onClick={handleValidate}
                  className="w-full bg-[#00C475] text-white py-3.5 rounded-xl font-bold hover:bg-[#00B068] transition-colors shadow-sm"
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
            <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[11px] font-bold rounded-full mb-6 mt-2">Chờ xác nhận</span>
            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6 text-left text-[13px] space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Sân</span><span className="font-bold text-gray-800">{getSelectedCourtName()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Khung giờ</span><span className="font-bold text-gray-800">{startTime} - {endTime}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Giao dịch</span><span className="font-bold text-gray-800">{startDate} - {endDate}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-3"><span className="text-gray-500 font-bold">Tổng tiền chu kỳ</span><span className="font-bold text-[#00C475] text-[15px]">{totalAmount.toLocaleString()}đ</span></div>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button onClick={() => navigate('/my-bookings')} className="w-full bg-[#00C475] text-white py-3 rounded-xl font-bold hover:bg-[#00B068] transition-colors text-sm">Xem chi tiết booking</button>
              <button onClick={() => setIsSuccessModalOpen(false)} className="w-full bg-white border border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm">Về danh sách sân</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
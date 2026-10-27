import React, { useState, useEffect } from 'react'; //BaoDen Them
import { courtApi } from '../api/CourtApi'; //BaoDen Them
import { previewRecurringBookingApi } from '../api/bookingApi'; //BaoDen Them

import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ChevronDown, CalendarDays, Clock, MapPin, Search, Calendar as CalendarIcon, Info, CheckCircle2, AlertCircle, MessageCircle, X, Wallet } from 'lucide-react';

export default function RecurringBooking() {
  const navigate = useNavigate();

  // State các trường dữ liệu
  const [selectedCourt, setSelectedCourt] = useState('');
  
  // SỬA: Đổi selectedTime thành startTime và endTime cho UI Popover
  const [startTime, setStartTime] = useState('18:30');
  const [endTime, setEndTime] = useState('20:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isConflictExpanded, setIsConflictExpanded] = useState(false);
  
  const [selectedDays, setSelectedDays] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State quản lý Trạng thái màn hình & Validation
  const [validationStatus, setValidationStatus] = useState('IDLE');
  
  // State quản lý Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Danh sách Tên sân (Mock combobox)
  const [courts, setCourts] = useState([]); // Danh sách sân từ backend
  const [previewResult, setPreviewResult] = useState(null); // Kết quả tính tiền & conflict từ backend
  const [conflicts, setConflicts] = useState([]); // Danh sách ngày bị trùng
  const [loading, setLoading] = useState(false); // Trạng thái đang kiểm tra

  // THÊM: Hàm sinh danh sách giờ tự động
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 4; h <= 23; h++) {
      const hour = h.toString().padStart(2, '0');
      slots.push(`${hour}:00`);
      if (h !== 23) slots.push(`${hour}:30`);
    }
    return slots;
  };
  const timeOptions = generateTimeSlots();

  // THÊM: Hàm tính thời lượng hiển thị ở Popover
  const calculateDuration = (start, end) => {
    if (!start || !end) return '';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const totalMins = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMins <= 0) return 'Giờ không hợp lệ';
    
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
  };

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

  // Bảng map từ ID thứ của FE sang Enum của Backend
  const mapDayToEnum = {
    1: "MON",
    2: "TUE",
    3: "WES",
    4: "THU",
    5: "FRI",
    6: "SAT",
    0: "SUN"
  };

  const handleValidate = async () => {
    // SỬA: Check theo startTime và endTime thay vì selectedTime
    if (!selectedCourt || !startTime || !endTime || selectedDays.length === 0 || !startDate || !endDate) {
      alert("Vui lòng nhập đầy đủ thông tin để kiểm tra lịch trống!");
      return;
    }

    if (calculateDuration(startTime, endTime) === 'Giờ không hợp lệ') {
      alert("Giờ kết thúc phải lớn hơn giờ bắt đầu!");
      return;
    }

    const payload = {
      courtId: Number(selectedCourt),
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
      daysOfWeek: selectedDays.map(d => mapDayToEnum[d]),
      startDate: startDate,
      endDate: endDate
    };

    try {
      setLoading(true);
      const data = await previewRecurringBookingApi(payload);
      setPreviewResult(data);

      if (data.conflictingSlotList && data.conflictingSlotList.length > 0) {
        setValidationStatus('CONFLICT');
        setConflicts(data.conflictingSlotList);
      } else {
        setValidationStatus('AVAILABLE');
        setConflicts([]);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Có lỗi khi kiểm tra lịch!");
      setValidationStatus('IDLE');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý Đặt lịch (Chỉ chạy khi Available)
  const handleSubmitBooking = () => {
    setIsSuccessModalOpen(true);
  };

  const getSelectedCourtName = () => {
    const court = courts.find(c => c.id.toString() === selectedCourt.toString());
    return court ? court.name : 'Chưa chọn sân';
  };

  const formattedTimeRange = `${startTime} - ${endTime}`;

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
                        onChange={(e) => {
                          setSelectedCourt(e.target.value);
                          setValidationStatus('IDLE'); 
                        }}
                        className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl h-[46px] pl-10 pr-10 text-[14px] text-gray-800 font-semibold outline-none focus:border-[#00C475] focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="" disabled>Chọn sân...</option>
                      {courts.map(court => {
                        // Hứng trạng thái sân (Dự phòng cả 2 tên biến BE hay dùng là status hoặc courtStatus)
                        const currentStatus = court.status || court.courtStatus;
                        const isMaintenance = currentStatus && currentStatus !== 'ACTIVE';
                        
                        return (
                          <option 
                            key={court.id || court.courtId} 
                            value={court.id || court.courtId} 
                            disabled={isMaintenance}
                            className={isMaintenance ? 'text-gray-400 bg-gray-100' : 'text-gray-800'}
                          >
                            {court.name || court.courtName} {isMaintenance ? '(Đang bảo trì)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* SỬA: Combobox Chọn Khung giờ (Popover động) */}
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Khung giờ <span className="text-red-500">*</span></label>
                  <div
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className={`relative w-full bg-gray-50 border rounded-xl h-[46px] pl-10 pr-10 flex items-center text-[14px] text-gray-800 font-semibold cursor-pointer transition-colors shadow-sm ${
                      showTimePicker ? 'border-[#00C475] bg-white' : 'border-gray-200'
                    }`}
                  >
                    <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00C475]" />
                    <span className="flex-1 truncate">
                      {startTime && endTime ? formattedTimeRange : 'Chọn khung giờ'}
                    </span>
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
                              onChange={(e) => {
                                setStartTime(e.target.value);
                                setValidationStatus('IDLE');
                              }}
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
                              onChange={(e) => {
                                setEndTime(e.target.value);
                                setValidationStatus('IDLE');
                              }}
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
                        <Info size={14} className="text-[#00C475]" />
                        Thời lượng: {calculateDuration(startTime, endTime)}
                      </div>
                      <button
                        onClick={() => setShowTimePicker(false)}
                        className="w-full bg-[#00C475] text-white py-2.5 rounded-lg text-[13px] font-bold hover:bg-[#00B068] transition-colors"
                      >
                        Áp dụng
                      </button>
                    </div>
                  )}
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
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setValidationStatus('IDLE');
                      }}
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
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setValidationStatus('IDLE');
                      }}
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
                
                {/* SỬA: Box báo lỗi trùng lịch dạng Accordion */}
                {validationStatus === 'CONFLICT' && (
                  <div className="border border-red-200 rounded-xl overflow-hidden shadow-sm transition-all">
                    <div
                      className="bg-red-50 p-3.5 flex gap-3 items-start cursor-pointer hover:bg-red-100/50 transition-colors"
                      onClick={() => setIsConflictExpanded(!isConflictExpanded)}
                    >
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[13px] text-red-600 font-bold mb-0.5">
                          Có {conflicts.length} buổi bị trùng lịch
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium select-none">
                          Xem chi tiết <ChevronDown size={12} className={`transition-transform duration-200 ${isConflictExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                    
                    {isConflictExpanded && (
                      <div className="bg-red-50/40 p-3 border-t border-red-100 max-h-48 overflow-y-auto">
                        <ul className="space-y-2">
                          {conflicts.map((item, index) => (
                            <li key={index} className="flex justify-between items-center text-[12px] text-red-700 bg-red-100/60 px-3 py-2.5 rounded-lg">
                              <span className="font-bold">
                                {item.date ? item.date.split('-').reverse().join('/') : ''} ({item.dayOfWeek})
                              </span>
                              <span className="font-medium text-red-600/80">{formattedTimeRange}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                  <span className="font-bold text-gray-800">
                    {previewResult ? `${previewResult.totalSessions} Buổi` : '0 Buổi'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-gray-500 flex items-center gap-2"><Info size={16}/> Chiết khấu</span>
                  <span className="font-bold text-gray-800">
                    {previewResult ? `${previewResult.discountPercent}%` : '0%'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px] pt-4 border-t border-gray-100">
                  <span className="text-gray-500 flex items-center gap-2 font-medium"><Wallet size={16}/> Tổng tiền chu kỳ</span>
                  <span className="font-bold text-[#00C475] text-[17px]">
                    {previewResult ? `${new Intl.NumberFormat("vi-VN").format(previewResult.totalPrice)}đ` : '0đ'}
                  </span>
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
              ) : validationStatus === 'CONFLICT' ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full bg-gray-200 text-gray-400 py-3.5 rounded-xl font-bold cursor-not-allowed"
                  >
                    Xác nhận →
                  </button>
                  <button
                    onClick={handleValidate}
                    disabled={loading}
                    className="w-full bg-white border border-[#00C475] text-[#00C475] py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors"
                  >
                    {loading ? "Đang kiểm tra..." : "Kiểm tra lại"}
                  </button>
                </div>
              ) : (
                  <button
                      onClick={handleValidate}
                      disabled={loading}
                      className="w-full bg-[#00C475] text-white py-3.5 rounded-xl font-bold hover:bg-[#00B068] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? "Đang kiểm tra lịch..." : "Kiểm tra lịch"}
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
              <div className="flex justify-between"><span className="text-gray-500">Sân</span><span className="font-bold text-gray-800">{getSelectedCourtName()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Khung giờ</span><span className="font-bold text-gray-800">{formattedTimeRange}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Thời gian giao dịch</span><span className="font-bold text-gray-800">{startDate || '01/10/2026'} - {endDate || '31/12/2026'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Số buổi</span><span className="font-bold text-gray-800">{previewResult ? `${previewResult.totalSessions} Buổi` : '0 Buổi'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Chiết khấu</span><span className="font-bold text-gray-800">{previewResult ? `${previewResult.discountPercent}%` : '0%'}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-3"><span className="text-gray-500 font-bold">Tổng tiền chu kỳ</span><span className="font-bold text-[#00C475] text-[15px]">{previewResult ? `${new Intl.NumberFormat("vi-VN").format(previewResult.totalPrice)}đ` : '0đ'}</span></div>
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
import React, { useEffect, useMemo, useRef } from 'react';
import { Clock, ChevronDown, Info } from 'lucide-react';
import { mockBusinessHours, toHHMM, toMinutes } from '../../mocks/staffBookingMock';

const formatDuration = (start, end) => {
  if (!start || !end) return '';
  const totalMins = toMinutes(end) - toMinutes(start);
  if (totalMins <= 0) return 'Giờ không hợp lệ';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
  if (h > 0) return `${h} giờ`;
  return `${m} phút`;
};

export default function TimePickerPopover({
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  showTimePicker,
  setShowTimePicker,
  onTimeChange,
  openTime = mockBusinessHours.openTime,
  closeTime = mockBusinessHours.closeTime,
}) {
  const containerRef = useRef(null);

  // Các mốc 30 phút trong giờ hoạt động
  const timeOptions = useMemo(() => {
    const options = [];
    for (let t = toMinutes(openTime); t <= toMinutes(closeTime); t += 30) options.push(toHHMM(t));
    return options;
  }, [openTime, closeTime]);

  const startOptions = timeOptions.slice(0, -1); // không bắt đầu đúng giờ đóng cửa
  const endOptions = timeOptions.filter((t) => toMinutes(t) > toMinutes(startTime));

  // Giờ mở/đóng cửa thay đổi (lấy từ API) -> kéo giờ đang chọn về trong khoảng hợp lệ
  useEffect(() => {
    const open = toMinutes(openTime);
    const close = toMinutes(closeTime);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start >= open && end <= close && end > start) return;
    const newStart = Math.min(Math.max(start, open), close - 30);
    const newEnd = Math.min(Math.max(end, newStart + 30), close);
    setStartTime(toHHMM(newStart));
    setEndTime(toHHMM(newEnd));
    onTimeChange?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTime, closeTime]);

  // Đóng popover khi bấm ra ngoài
  useEffect(() => {
    if (!showTimePicker) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setShowTimePicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimePicker, setShowTimePicker]);

  const handleStartChange = (value) => {
    setStartTime(value);
    // Giờ kết thúc không hợp lệ -> tự lùi về start + 1h (hoặc giờ đóng cửa)
    if (toMinutes(endTime) <= toMinutes(value)) {
      setEndTime(toHHMM(Math.min(toMinutes(value) + 60, toMinutes(closeTime))));
    }
    onTimeChange?.();
  };

  const handleEndChange = (value) => {
    setEndTime(value);
    onTimeChange?.();
  };

  const selectClass = 'w-full appearance-none border border-gray-200 rounded-lg p-2.5 text-[13px] font-bold text-gray-700 outline-none focus:border-[#00C475] cursor-pointer';

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
        Khung giờ <span className="text-red-500">*</span>
      </label>
      <button
        type="button"
        onClick={() => setShowTimePicker(!showTimePicker)}
        className={`relative w-full bg-white border rounded-xl h-11 pl-10 pr-10 flex items-center text-[14px] text-gray-800 font-bold cursor-pointer transition-colors text-left ${
          showTimePicker ? 'border-[#00C475]' : 'border-gray-200'
        }`}
      >
        <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00C475]" />
        <span className="flex-1 truncate">{startTime && endTime ? `${startTime} - ${endTime}` : 'Chọn khung giờ'}</span>
        <ChevronDown size={16} className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${showTimePicker ? 'rotate-180' : ''}`} />
      </button>

      {showTimePicker && (
        <div className="absolute top-[72px] left-0 w-full bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-100 p-4 z-20 animate-fadeIn">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-gray-400 mb-1">Giờ bắt đầu</label>
              <div className="relative">
                <select value={startTime} onChange={(e) => handleStartChange(e.target.value)} className={selectClass}>
                  {startOptions.map((time) => <option key={`start-${time}`} value={time}>{time}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-gray-400 mb-1">Giờ kết thúc</label>
              <div className="relative">
                <select value={endTime} onChange={(e) => handleEndChange(e.target.value)} className={selectClass}>
                  {endOptions.map((time) => <option key={`end-${time}`} value={time}>{time}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 bg-emerald-50/50 p-2.5 rounded-lg mb-4">
            <Info size={14} className="text-[#00C475]" />
            Thời lượng: {formatDuration(startTime, endTime)} • Giờ mở cửa {openTime} - {closeTime}
          </div>
          <button
            type="button"
            onClick={() => setShowTimePicker(false)}
            className="w-full bg-[#00C475] text-white py-2.5 rounded-lg text-[13px] font-bold hover:bg-[#00B068] transition-colors"
          >
            Áp dụng
          </button>
        </div>
      )}
    </div>
  );
}

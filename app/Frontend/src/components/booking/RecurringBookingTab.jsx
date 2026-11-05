import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronDown, CalendarDays, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import TimePickerPopover from './TimePickerPopover';
import ConflictAccordion from './ConflictAccordion';
import { courtApi } from '../../api/CourtApi';
import { staffBookingCreateApi, DAY_NUMBER_TO_ENUM, toApiTime, toHHMM } from '../../api/staffBookingCreateApi';
import { getCourtTypeLabel } from '../../utils/CourtUtils';
import { PAYMENT_METHODS, formatVnd, mockBusinessHours, todayString } from '../../mocks/staffBookingMock';

// id theo Date.getDay(): 0 = CN, 1 = T2 ... 6 = T7
const weekDays = [
  { id: 1, label: 'T2', name: 'Thứ 2' },
  { id: 2, label: 'T3', name: 'Thứ 3' },
  { id: 3, label: 'T4', name: 'Thứ 4' },
  { id: 4, label: 'T5', name: 'Thứ 5' },
  { id: 5, label: 'T6', name: 'Thứ 6' },
  { id: 6, label: 'T7', name: 'Thứ 7' },
  { id: 0, label: 'CN', name: 'Chủ nhật' },
];

export default function RecurringBookingTab({ customer, onBooked }) {
  const navigate = useNavigate();

  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState('');
  const [startTime, setStartTime] = useState('18:30');
  const [endTime, setEndTime] = useState('20:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  // Giờ mở/đóng cửa: staff không gọi được API business-hour (chỉ MANAGER),
  // nên suy ra từ ô đầu/cuối của API lịch trống
  const [businessHours, setBusinessHours] = useState(mockBusinessHours);

  // IDLE | CONFLICT | AVAILABLE
  const [validationStatus, setValidationStatus] = useState('IDLE');
  const [previewResult, setPreviewResult] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    courtApi.getAllCourt()
      .then(setCourts)
      .catch((err) => toast.error(err.message));
  }, []);

  useEffect(() => {
    if (!selectedCourt) return;
    courtApi.getAvailability(selectedCourt, todayString())
      .then(({ slots = [] }) => {
        if (slots.length === 0) return;
        setBusinessHours({ openTime: toHHMM(slots[0].startTime), closeTime: toHHMM(slots[slots.length - 1].endTime) });
      })
      .catch(() => { /* giữ giờ mặc định, backend vẫn validate giờ hoạt động */ });
  }, [selectedCourt]);

  // Mọi thay đổi trong form đều phải kiểm tra lại lịch
  const resetValidation = () => {
    setValidationStatus('IDLE');
    setPreviewResult(null);
    setConflicts([]);
  };

  const handleDayToggle = (dayId) => {
    setSelectedDays((prev) => (prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]));
    resetValidation();
  };

  const validateForm = () => {
    if (!selectedCourt) return 'Vui lòng chọn sân.';
    if (!startTime || !endTime) return 'Vui lòng chọn khung giờ.';
    if (selectedDays.length === 0) return 'Vui lòng chọn ít nhất một thứ trong tuần.';
    if (!startDate || !endDate) return 'Vui lòng chọn ngày bắt đầu và kết thúc.';
    if (startDate < todayString()) return 'Ngày bắt đầu phải từ hôm nay trở đi.';
    if (endDate <= startDate) return 'Ngày kết thúc phải sau ngày bắt đầu.';
    return null;
  };

  const buildPayload = () => ({
    courtId: Number(selectedCourt),
    startTime: toApiTime(startTime),
    endTime: toApiTime(endTime),
    daysOfWeek: selectedDays.map((d) => DAY_NUMBER_TO_ENUM[d]),
    startDate,
    endDate,
  });

  const handleValidate = async () => {
    const error = validateForm();
    if (error) return toast.error(error);

    setLoading(true);
    try {
      const data = await staffBookingCreateApi.previewRecurringBooking(buildPayload());
      const conflictList = data.conflictingSlotList ?? [];
      setPreviewResult(data);
      setConflicts(conflictList);
      setValidationStatus(conflictList.length > 0 ? 'CONFLICT' : 'AVAILABLE');
    } catch (err) {
      toast.error(err.message || 'Có lỗi khi kiểm tra lịch!');
      resetValidation();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (!customer) return toast.error('Vui lòng chọn khách hàng ở cột bên trái trước khi tạo booking!');
    if (customer.isMock) return toast.error('Khách này chỉ là dữ liệu mock (chưa có API thêm khách), không tạo booking thật được.');
    if (validationStatus !== 'AVAILABLE') return toast.error('Vui lòng kiểm tra lịch trống trước.');

    setSubmitting(true);
    try {
      const result = await staffBookingCreateApi.createRecurringBooking({
        ...buildPayload(),
        customerId: customer.userId,
        paymentMethod,
      });
      toast.success(`Tạo gói #${result.recurringBookingId} (${result.totalSessions} buổi) thành công! Tổng: ${formatVnd(result.totalPrice)}`);
      resetValidation();
      onBooked?.(result);
    } catch (err) {
      toast.error(err.message || 'Đặt lịch thất bại, vui lòng thử lại!');
      resetValidation();
    } finally {
      setSubmitting(false);
    }
  };

  const formattedTimeRange = `${startTime} - ${endTime}`;
  const dateInputClass = 'w-full bg-white border border-gray-200 rounded-xl h-11 pl-10 pr-4 text-[14px] text-gray-800 font-bold outline-none focus:border-[#00C475]';

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {!customer && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-700">
          <AlertTriangle size={16} /> Chưa chọn khách hàng — chọn ở cột bên trái trước khi tạo booking.
        </div>
      )}

      {/* 1. Chọn sân & khung giờ */}
      <div className="flex flex-wrap gap-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Sân <span className="text-red-500">*</span></label>
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00C475]" />
            <select
              value={selectedCourt}
              onChange={(e) => { setSelectedCourt(e.target.value); resetValidation(); }}
              className="w-full appearance-none bg-white border border-gray-200 rounded-xl h-11 pl-10 pr-10 text-[14px] text-gray-800 font-bold outline-none focus:border-[#00C475] transition-colors cursor-pointer"
            >
              <option value="" disabled>Chọn sân...</option>
              {courts.map((court) => {
                const isInactive = court.status !== 'ACTIVE';
                return (
                  <option key={court.id} value={court.id} disabled={isInactive}>
                    {court.name} — {getCourtTypeLabel(court.courtType)}{isInactive ? ' (Ngưng hoạt động)' : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <TimePickerPopover
            startTime={startTime} endTime={endTime}
            setStartTime={setStartTime} setEndTime={setEndTime}
            showTimePicker={showTimePicker} setShowTimePicker={setShowTimePicker}
            onTimeChange={resetValidation}
            openTime={businessHours.openTime}
            closeTime={businessHours.closeTime}
          />
        </div>
      </div>

      {/* 2. Chọn thứ & khoảng ngày */}
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide text-center">Chọn thứ trong tuần <span className="text-red-500">*</span></label>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {weekDays.map((day) => (
            <button
              key={day.id}
              type="button"
              title={day.name}
              onClick={() => handleDayToggle(day.id)}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border transition-all ${selectedDays.includes(day.id) ? 'bg-[#00C475] text-white border-[#00C475]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#00C475] hover:text-[#00C475]'}`}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Từ ngày <span className="text-red-500">*</span></label>
            <div className="relative">
              <CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date" value={startDate} min={todayString()}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value > endDate) setEndDate('');
                  resetValidation();
                }}
                className={dateInputClass}
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Đến ngày <span className="text-red-500">*</span></label>
            <div className="relative">
              <CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date" value={endDate} min={startDate || todayString()}
                onChange={(e) => { setEndDate(e.target.value); resetValidation(); }}
                className={dateInputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Kiểm tra lịch */}
      <div className="mt-2 border-b border-gray-100 pb-6">
        {validationStatus === 'IDLE' && (
          <button type="button" onClick={handleValidate} disabled={loading} className="w-full bg-[#00C475] text-white py-3 rounded-xl font-bold hover:bg-[#00B068] transition-colors shadow-sm disabled:opacity-60">
            {loading ? 'Đang kiểm tra lịch...' : 'Kiểm tra lịch trống'}
          </button>
        )}

        {validationStatus === 'CONFLICT' && (
          <div className="space-y-3">
            <ConflictAccordion conflicts={conflicts} formattedTimeRange={formattedTimeRange} />
            <p className="text-xs text-gray-500 m-0">Hãy đổi sân, khung giờ, thứ hoặc khoảng ngày để tránh các buổi trùng rồi kiểm tra lại.</p>
            <button type="button" onClick={handleValidate} disabled={loading} className="w-full bg-[#00C475] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#00B068] transition-colors shadow-sm disabled:opacity-60">
              {loading ? 'Đang kiểm tra lại...' : 'Kiểm tra lại'}
            </button>
          </div>
        )}

        {validationStatus === 'AVAILABLE' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex gap-3 items-center shadow-sm text-sm text-blue-700 font-medium">
            <CheckCircle2 size={18} className="text-blue-500" /> Không trùng lịch. Đã có thể tạo booking!
          </div>
        )}
      </div>

      {/* 4. Thanh toán */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mt-2">
        <div className="flex-1 w-full space-y-4">
          <div>
            <h3 className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
              Thông tin gói:
              <span className="text-[#00C475]">{previewResult ? `${previewResult.totalSessions} buổi` : '0 buổi'}</span>
              {previewResult?.discountPercent > 0 && (
                <span className="ml-2 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  - {previewResult.discountPercent}%
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {previewResult
                ? `${previewResult.totalSessions} buổi • ${formatVnd(previewResult.totalPrice / Math.max(previewResult.totalSessions, 1))}/buổi sau giảm giá`
                : 'Kiểm tra lịch trống để hiển thị giá'}
            </p>
          </div>

          <div className="flex gap-6 items-end w-full max-w-md">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Phương thức thanh toán</label>
              <div className="relative">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg h-11 px-3 text-sm text-gray-800 font-bold outline-none focus:border-[#00C475] appearance-none cursor-pointer">
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Tổng tiền chu kỳ</label>
              <input
                type="text" disabled
                value={formatVnd(previewResult?.totalPrice ?? 0)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg h-11 px-3 text-sm text-gray-800 font-bold cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto shrink-0">
          <button type="button" onClick={() => navigate('/staff/bookings')} className="flex-1 md:flex-none px-6 h-11 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
            Hủy / Quay lại
          </button>
          <button
            type="button"
            onClick={handleSubmitBooking}
            disabled={submitting || validationStatus !== 'AVAILABLE' || !customer}
            className="flex-1 md:flex-none px-6 h-11 bg-[#00C475] text-white rounded-lg text-sm font-bold hover:bg-[#00B068] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang xử lý...' : 'Tạo & Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

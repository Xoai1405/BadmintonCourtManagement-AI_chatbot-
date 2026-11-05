import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronDown, CalendarDays, MapPin, AlertTriangle } from 'lucide-react';
import { courtApi } from '../../api/CourtApi';
import { staffBookingCreateApi, toApiTime, toHHMM } from '../../api/staffBookingCreateApi';
import { getCourtTypeLabel } from '../../utils/CourtUtils';
import { PAYMENT_METHODS, formatVnd, todayString } from '../../mocks/staffBookingMock';

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} giờ ${m} phút`;
  if (h) return `${h} giờ`;
  return `${m} phút`;
};

export default function SingleBookingTab({ customer, onBooked }) {
  const navigate = useNavigate();

  const [courts, setCourts] = useState([]);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [bookingDate, setBookingDate] = useState(todayString());
  // Ô 30 phút từ API availability: { startTime, endTime, status: AVAILABLE|BOOKED|PAST, isPeak, price }
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // Khoảng ô đang chọn (index liên tiếp): { from, to } hoặc null
  const [selection, setSelection] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Tải danh sách sân, chọn sẵn sân hoạt động đầu tiên
  useEffect(() => {
    courtApi.getAllCourt()
      .then((data) => {
        setCourts(data);
        const firstActive = data.find((c) => c.status === 'ACTIVE');
        if (firstActive) setSelectedCourtId(String(firstActive.id));
      })
      .catch((err) => toast.error(err.message));
  }, []);

  // Tải lịch trống khi đổi sân / ngày
  useEffect(() => {
    if (!selectedCourtId || !bookingDate) return;
    let ignore = false;
    setLoadingSlots(true);
    setSelection(null);
    courtApi.getAvailability(selectedCourtId, bookingDate)
      .then((data) => { if (!ignore) setSlots(data.slots ?? []); })
      .catch((err) => { if (!ignore) { setSlots([]); toast.error(err.message); } })
      .finally(() => { if (!ignore) setLoadingSlots(false); });
    return () => { ignore = true; };
  }, [selectedCourtId, bookingDate, reloadKey]);

  const selectedCourt = courts.find((c) => String(c.id) === selectedCourtId);
  const isDisabled = (slot) => slot.status !== 'AVAILABLE';

  // Khung giờ cao điểm suy ra từ các ô isPeak của API
  const peakRange = useMemo(() => {
    const peakSlots = slots.filter((s) => s.isPeak);
    if (peakSlots.length === 0) return null;
    return `${toHHMM(peakSlots[0].startTime)} - ${toHHMM(peakSlots[peakSlots.length - 1].endTime)}`;
  }, [slots]);

  const isRangeAvailable = (from, to) => {
    for (let i = from; i <= to; i++) if (isDisabled(slots[i])) return false;
    return true;
  };

  // Chọn ô: đảm bảo luôn là các khung giờ LIÊN TIẾP
  const handleSlotClick = (index) => {
    if (!selection) {
      setSelection({ from: index, to: index });
      return;
    }
    const { from, to } = selection;
    const inside = index >= from && index <= to;

    if (inside) {
      if (from === to) setSelection(null);
      else if (index === from) setSelection({ from: from + 1, to });
      else if (index === to) setSelection({ from, to: to - 1 });
      else setSelection({ from: index, to: index });
      return;
    }

    const newFrom = Math.min(from, index);
    const newTo = Math.max(to, index);
    if (isRangeAvailable(newFrom, newTo)) {
      setSelection({ from: newFrom, to: newTo });
    } else {
      toast('Khoảng giờ bị ngắt bởi ô đã đặt, đã chọn lại từ ô này.', { icon: 'ℹ️' });
      setSelection({ from: index, to: index });
    }
  };

  const selectedSlots = selection ? slots.slice(selection.from, selection.to + 1) : [];
  const startTime = selectedSlots.length ? toHHMM(selectedSlots[0].startTime) : null;
  const endTime = selectedSlots.length ? toHHMM(selectedSlots[selectedSlots.length - 1].endTime) : null;
  const durationMinutes = selectedSlots.length * 30;
  const peakMinutes = selectedSlots.filter((s) => s.isPeak).length * 30;
  const normalMinutes = durationMinutes - peakMinutes;
  // price của ô là giá theo giờ -> mỗi ô 30 phút = price / 2 (giống CourtDetail)
  const total = selectedSlots.reduce((sum, s) => sum + Number(s.price) / 2, 0);

  const handleSubmit = async () => {
    if (!customer) return toast.error('Vui lòng chọn khách hàng ở cột bên trái.');
    if (customer.isMock) return toast.error('Khách này chỉ là dữ liệu mock (chưa có API thêm khách), không tạo booking thật được.');
    if (!selectedCourt) return toast.error('Vui lòng chọn sân.');
    if (!bookingDate) return toast.error('Vui lòng chọn ngày.');
    if (!selection) return toast.error('Vui lòng chọn khung giờ.');

    setSubmitting(true);
    try {
      const result = await staffBookingCreateApi.createSingleBooking({
        customerId: customer.userId,
        courtId: selectedCourt.id,
        bookingDate,
        startTime: toApiTime(startTime),
        endTime: toApiTime(endTime),
        paymentMethod,
      });
      toast.success(`Tạo booking ${result.bookingCode} thành công! Tổng: ${formatVnd(result.totalAmount)}`);
      onBooked?.(result);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
      setReloadKey((k) => k + 1); // tải lại lịch để thấy ô vừa đặt / ô bị người khác đặt
    }
  };

  const selectClass = 'w-full bg-white border border-gray-200 rounded-xl h-11 text-sm text-gray-800 font-bold outline-none focus:border-[#00C475] appearance-none cursor-pointer';

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {!customer && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-700">
          <AlertTriangle size={16} /> Chưa chọn khách hàng — chọn ở cột bên trái trước khi tạo booking.
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Sân <span className="text-red-500">*</span></label>
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00C475]" />
            <select value={selectedCourtId} onChange={(e) => setSelectedCourtId(e.target.value)} className={`${selectClass} pl-10 pr-10`}>
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
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Ngày <span className="text-red-500">*</span></label>
          <div className="relative">
            <CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={bookingDate}
              min={todayString()}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl h-11 pl-10 pr-3 text-sm text-gray-800 font-bold outline-none focus:border-[#00C475]"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
          Chọn các khung giờ liên tiếp (30 phút/khung)
          {selection && <span className="ml-2 normal-case text-[#00C475]">• {startTime} - {endTime} ({formatDuration(durationMinutes)})</span>}
        </p>

        {!loadingSlots && slots.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center m-0">{selectedCourtId ? 'Không có khung giờ nào cho ngày này.' : 'Chọn sân để xem lịch trống.'}</p>
        )}

        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 transition-opacity ${loadingSlots ? 'opacity-40 pointer-events-none' : ''}`}>
          {slots.map((slot, index) => {
            const disabled = isDisabled(slot);
            const isPast = slot.status === 'PAST';
            const isSelected = selection && index >= selection.from && index <= selection.to;
            return (
              <button
                key={slot.startTime}
                type="button"
                disabled={disabled}
                onClick={() => handleSlotClick(index)}
                title={slot.status === 'BOOKED' ? 'Đã có người đặt' : isPast ? 'Đã qua giờ' : slot.isPeak ? 'Giờ cao điểm' : ''}
                className={`py-2 px-1 text-[12px] font-bold rounded-lg transition-colors border ${
                  disabled
                    ? `bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed ${isPast ? 'line-through' : ''}`
                    : isSelected
                      ? 'bg-[#00C475] text-white border-[#00C475]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#00C475] hover:text-[#00C475]'
                }`}
              >
                {toHHMM(slot.startTime)} - {toHHMM(slot.endTime)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-6 mt-5 text-xs font-medium text-gray-500 mb-6 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></span> Đã đặt / đã qua</div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-white border border-gray-200"></span> Còn trống</div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-[#00C475]"></span> Đang chọn</div>
          {selection && (
            <button type="button" onClick={() => setSelection(null)} className="ml-auto font-bold text-[#00C475] hover:underline">Bỏ chọn</button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="flex-1 w-full space-y-4">
          <div>
            <h3 className="text-[15px] font-bold text-gray-800">
              Giá bình thường: <span className="text-[#00C475]">{selectedCourt?.priceNormalHour != null ? `${formatVnd(selectedCourt.priceNormalHour)}/giờ` : '—'}</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              (Giờ cao điểm{peakRange ? ` ${peakRange}` : ''}: {selectedCourt?.pricePeakHour != null ? `${formatVnd(selectedCourt.pricePeakHour)}/giờ` : '—'})
            </p>
            {selection && (
              <p className="text-xs text-gray-500 font-medium mt-1">
                {normalMinutes > 0 && <>Giờ thường: {formatDuration(normalMinutes)}</>}
                {normalMinutes > 0 && peakMinutes > 0 && ' • '}
                {peakMinutes > 0 && <>Cao điểm: {formatDuration(peakMinutes)}</>}
              </p>
            )}
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
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Tổng tiền</label>
              <input
                type="text" disabled value={formatVnd(total)}
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
            onClick={handleSubmit}
            disabled={submitting || !selection || !customer}
            className="flex-1 md:flex-none px-6 h-11 bg-[#00C475] text-white rounded-lg text-sm font-bold hover:bg-[#00B068] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang xử lý...' : 'Tạo & Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

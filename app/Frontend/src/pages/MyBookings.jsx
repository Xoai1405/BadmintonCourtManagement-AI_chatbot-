
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  Plus,
  Search,
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  CalendarDays,
  Repeat,
} from 'lucide-react';
import { bookingApi, formatBookingDays, toDayNumbers } from '../api/bookingApi';

// ==================== FORMAT DATA ====================
const formatDate = (value) => {
  if (!value) return '—';

  const datePart = String(value).split('T')[0];
  const parts = datePart.split('-');

  if (parts.length !== 3) return datePart;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const formatTime = (value) => {
  if (!value) return '—';
  return String(value).slice(0, 5);
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return `${Number(value).toLocaleString('vi-VN')}đ`;
};

const getDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '—';

  const toMinutes = (value) => {
    const [hours, minutes] = String(value).split(':').map(Number);
    return hours * 60 + minutes;
  };

  const duration = toMinutes(endTime) - toMinutes(startTime);

  if (duration <= 0) return '—';

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (minutes === 0) return `${hours} giờ`;
  if (hours === 0) return `${minutes} phút`;

  return `${hours} giờ ${minutes} phút`;
};

const getCourtTypeLabel = (courtType) => {
  if (!courtType) return '';

  const type = String(courtType).toUpperCase();

  if (type.includes('INDOOR') || type.includes('IN_DOOR')) {
    return '(Trong nhà)';
  }

  if (type.includes('OUTDOOR') || type.includes('OUT_DOOR')) {
    return '(Ngoài trời)';
  }

  return `(${courtType})`;
};

// ==================== NORMALIZE API DATA ====================
// API hiện tại trả về dữ liệu booking lẻ.
// Không suy luận booking lẻ/lịch cố định từ những field
// không có trong BookingDetailResponse.
const normalizeBooking = (booking) => {
  return {
    id: booking.id,
    code: booking.bookingCode ?? `#${booking.id}`,
    type: 'SINGLE',

    courtId: booking.courtId,
    courtName:
      booking.courtName ??
      (booking.courtId
        ? `Sân ${booking.courtId}`
        : 'Chưa có thông tin sân'),

    courtTypeLabel: getCourtTypeLabel(booking.courtType),
    img: booking.courtImageUrl ?? '',

    date: formatDate(booking.bookingDate),
    time: `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`,
    duration: getDuration(booking.startTime, booking.endTime),

    status: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,

    total: formatMoney(booking.totalAmount),
    rawDate: booking.bookingDate,
    expireAt: booking.expireAt,
  };
};

// ==================== STATUS BADGES ====================
const renderStatusBadge = (booking) => {
  const { status, paymentStatus } = booking;

  if (status === 'CANCELLED') {
    return (
      <span className="inline-block px-3 py-1 bg-red-50 text-red-500 font-semibold rounded-full text-[11px]">
        Đã hủy
      </span>
    );
  }

  if (status === 'PENDING' && paymentStatus === 'UNPAID') {
    return (
      <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 font-semibold rounded-full text-[11px] leading-5">
        Đang giữ chỗ, chờ thanh toán để xác nhận
      </span>
    );
  }

  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 font-semibold rounded-full text-[11px]">
          Chờ nhân viên xác nhận
        </span>
      );

    case 'CONFIRMED':
      return (
        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 font-semibold rounded-full text-[11px]">
          Đã xác nhận
        </span>
      );

    case 'CHECKED_IN':
      return (
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 font-semibold rounded-full text-[11px]">
          Đang chơi
        </span>
      );

    case 'COMPLETED':
      return (
        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 font-semibold rounded-full text-[11px]">
          Hoàn thành
        </span>
      );

    case 'NO_SHOW':
      return (
        <span className="inline-block px-3 py-1 bg-red-50 text-red-500 font-semibold rounded-full text-[11px]">
          Bùng lịch
        </span>
      );

    default:
      return (
        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 font-semibold rounded-full text-[11px]">
          {status || 'Chưa xác định'}
        </span>
      );
  }
};

// Badge kết toán: chỉ hiện sau khi nhân viên xác nhận (tiền sân đã thanh toán).
// paymentStatus PAID    => Chưa kết toán (có thể phát sinh tiền dịch vụ)
// paymentStatus SETTLED => Đã kết toán (nhân viên đã thu đủ tiền / bùng lịch)
const renderSettlementBadge = (booking) => {
  if (booking.paymentStatus === 'SETTLED') {
    return (
      <span className="inline-block px-3 py-1 border border-emerald-500 text-emerald-600 font-semibold rounded-full text-[11px]">
        Đã kết toán
      </span>
    );
  }

  if (booking.paymentStatus === 'PAID' && booking.status !== 'CANCELLED') {
    return (
      <span className="inline-block px-3 py-1 border border-amber-500 text-amber-600 font-semibold rounded-full text-[11px]">
        Chưa kết toán
      </span>
    );
  }

  return null;
};

const BookingCountdown = ({ expireAt }) => {
  const [remaining, setRemaining] = useState(() => {
    if (!expireAt) return 0;

    return Math.max(
      0,
      Math.floor((new Date(expireAt).getTime() - Date.now()) / 1000)
    );
  });

  useEffect(() => {
    if (!expireAt) return undefined;

    const updateCountdown = () => {
      const seconds = Math.max(
        0,
        Math.floor((new Date(expireAt).getTime() - Date.now()) / 1000)
      );

      setRemaining(seconds);
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [expireAt]);

  if (!expireAt) return <span>Chưa có hạn</span>;
  if (remaining <= 0) return <span>Đã hết hạn</span>;

  const hours = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');

  return <span>{`${hours}:${minutes}:${seconds}`}</span>;
};

const PaymentModal = ({ booking, onClose, onConfirm }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  if (!booking) return null;
  const submit = async () => {
    try {
      setSubmitting(true); setError('');
      await onConfirm(booking);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể ghi nhận thanh toán.');
    } finally { setSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="payment-modal-title" className="text-xl font-bold text-gray-800">Thanh toán chuyển khoản</h2>
        <p className="mt-2 text-sm text-gray-500">Quét mã QR để thanh toán {booking.label || 'booking'} <strong>{booking.code}</strong>.</p>
        <img src="/qr-placeholder.svg" alt="Mã QR thanh toán minh họa" className="mx-auto my-5 h-48 w-48 rounded-lg border border-gray-200 p-2" />
        <p className="mb-4 text-center text-lg font-bold text-emerald-600">{booking.total}</p>
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-700">Sau khi bạn xác nhận đã thanh toán, nhân viên có 30 phút để kiểm tra. Quá thời hạn, booking sẽ tự động bị hủy.</p>
        {error && <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">Đóng</button>
          <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{submitting ? 'Đang xử lý...' : 'Tôi đã thanh toán'}</button>
        </div>
      </div>
    </div>
  );
};

// ==================== RECURRING EMPTY STATE ====================
const RecurringEmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-5">
        <Repeat size={34} className="text-purple-500" />
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-2">
        Lịch đặt cố định
      </h3>

      <p className="text-sm text-gray-500 max-w-md leading-relaxed">
        Đây là nơi hiển thị các gói đặt sân cố định của bạn, bao gồm
        thông tin sân, thứ trong tuần, khung giờ và thời hạn của lịch đặt.
      </p>

      <Link
        to="/recurring-bookings"
        className="mt-5 px-4 py-2.5 rounded-lg bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors"
      >
        Bạn chưa có gói nào, đặt lịch cố định ngay
      </Link>
    </div>
  );
};

// ==================== RECURRING BOOKING LIST ====================
// Tiền sân gói thanh toán trọn gói (BR-11).
// Chưa thanh toán: hiện khung giữ chỗ + nút Thanh toán.
// Đã thanh toán: khung được thay bằng "Kết toán theo buổi" (x/y buổi đã kết toán).
const renderPackageStatusBadge = (pkg) => {
  if (pkg.status === 'CANCELLED') {
    return <span className="inline-block px-3 py-1 bg-red-50 text-red-500 font-semibold rounded-full text-[11px]">Đã hủy</span>;
  }
  if (pkg.status === 'COMPLETED') {
    return <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 font-semibold rounded-full text-[11px]">Hoàn thành</span>;
  }
  if (pkg.paymentStatus !== 'PAID') {
    return (
      <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 font-semibold rounded-full text-[11px] leading-5">
        Đang giữ chỗ, chờ thanh toán để xác nhận
      </span>
    );
  }
  return <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 font-semibold rounded-full text-[11px]">Đang hoạt động</span>;
};

const RecurringBookingList = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [payingPackage, setPayingPackage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    bookingApi.getMyRecurringBookings()
      .then((data) => { if (!cancelled) { setPackages(Array.isArray(data) ? data : []); setError(''); } })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Không thể tải lịch cố định.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  if (loading) return <div className="text-center py-10 text-gray-500 text-sm">Đang tải lịch cố định...</div>;
  if (error) {
    return (
      <div className="text-center py-10 text-sm text-red-500">
        <p>{error}</p>
        <button type="button" onClick={() => { setLoading(true); setReloadKey((key) => key + 1); }}
          className="mt-3 px-4 py-2 rounded-lg bg-[#00C475] text-white">Thử lại</button>
      </div>
    );
  }
  if (!packages.length) return <RecurringEmptyState />;

  return (
    <>
    <div className="space-y-4">
      {packages.map((pkg) => {
        const isUnpaid = pkg.status === 'ACTIVE' && pkg.paymentStatus !== 'PAID';
        const isPaid = pkg.paymentStatus === 'PAID';
        return (
          <div key={pkg.recurringBookingId}
            className="grid grid-cols-1 items-start gap-4 border border-gray-200 rounded-xl p-4 hover:border-[#00C475] hover:shadow-sm transition-all lg:grid-cols-[minmax(190px,1.35fr)_minmax(75px,0.55fr)_minmax(115px,0.8fr)_minmax(175px,1.25fr)_minmax(165px,1.15fr)_minmax(160px,1.1fr)] lg:gap-3">
            <div className="flex min-w-0 items-start gap-4">
              {pkg.courtImageUrl ? (
                <img src={pkg.courtImageUrl} alt={pkg.courtName} className="w-[85px] h-[60px] rounded-lg object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="w-[85px] h-[60px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center">Chưa có ảnh</div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 mb-0.5">Mã gói</p>
                <p className="font-bold text-gray-800 text-[13px] break-all">{pkg.code}</p>
                <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-semibold bg-purple-50 text-purple-600">Lịch cố định</span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 mb-0.5">Sân</p>
              <p className="font-bold text-gray-800 text-[13px]">{pkg.courtName}</p>
              <p className="text-[12px] text-gray-500">{getCourtTypeLabel(pkg.courtType)}</p>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 mb-0.5">Thời gian</p>
              <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mt-1">
                <Calendar size={13} className="text-gray-400 shrink-0" />
                <span>{formatDate(pkg.startDate)} - {formatDate(pkg.endDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mt-1">
                <Clock size={13} className="text-gray-400 shrink-0" />
                <span>{formatTime(pkg.startTime)} - {formatTime(pkg.endTime)}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">{formatBookingDays(toDayNumbers(pkg.daysOfWeek))} · {pkg.sessionCount} buổi</p>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 mb-2">Trạng thái gói</p>
              {renderPackageStatusBadge(pkg)}
            </div>

            {isUnpaid ? (
              <div className="flex h-[68px] w-full min-w-0 max-w-[180px] self-center flex-col justify-between rounded-xl border border-amber-200 bg-amber-50 p-2">
                <div className="flex min-w-0 items-center gap-1 text-[10px] leading-4 text-amber-700">
                  <Clock size={13} className="shrink-0" />
                  <span className="min-w-0 break-words">Giữ chỗ: <span className="font-bold tabular-nums"><BookingCountdown expireAt={pkg.expireAt} /></span></span>
                </div>
                <button type="button" onClick={() => setPayingPackage({ id: pkg.recurringBookingId, code: pkg.code, total: formatMoney(pkg.totalAmount), label: 'gói lịch cố định' })}
                  className="flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 transition-colors">
                  <CreditCard size={14} />
                  Thanh toán
                </button>
              </div>
            ) : isPaid ? (
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 mb-2">Kết toán theo buổi</p>
                <span className={`inline-block px-3 py-1 border font-semibold rounded-full text-[11px] ${pkg.settledSessionCount === pkg.sessionCount ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}`}>
                  {pkg.settledSessionCount}/{pkg.sessionCount} buổi đã kết toán
                </span>
              </div>
            ) : null}

            <div className="flex h-full min-w-0 items-start justify-between gap-3 lg:col-start-6 lg:justify-end">
              <div className="min-w-0 shrink-0 text-left md:text-right">
                <p className="text-[11px] text-gray-400 mb-0.5">Tổng tiền gói</p>
                <p className="font-bold text-gray-800 text-[14px]">{formatMoney(pkg.totalAmount)}</p>
              </div>
              <Link to={`/my-bookings/recurring-${pkg.recurringBookingId}`}
                className="shrink-0 self-center px-3 py-2 border border-emerald-200 text-[#00C475] rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors whitespace-nowrap">
                Xem chi tiết
              </Link>
            </div>
          </div>
        );
      })}
    </div>
    <PaymentModal booking={payingPackage} onClose={() => setPayingPackage(null)} onConfirm={async (pkg) => {
      await bookingApi.markMyRecurringPaymentSubmitted(pkg.id);
      setLoading(true); setReloadKey((key) => key + 1);
    }} />
    </>
  );
};

// ==================== MAIN COMPONENT ====================
export default function MyBookings() {
  // Chỉ còn 2 tab chính
  const [activeTab, setActiveTab] = useState('SINGLE');

  const [showCalendar, setShowCalendar] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [courtFilter, setCourtFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [payingBooking, setPayingBooking] = useState(null);

  // ==================== FETCH SINGLE BOOKINGS ====================
  useEffect(() => {
    let cancelled = false;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await bookingApi.getMyBookingsApi();

        if (!cancelled) {
          if (!Array.isArray(data)) {
            throw new Error('Dữ liệu booking trả về không đúng định dạng.');
          }

          setBookings(data.map(normalizeBooking));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              'Không thể tải danh sách booking. Vui lòng thử lại.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // ==================== FILTER OPTIONS ====================
  const courtOptions = useMemo(() => {
    const uniqueCourts = new Map();

    bookings.forEach((booking) => {
      if (booking.courtName) {
        uniqueCourts.set(booking.courtName, booking.courtName);
      }
    });

    return Array.from(uniqueCourts.values());
  }, [bookings]);

  const statusOptions = useMemo(
    () => [...new Set(bookings.map((booking) => booking.status).filter(Boolean))],
    [bookings]
  );

  // ==================== FILTER SINGLE BOOKINGS ====================
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (
        courtFilter !== 'ALL' &&
        booking.courtName !== courtFilter
      ) {
        return false;
      }

      if (
        statusFilter !== 'ALL' &&
        booking.status !== statusFilter
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();

        const matchCode = String(booking.code)
          .toLowerCase()
          .includes(term);

        const matchCourt = String(booking.courtName)
          .toLowerCase()
          .includes(term);

        if (!matchCode && !matchCourt) return false;
      }

      return true;
    });
  }, [bookings, courtFilter, statusFilter, searchTerm]);

  // ==================== TAB HANDLER ====================
  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // Reset bộ lọc khi chuyển tab
    setSearchTerm('');
    setCourtFilter('ALL');
    setStatusFilter('ALL');
    setShowCalendar(false);
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />

      <div className="max-w-[1100px] mx-auto px-4 mt-8">

        {/* Page heading */}
        <div className="flex justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Booking của tôi
            </h1>

            <p className="text-sm text-gray-500">
              Quản lý các lịch đặt sân của bạn
            </p>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 bg-[#00C475] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#00B068] transition-colors shadow-sm text-sm"
          >
            <Plus size={18} />
            Đặt sân mới
          </Link>
        </div>

        {/* Main container */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">

          {/* ==================== MAIN TABS ==================== */}
          <div className="flex items-center gap-8 border-b border-gray-100 px-6 pt-4">
            <button
              onClick={() => handleTabChange('SINGLE')}
              className={`pb-4 px-1 text-[13px] font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                activeTab === 'SINGLE'
                  ? 'border-[#00C475] text-[#00C475]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CalendarDays size={16} />
              Booking lẻ

              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'SINGLE'
                  ? 'bg-emerald-50 text-[#00C475]'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('RECURRING')}
              className={`pb-4 px-1 text-[13px] font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                activeTab === 'RECURRING'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Repeat size={16} />
              Lịch cố định
            </button>
          </div>

          {/* ==================== SINGLE BOOKING TAB ==================== */}
          {activeTab === 'SINGLE' && (
            <>
              {/* Filters */}
              <div className="p-5 flex flex-wrap gap-4 items-center border-b border-gray-100 bg-white">

                {/* Date filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-md h-[38px] w-60 px-3 hover:border-[#00C475] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={16} />
                      <span className="text-[13px]">
                        Lọc theo ngày chơi
                      </span>
                    </div>
                  </button>

                  {showCalendar && (
                    <div className="absolute top-[44px] left-0 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-[280px] z-50">
                      <p className="text-sm text-gray-500 text-center mb-2">
                        Tính năng lọc ngày sẽ được bổ sung sau.
                      </p>

                      <button
                        onClick={() => setShowCalendar(false)}
                        className="w-full bg-[#00C475] text-white py-2 rounded-lg text-sm font-semibold mt-2 hover:bg-[#00B068]"
                      >
                        Đóng
                      </button>
                    </div>
                  )}
                </div>

                {/* Court filter */}
                <div className="relative">
                  <select
                    value={courtFilter}
                    onChange={(e) => setCourtFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-md h-[38px] w-40 pl-3 pr-8 text-[13px] text-gray-600 outline-none cursor-pointer hover:border-[#00C475]"
                  >
                    <option value="ALL">Tất cả sân</option>

                    {courtOptions.map((courtName) => (
                      <option key={courtName} value={courtName}>
                        {courtName}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Status filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-md h-[38px] w-48 pl-3 pr-8 text-[13px] text-gray-600 outline-none cursor-pointer hover:border-[#00C475]"
                  >
                    <option value="ALL">Tất cả trạng thái</option>

                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === 'PENDING'
                          ? 'Chờ xác nhận'
                          : status === 'CONFIRMED'
                            ? 'Đã xác nhận'
                            : status === 'CHECKED_IN'
                              ? 'Đang chơi'
                              : status === 'COMPLETED'
                                ? 'Hoàn thành'
                                : status === 'CANCELLED'
                                  ? 'Đã hủy'
                                  : status === 'NO_SHOW'
                                    ? 'Bùng lịch'
                                    : status}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo mã booking, tên sân..."
                    className="w-full bg-white border border-gray-200 rounded-md h-[38px] pl-9 pr-3 text-[13px] text-gray-600 outline-none focus:border-[#00C475]"
                  />
                </div>
              </div>

              {/* Booking list */}
              <div className="p-5 space-y-3">
            {loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">Đang tải danh sách booking...</div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-red-500 text-sm">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50"
                >
                  Thử tải lại
                </button>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">Không có dữ liệu phù hợp với bộ lọc hiện tại.</div>
            ) : (
              filteredBookings.map((booking) => {
                const canPay =
                  booking.type === 'SINGLE' &&
                  booking.status === 'PENDING' &&
                  booking.paymentStatus === 'UNPAID';

                return (
                  <div
                    key={booking.id}
                    className="grid grid-cols-1 items-start gap-4 border border-gray-200 rounded-xl p-4 hover:border-[#00C475] hover:shadow-sm transition-all lg:grid-cols-[minmax(190px,1.35fr)_minmax(75px,0.55fr)_minmax(115px,0.8fr)_minmax(175px,1.25fr)_minmax(165px,1.15fr)_minmax(160px,1.1fr)] lg:gap-3"
                  >
                    {/* Booking identity */}
                    <div className="flex min-w-0 items-start gap-4">
                      {booking.img ? (
                        <img
                          src={booking.img}
                          alt={booking.courtName}
                          className="w-[85px] h-[60px] rounded-lg object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-[85px] h-[60px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center">
                          Chưa có ảnh
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 mb-0.5">Mã booking</p>
                        <p className="font-bold text-gray-800 text-[13px] break-all">{booking.code}</p>
                        <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-semibold ${booking.type === 'SINGLE' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {booking.type === 'SINGLE' ? 'Đặt sân lẻ' : 'Lịch cố định'}
                        </span>
                      </div>
                    </div>

                    {/* Court */}
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 mb-0.5">Sân</p>
                      <p className="font-bold text-gray-800 text-[13px]">{booking.courtName}</p>
                      <p className="text-[12px] text-gray-500">{booking.courtTypeLabel}</p>
                    </div>

                    {/* Date and time */}
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 mb-0.5">Ngày chơi</p>
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mt-1">
                        <Calendar size={13} className="text-gray-400 shrink-0" />
                        <span>{booking.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mt-1">
                        <Clock size={13} className="text-gray-400 shrink-0" />
                        <span>{booking.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">({booking.duration})</p>
                    </div>

                    {/* Status and payment side by side */}
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 mb-2">Trạng thái booking</p>
                      <div className="flex flex-col items-start gap-2">
                        {renderStatusBadge(booking)}
                      </div>
                    </div>

                    {/* Sau khi nhân viên xác nhận: khung thanh toán được thay bằng cột Trạng thái kết toán */}
                    {!canPay && renderSettlementBadge(booking) && (
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 mb-2">Trạng thái kết toán</p>
                        {renderSettlementBadge(booking)}
                      </div>
                    )}

                    {canPay && (
                      <div className="flex h-[68px] w-full min-w-0 max-w-[180px] self-center flex-col justify-between rounded-xl border border-amber-200 bg-amber-50 p-2">
                        <div className="flex min-w-0 items-center gap-1 text-[10px] leading-4 text-amber-700">
                          <Clock size={13} className="shrink-0" />
                          <span className="min-w-0 break-words">Giữ chỗ: <span className="font-bold tabular-nums"><BookingCountdown expireAt={booking.expireAt} /></span></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPayingBooking({ id: booking.id, code: booking.code, total: booking.total, label: 'booking' })}
                          className="flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 transition-colors"
                        >
                          <CreditCard size={14} />
                          Thanh toán
                        </button>
                      </div>
                    )}

                    {/* Amount and detail */}
                    <div className="flex h-full min-w-0 items-start justify-between gap-3 lg:col-start-6 lg:justify-end">
                      <div className="min-w-0 shrink-0 text-left md:text-right">
                        <p className="text-[11px] text-gray-400 mb-0.5">Tổng tiền</p>
                        <p className="font-bold text-gray-800 text-[14px]">{booking.total}</p>
                      </div>
                      <Link
                        to={`/my-bookings/${booking.id}`}
                        className="shrink-0 self-center px-3 py-2 border border-emerald-200 text-[#00C475] rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors whitespace-nowrap"
                      >
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
            </>
          )}

          {/* ==================== RECURRING BOOKING TAB ==================== */}
          {activeTab === 'RECURRING' && (
            <RecurringBookingList />
          )}
        </div>
      </div>
      <PaymentModal booking={payingBooking} onClose={() => setPayingBooking(null)} onConfirm={async (booking) => {
        await bookingApi.markMyBookingPaymentSubmitted(booking.id);
        setLoading(true); setReloadKey((key) => key + 1);
      }} />
    </div>
  );
}

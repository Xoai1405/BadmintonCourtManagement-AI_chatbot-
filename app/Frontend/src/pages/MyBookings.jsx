
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  Plus,
  Search,
  Calendar,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { bookingApi } from '../api/bookingApi';

// ==================== FORMAT DATA ====================

const formatDate = (value) => {
  if (!value) return '—';

  // Backend trả LocalDate theo định dạng yyyy-MM-dd
  const datePart = String(value).split('T')[0];
  const parts = datePart.split('-');

  if (parts.length !== 3) return datePart;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const formatTime = (value) => {
  if (!value) return '—';

  // Hỗ trợ cả HH:mm:ss và HH:mm
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
    const [hours, minutes] = String(value)
      .split(':')
      .map(Number);

    return hours * 60 + minutes;
  };

  const duration = toMinutes(endTime) - toMinutes(startTime);

  if (duration <= 0) return '—';

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (minutes === 0) {
    return `${hours} giờ`;
  }

  if (hours === 0) {
    return `${minutes} phút`;
  }

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

  // Tránh tự suy diễn nếu enum backend có tên khác
  return `(${courtType})`;
};

// ==================== NORMALIZE API DATA ====================

const normalizeBooking = (booking) => {
  const isRecurring = Boolean(
    booking.recurringBookingId ??
    booking.recurringBooking?.id
  );

  return {
    id: booking.id,
    code: booking.bookingCode ?? `#${booking.id}`,

    type: isRecurring ? 'RECURRING' : 'SINGLE',

    courtId: booking.courtId ?? booking.court?.id,
    courtName:
      booking.courtName ??
      booking.court?.name ??
      (booking.courtId
        ? `Sân ${booking.courtId}`
        : 'Chưa có thông tin sân'),

    courtTypeLabel: getCourtTypeLabel(
      booking.courtType ?? booking.court?.courtType
    ),

    img:
      booking.courtImageUrl ??
      booking.court?.imageUrl ??
      '',

    date: formatDate(booking.bookingDate),

    time: `${formatTime(booking.startTime)} - ${formatTime(
      booking.endTime
    )}`,

    duration: getDuration(
      booking.startTime,
      booking.endTime
    ),

    status: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,

    total: formatMoney(
      booking.totalAmount ?? booking.courtPrice
    ),

    rawDate: booking.bookingDate,
    expireAt: booking.expireAt,
  };
};

// ==================== STATUS BADGES ====================

// Badge thứ nhất: trạng thái booking / xác nhận sân
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

// Badge thứ hai: trạng thái thanh toán tiền sân
const renderPaymentBadge = (paymentStatus) => {
  switch (paymentStatus) {
    case 'PAID':
      return (
        <span className="inline-block px-3 py-1 border border-emerald-500 text-emerald-600 font-semibold rounded-full text-[11px] mt-1.5">
          Đã thanh toán tiền sân
        </span>
      );

    case 'UNPAID':
      return (
        <span className="inline-block px-3 py-1 border border-amber-500 text-amber-600 font-semibold rounded-full text-[11px] mt-1.5">
          Chưa thanh toán tiền sân
        </span>
      );

    default:
      return (
        <span className="inline-block px-3 py-1 border border-gray-300 text-gray-500 font-semibold rounded-full text-[11px] mt-1.5">
          {paymentStatus || 'Chưa xác định thanh toán'}
        </span>
      );
  }
};

// ==================== MAIN COMPONENT ====================

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [showCalendar, setShowCalendar] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [courtFilter, setCourtFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tải booking thật từ backend
  useEffect(() => {
    let cancelled = false;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await bookingApi.getMyBookingsApi();

        if (!cancelled) {
          if (!Array.isArray(data)) {
            throw new Error(
              'Dữ liệu booking trả về không đúng định dạng.'
            );
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
  }, []);

  // Danh sách sân lấy từ dữ liệu thật
  const courtOptions = useMemo(() => {
    const uniqueCourts = new Map();

    bookings.forEach((booking) => {
      if (booking.courtName) {
        uniqueCourts.set(
          booking.courtName,
          booking.courtName
        );
      }
    });

    return Array.from(uniqueCourts.values());
  }, [bookings]);

  // Danh sách trạng thái lấy từ dữ liệu thật
  const statusOptions = useMemo(() => {
    return [...new Set(
      bookings
        .map((booking) => booking.status)
        .filter(Boolean)
    )];
  }, [bookings]);

  // Lọc danh sách booking
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Lọc theo tab
      if (
        activeTab === 'SINGLE' &&
        booking.type !== 'SINGLE'
      ) {
        return false;
      }

      if (
        activeTab === 'RECURRING' &&
        booking.type !== 'RECURRING'
      ) {
        return false;
      }

      if (
        activeTab === 'UNPAID' &&
        booking.paymentStatus !== 'UNPAID'
      ) {
        return false;
      }

      if (
        activeTab === 'PAID' &&
        booking.paymentStatus !== 'PAID'
      ) {
        return false;
      }

      // Lọc theo sân
      if (
        courtFilter !== 'ALL' &&
        booking.courtName !== courtFilter
      ) {
        return false;
      }

      // Lọc theo trạng thái booking
      if (
        statusFilter !== 'ALL' &&
        booking.status !== statusFilter
      ) {
        return false;
      }

      // Tìm theo mã booking hoặc tên sân
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();

        const matchCode = String(booking.code)
          .toLowerCase()
          .includes(term);

        const matchCourt = String(booking.courtName)
          .toLowerCase()
          .includes(term);

        if (!matchCode && !matchCourt) {
          return false;
        }
      }

      return true;
    });
  }, [
    bookings,
    activeTab,
    courtFilter,
    statusFilter,
    searchTerm,
  ]);

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />

      <div className="max-w-[1100px] mx-auto px-4 mt-8">
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

        <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-gray-100 px-6 pt-4 overflow-x-auto">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'SINGLE', label: 'Đặt sân lẻ' },
              { id: 'RECURRING', label: 'Lịch cố định' },
              { id: 'UNPAID', label: 'Chưa thanh toán' },
              { id: 'PAID', label: 'Đã thanh toán' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 text-[13px] font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#00C475] text-[#00C475]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="p-5 flex flex-wrap gap-4 items-center border-b border-gray-100 bg-white">
            {/* Date filter placeholder */}
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
              <div className="text-center py-10 text-gray-500 text-sm">
                Đang tải danh sách booking...
              </div>
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
              <div className="text-center py-10 text-gray-500 text-sm">
                Không có dữ liệu phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col md:flex-row items-center justify-between border border-gray-200 rounded-xl p-4 hover:border-[#00C475] hover:shadow-sm transition-all gap-4"
                >
                  {/* Booking identity */}
                  <div className="flex items-center gap-4 w-full md:w-[220px] shrink-0">
                    {booking.img ? (
                      <img
                        src={booking.img}
                        alt={booking.courtName}
                        className="w-[85px] h-[60px] rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-[85px] h-[60px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center">
                        Chưa có ảnh
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 mb-0.5">
                        Mã booking
                      </p>

                      <p className="font-bold text-gray-800 text-[13px] break-all">
                        {booking.code}
                      </p>

                      <span
                        className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-semibold ${
                          booking.type === 'SINGLE'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-purple-50 text-purple-600'
                        }`}
                      >
                        {booking.type === 'SINGLE'
                          ? 'Đặt sân lẻ'
                          : 'Lịch cố định'}
                      </span>
                    </div>
                  </div>

                  {/* Court */}
                  <div className="w-full md:w-[120px]">
                    <p className="text-[11px] text-gray-400 mb-0.5">
                      Sân
                    </p>

                    <p className="font-bold text-gray-800 text-[13px]">
                      {booking.courtName}
                    </p>

                    <p className="text-[12px] text-gray-500">
                      {booking.courtTypeLabel}
                    </p>
                  </div>

                  {/* Date and time */}
                  <div className="w-full md:w-[160px]">
                    <p className="text-[11px] text-gray-400 mb-0.5">
                      Ngày chơi
                    </p>

                    <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mt-1">
                      <Calendar
                        size={13}
                        className="text-gray-400 shrink-0"
                      />
                      <span>{booking.date}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mt-1">
                      <Clock
                        size={13}
                        className="text-gray-400 shrink-0"
                      />
                      <span>{booking.time}</span>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-0.5">
                      ({booking.duration})
                    </p>
                  </div>

                  {/* Status badges */}
                  <div className="w-full md:w-[190px] flex flex-col items-start gap-1">
                    <p className="text-[11px] text-gray-400 mb-1">
                      Trạng thái booking
                    </p>

                    {renderStatusBadge(booking)}

                    {renderPaymentBadge(booking.paymentStatus)}
                  </div>

                  {/* Amount and detail */}
                  <div className="flex items-center justify-between w-full md:w-auto md:flex-1 md:justify-end gap-6">
                    <div className="text-left md:text-right">
                      <p className="text-[11px] text-gray-400 mb-0.5">
                        Tổng tiền
                      </p>

                      <p className="font-bold text-gray-800 text-[14px]">
                        {booking.total}
                      </p>
                    </div>

                    <Link
                      to={`/my-bookings/${booking.id}`}
                      className="px-5 py-2 border border-emerald-200 text-[#00C475] rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors whitespace-nowrap"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

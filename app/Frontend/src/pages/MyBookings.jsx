import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Plus, Search, Calendar, ChevronDown, Clock, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const mockMyBookings = [
  { id: 1, code: 'BK2026091801', type: 'SINGLE', courtName: 'Sân VIP 02', courtTypeLabel: '(Trong nhà)', date: '18/09/2026', time: '19:00 - 21:00', duration: '2 giờ', status: 'PENDING', paymentStatus: 'UNPAID', total: '500.000đ', img: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=2007&auto=format&fit=crop' },
  { id: 2, code: 'BK2026081801', type: 'SINGLE', courtName: 'Sân 01', courtTypeLabel: '(Ngoài trời)', date: '18/08/2026', time: '19:00 - 21:00', duration: '2 giờ', status: 'CONFIRMED', paymentStatus: 'UNPAID', total: '500.000đ', img: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop' },
  { id: 3, code: 'BK2026091001', type: 'SINGLE', courtName: 'Sân 03', courtTypeLabel: '(Trong nhà)', date: '18/09/2026', time: '19:00 - 21:00', duration: '2 giờ', status: 'COMPLETED', paymentStatus: 'PAID', total: '500.000đ', img: 'https://images.unsplash.com/photo-1572560377017-eb965a3d76b1?q=80&w=2069&auto=format&fit=crop' },
  { id: 4, code: '#15', type: 'RECURRING', courtName: 'Sân VIP 02', courtTypeLabel: '(Trong nhà)', date: '1/09/2026 - 30/09/2026', time: 'T2, T4, T6 | 19:30 - 21:00', duration: '12 buổi', status: 'ACTIVE', paymentStatus: '', total: '500.000đ', img: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=2007&auto=format&fit=crop' },
  { id: 5, code: '#16', type: 'RECURRING', courtName: 'Sân 03', courtTypeLabel: '(Trong nhà)', date: '1/09/2026 - 30/09/2026', time: 'T3, T5, T7 | 19:00 - 21:00', duration: '12 buổi', status: 'CANCELLED', paymentStatus: '', total: '500.000đ', img: 'https://images.unsplash.com/photo-1572560377017-eb965a3d76b1?q=80&w=2069&auto=format&fit=crop' }
];

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [showCalendar, setShowCalendar] = useState(false);

  // [THÊM MỚI] 3 State để lưu trữ giá trị người dùng nhập/chọn vào bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [courtFilter, setCourtFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Logic lọc danh sách Booking tổng hợp
  const filteredBookings = mockMyBookings.filter(booking => {
    // 1. Lọc theo Tab ngang
    if (activeTab === 'SINGLE' && booking.type !== 'SINGLE') return false;
    if (activeTab === 'RECURRING' && booking.type !== 'RECURRING') return false;
    if (activeTab === 'UNPAID' && booking.paymentStatus !== 'UNPAID') return false;
    if (activeTab === 'PAID' && booking.paymentStatus !== 'PAID') return false;

    // 2. Lọc theo Dropdown Tên Sân
    if (courtFilter !== 'ALL' && booking.courtName !== courtFilter) return false;

    // 3. Lọc theo Dropdown Trạng thái
    if (statusFilter !== 'ALL' && booking.status !== statusFilter) return false;

    // 4. Lọc theo Ô Tìm kiếm (Search)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchCode = booking.code.toLowerCase().includes(term);
      const matchCourt = booking.courtName.toLowerCase().includes(term);
      if (!matchCode && !matchCourt) return false;
    }

    return true;
  });

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'PENDING': return <span className="px-3 py-1 bg-amber-50 text-amber-600 font-semibold rounded-full text-[11px]">Chờ xác nhận</span>;
      case 'CONFIRMED': return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 font-semibold rounded-full text-[11px]">Đã xác nhận</span>;
      case 'COMPLETED': return <span className="px-3 py-1 bg-gray-100 text-gray-500 font-semibold rounded-full text-[11px]">Hoàn thành</span>;
      case 'ACTIVE': return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 font-semibold rounded-full text-[11px]">Đang hoạt động</span>;
      case 'CANCELLED': return <span className="px-3 py-1 bg-red-50 text-red-500 font-semibold rounded-full text-[11px]">Đã hủy</span>;
      default: return null;
    }
  };

  const renderPaymentBadge = (paymentStatus) => {
    if (!paymentStatus) return null;
    return paymentStatus === 'PAID' 
      ? <span className="px-3 py-1 border border-emerald-500 text-emerald-600 font-semibold rounded-full text-[11px] mt-1.5 inline-block">Đã thanh toán</span>
      : <span className="px-3 py-1 border border-amber-500 text-amber-500 font-semibold rounded-full text-[11px] mt-1.5 inline-block">Chưa thanh toán</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />

      <div className="max-w-[1100px] mx-auto px-4 mt-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Booking của tôi</h1>
            <p className="text-sm text-gray-500">Quản lý các lịch đặt sân của bạn</p>
          </div>
          <Link to="/" className="flex items-center gap-2 bg-[#00C475] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#00B068] transition-colors shadow-sm text-sm">
            <Plus size={18} /> Đặt sân mới
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
          
          {/* Thanh Tabs */}
          <div className="flex items-center gap-8 border-b border-gray-100 px-6 pt-4">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'SINGLE', label: 'Đặt sân lẻ' },
              { id: 'RECURRING', label: 'Lịch cố định' },
              { id: 'UNPAID', label: 'Chưa thanh toán' },
              { id: 'PAID', label: 'Đã thanh toán' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 text-[13px] font-bold border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === tab.id ? 'border-[#00C475] text-[#00C475]' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Thanh Bộ Lọc (Filters) */}
          <div className="p-5 flex flex-wrap gap-4 items-center border-b border-gray-100 bg-white">
            
            {/* Lọc: Lịch */}
            <div className="relative">
              <button onClick={() => setShowCalendar(!showCalendar)} className="flex items-center justify-between bg-white border border-gray-200 rounded-md h-[38px] w-60 px-3 hover:border-[#00C475] transition-colors">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} />
                  <span className="text-[13px]">Lọc theo ngày chơi</span>
                </div>
              </button>
              {showCalendar && (
                <div className="absolute top-[44px] left-0 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-[280px] z-50 animate-fadeIn">
                  <p className="text-sm text-gray-500 text-center mb-2">Tính năng chọn lịch sẽ được mở ở giai đoạn ghép API thật.</p>
                  <button onClick={() => setShowCalendar(false)} className="w-full bg-[#00C475] text-white py-2 rounded-lg text-sm font-semibold mt-2 hover:bg-[#00B068]">Đóng</button>
                </div>
              )}
            </div>

            {/* Lọc: Dropdown Chọn sân */}
            <div className="relative">
              <select 
                value={courtFilter}
                onChange={(e) => setCourtFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-md h-[38px] w-40 pl-3 pr-8 text-[13px] text-gray-600 outline-none cursor-pointer hover:border-[#00C475]"
              >
                <option value="ALL">Tất cả sân</option>
                <option value="Sân 01">Sân 01</option>
                <option value="Sân VIP 02">Sân VIP 02</option>
                <option value="Sân 03">Sân 03</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Lọc: Dropdown Trạng thái */}
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-md h-[38px] w-44 pl-3 pr-8 text-[13px] text-gray-600 outline-none cursor-pointer hover:border-[#00C475]"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Lọc: Ô Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo mã booking, tên sân..." 
                className="w-full bg-white border border-gray-200 rounded-md h-[38px] pl-9 pr-3 text-[13px] text-gray-600 outline-none focus:border-[#00C475]"
              />
            </div>
          </div>

          {/* Danh sách Bookings */}
          <div className="p-5 space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                Không có dữ liệu phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div key={booking.id} className="flex flex-col md:flex-row items-center justify-between border border-gray-200 rounded-xl p-4 hover:border-[#00C475] hover:shadow-sm transition-all gap-4">
                  <div className="flex items-center gap-4 w-full md:w-[220px] shrink-0">
                    <img src={booking.img} alt={booking.courtName} className="w-[85px] h-[60px] rounded-lg object-cover" />
                    <div>
                      <p className="text-[11px] text-gray-400 mb-0.5">Mã booking</p>
                      <p className="font-bold text-gray-800 text-[13px]">{booking.code}</p>
                      <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-semibold ${booking.type === 'SINGLE' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {booking.type === 'SINGLE' ? 'Đặt sân lẻ' : 'Lịch cố định'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full md:w-[120px]">
                    <p className="text-[11px] text-gray-400 mb-0.5">Sân</p>
                    <p className="font-bold text-gray-800 text-[13px]">{booking.courtName}</p>
                    <p className="text-[12px] text-gray-500">{booking.courtTypeLabel}</p>
                  </div>
                  <div className="w-full md:w-[160px]">
                    <p className="text-[11px] text-gray-400 mb-0.5">Ngày chơi</p>
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mt-1"><Calendar size={13} className="text-gray-400" /><span>{booking.date}</span></div>
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-600 mt-1"><Clock size={13} className="text-gray-400" /><span>{booking.time}</span></div>
                    <p className="text-[11px] text-gray-500 mt-0.5">({booking.duration})</p>
                  </div>
                  <div className="w-full md:w-[130px] flex flex-col items-start">
                    <p className="text-[11px] text-gray-400 mb-1.5">Trạng thái</p>
                    {renderStatusBadge(booking.status)}
                    {renderPaymentBadge(booking.paymentStatus)}
                  </div>
                  <div className="flex items-center justify-between w-full md:w-auto md:flex-1 md:justify-end gap-6">
                    <div className="text-left md:text-right">
                      <p className="text-[11px] text-gray-400 mb-0.5">Tổng tiền</p>
                      <p className="font-bold text-gray-800 text-[14px]">{booking.total}</p>
                    </div>
                    <Link to={`/my-bookings/${booking.id}`} className="px-5 py-2 border border-emerald-200 text-[#00C475] rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors">
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
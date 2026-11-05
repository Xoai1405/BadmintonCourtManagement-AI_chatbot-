import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, CheckCircle2, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { staffBookingCreateApi } from '../../api/staffBookingCreateApi';
// "Khách mới" chưa có API (không thuộc task này) nên tạm dùng mock
import { mockStaffBookingApi } from '../../mocks/staffBookingMock';
import NewCustomerModal from './NewCustomerModal';

const formatPhone = (phone = '') => phone.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3');

export default function CustomerSelectionPanel({ selectedCustomer, onSelect, refreshKey = 0 }) {
  // State form tìm kiếm
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Popup thêm khách mới
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchCustomers = useCallback(async (filters) => {
    setLoading(true);
    try {
      const data = await staffBookingCreateApi.searchCustomers(filters);
      setCustomers(data);
    } catch (error) {
      toast.error(error.message || 'Lỗi tìm kiếm khách hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load lần đầu + reload sau khi tạo booking (số lượt đặt thay đổi)
  useEffect(() => {
    fetchCustomers({});
  }, [fetchCustomers, refreshKey]);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchCustomers({ name: searchName, phone: searchPhone, email: searchEmail });
  };

  const handleClearSearch = () => {
    setSearchName('');
    setSearchPhone('');
    setSearchEmail('');
    fetchCustomers({});
  };

  // Lưu khách mới (tạm dùng mock). Lỗi throw ra để popup hiển thị.
  const handleCreateCustomer = async (form) => {
    // isMock: khách chỉ tồn tại trên trình duyệt, chưa lưu DB -> không cho tạo booking thật
    const created = { ...(await mockStaffBookingApi.createCustomer(form)), isMock: true };
    toast.success(`Đã thêm khách ${created.fullName} (dữ liệu mock, chưa lưu DB)`);
    setCustomers((prev) => [created, ...prev]);
    onSelect(created);
    setShowNewModal(false);
  };

  const inputClass = 'w-full bg-white border border-gray-200 rounded-lg h-10 px-3 text-sm text-gray-800 outline-none focus:border-[#00C475]';

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Form tìm kiếm */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Tên khách hàng</label>
          <input type="text" placeholder="Nguyễn Văn A" value={searchName} onChange={(e) => setSearchName(e.target.value)} className={inputClass} />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">SĐT</label>
          <input type="tel" placeholder="0909 xxx xxx" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className={inputClass} />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Email</label>
          <input type="text" placeholder="xxxxx@email.com" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} className={inputClass} />
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="h-10 px-4 bg-[#00C475] text-white rounded-lg text-sm font-bold hover:bg-[#00B068] flex items-center gap-1.5 shadow-sm disabled:opacity-60">
            <Search size={16} /> {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="h-10 px-4 bg-[#00C475] text-white rounded-lg text-sm font-bold hover:bg-[#00B068] flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} /> Khách mới
          </button>
        </div>
      </form>

      <NewCustomerModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateCustomer}
      />

      {/* Danh sách kết quả */}
      <div className="flex items-center justify-between -mb-3">
        <p className="text-xs font-bold text-gray-500 m-0">{loading ? 'Đang tải...' : `${customers.length} khách hàng`}</p>
        {(searchName || searchPhone || searchEmail) && (
          <button type="button" onClick={handleClearSearch} className="text-xs font-bold text-[#00C475] hover:underline">Xóa bộ lọc</button>
        )}
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
        {!loading && customers.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <UserRound size={32} />
            <p className="text-sm m-0">Không tìm thấy khách hàng phù hợp.</p>
            <button type="button" onClick={() => setShowNewModal(true)} className="text-sm font-bold text-[#00C475] hover:underline">+ Thêm khách mới</button>
          </div>
        )}

        {customers.map((customer) => {
          const isSelected = selectedCustomer?.userId === customer.userId;
          return (
            <div
              key={customer.userId}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(isSelected ? null : customer)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(isSelected ? null : customer)}
              className={`p-3.5 rounded-full border-2 cursor-pointer transition-all flex justify-between items-center gap-3 ${
                isSelected ? 'border-[#009154] bg-[#009154] text-white shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isSelected ? <CheckCircle2 size={22} className="text-white shrink-0" /> : <div className="w-[22px] h-[22px] rounded-full border-2 border-gray-300 shrink-0"></div>}

                <p className={`text-sm truncate m-0 ${isSelected ? 'text-white' : 'text-gray-600'}`} title={`${customer.fullName} - ${customer.phoneNumber} - ${customer.email}`}>
                  <span className="font-bold">{customer.fullName}</span> - {formatPhone(customer.phoneNumber)}
                  {customer.email && <> - {customer.email}</>}{' '}
                  <span className={isSelected ? 'text-green-100' : 'text-gray-400'}>- {customer.totalBookings} lượt đặt trước</span>
                </p>
              </div>
              {customer.isMock && (
                <span className="px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap bg-amber-100 text-amber-700">Mock</span>
              )}
              {customer.status && customer.status !== 'ACTIVE' && (
                <span className="px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap bg-red-100 text-red-600">Đã khóa</span>
              )}
              {customer.isFrequent && (
                <span className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${isSelected ? 'bg-white text-[#009154]' : 'bg-gray-100 text-gray-500'}`}>
                  Khách quen
                </span>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #E5E7EB; border-radius: 20px; }
      `}</style>
    </div>
  );
}

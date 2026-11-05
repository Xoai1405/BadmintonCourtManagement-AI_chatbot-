import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

import CustomerSelectionPanel from '../../components/booking/CustomerSelectionPanel';
import SingleBookingTab from '../../components/booking/SingleBookingTab';
import RecurringBookingTab from '../../components/booking/RecurringBookingTab';

// Màn hình gọi API thật (src/api/staffBookingCreateApi.js + CourtApi), cần đăng nhập
// tài khoản STAFF/MANAGER. Riêng nút "Khách mới" vẫn dùng mock (src/mocks/staffBookingMock.js)
// vì chưa có API thêm khách.

const TABS = [
  { key: 'SINGLE', label: 'Booking lẻ' },
  { key: 'RECURRING', label: 'Booking gói' },
];

export default function StaffBookingCreate() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('SINGLE');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  // Tăng sau mỗi lần tạo booking để panel khách tải lại số lượt đặt
  const [customerRefreshKey, setCustomerRefreshKey] = useState(0);

  const handleBooked = () => setCustomerRefreshKey((k) => k + 1);

  return (
    <section className="p-6 bg-gray-50/50 min-h-screen">
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />

      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          aria-label="Quay lại tra cứu booking"
          onClick={() => navigate('/staff/bookings')}
          className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-gray-500 rounded-full hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 m-0">Tạo booking tại quầy</h1>
      </div>

      {/* Chia đôi màn hình (50 - 50) */}
      <div className="flex flex-col xl:flex-row gap-6">

        {/* ================= CỘT TRÁI: THÔNG TIN KHÁCH HÀNG ================= */}
        <div className="w-full xl:w-1/2">
          <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-6 h-full">
            <h2 className="text-lg font-bold text-gray-800 mb-5 pb-4 border-b border-gray-100">Thông tin khách</h2>
            <CustomerSelectionPanel
              onSelect={setSelectedCustomer}
              selectedCustomer={selectedCustomer}
              refreshKey={customerRefreshKey}
            />
          </div>
        </div>

        {/* ================= CỘT PHẢI: CHI TIẾT ĐẶT LỊCH & THANH TOÁN ================= */}
        <div className="w-full xl:w-1/2">
          <div className="bg-white rounded-2xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 p-6">

            {/* Tabs với vạch ngăn ở giữa */}
            <div className="flex justify-center items-center border-b border-gray-100 mb-6 gap-3" role="tablist">
              {TABS.map((tab, index) => (
                <React.Fragment key={tab.key}>
                  {index > 0 && <div className="w-[2px] h-4 bg-black mb-3 opacity-80 rounded-full"></div>}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    className={`pb-3 px-6 font-bold text-[15px] transition-colors relative ${
                      activeTab === tab.key ? 'text-[#00C475]' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    {activeTab === tab.key && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#00C475] rounded-t-md"></div>}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Giữ cả 2 tab mounted để chuyển tab không mất dữ liệu đang nhập */}
            <div className="min-h-[400px]">
              <div hidden={activeTab !== 'SINGLE'}>
                <SingleBookingTab customer={selectedCustomer} onBooked={handleBooked} />
              </div>
              <div hidden={activeTab !== 'RECURRING'}>
                <RecurringBookingTab customer={selectedCustomer} onBooked={handleBooked} />
              </div>
            </div>

          </div>
        </div>

      </div>

      <style>{`
        @keyframes staffFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .animate-fadeIn { animation: staffFadeIn .2s ease-out; }
      `}</style>
    </section>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, FileText } from 'lucide-react';

export default function CourtCard({ court }) {
  if (!court) return null;

  // Hỗ trợ song song cả biến Database (price_normal_hour) và biến Mock Data (basePrice)
  const normalPrice = court.price_normal_hour || court.basePrice || 60000;
  const peakPrice = court.price_peak_hour || court.peakPrice || 72000;

  // Đồng bộ trạng thái tiếng Anh từ Database sang tiếng Việt hiển thị UI
  const displayStatus = court.status === 'ACTIVE' ? 'Hoạt động' : 
                        court.status === 'MAINTENANCE' ? 'Bảo trì' : 
                        court.status === 'CLOSED' ? 'Đóng cửa' : 
                        court.status;

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden flex flex-col h-full border border-gray-100">
      
      {/* Ảnh sân */}
      <img src={court.imageUrl || court.image_url} alt={court.name} className="w-full h-48 object-cover" />

      {/* Nội dung thẻ */}
      <div className="p-5 flex flex-col flex-grow">
        
        {/* Tên sân & Trạng thái */}
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-xl font-bold text-gray-800">{court.name}</h3>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            displayStatus === 'Hoạt động' ? 'bg-emerald-50 text-[#00C475]' :
            'bg-gray-100 text-gray-500'
          }`}>
            {displayStatus}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-4">{court.court_type || court.type}</p>

        {/* Khung mô tả (Tự nhận diện VIP) */}
        <div className="flex items-start gap-2 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg flex-grow">
          {court.isVip || (court.court_type && court.court_type.includes('VIP')) ? (
            <Crown size={18} className="text-yellow-500 shrink-0 mt-0.5" />
          ) : (
            <FileText size={18} className="text-gray-400 shrink-0 mt-0.5" />
          )}
          <p className="line-clamp-2">{court.description}</p>
        </div>

        {/* Giá & Nút hành động */}
        <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-100">
          <div>
            <p className="font-bold text-xl text-[#00C475]">
              {normalPrice.toLocaleString('vi-VN')}đ<span className="text-sm text-gray-500 font-medium">/giờ</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              (Giờ cao điểm: {peakPrice.toLocaleString('vi-VN')}đ/giờ)
            </p>
          </div>

          {displayStatus === 'Hoạt động' ? (
             <Link
               to={`/court/${court.id}`}
               className="px-5 py-2 bg-[#00C475] text-white text-sm font-semibold rounded-lg hover:bg-[#00B068] transition-colors shadow-sm"
             >
               Xem lịch
             </Link>
          ) : (
             <button
               disabled
               className="px-5 py-2 bg-gray-200 text-gray-500 text-sm font-semibold rounded-lg cursor-not-allowed"
             >
               Tạm dừng
             </button>
          )}
        </div>
      </div>
    </div>
  );
}
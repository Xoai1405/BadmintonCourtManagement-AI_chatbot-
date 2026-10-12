import React from 'react';
import { Link } from 'react-router-dom'; // Bắt buộc phải có để chuyển trang
import { FileText, Crown } from 'lucide-react';

export default function CourtCard({ court }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <img src={court.imageUrl} alt={court.name} className="w-full h-48 object-cover" />
      <div className="p-4 flex flex-col flex-grow">
        
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-800">{court.name}</h3>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            court.status === 'Hoạt động' ? 'bg-emerald-50 text-[#00C475]' : 'bg-gray-100 text-gray-500'
          }`}>
            {court.status}
          </span>
        </div>
        
        <p className="text-sm text-gray-500 mb-3">{court.type}</p>
        
        <div className="flex items-start gap-2 text-xs text-gray-600 mb-4 bg-gray-50 p-2 rounded flex-grow">
          {court.isVip ? <Crown size={16} className="text-yellow-500 shrink-0" /> : <FileText size={16} className="text-gray-400 shrink-0" />}
          <p>{court.description}</p>
        </div>
        
        <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-50">
          <div>
            <p className="font-bold text-lg text-[#00C475]">
              {court.basePrice.toLocaleString()}đ<span className="text-sm text-gray-500 font-normal">/giờ</span>
            </p>
            <p className="text-xs text-gray-400">(Giờ cao điểm: {court.peakPrice.toLocaleString()}đ/giờ)</p>
          </div>
          
          {/* ĐÂY LÀ NÚT CHUYỂN TRANG */}
          <Link 
            to={`/court/${court.id}`}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              court.status === 'Hoạt động' 
              ? 'bg-[#00C475] text-white hover:bg-[#00B068]' 
              : 'bg-gray-200 text-gray-500 pointer-events-none'
            }`}
          >
            {court.status === 'Hoạt động' ? 'Xem lịch' : 'Tạm đóng'}
          </Link>
        </div>

      </div>
    </div>
  );
}
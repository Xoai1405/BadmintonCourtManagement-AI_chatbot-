import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Crown, FileText, Calendar } from 'lucide-react';
import { mockCourts, generateTimeSlots } from '../mocks/apiContract';
import Navbar from '../components/Navbar'; 

export default function CourtDetail() {
  const { id } = useParams();
  const court = mockCourts.find(c => c.id === parseInt(id)) || mockCourts[1]; 
  
  const [timeSlots] = useState(generateTimeSlots());
  const [selectedSlots, setSelectedSlots] = useState([]);

  const toggleSlot = (slot) => {
    if (slot.status === 'booked') return; 
    if (selectedSlots.includes(slot.id)) {
      setSelectedSlots(selectedSlots.filter(sId => sId !== slot.id)); 
    } else {
      setSelectedSlots([...selectedSlots, slot.id]); 
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      
      {/* 1. THANH MENU DÙNG CHUNG (Tự động lấy Logo và UI từ file Navbar.jsx) */}
      <Navbar />
      
      {/* 2. NỘI DUNG TRANG CHI TIẾT SÂN */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        
        <Link to="/" className="inline-flex items-center gap-2 text-[#00C475] font-medium hover:underline mb-6 text-sm">
          <ArrowLeft size={16} /> Quay lại danh sách sân
        </Link>
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* CỘT TRÁI */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden sticky top-24">
              <img src={court.imageUrl} alt={court.name} className="w-full h-56 object-cover" />
              <div className="p-5">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">{court.name}</h2>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-[#00C475]">Hoạt động</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{court.type}</p>
                
                <div className="flex items-start gap-2 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
                  {court.isVip ? (
                    <Crown size={20} className="text-yellow-500 shrink-0" />
                  ) : (
                    <FileText size={20} className="text-gray-400 shrink-0" />
                  )}
                  <p>{court.description}</p>
                </div>
                
                <div>
                  <p className="font-bold text-2xl text-[#00C475]">{court.basePrice.toLocaleString()}đ<span className="text-lg text-gray-500 font-medium">/giờ</span></p>
                  <p className="text-xs text-gray-400 mt-1">(Giờ cao điểm {court.peakPrice.toLocaleString()}đ/giờ)</p>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI */}
          <div className="w-full lg:w-2/3 bg-gray-50 p-6 rounded-xl">
            <div className="mb-6 inline-block">
              <div className="relative flex items-center bg-white border border-gray-200 rounded-md h-10 w-48">
                <Calendar className="absolute left-3 text-gray-500" size={18} />
                <input 
                  type="text" 
                  defaultValue="20/09/2026" 
                  className="pl-10 pr-3 py-2 w-full h-full outline-none text-sm text-gray-700 bg-transparent rounded-md" 
                />
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">Chọn các khung giờ liên tiếp (30 phút/khung)</p>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
              {timeSlots.map(slot => {
                const isSelected = selectedSlots.includes(slot.id);
                let btnClass = "py-2 rounded border text-xs font-medium transition-colors duration-200 ";
                
                if (slot.status === 'booked') {
                  btnClass += "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed";
                } else if (isSelected) {
                  btnClass += "bg-[#00C475] text-white border-[#00C475] shadow-sm";
                } else {
                  btnClass += "bg-white text-gray-600 border-gray-200 hover:border-[#00C475] hover:text-[#00C475]";
                }

                return (
                  <button key={slot.id} onClick={() => toggleSlot(slot)} className={btnClass}>
                    {slot.time}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-6 text-sm text-gray-500 mb-8 border-b border-gray-200 pb-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded border border-gray-200"></div> Đã đặt
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div> Còn trống
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[#00C475] rounded"></div> Đang chọn
              </div>
            </div>

            <div className="flex justify-between items-center bg-emerald-50/50 p-5 rounded-xl border border-emerald-100/50">
              <div>
                <p className="text-sm text-gray-600 mb-1">Đã chọn: <span className="font-bold text-gray-800">{selectedSlots.length} khung</span></p>
                <p className="text-sm text-gray-600">Tổng tiền: <span className="text-xl font-bold text-[#00C475]">{(selectedSlots.length * (court.basePrice / 2)).toLocaleString()}đ</span></p>
              </div>
              <button 
                disabled={selectedSlots.length === 0}
                className={`px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  selectedSlots.length > 0 
                  ? 'bg-[#00C475] text-white shadow-md hover:bg-[#00B068]' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Đặt sân ngay <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00C475] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#00B068] transition-colors">
        <MessageCircle size={28} />
      </button>
    </div>
  );
}
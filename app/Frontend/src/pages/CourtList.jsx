import Navbar from '../components/Navbar';
import CourtCard from '../components/CourtCard';
import { courtApi } from '../api/CourtApi';
import { Calendar, Search } from 'lucide-react';
import { useState,useEffect } from 'react';
import ChatbotButton from "../components/ChatbotButton";

export default function CourtList() {
  

 const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const data = await courtApi.getAllCourt();
        setCourts(data);
      } catch (err) {
        setError(err.message || 'Không lấy được danh sách sân');
      } finally {
        setLoading(false);
      }
    };

    fetchCourts();
  }, []);

  if (loading) {
    return <div className="p-6">Đang tải danh sách sân...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Danh sách sân</h1>
        <p className="text-gray-500 mb-6 text-sm">Chọn ngày để xem sân còn trống</p>
        
        {/* Bộ lọc tìm kiếm - 3 khối riêng biệt */}
        <div className="flex gap-4 mb-8 items-center">
          
          {/* Khối 1: Chọn ngày */}
          <div className="relative flex items-center bg-white border border-gray-200 rounded-md shadow-sm h-10 w-48">
            <Calendar className="absolute left-3 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="dd/mm/yyyy" 
              className="pl-10 pr-3 py-2 w-full h-full outline-none text-sm text-gray-600 bg-transparent rounded-md" 
            />
          </div>
          
          {/* Khối 2: Loại sân */}
          <div className="bg-white border border-gray-200 rounded-md shadow-sm h-10 w-48 relative">
            <select className="w-full h-full pl-4 pr-10 outline-none text-sm text-gray-600 bg-transparent appearance-none cursor-pointer">
              <option>Tất cả sân</option>
              <option>Sân ngoài trời</option>
              <option>Sân trong nhà</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          
          {/* Khối 3: Nút tìm kiếm */}
          <button className="h-10 px-6 bg-[#00C475] text-white text-sm font-medium rounded-md shadow-sm hover:bg-[#00B068] transition-colors flex items-center justify-center gap-2">
            <Search size={16} /> Tìm sân trống
          </button>
          
        </div>

        {/* Danh sách thẻ sân */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courts.map(court => (
            <CourtCard key={court.id} court={court} />
          ))}
        </div>

        <ChatbotButton/>
      </div>

    </div>
  );
}

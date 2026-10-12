import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, LogOut, ChevronDown } from 'lucide-react';

// Import file Logo từ thư mục assets
// (Lưu ý: Bạn hãy check kỹ trong thư mục assets, tên file phải chính xác là "Logo.png" - chữ L viết hoa nhé)
import logoImg from '../assets/Logo.png'; 

export default function Navbar() {
  // Đang để false để hiện nút Đăng nhập/Đăng ký. Đổi thành true sẽ hiện Avatar.
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo Ảnh & Tên hệ thống SmashFlow */}
          <div className="flex items-center gap-3">
            {/* Đây là thẻ img hiển thị Logo thực tế */}
            <img 
              src={logoImg} 
              alt="SmashFlow Logo" 
              className="h-10 w-auto object-contain" 
            />
            <Link to="/" className="text-xl font-extrabold text-gray-800 tracking-tight">
              Smash<span className="text-[#00C475]">Flow</span>
            </Link>
          </div>

          {/* Menu giữa (Chỉ hiện khi đã đăng nhập) */}
          {isLoggedIn && (
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-[#00C475] border-b-2 border-[#00C475] px-1 py-5 text-sm font-semibold">Sân</Link>
              <Link to="/fixed-schedule" className="text-gray-500 hover:text-gray-800 px-1 py-5 text-sm font-medium transition-colors">Lịch cố định</Link>
              <Link to="/my-bookings" className="text-gray-500 hover:text-gray-800 px-1 py-5 text-sm font-medium transition-colors">Booking của tôi</Link>
            </div>
          )}

          {/* Menu phải (Guest vs Logged In) */}
          <div className="flex items-center">
            {isLoggedIn ? (
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-md transition-colors border border-transparent hover:border-gray-200"
                >
                  <img src="https://i.pravatar.cc/150?img=11" alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                  <span className="text-sm font-medium text-gray-700">Nguyễn Văn A</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                {/* Dropdown Menu Cá nhân */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                       <img src="https://i.pravatar.cc/150?img=11" alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                       <div>
                         <p className="text-sm font-bold text-gray-800">Nguyễn Văn A</p>
                         <p className="text-xs text-gray-500">Khách hàng</p>
                       </div>
                    </div>
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <User size={16} className="text-gray-500"/> Thông tin cá nhân
                    </Link>
                    <Link to="/change-password" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Lock size={16} className="text-gray-500"/> Đổi mật khẩu
                    </Link>
                    <div className="border-t border-gray-100 mt-1"></div>
                    <button 
                      onClick={() => {
                        setIsLoggedIn(false);
                        setIsDropdownOpen(false);
                      }} 
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                  Đăng nhập
                </Link>
                <Link to="/register" className="px-5 py-2.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </nav>
  );
}
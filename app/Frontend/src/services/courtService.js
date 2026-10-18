// src/services/courtService.js
// Nơi tập trung toàn bộ các hàm gọi API liên quan đến Sân cầu lông

const BASE_URL = 'http://localhost:8081/api/v1';

export const courtService = {
  // 1. Lấy danh sách tất cả các sân
  getAllCourts: async () => {
    try {
      const response = await fetch(`${BASE_URL}/courts`);
      if (!response.ok) throw new Error('Lỗi khi tải danh sách sân');
      return await response.json(); 
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // 2. Lấy chi tiết 1 sân (Dành cho trang CourtDetail)
  getCourtById: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/courts/${id}`);
      if (!response.ok) throw new Error('Lỗi tải chi tiết sân');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // 3. Đặt sân mới (Dành cho trang BookingConfirm)
  createBooking: async (bookingData) => {
    try {
      const response = await fetch(`${BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      if (!response.ok) throw new Error('Lỗi khi đặt sân');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};
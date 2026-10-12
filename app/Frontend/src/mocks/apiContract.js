// Dữ liệu giả lập danh sách sân
export const mockCourts = [
  {
    id: 1,
    name: "Sân 01",
    type: "Sân tiêu chuẩn ngoài trời",
    isVip: false,
    status: "Hoạt động",
    basePrice: 100000,
    peakPrice: 150000,
    description: "Sân tiêu chuẩn, phù hợp cho đánh đơn và đánh đôi.",
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Sân VIP 02",
    type: "Sân VIP trong nhà",
    isVip: true,
    status: "Hoạt động",
    basePrice: 250000,
    peakPrice: 350000,
    description: "Sân VIP, không gian thoáng mát, đèn đạt chuẩn thi đấu.",
    imageUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=2007&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Sân 03",
    type: "Sân tiêu chuẩn trong nhà",
    isVip: false,
    status: "Bảo trì",
    basePrice: 80000,
    peakPrice: 120000,
    description: "Sân tiêu chuẩn, phù hợp cho đánh đơn và đánh đôi.",
    imageUrl: "https://images.unsplash.com/photo-1572560377017-eb965a3d76b1?q=80&w=2069&auto=format&fit=crop",
  }
];

// Hàm tạo các khung giờ 30 phút từ 6:00 đến 22:00
export const generateTimeSlots = () => {
  const slots = [];
  let currentId = 1;
  // Bắt đầu từ 6:00 sáng
  for (let hour = 6; hour < 22; hour++) {
    // Khung giờ chẵn (VD: 6:00 - 6:30)
    slots.push({
      id: currentId++,
      time: `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:30`,
      // Giả lập random trạng thái: khoảng 20% khung giờ đã bị đặt (booked), còn lại là trống (available)
      status: Math.random() > 0.8 ? 'booked' : 'available' 
    });
    // Khung giờ lẻ (VD: 6:30 - 7:00)
    slots.push({
      id: currentId++,
      time: `${hour.toString().padStart(2, '0')}:30 - ${(hour + 1).toString().padStart(2, '0')}:00`,
      status: Math.random() > 0.8 ? 'booked' : 'available'
    });
  }
  return slots;
};
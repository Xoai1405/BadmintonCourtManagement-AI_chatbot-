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

// Hàm tạo các khung giờ 30 phút từ 06:00 đến 23:00
export const generateTimeSlots = () => {
  const slots = [];
  let currentId = 1;
  // Khung giờ cố định mô phỏng đã có người đặt giống thiết kế Figma
  const defaultBookedTimes = ["17:30 - 18:00", "18:00 - 18:30", "20:00 - 20:30"];

  for (let hour = 6; hour < 23; hour++) {
    const time1 = `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:30`;
    slots.push({
      id: currentId++,
      time: time1,
      status: defaultBookedTimes.includes(time1) ? 'booked' : 'available'
    });

    const time2 = `${hour.toString().padStart(2, '0')}:30 - ${(hour + 1).toString().padStart(2, '0')}:00`;
    slots.push({
      id: currentId++,
      time: time2,
      status: defaultBookedTimes.includes(time2) ? 'booked' : 'available'
    });
  }
  return slots;
};
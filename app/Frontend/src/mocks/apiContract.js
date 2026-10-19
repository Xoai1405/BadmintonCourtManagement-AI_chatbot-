// Dữ liệu sân dùng chung theo cấu trúc của giao diện khách hàng.
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
  },
];

// Bảng giá vẫn nhóm theo mã loại sân; dữ liệu sân dùng tên tiếng Việt.
export const courtTypeCodes = {
  "Sân tiêu chuẩn ngoài trời": "STANDARD_OUTDOOR",
  "Sân tiêu chuẩn trong nhà": "STANDARD_INDOOR",
  "Sân VIP trong nhà": "VIP_INDOOR",
};

export const mockCustomers = [
  { id: 1, fullName: "Nguyễn Văn A", phone: "0909 123 456", email: "c.le@email.com", status: "ACTIVE" },
  { id: 2, fullName: "Trần Thị B", phone: "0909 456 789", email: "PVD42@email.com", status: "LOCKED" },
];

// Mỗi dòng là một lần đặt sân lẻ hoặc một gói lịch cố định.
// courtId của booking tham chiếu id của sân trong mockCourts.
// Lưu thông tin tại thời điểm tạo lịch sử để không đổi khi admin sửa/xóa sân.
const historyCourts = Object.fromEntries(mockCourts.map((court) => [
  court.id,
  {
    courtName: court.name,
    courtTypeLabel: court.type,
    courtDescription: court.description,
    isVip: court.isVip,
    courtLocation: courtTypeCodes[court.type] === "STANDARD_OUTDOOR" ? "Ngoài trời" : "Trong nhà",
    imageUrl: court.imageUrl,
    imagePosition: "center",
  },
]));

const makeHistory = (entry) => {
  const booking = {
    startTime: "19:00", endTime: "21:00", amount: 500000,
    createdAt: "2026-09-01",
    notes: "Dữ liệu lịch sử minh họa cho màn quản lý khách hàng.",
    ...historyCourts[entry.courtId],
    ...entry,
  };
  if (entry.type === "RECURRING") return { ...booking, sessionCourtFee: 500000, discountPercent: 10,
    amount: 450000 * entry.sessionCount,
    cancellationReason: entry.status === "CANCELLED" ? "Bận công việc đột xuất" : null,
  };
  // Chỉ booking lẻ có chi tiết thanh toán. Tổng tiền luôn bằng tiền sân + dịch vụ.
  const paid = booking.paymentStatus === "PAID";
  const serviceFee = entry.serviceFee ?? 0;
  return { ...booking, courtFee: booking.amount - serviceFee, serviceFee,
    createdAt: entry.createdAt ?? entry.startDate, createdTime: "16:42",
    holdExpiresAt: `${entry.startDate}T17:02:00`,
    paymentMethod: paid ? "Chuyển khoản" : null,
    paidAt: paid ? `${entry.startDate}T16:52:00` : null,
    confirmedBy: paid ? "Quản lý — BảoDZ" : null,
    cancellationReason: entry.status === "CANCELLED" ? "Bận công việc đột xuất" : null,
  };
};

// Khách hàng 1: 6 lịch sử = 4 đặt sân lẻ + 2 lịch cố định;
// Chỉ 4 đặt sân lẻ có trạng thái thanh toán: 3 chưa thanh toán + 1 đã thanh toán.
// Lịch cố định chỉ có trạng thái hoạt động của gói, không có paymentStatus.
export const mockBookings = [
  makeHistory({ id: 1, customerId: 1, courtId: 2, code: "BK2026091801", type: "SINGLE",
    startDate: "2026-09-18", endDate: "2026-09-18", status: "PENDING", paymentStatus: "UNPAID" }),
  makeHistory({ id: 2, customerId: 1, courtId: 1, code: "BK2026091802", type: "SINGLE",
    startDate: "2026-09-18", endDate: "2026-09-18", status: "CONFIRMED", paymentStatus: "UNPAID" }),
  makeHistory({ id: 3, customerId: 1, courtId: 3, code: "BK2026091803", type: "SINGLE",
    startDate: "2026-09-18", endDate: "2026-09-18", status: "COMPLETED", paymentStatus: "PAID" }),
  makeHistory({ id: 4, customerId: 1, courtId: 2, code: "#15", type: "RECURRING",
    startDate: "2026-09-01", endDate: "2026-09-30", daysOfWeek: [1, 3, 5], sessionCount: 12,
    status: "ACTIVE" }),
  makeHistory({ id: 5, customerId: 1, courtId: 3, code: "#16", type: "RECURRING",
    startDate: "2026-09-01", endDate: "2026-09-30", daysOfWeek: [1, 3, 5], sessionCount: 12,
    status: "CANCELLED" }),
  makeHistory({ id: 6, customerId: 1, courtId: 1, code: "BK2026081701", type: "SINGLE",
    startDate: "2026-08-17", endDate: "2026-08-17", status: "CANCELLED", paymentStatus: "UNPAID" }),
  makeHistory({ id: 7, customerId: 2, courtId: 1, code: "BK2026100501", type: "SINGLE",
    startDate: "2026-10-05", endDate: "2026-10-05", amount: 300000,
    status: "COMPLETED", paymentStatus: "PAID" }),
  makeHistory({ id: 8, customerId: 2, courtId: 3, code: "BK2026101201", type: "SINGLE",
    startDate: "2026-10-12", endDate: "2026-10-12", amount: 380000,
    status: "CONFIRMED", paymentStatus: "UNPAID" }),
  makeHistory({ id: 9, customerId: 2, courtId: 2, code: "#17", type: "RECURRING",
    startDate: "2026-10-01", endDate: "2026-10-31", daysOfWeek: [2, 4], sessionCount: 9,
    status: "COMPLETED" }),
];

// Mỗi buổi có booking và thanh toán riêng. Gói chỉ tổng hợp số buổi đã thanh toán.
// Sinh ngày thực theo các thứ trong tuần, không lặp cùng một ngày cho mọi dòng minh họa.
export const mockRecurringSessions = mockBookings.filter((booking) => booking.type === "RECURRING").flatMap((group) => {
  const dates = [];
  const cursor = new Date(`${group.startDate}T00:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= group.endDate && dates.length < group.sessionCount) {
    if (group.daysOfWeek.includes(cursor.getUTCDay() || 7)) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates.map((day, index) => {
    const completed = group.status === "COMPLETED" || index < (group.status === "CANCELLED" ? 3 : 2);
    const cancelled = !completed && group.status === "CANCELLED";
    const status = completed ? "COMPLETED" : cancelled ? "CANCELLED" : index === 2 ? "CONFIRMED" : "PENDING";
    const discountAmount = Math.round(group.sessionCourtFee * group.discountPercent / 100);
    return { ...historyCourts[group.courtId], id: `${group.id}-${index + 1}`, packageId: group.id,
      packageCode: group.code, customerId: group.customerId, courtId: group.courtId, type: "SESSION",
      code: `BK${day.replaceAll("-", "")}${group.id}${String(index + 1).padStart(2, "0")}`,
      startDate: day, endDate: day, startTime: group.startTime, endTime: group.endTime,
      createdAt: group.createdAt, createdTime: "16:42", holdExpiresAt: `${day}T17:02:00`,
      status, paymentStatus: completed ? "PAID" : "UNPAID",
      courtFee: group.sessionCourtFee, discountPercent: group.discountPercent, discountAmount,
      serviceFee: 0, amount: group.sessionCourtFee - discountAmount,
      paymentMethod: completed ? "Chuyển khoản" : null, paidAt: completed ? `${day}T17:02:00` : null,
      confirmedBy: completed ? "Đoàn Thị B (Nhân viên)" : null,
      cancellationReason: cancelled ? group.cancellationReason : null,
    };
  });
});

export const generateTimeSlots = () => {
  const slots = [];

  const toTime = (totalMinutes) => {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  for (let minutes = 4 * 60; minutes < 23 * 60; minutes += 30) {
    const startTime = toTime(minutes);
    const endTime = toTime(minutes + 30);

    slots.push({
      id: minutes,
      startTime,
      endTime,
      time: `${startTime} - ${endTime}`,
      status: "available",
    });
  }

  return slots;
};

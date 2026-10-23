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

// DTO mock cho panel nhân viên theo SE214_API Contract (bản kết thúc ở Nhóm 3, API 11).
// Các model UI của admin ở trên giữ riêng, không dùng làm response của booking API.
export const mockStaffCourts = mockCourts.map((court) => ({
  courtId: court.id, name: court.name, courtType: courtTypeCodes[court.type],
  status: court.status === "Bảo trì" ? "MAINTENANCE" : "ACTIVE", referencePrice: court.basePrice,
  imageUrl: court.imageUrl, description: court.description,
}));
export const mockBookingServices = [
  { serviceId: 1, name: "Nước Aquafina", category: "DRINK", unitPrice: 10000, status: "ACTIVE" },
  { serviceId: 2, name: "Thuê vợt", category: "RACKET_RENTAL", unitPrice: 20000, status: "ACTIVE" },
  { serviceId: 3, name: "Ống cầu lông", category: "OTHER", unitPrice: 120000, status: "ACTIVE" },
  { serviceId: 4, name: "Khăn thể thao", category: "OTHER", unitPrice: 15000, status: "ACTIVE" },
];

const staffDemoCustomers = [
  ...mockCustomers,
  { id: 3, fullName: "Lê Minh Anh", phone: "0912 345 678", email: "minhanh@example.com" },
  { id: 4, fullName: "Phạm Quốc Huy", phone: "0986 234 567", email: "quochuy@example.com" },
  { id: 5, fullName: "Võ Ngọc Linh", phone: "0938 567 890", email: "ngoclinh@example.com" },
  { id: 6, fullName: "Đặng Hoàng Nam", phone: "0977 456 123", email: "hoangnam@example.com" },
];
// Catalog cục bộ để giữ gợi ý email/SĐT của UI; file contract chưa có GET /customers.
export const mockStaffCustomers = staffDemoCustomers.map((customer) => ({
  userId: customer.id, fullName: customer.fullName, phoneNumber: customer.phone.replace(/\s/g, ""),
  email: customer.email, role: "CUSTOMER",
}));
const staffDemoDate = (offset = 0) => new Date(Date.now() + (7 + offset * 24) * 3600000).toISOString().slice(0, 10);
const staffDemoTimestamp = (minutes = 0) => `${new Date(Date.now() + 7 * 3600000 + minutes * 60000).toISOString().slice(0, 19)}+07:00`;
const staffDemoRows = [
  { customerId: 1, courtId: 1, status: "PENDING", time: "18:00", services: [{ serviceId: 1, quantity: 2 }, { serviceId: 2, quantity: 2 }] },
  { customerId: 3, courtId: 2, status: "CONFIRMED", time: "18:00", paid: true },
  { customerId: 4, courtId: 1, status: "CHECKED_IN", time: "19:00", services: [{ serviceId: 1, quantity: 4 }] },
  { customerId: 5, courtId: 2, status: "COMPLETED", time: "16:00", paid: true },
  { customerId: 6, courtId: 1, status: "PENDING", time: "20:00", offset: 1 },
  { customerId: 2, courtId: 2, status: "CANCELLED", time: "17:00" },
  { customerId: 3, courtId: 1, status: "NO_SHOW", time: "15:00" },
  { customerId: 5, courtId: 2, status: "CONFIRMED", time: "19:00", offset: 1 },
];

export const mockStaffBookings = staffDemoRows.map((entry, index) => {
  const services = (entry.services ?? []).map(({ serviceId, quantity }) => {
    const service = mockBookingServices.find((item) => item.serviceId === serviceId);
    return { serviceId, name: service.name, quantity, priceAtBooking: service.unitPrice, subtotal: quantity * service.unitPrice };
  });
  const courtFee = entry.courtId === 2 ? 250000 : 180000;
  const serviceFee = services.reduce((total, service) => total + service.subtotal, 0);
  const startDate = staffDemoDate(entry.offset);
  const customer = mockStaffCustomers.find((item) => item.userId === entry.customerId);
  return {
    bookingId: index + 1, bookingCode: `BK${startDate.replaceAll("-", "")}${String(index + 1).padStart(3, "0")}`,
    customer: { userId: customer.userId, fullName: customer.fullName, phoneNumber: customer.phoneNumber },
    courtId: entry.courtId, courtName: mockStaffCourts.find((court) => court.courtId === entry.courtId).name,
    courtType: mockStaffCourts.find((court) => court.courtId === entry.courtId).courtType,
    bookingDate: startDate, startTime: entry.time, endTime: `${String(Number(entry.time.slice(0, 2)) + 1).padStart(2, "0")}:00`,
    bookingStatus: entry.status, paymentStatus: entry.paid ? "PAID" : "UNPAID",
    courtPrice: courtFee, servicePrice: serviceFee, totalAmount: courtFee + serviceFee, services,
    cancelReason: entry.status === "CANCELLED" ? "Khách hàng yêu cầu đổi lịch." : null,
    cancelledAt: entry.status === "CANCELLED" ? staffDemoTimestamp(-1) : null,
    expireAt: entry.status === "PENDING" ? staffDemoTimestamp(25) : null, createdAt: staffDemoTimestamp(-5),
    paymentMethod: entry.paid ? "Chuyển khoản" : null,
    paidAt: entry.paid ? `${startDate}T14:30:00+07:00` : null,
    paidBy: entry.paid ? "Đoàn Thị B" : null,
  };
});

// TẠM: file contract chưa định nghĩa API/DTO gói lịch cố định.
// Giữ model gói để chạy UI; ID trong dữ liệu vẫn là Long, prefix chỉ dùng cho URL của UI.
export const mockStaffRecurringBookings = mockBookings.filter((booking) => booking.type === "RECURRING").map((booking) => ({
  ...booking,
  customer: staffDemoCustomers.find((customer) => customer.id === booking.customerId), staffName: "Đoàn Thị B",
}));

// Buổi trong gói là booking thật theo DTO /bookings, dùng bookingId dạng số.
export const mockStaffRecurringSessions = mockRecurringSessions.map((session, index) => {
  const customer = mockStaffCustomers.find((item) => item.userId === session.customerId);
  return {
    bookingId: 1001 + index, bookingCode: session.code,
    customer: { userId: customer.userId, fullName: customer.fullName, phoneNumber: customer.phoneNumber },
    courtId: session.courtId, courtName: session.courtName, courtType: courtTypeCodes[session.courtTypeLabel],
    bookingDate: session.startDate, startTime: session.startTime, endTime: session.endTime,
    courtPrice: session.courtFee - session.discountAmount, servicePrice: 0, totalAmount: session.amount,
    bookingStatus: session.status, paymentStatus: session.paymentStatus,
    paymentMethod: session.paymentMethod, paidAt: session.paidAt ? `${session.paidAt}+07:00` : null, paidBy: session.confirmedBy,
    cancelReason: session.cancellationReason, cancelledAt: session.status === "CANCELLED" ? `${session.startDate}T09:00:00+07:00` : null,
    expireAt: null, createdAt: `${session.createdAt}T16:42:00+07:00`, services: [],
  };
});
// TẠM: liên kết gói và ưu đãi để dựng UI, không thêm các trường này vào response /bookings.
export const mockStaffRecurringSessionLinks = mockRecurringSessions.map((session, index) => ({
  bookingId: 1001 + index, packageId: session.packageId, packageCode: session.packageCode,
  originalCourtPrice: session.courtFee, discountPercent: session.discountPercent, discountAmount: session.discountAmount,
}));

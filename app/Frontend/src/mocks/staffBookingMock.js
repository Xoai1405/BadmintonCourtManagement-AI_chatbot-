// ============================================================================
// MOCK DATA cho màn hình "Tạo booking tại quầy" (StaffBookingCreate).
// Toàn bộ dữ liệu nằm trong bộ nhớ trình duyệt, F5 là reset.
// Khi nối backend thật, chỉ cần thay các hàm async ở cuối file bằng lời gọi API
// (giữ nguyên tên hàm + cấu trúc dữ liệu trả về).
// ============================================================================

const MOCK_DELAY_MS = 400;
const wait = (ms = MOCK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------- Cấu hình chung
export const mockBusinessHours = { openTime: "06:00", closeTime: "23:00" };

// Giờ cao điểm: khung bắt đầu trong [peakStart, peakEnd) tính giá cao điểm.
export const mockPeakHours = { peakStart: "17:00", peakEnd: "22:00" };

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
];

// Chiết khấu gói theo số buổi (áp dụng mức cao nhất đạt được).
export const mockDiscountTiers = [
  { minSessions: 24, percent: 15 },
  { minSessions: 12, percent: 10 },
  { minSessions: 8, percent: 5 },
];

// ---------------------------------------------------------------- Sân
export const mockStaffCourts = [
  { id: 1, name: "Sân 01", courtType: "Tiêu chuẩn ngoài trời", status: "ACTIVE", normalPrice: 100000, peakPrice: 150000 },
  { id: 2, name: "Sân 02", courtType: "Tiêu chuẩn trong nhà", status: "ACTIVE", normalPrice: 120000, peakPrice: 170000 },
  { id: 3, name: "Sân VIP 03", courtType: "VIP trong nhà", status: "ACTIVE", normalPrice: 250000, peakPrice: 350000 },
  { id: 4, name: "Sân 04", courtType: "Tiêu chuẩn trong nhà", status: "MAINTENANCE", normalPrice: 120000, peakPrice: 170000 },
];

// ---------------------------------------------------------------- Khách hàng
let customers = [
  { userId: 101, fullName: "Nguyễn Văn An", phoneNumber: "0909123456", email: "an.nguyen@email.com", totalBookings: 24, isFrequent: true },
  { userId: 102, fullName: "Trần Thị Bình", phoneNumber: "0912456789", email: "binh.tran@email.com", totalBookings: 3, isFrequent: false },
  { userId: 103, fullName: "Lê Hoàng Cường", phoneNumber: "0987654321", email: "cuong.le@email.com", totalBookings: 15, isFrequent: true },
  { userId: 104, fullName: "Phạm Minh Dũng", phoneNumber: "0934111222", email: "dung.pham@email.com", totalBookings: 0, isFrequent: false },
  { userId: 105, fullName: "Võ Thị Hạnh", phoneNumber: "0978333444", email: "hanh.vo@email.com", totalBookings: 8, isFrequent: true },
  { userId: 106, fullName: "Đặng Quốc Khánh", phoneNumber: "0965777888", email: "khanh.dang@email.com", totalBookings: 1, isFrequent: false },
];

// ---------------------------------------------------------------- Lịch đã đặt
// Lịch lặp theo thứ (0 = CN, 1 = T2, ... 6 = T7) để cả booking lẻ lẫn booking gói
// đều thấy được ô "đã đặt" / buổi trùng ở bất kỳ ngày nào.
const recurringOccupied = [
  { courtId: 1, days: [0, 1, 2, 3, 4, 5, 6], start: "18:00", end: "19:30" },
  { courtId: 1, days: [1, 3, 5], start: "07:00", end: "08:00" },
  { courtId: 2, days: [2, 4, 6], start: "19:00", end: "21:00" },
  { courtId: 2, days: [0, 1, 2, 3, 4, 5, 6], start: "09:00", end: "10:00" },
  { courtId: 3, days: [0, 6], start: "08:00", end: "11:00" },
  { courtId: 3, days: [0, 1, 2, 3, 4, 5, 6], start: "20:00", end: "21:00" },
];

// Booking tạo trong phiên test (để tạo xong thấy ngay ô bị chiếm).
const createdOccupied = []; // { courtId, date: "YYYY-MM-DD", start, end }

// ---------------------------------------------------------------- Helpers thời gian
export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Parse "YYYY-MM-DD" theo giờ địa phương (tránh lệch ngày do UTC).
export const parseLocalDate = (value) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const formatLocalDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const todayString = () => formatLocalDate(new Date());

export const formatVnd = (value) => `${new Intl.NumberFormat("vi-VN").format(Math.round(value || 0))}đ`;

const WEEKDAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// Danh sách khoảng thời gian đã có người đặt của 1 sân trong 1 ngày.
export const getOccupiedRanges = (courtId, dateString) => {
  const weekday = parseLocalDate(dateString).getDay();
  const fromRecurring = recurringOccupied
    .filter((r) => r.courtId === Number(courtId) && r.days.includes(weekday))
    .map(({ start, end }) => ({ start, end }));
  const fromCreated = createdOccupied
    .filter((r) => r.courtId === Number(courtId) && r.date === dateString)
    .map(({ start, end }) => ({ start, end }));
  return [...fromRecurring, ...fromCreated];
};

const isRangeFree = (courtId, dateString, start, end) =>
  getOccupiedRanges(courtId, dateString).every(
    (r) => !overlaps(toMinutes(start), toMinutes(end), toMinutes(r.start), toMinutes(r.end)),
  );

// Tính tiền theo từng block 30 phút, block bắt đầu trong giờ cao điểm tính giá cao điểm.
export const calculatePrice = (court, start, end) => {
  if (!court || !start || !end) return { total: 0, normalMinutes: 0, peakMinutes: 0 };
  const peakStart = toMinutes(mockPeakHours.peakStart);
  const peakEnd = toMinutes(mockPeakHours.peakEnd);
  let total = 0;
  let normalMinutes = 0;
  let peakMinutes = 0;
  for (let t = toMinutes(start); t < toMinutes(end); t += 30) {
    const isPeak = t >= peakStart && t < peakEnd;
    total += (isPeak ? court.peakPrice : court.normalPrice) / 2;
    if (isPeak) peakMinutes += 30;
    else normalMinutes += 30;
  }
  return { total, normalMinutes, peakMinutes };
};

const generateCode = (prefix) => `${prefix}${Date.now().toString().slice(-6)}`;

// ============================================================================
// "API" giả lập (async để sau này thay bằng API thật không phải sửa component)
// ============================================================================

export const mockStaffBookingApi = {
  async getCourts() {
    await wait(200);
    return mockStaffCourts.map((c) => ({ ...c }));
  },

  async searchCustomers({ name = "", phone = "", email = "" } = {}) {
    await wait();
    const n = name.trim().toLowerCase();
    const p = phone.replace(/\D/g, "");
    const e = email.trim().toLowerCase();
    return customers.filter(
      (c) =>
        (!n || c.fullName.toLowerCase().includes(n)) &&
        (!p || c.phoneNumber.includes(p)) &&
        (!e || c.email.toLowerCase().includes(e)),
    );
  },

  async createCustomer({ fullName, phoneNumber, email }) {
    await wait();
    const phone = phoneNumber.replace(/\D/g, "");
    if (customers.some((c) => c.phoneNumber === phone)) {
      throw new Error("Số điện thoại này đã tồn tại trong hệ thống.");
    }
    const customer = {
      userId: Math.max(...customers.map((c) => c.userId)) + 1,
      fullName: fullName.trim(),
      phoneNumber: phone,
      email: email.trim(),
      totalBookings: 0,
      isFrequent: false,
    };
    customers = [customer, ...customers];
    return customer;
  },

  async getAvailability(courtId, dateString) {
    await wait(250);
    return getOccupiedRanges(courtId, dateString);
  },

  async createSingleBooking({ customerId, courtId, bookingDate, startTime, endTime, paymentMethod }) {
    await wait(600);
    if (!isRangeFree(courtId, bookingDate, startTime, endTime)) {
      throw new Error("Khung giờ vừa được người khác đặt, vui lòng chọn lại.");
    }
    const court = mockStaffCourts.find((c) => c.id === Number(courtId));
    createdOccupied.push({ courtId: Number(courtId), date: bookingDate, start: startTime, end: endTime });
    bumpCustomer(customerId);
    return {
      bookingCode: generateCode("BK"),
      customerId,
      courtId,
      bookingDate,
      startTime,
      endTime,
      paymentMethod,
      totalAmount: calculatePrice(court, startTime, endTime).total,
      bookingStatus: "CONFIRMED",
    };
  },

  // daysOfWeek: mảng số theo JS (0 = CN ... 6 = T7)
  async previewRecurringBooking({ courtId, startTime, endTime, daysOfWeek, startDate, endDate }) {
    await wait();
    const court = mockStaffCourts.find((c) => c.id === Number(courtId));
    if (!court) throw new Error("Không tìm thấy sân.");
    if (parseLocalDate(endDate) < parseLocalDate(startDate)) {
      throw new Error("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
    }

    const sessions = [];
    const conflictingSlotList = [];
    for (let d = parseLocalDate(startDate); d <= parseLocalDate(endDate); d.setDate(d.getDate() + 1)) {
      if (!daysOfWeek.includes(d.getDay())) continue;
      const date = formatLocalDate(d);
      const item = { date, dayOfWeek: WEEKDAY_LABELS[d.getDay()] };
      if (isRangeFree(courtId, date, startTime, endTime)) sessions.push(item);
      else conflictingSlotList.push(item);
    }

    const totalSessions = sessions.length + conflictingSlotList.length;
    if (totalSessions === 0) throw new Error("Khoảng ngày đã chọn không có buổi nào khớp với thứ đã chọn.");

    const pricePerSession = calculatePrice(court, startTime, endTime).total;
    const subtotal = pricePerSession * totalSessions;
    const discountPercent = mockDiscountTiers.find((t) => totalSessions >= t.minSessions)?.percent ?? 0;

    return {
      totalSessions,
      pricePerSession,
      subtotal,
      discountPercent,
      discountAmount: (subtotal * discountPercent) / 100,
      totalPrice: subtotal * (1 - discountPercent / 100),
      sessions,
      conflictingSlotList,
    };
  },

  async createRecurringBooking(payload) {
    const preview = await this.previewRecurringBooking(payload);
    if (preview.conflictingSlotList.length > 0) {
      throw new Error(`Có ${preview.conflictingSlotList.length} buổi bị trùng lịch, vui lòng kiểm tra lại.`);
    }
    preview.sessions.forEach(({ date }) =>
      createdOccupied.push({ courtId: Number(payload.courtId), date, start: payload.startTime, end: payload.endTime }),
    );
    bumpCustomer(payload.customerId);
    return {
      bookingCode: generateCode("RB"),
      ...payload,
      totalSessions: preview.totalSessions,
      totalPrice: preview.totalPrice,
      status: "CONFIRMED",
    };
  },
};

function bumpCustomer(customerId) {
  customers = customers.map((c) =>
    c.userId === customerId
      ? { ...c, totalBookings: c.totalBookings + 1, isFrequent: c.totalBookings + 1 >= 5 }
      : c,
  );
}

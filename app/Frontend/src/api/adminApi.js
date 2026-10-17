import { mockBookings, mockCourts, mockCustomers, mockPriceConfigs, mockRecurringSessions } from "../mocks/apiContract.js";

// Store chỉ nằm trong frontend: dữ liệu giữ khi chuyển menu và reset khi reload.
// Clone để component không sửa trực tiếp dữ liệu gốc hoặc dữ liệu trong store.
let courts = structuredClone(mockCourts);
let priceConfigs = structuredClone(mockPriceConfigs);
const bookingStore = structuredClone(mockBookings);
const sessionStore = structuredClone(mockRecurringSessions);
let nextCourtId = Math.max(0, ...courts.map((court) => court.courtId)) + 1;
let nextPriceId = Math.max(0, ...priceConfigs.map((price) => price.priceConfigId)) + 1;
const courtTypes = ["STANDARD_OUTDOOR", "STANDARD_INDOOR", "VIP_INDOOR"];
const courtStatuses = ["ACTIVE", "MAINTENANCE", "CLOSED"];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
// Khung giá dùng giờ Việt Nam dạng HH:mm và chỉ nhận phút 00 hoặc 30 như form.
const priceTimePattern = /^([01]\d|2[0-3]):(00|30)$/;
const normalizeName = (value) => value.trim().toLocaleLowerCase("vi-VN")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const normalizePhone = (value) => value.replace(/[\s().+-]/g, "");

// Promise và độ trễ giả lập request; UI dùng await/try/catch như API thật.
// Không fetch/axios và không lưu database.
const request = (handler) => new Promise((resolve, reject) => {
  setTimeout(() => {
    try { resolve(structuredClone(handler())); }
    catch (error) { reject(error); }
  }, 150);
});

function findById(items, key, id, label) {
  const item = items.find((entry) => entry[key] === id);
  if (!item) throw new Error(`${label} không tồn tại.`);
  return item;
}

function validateCourt(input) {
  const name = input.name?.trim();
  if (!name) throw new Error("Vui lòng nhập tên sân.");
  if (!courtTypes.includes(input.courtType)) throw new Error("Loại sân không hợp lệ.");
  if (!courtStatuses.includes(input.status)) throw new Error("Trạng thái sân không hợp lệ.");
  return { name, courtType: input.courtType, status: input.status };
}

function getReferencePrice(courtType) {
  const prices = priceConfigs.filter((price) => price.courtType === courtType && !price.isPeakHour);
  return prices.length ? Math.min(...prices.map((price) => price.pricePerHour)) : 0;
}

function validatePrice(input, editingId = null) {
  if (!courtTypes.includes(input.courtType)) throw new Error("Loại sân không hợp lệ.");
  if (!priceTimePattern.test(input.startTime) || !priceTimePattern.test(input.endTime)) {
    throw new Error("Khung giá phải dùng giờ 24 giờ theo mốc 30 phút (ví dụ 06:00, 06:30).");
  }
  if (input.endTime <= input.startTime) {
    throw new Error("Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.");
  }
  if (!Number.isSafeInteger(input.pricePerHour) || input.pricePerHour <= 0 || input.pricePerHour > 9999999999) {
    throw new Error("Giá mỗi giờ phải là số nguyên từ 1 đến 9.999.999.999 đồng.");
  }
  if (typeof input.isPeakHour !== "boolean") throw new Error("Giờ cao điểm phải là true hoặc false.");
  if (priceConfigs.some((price) => price.priceConfigId !== editingId && price.courtType === input.courtType &&
    input.startTime < price.endTime && input.endTime > price.startTime)) {
    throw new Error("Khung giờ bị trùng với một khung giá của loại sân này.");
  }
  return { courtType: input.courtType, startTime: input.startTime, endTime: input.endTime,
    pricePerHour: input.pricePerHour, isPeakHour: input.isPeakHour };
}

function customerBooking(customerId, bookingId) {
  findById(mockCustomers, "id", customerId, "Khách hàng");
  return findById(bookingStore.filter((item) => item.customerId === customerId), "id", bookingId, "Lịch sử đặt sân");
}
function recurringSession(customerId, packageId, sessionId) {
  const group = customerBooking(customerId, packageId);
  if (group.type !== "RECURRING") throw new Error("Đây không phải gói lịch cố định.");
  return { group, session: findById(sessionStore.filter((item) => item.packageId === packageId), "id", sessionId, "Buổi đặt sân") };
}
function bookingDetail(booking) {
  const customer = findById(mockCustomers, "id", booking.customerId, "Khách hàng");
  if (booking.type !== "RECURRING") return { ...booking, customer };
  const sessions = sessionStore.filter((item) => item.packageId === booking.id);
  return { ...booking, customer, sessions, paidSessionCount: sessions.filter((item) => item.paymentStatus === "PAID").length };
}
const playTimestamp = (booking) => Date.parse(`${booking.startDate}T${booking.startTime}:00+07:00`);
// Giờ sân dùng UTC+7; khách hàng chỉ hủy/đổi buổi còn chờ/xác nhận trước giờ chơi ít nhất 2 tiếng.
function requireChangeable(booking) {
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) throw new Error("Trạng thái này không cho phép hủy hoặc đổi lịch.");
  if (playTimestamp(booking) - Date.now() < 2 * 60 * 60 * 1000) throw new Error("Chỉ có thể hủy hoặc đổi lịch trước giờ chơi ít nhất 2 tiếng.");
}
function cancellationReason(value) {
  const reason = value?.trim();
  if (!reason || reason.length > 500) throw new Error("Vui lòng nhập lý do hủy từ 1 đến 500 ký tự.");
  return reason;
}

export const adminApi = {
  getCourts: () => request(() => courts.map((court) => ({
    ...court, referencePrice: getReferencePrice(court.courtType),
  }))),

  createCourt: (input) => {
    const body = structuredClone(input);
    return request(() => {
      const values = validateCourt(body);
      const court = { ...values, courtId: nextCourtId++, referencePrice: getReferencePrice(values.courtType), imageUrl: "", description: "" };
      courts.push(court);
      return court;
    });
  },

  updateCourt: (id, input) => {
    const body = structuredClone(input);
    return request(() => {
      const court = findById(courts, "courtId", id, "Sân");
      const values = validateCourt(body);
      Object.assign(court, values, { referencePrice: getReferencePrice(values.courtType) });
      return court;
    });
  },

  deleteCourt: (id) => request(() => {
    findById(courts, "courtId", id, "Sân");
    courts = courts.filter((court) => court.courtId !== id);
    return { courtId: id };
  }),

  changeCourtStatus: (id, status) => request(() => {
    const court = findById(courts, "courtId", id, "Sân");
    if (!courtStatuses.includes(status)) throw new Error("Trạng thái sân không hợp lệ.");
    court.status = status;
    return court;
  }),

  getPriceConfigs: () => request(() => priceConfigs),

  createPriceConfig: (input) => {
    const body = structuredClone(input);
    return request(() => {
      const price = { ...validatePrice(body), priceConfigId: nextPriceId++ };
      priceConfigs.push(price);
      return price;
    });
  },

  updatePriceConfig: (id, input) => {
    const body = structuredClone(input);
    return request(() => {
      const price = findById(priceConfigs, "priceConfigId", id, "Khung giá");
      Object.assign(price, validatePrice(body, id));
      return price;
    });
  },

  deletePriceConfig: (id) => request(() => {
    findById(priceConfigs, "priceConfigId", id, "Khung giá");
    priceConfigs = priceConfigs.filter((price) => price.priceConfigId !== id);
    return { priceConfigId: id };
  }),

  getCustomers: (filters = {}) => {
    const query = { ...filters };
    return request(() => mockCustomers.filter((customer) =>
      normalizeName(customer.fullName).includes(normalizeName(query.name ?? "")) &&
      normalizePhone(customer.phone).includes(normalizePhone((query.phone ?? "").trim())) &&
      customer.email.toLowerCase().includes((query.email ?? "").trim().toLowerCase())
    ).map((customer) => {
      const bookings = bookingStore.filter((booking) => booking.customerId === customer.id);
      return { ...customer, bookingCount: bookings.length,
        // Cộng khoản đã thanh toán của booking lẻ và từng buổi; không gán thanh toán cho gói.
        totalSpending: bookings.reduce((total, booking) =>
          total + (booking.type === "SINGLE" && booking.paymentStatus === "PAID" ? booking.amount : 0), 0)
          + sessionStore.filter((session) => session.customerId === customer.id && session.paymentStatus === "PAID")
            .reduce((total, session) => total + session.amount, 0) };
    }));
  },

  getCustomerBookings: (id) => request(() => {
    findById(mockCustomers, "id", id, "Khách hàng");
    // Trả cả đặt sân lẻ/lịch cố định; chỉ đặt sân lẻ có trạng thái thanh toán.
    return bookingStore.filter((booking) => booking.customerId === id);
  }),

  getCustomerBookingDetail: (customerId, bookingId) => request(() => {
    return bookingDetail(customerBooking(customerId, bookingId));
  }),

  getCustomerRecurringSessionDetail: (customerId, packageId, sessionId) => request(() => {
    const { session } = recurringSession(customerId, packageId, sessionId);
    return { ...session, customer: findById(mockCustomers, "id", customerId, "Khách hàng") };
  }),

  // Các thao tác này chỉ cập nhật store frontend. Trang sử dụng tự truyền callback vào component.
  cancelCustomerBooking: (customerId, bookingId, input) => {
    const body = structuredClone(input);
    return request(() => {
      const booking = customerBooking(customerId, bookingId);
      if (booking.type !== "SINGLE") throw new Error("Hãy hủy gói hoặc buổi bằng thao tác tương ứng.");
      requireChangeable(booking);
      const reason = cancellationReason(body.reason);
      Object.assign(booking, { status: "CANCELLED", cancellationReason: reason });
      return bookingDetail(booking);
    });
  },

  cancelCustomerRecurringBooking: (customerId, packageId, input) => {
    const body = structuredClone(input);
    return request(() => {
      const group = customerBooking(customerId, packageId);
      if (group.type !== "RECURRING" || group.status !== "ACTIVE") throw new Error("Chỉ hủy được gói đang hoạt động.");
      const remaining = sessionStore.filter((session) => session.packageId === packageId && ["PENDING", "CONFIRMED"].includes(session.status));
      if (!remaining.length) throw new Error("Gói không còn buổi có thể hủy.");
      // Kiểm tra toàn bộ trước khi sửa, tránh hủy nửa gói nếu một buổi không hợp lệ.
      remaining.forEach(requireChangeable);
      const reason = cancellationReason(body.reason);
      remaining.forEach((session) => Object.assign(session, { status: "CANCELLED", cancellationReason: reason }));
      Object.assign(group, { status: "CANCELLED", cancellationReason: reason });
      return bookingDetail(group);
    });
  },

  cancelCustomerRecurringSession: (customerId, packageId, sessionId, input) => {
    const body = structuredClone(input);
    return request(() => {
      const { group, session } = recurringSession(customerId, packageId, sessionId);
      if (group.status !== "ACTIVE") throw new Error("Gói không còn hoạt động.");
      requireChangeable(session);
      Object.assign(session, { status: "CANCELLED", cancellationReason: cancellationReason(body.reason) });
      const siblings = sessionStore.filter((item) => item.packageId === packageId);
      if (siblings.every((item) => ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.status))) {
        Object.assign(group, { status: "CANCELLED", cancellationReason: session.cancellationReason });
      }
      return { session: { ...session, customer: findById(mockCustomers, "id", customerId, "Khách hàng") }, package: bookingDetail(group) };
    });
  },

  rescheduleCustomerRecurringSession: (customerId, packageId, sessionId, input) => {
    const body = structuredClone(input);
    return request(() => {
      const { group, session } = recurringSession(customerId, packageId, sessionId);
      if (group.status !== "ACTIVE") throw new Error("Gói không còn hoạt động.");
      requireChangeable(session);
      const day = body.startDate;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(`${day}T00:00:00Z`))
        || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) throw new Error("Ngày chơi không hợp lệ.");
      if (day < group.startDate || day > group.endDate) throw new Error("Ngày đổi phải nằm trong thời gian áp dụng của gói.");
      if (!timePattern.test(body.startTime) || !timePattern.test(body.endTime) || body.endTime <= body.startTime) throw new Error("Khung giờ không hợp lệ.");
      const next = { ...session, startDate: day, startTime: body.startTime, endTime: body.endTime };
      requireChangeable(next);
      const occupied = [...bookingStore.filter((item) => item.type === "SINGLE"), ...sessionStore];
      if (occupied.some((item) => item !== session && item.courtId === session.courtId && item.startDate === day
        && !["CANCELLED", "NO_SHOW"].includes(item.status) && next.startTime < item.endTime && next.endTime > item.startTime)) {
        throw new Error("Sân đã có booking trùng khung giờ này.");
      }
      const minutes = (time) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
      if (minutes(next.endTime) - minutes(next.startTime) !== minutes(session.endTime) - minutes(session.startTime)) {
        throw new Error("Đổi lịch phải giữ nguyên thời lượng buổi.");
      }
      Object.assign(session, { startDate: day, endDate: day, startTime: next.startTime, endTime: next.endTime });
      return { session: { ...session, customer: findById(mockCustomers, "id", customerId, "Khách hàng") }, package: bookingDetail(group) };
    });
  },
};

import axiosClient from "./axiosClient";
import { mockBookingServices, mockStaffCourts, mockStaffCustomers, mockStaffBookings, mockStaffRecurringBookings, mockStaffRecurringSessions, mockStaffRecurringSessionLinks } from "../mocks/apiContract.js";

export const staffBookingStatuses = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "CHECKED_IN", label: "Đã nhận sân" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "NO_SHOW", label: "No-show" },
];
export const staffRecurringStatuses = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];
export const staffBookingTypes = [{ value: "ALL", label: "Tất cả" }, { value: "SINGLE", label: "Đặt sân lẻ" }, { value: "RECURRING", label: "Lịch cố định" }];
export const bookingStatusLabel = (status) => [...staffBookingStatuses, ...staffRecurringStatuses].find((item) => item.value === status)?.label ?? status;
// Kết toán theo buổi: chỉ có sau khi nhân viên xác nhận (tiền sân đã thanh toán).
// SETTLED = Đã kết toán, PAID (chưa hủy) = Chưa kết toán, còn lại = null (hiển thị "–").
export const settlementStatus = (booking) => {
  if (booking.paymentStatus === "SETTLED") return "SETTLED";
  if (booking.paymentStatus === "PAID" && booking.status !== "CANCELLED") return "UNSETTLED";
  return null;
};
export const settlementLabel = (value) => ({ SETTLED: "Đã kết toán", UNSETTLED: "Chưa kết toán" }[value] ?? "–");
export const formatBookingMoney = (amount) => `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
export const formatBookingDate = (date) => date.split("-").reverse().join("/");
export const formatBookingDays = (days) => days.map((day) => day === 7 ? "CN" : `T${day + 1}`).join(", ");

// Mock DTO theo bản SE214_API Contract: resource/mảng trả thẳng, không có envelope.
// bookingContractApi là ranh giới API; bookingApi.getStaff* chuyển DTO thành model của UI.
// Không gọi mạng từ các hàm mock. Hàm create cuối file tiếp tục dùng backend thật.
const staffBookingStore = structuredClone([...mockStaffBookings, ...mockStaffRecurringSessions]);
const staffRecurringStore = structuredClone(mockStaffRecurringBookings);
const sessionLinks = structuredClone(mockStaffRecurringSessionLinks);
const staffNames = new Map(staffBookingStore.map((booking) => [booking.bookingId, "Đoàn Thị B"]));
const staffRequest = (handler) => new Promise((resolve, reject) => {
  setTimeout(() => {
    try { resolve(structuredClone(handler())); }
    catch (error) { reject(error); }
  }, 120);
});
const normalize = (value = "") => value.trim().toLocaleLowerCase("vi-VN")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const normalizePhone = (value = "") => value.replace(/[\s().+-]/g, "");
const nextStatuses = { PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["CHECKED_IN", "NO_SHOW", "CANCELLED"], CHECKED_IN: ["COMPLETED"] };
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const resource = (status, body) => ({ status, body });
const validId = (id) => /^\d+$/.test(String(id)) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
const sessionLink = (id) => sessionLinks.find((item) => item.bookingId === Number(id));
function staffBooking(id) {
  const booking = validId(id) && staffBookingStore.find((item) => item.bookingId === Number(id));
  if (!booking) fail(404, "BOOKING_NOT_FOUND", "Không tìm thấy booking. Vui lòng quay lại danh sách.");
  return booking;
}
function recurringBooking(id) {
  const group = staffRecurringStore.find((item) => item.id === Number(id));
  if (!group) fail(404, "MOCK_PACKAGE_NOT_FOUND", "Không tìm thấy gói lịch cố định.");
  return group;
}
function packageSessions(id) {
  return staffBookingStore.filter((booking) => sessionLink(booking.bookingId)?.packageId === id);
}
function requireActivePackage(booking) {
  const link = sessionLink(booking.bookingId);
  if (link && recurringBooking(link.packageId).status !== "ACTIVE") {
    fail(409, "BOOKING_INVALID_STATUS", "Gói lịch cố định không còn hoạt động.");
  }
}
function updatePackageStatus(booking) {
  const link = sessionLink(booking.bookingId);
  if (!link) return;
  const group = recurringBooking(link.packageId);
  const sessions = packageSessions(group.id);
  if (group.status === "ACTIVE" && sessions.every((item) => ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(item.bookingStatus))) {
    group.status = sessions.every((item) => item.bookingStatus === "CANCELLED") ? "CANCELLED" : "COMPLETED";
    if (group.status === "CANCELLED") group.cancellationReason = booking.cancelReason;
  }
}
function requireEditableServices(booking) {
  requireActivePackage(booking);
  if (booking.paymentStatus === "SETTLED" || ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.bookingStatus)) {
    fail(409, "BOOKING_INVALID_STATUS", "Không thể sửa dịch vụ sau khi thu tiền hoặc booking đã kết thúc.");
  }
}
function recalculate(booking) {
  booking.servicePrice = booking.services.reduce((total, item) => total + item.subtotal, 0);
  booking.totalAmount = booking.courtPrice + booking.servicePrice;
}
function bookingSummary(booking) {
  return {
    bookingId: booking.bookingId, bookingCode: booking.bookingCode, customerName: booking.customer.fullName,
    courtName: booking.courtName, bookingDate: booking.bookingDate, startTime: booking.startTime, endTime: booking.endTime,
    totalAmount: booking.totalAmount, bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus,
  };
}

// Đây là metadata HTTP của transport mock, không phải JSON envelope.
// Các API chưa có trong file (thu tiền, xóa dịch vụ, gói cố định) không được khai báo endpoint giả.
export const mockBookingContractRequest = ({ method, path, query = {}, body = null }) => {
  const requestBody = structuredClone(body);
  const params = { ...query };
  return staffRequest(() => {
    if (method === "GET" && path === "/api/v1/courts") {
      return resource(200, mockStaffCourts.filter((court) => !params.status || court.status === params.status));
    }
    if (method === "GET" && path === "/api/v1/services") return resource(200, mockBookingServices);
    if (method === "GET" && path === "/api/v1/bookings") {
      let items = staffBookingStore.filter((booking) => (!params.status || booking.bookingStatus === params.status)
        && (!params.courtId || booking.courtId === Number(params.courtId)) && (!params.date || booking.bookingDate === params.date));
      if (params.page !== undefined || params.size !== undefined) {
        const page = Number(params.page ?? 0);
        const size = Number(params.size ?? 20);
        if (!Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(size) || size < 1) {
          fail(400, "VALIDATION_ERROR", "Tham số phân trang không hợp lệ.");
        }
        items = items.slice(page * size, (page + 1) * size);
      }
      return resource(200, items.map(bookingSummary));
    }
    const match = path.match(/^\/api\/v1\/bookings\/(\d+)(?:\/(confirm|cancel|check-in|no-show|complete|services))?$/);
    if (!match) fail(501, "MOCK_ENDPOINT_NOT_IMPLEMENTED", "Endpoint này chưa được mock cho panel nhân viên.");
    const booking = staffBooking(match[1]);
    const action = match[2];
    if (method === "GET" && !action) return resource(200, booking);
    if (method === "POST" && action === "services") {
      requireEditableServices(booking);
      const service = mockBookingServices.find((item) => item.serviceId === requestBody?.serviceId && item.status === "ACTIVE");
      if (!service) fail(400, "VALIDATION_ERROR", "Vui lòng chọn dịch vụ hợp lệ.");
      const quantity = requestBody?.quantity;
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) fail(400, "VALIDATION_ERROR", "Số lượng phải là số nguyên từ 1 đến 99.");
      const existing = booking.services.find((item) => item.serviceId === service.serviceId);
      if (existing) {
        if (existing.quantity + quantity > 99) fail(400, "VALIDATION_ERROR", "Tổng số lượng một dịch vụ không vượt quá 99.");
        existing.quantity += quantity;
        existing.subtotal = existing.quantity * existing.priceAtBooking;
      } else booking.services.push({
        serviceId: service.serviceId, name: service.name, quantity, priceAtBooking: service.unitPrice, subtotal: quantity * service.unitPrice,
      });
      recalculate(booking);
      return resource(201, { bookingId: booking.bookingId, servicePrice: booking.servicePrice, totalAmount: booking.totalAmount, services: booking.services });
    }
    if (method === "PATCH" && action && action !== "services") {
      requireActivePackage(booking);
      const target = { confirm: "CONFIRMED", cancel: "CANCELLED", "check-in": "CHECKED_IN", "no-show": "NO_SHOW", complete: "COMPLETED" }[action];
      if (action !== "cancel" && requestBody !== null) fail(400, "VALIDATION_ERROR", "Thao tác này không có request body.");
      if (!nextStatuses[booking.bookingStatus]?.includes(target)) fail(409, "BOOKING_INVALID_STATUS", "Không thể chuyển sang trạng thái này.");
      if (action === "confirm") {
        if (booking.expireAt && Date.parse(booking.expireAt) <= Date.now()) fail(409, "BOOKING_EXPIRED", "Booking đã hết hạn giữ chỗ.");
        if (staffBookingStore.some((item) => item !== booking && item.courtId === booking.courtId && item.bookingDate === booking.bookingDate
          && !["CANCELLED", "NO_SHOW"].includes(item.bookingStatus) && booking.startTime < item.endTime && booking.endTime > item.startTime)) {
          fail(409, "BOOKING_CONFLICT", "Khung giờ đã có booking khác.");
        }
      }
      if (action === "cancel") {
        if (booking.paymentStatus === "PAID") fail(409, "BOOKING_ALREADY_PAID", "Booking đã thu tiền cần được xử lý hoàn tiền trước khi hủy.");
        const reason = requestBody?.reason?.trim();
        if (!reason || reason.length > 500) fail(400, "VALIDATION_ERROR", "Vui lòng nhập lý do hủy từ 1 đến 500 ký tự.");
        booking.cancelReason = reason;
        booking.cancelledAt = new Date().toISOString();
      }
      if (action === "complete" && booking.paymentStatus !== "SETTLED") fail(409, "BOOKING_INVALID_STATUS", "Vui lòng xác nhận thu đủ tiền trước khi hoàn thành.");
      booking.bookingStatus = target;
      if (["CONFIRMED", "CANCELLED"].includes(target)) booking.expireAt = null;
      updatePackageStatus(booking);
      return resource(200, booking);
    }
    fail(501, "MOCK_ENDPOINT_NOT_IMPLEMENTED", "Endpoint này chưa được mock cho panel nhân viên.");
  });
};
const contractData = async (method, path, body = null, query = {}) =>
  (await mockBookingContractRequest({ method, path, body, query })).body;
export const bookingContractApi = {
  getBookings: (query = {}) => contractData("GET", "/api/v1/bookings", null, query),
  getBooking: (id) => contractData("GET", `/api/v1/bookings/${id}`),
  getCourts: (query = {}) => contractData("GET", "/api/v1/courts", null, query),
  getServices: () => contractData("GET", "/api/v1/services"),
  confirm: (id) => contractData("PATCH", `/api/v1/bookings/${id}/confirm`),
  cancel: (id, body) => contractData("PATCH", `/api/v1/bookings/${id}/cancel`, body),
  checkIn: (id) => contractData("PATCH", `/api/v1/bookings/${id}/check-in`),
  noShow: (id) => contractData("PATCH", `/api/v1/bookings/${id}/no-show`),
  complete: (id) => contractData("PATCH", `/api/v1/bookings/${id}/complete`),
  addService: (id, body) => contractData("POST", `/api/v1/bookings/${id}/services`, body),
};

// Chỉ adapter UI dùng alias id/code/startDate/courtFee. Response API phía trên giữ nguyên DTO contract.
function toStaffBooking(booking) {
  const customer = mockStaffCustomers.find((item) => item.userId === booking.customer.userId);
  const link = sessionLink(booking.bookingId);
  return {
    id: booking.bookingId, code: booking.bookingCode, type: link ? "SESSION" : "SINGLE",
    customer: { id: booking.customer.userId, fullName: booking.customer.fullName, phone: booking.customer.phoneNumber, email: customer?.email ?? "" },
    courtId: booking.courtId, courtName: booking.courtName, courtType: booking.courtType,
    startDate: booking.bookingDate, endDate: booking.bookingDate, startTime: booking.startTime, endTime: booking.endTime,
    status: booking.bookingStatus, paymentStatus: booking.paymentStatus,
    courtFee: link?.originalCourtPrice ?? booking.courtPrice, serviceFee: booking.servicePrice, amount: booking.totalAmount,
    services: booking.services.map((service) => ({ ...service, unitPrice: service.priceAtBooking })),
    cancellationReason: booking.cancelReason, cancelledAt: booking.cancelledAt, expireAt: booking.expireAt, createdAt: booking.createdAt,
    staffName: staffNames.get(booking.bookingId), paymentMethod: booking.paymentMethod, paidAt: booking.paidAt, paidBy: booking.paidBy,
    ...(link ? { packageId: `recurring-${link.packageId}`, packageCode: link.packageCode,
      packageStatus: recurringBooking(link.packageId).status, discountPercent: link.discountPercent, discountAmount: link.discountAmount } : {}),
  };
}
// ===== Booking lẻ thật từ backend (/api/v1/staff/bookings) =====
const hhmm = (value) => (value ? String(value).slice(0, 5) : "");
// Mã phương thức thanh toán lưu trong DB -> nhãn tiếng Việt
export const paymentMethodLabel = (method) => ({ CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản" }[method] ?? method);
const staffApiError = (err, fallback) => new Error(
  err.response?.data?.message
  || (typeof err.response?.data === "string" ? err.response.data : "")
  || fallback,
  { cause: err },
);
function realToStaffBooking(booking) {
  const packageId = booking.recurringBookingId;
  return {
    id: booking.bookingId, code: booking.bookingCode, type: packageId ? "SESSION" : "SINGLE", isReal: true,
    // Buổi thuộc gói lịch cố định: tiền sân đã trừ ưu đãi, xác nhận / hủy ở trang gói
    ...(packageId ? { packageId: `recurring-${packageId}`, packageCode: `#${packageId}`,
      packageStatus: booking.packageStatus, discountPercent: Number(booking.discountPercent ?? 0), discountAmount: 0 } : {}),
    customer: { id: booking.customer?.userId, fullName: booking.customer?.fullName ?? "",
      phone: booking.customer?.phoneNumber ?? "", email: booking.customer?.email ?? "" },
    courtId: booking.courtId, courtName: booking.courtName, courtType: booking.courtType,
    startDate: booking.bookingDate, endDate: booking.bookingDate,
    startTime: hhmm(booking.startTime), endTime: hhmm(booking.endTime),
    status: booking.bookingStatus, paymentStatus: booking.paymentStatus,
    paymentMethodCode: booking.paymentMethod,
    courtFee: Number(booking.courtPrice ?? 0), serviceFee: Number(booking.servicePrice ?? 0), amount: Number(booking.totalAmount ?? 0),
    // Dịch vụ đi kèm chưa có API, giữ danh sách rỗng
    services: [],
    cancellationReason: booking.cancelReason, cancelledAt: booking.cancelledAt, expireAt: booking.expireAt, createdAt: booking.createdAt,
    staffName: booking.paidBy || booking.createdByStaffName || "–",
    paymentMethod: paymentMethodLabel(booking.paymentMethod), paidAt: booking.paidAt, paidBy: booking.paidBy,
  };
}
// Thứ trong tuần backend (MON..SUN) -> số dùng ở UI (1 = Thứ 2 ... 7 = Chủ nhật)
const DAY_NUMBERS = { MON: 1, TUE: 2, WES: 3, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 };
export const toDayNumbers = (days = []) => days.map((day) => DAY_NUMBERS[day] ?? day);
// Gói lịch cố định thật từ backend -> model UI
export function realToPackage(pkg) {
  const sessions = (pkg.sessions ?? []).map((session) => ({
    id: session.bookingId, code: session.bookingCode, type: "SESSION",
    startDate: session.bookingDate, endDate: session.bookingDate,
    startTime: hhmm(session.startTime), endTime: hhmm(session.endTime),
    status: session.bookingStatus, paymentStatus: session.paymentStatus,
    courtFee: Number(session.courtPrice ?? 0), serviceFee: Number(session.servicePrice ?? 0), amount: Number(session.totalAmount ?? 0),
  }));
  return {
    id: `recurring-${pkg.recurringBookingId}`, packageId: pkg.recurringBookingId, code: pkg.code, type: "RECURRING", isReal: true,
    customer: { id: pkg.customer?.userId, fullName: pkg.customer?.fullName ?? "",
      phone: pkg.customer?.phoneNumber ?? "", email: pkg.customer?.email ?? "" },
    courtId: pkg.courtId, courtName: pkg.courtName, courtType: pkg.courtType,
    courtImageUrl: pkg.courtImageUrl, courtDescription: pkg.courtDescription,
    startDate: pkg.startDate, endDate: pkg.endDate, startTime: hhmm(pkg.startTime), endTime: hhmm(pkg.endTime),
    daysOfWeek: toDayNumbers(pkg.daysOfWeek),
    status: pkg.status, paymentStatus: pkg.paymentStatus,
    paymentMethod: paymentMethodLabel(pkg.paymentMethod), paidAt: pkg.paidAt, paidBy: pkg.paidByStaffName,
    staffName: pkg.paidByStaffName || "–", expireAt: pkg.expireAt,
    amount: Number(pkg.totalAmount ?? 0), discountPercent: Number(pkg.discountPercent ?? 0),
    sessionCount: pkg.sessionCount, completedSessionCount: pkg.completedSessionCount,
    settledSessionCount: pkg.settledSessionCount, paidSessionCount: pkg.settledSessionCount,
    cancellationReason: pkg.cancelReason, cancelledAt: pkg.cancelledAt, createdAt: pkg.createdAt,
    sessions,
  };
}
export const staffRecurringRealApi = {
  getAll: async () => {
    try { return (await axiosClient.get("/api/v1/staff/recurring-bookings")).data; }
    catch (err) { throw staffApiError(err, "Không tải được danh sách lịch cố định"); }
  },
  get: async (id) => {
    try { return (await axiosClient.get(`/api/v1/staff/recurring-bookings/${id}`)).data; }
    catch (err) { throw staffApiError(err, "Không tìm thấy gói lịch cố định."); }
  },
  confirm: async (id) => {
    try { return (await axiosClient.patch(`/api/v1/staff/recurring-bookings/${id}/confirm`)).data; }
    catch (err) { throw staffApiError(err, "Không thể xác nhận gói"); }
  },
  cancel: async (id, reason) => {
    try { return (await axiosClient.patch(`/api/v1/staff/recurring-bookings/${id}/cancel`, { reason })).data; }
    catch (err) { throw staffApiError(err, "Không thể hủy gói"); }
  },
};
export const staffBookingRealApi = {
  getBookings: async () => {
    try { return (await axiosClient.get("/api/v1/staff/bookings")).data; }
    catch (err) { throw staffApiError(err, "Không tải được danh sách booking"); }
  },
  getBooking: async (id) => {
    try { return (await axiosClient.get(`/api/v1/staff/bookings/${id}`)).data; }
    catch (err) { throw staffApiError(err, "Không tìm thấy booking. Vui lòng quay lại danh sách."); }
  },
  confirm: async (id) => {
    try { return (await axiosClient.patch(`/api/v1/staff/bookings/${id}/confirm`)).data; }
    catch (err) { throw staffApiError(err, "Không thể xác nhận booking"); }
  },
  checkIn: async (id) => {
    try { return (await axiosClient.patch(`/api/v1/staff/bookings/${id}/check-in`)).data; }
    catch (err) { throw staffApiError(err, "Không thể check-in booking"); }
  },
  // Xác nhận thu đủ tiền (kết toán)
  settle: async (id) => {
    try { return (await axiosClient.patch(`/api/v1/staff/bookings/${id}/settle`)).data; }
    catch (err) { throw staffApiError(err, "Không thể xác nhận thu tiền"); }
  },
  complete: async (id) => {
    try { return (await axiosClient.patch(`/api/v1/staff/bookings/${id}/complete`)).data; }
    catch (err) { throw staffApiError(err, "Không thể hoàn thành booking"); }
  },
  noShow: async (id) => {
    try { return (await axiosClient.patch(`/api/v1/staff/bookings/${id}/no-show`)).data; }
    catch (err) { throw staffApiError(err, "Không thể đánh dấu bùng lịch"); }
  },
};

// Thêm API xem trước lịch đặt cố định (Preview & Check conflict) //BaoDen Them
export const previewRecurringBookingApi = async (payload) => { //BaoDen Them
  const response = await axiosClient.post("/api/recurring-bookings/preview", payload); //BaoDen Them
  return response.data; //BaoDen Them
}; //BaoDen Them

// Thêm API tạo đơn đặt lịch cố định //BaoDen Them
export const createRecurringBookingApi = async (payload) => { //BaoDen Them
  const response = await axiosClient.post("/api/recurring-bookings", payload); //BaoDen Them
  return response.data; //BaoDen Them
}; //BaoDen Them

export const bookingApi = {
  getStaffBookings: async (filters = {}) => {
    const query = { ...filters, courtIds: (filters.courtIds ?? (filters.courtId ? [filters.courtId] : [])).map(String) };
    if (query.fromDate && query.toDate && query.fromDate > query.toDate) throw new Error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
    // Contract danh sách không có phone/email hay liên kết gói. Ghép detail/catalog ở adapter, không giả thêm query params.
    // Booking lẻ và gói lịch cố định: dữ liệu thật từ backend
    const [singles, packages] = await Promise.all([staffBookingRealApi.getBookings(), staffRecurringRealApi.getAll()]);
    const items = [...singles.map(realToStaffBooking), ...packages.map(realToPackage)];
    return items.filter((booking) => normalize(booking.customer.fullName).includes(normalize(query.name))
      && normalizePhone(booking.customer.phone).includes(normalizePhone(query.phone))
      && normalize(booking.customer.email).includes(normalize(query.email))
      && (!query.courtIds.length || query.courtIds.includes(String(booking.courtId)))
      && (!query.fromDate || booking.endDate >= query.fromDate) && (!query.toDate || booking.startDate <= query.toDate)
      && (!query.paymentStatus || (booking.type === "SINGLE" && booking.paymentStatus === query.paymentStatus)));
  },
  getStaffBookingDetail: async (id) => {
    const groupId = String(id).match(/^recurring-(\d+)$/)?.[1];
    if (groupId) return realToPackage(await staffRecurringRealApi.get(groupId));
    // Booking lẻ và buổi thuộc gói đều lấy từ backend
    return realToStaffBooking(await staffBookingRealApi.getBooking(id));
  },
  getStaffBookingOptions: async () => {
    // Sân và gợi ý khách lấy từ backend; danh mục dịch vụ chưa có API nên vẫn dùng mock.
    const [courtsRes, bookings, services] = await Promise.all([
      axiosClient.get("/api/v1/courts").then((res) => res.data).catch(() => []),
      staffBookingRealApi.getBookings().catch(() => []),
      bookingContractApi.getServices(),
    ]);
    const customers = new Map();
    bookings.forEach((booking) => {
      const customer = booking.customer;
      if (customer?.userId && !customers.has(customer.userId)) {
        customers.set(customer.userId, { id: customer.userId, fullName: customer.fullName ?? "", phone: customer.phoneNumber ?? "", email: customer.email ?? "" });
      }
    });
    return { courts: courtsRes.map((court) => ({ ...court, id: court.id })),
      services: services.map((service) => ({ ...service, id: service.serviceId })),
      customers: [...customers.values()],
    };
  },
  updateStaffBookingStatus: async (id, status) => {
    // Booking lẻ và buổi trong gói (backend)
    const realActions = { CONFIRMED: staffBookingRealApi.confirm, CHECKED_IN: staffBookingRealApi.checkIn,
      NO_SHOW: staffBookingRealApi.noShow, COMPLETED: staffBookingRealApi.complete };
    if (realActions[status]) return realToStaffBooking(await realActions[status](id));
    throw new Error("Chức năng này đang được phát triển.");
  },
  addStaffBookingService: async (id, serviceId, quantity) => {
    // POST services chỉ trả phần tiền/dịch vụ; đọc lại detail trước khi cập nhật toàn bộ màn hình.
    await bookingContractApi.addService(id, { serviceId: Number(serviceId), quantity: Number(quantity) });
    return toStaffBooking(await bookingContractApi.getBooking(id));
  },

  // TẠM NGOÀI CONTRACT: bản DOCX chưa có xóa dịch vụ, thu tiền và các API gói cố định.
  // Các hàm này giữ demo UI đang có, không khai báo chúng là endpoint đã được thống nhất.
  removeStaffBookingService: (id, serviceId) => staffRequest(() => {
    const booking = staffBooking(id);
    requireEditableServices(booking);
    booking.services = booking.services.filter((item) => item.serviceId !== Number(serviceId));
    recalculate(booking);
    return toStaffBooking(booking);
  }),
  collectStaffBookingPayment: async (id) => {
    // Kết toán qua backend (booking lẻ và buổi trong gói)
    return realToStaffBooking(await staffBookingRealApi.settle(id));
  },
  cancelStaffRecurringBooking: async (id, input = {}) => {
    const reason = input.reason?.trim();
    if (!reason || reason.length > 500) throw new Error("Vui lòng nhập lý do hủy từ 1 đến 500 ký tự.");
    return realToPackage(await staffRecurringRealApi.cancel(String(id).replace(/^recurring-/, ""), reason));
  },
  // Xác nhận đã nhận tiền sân trọn gói: mọi buổi chuyển Đã xác nhận + Đã thanh toán
  confirmStaffRecurringBooking: async (id) =>
    realToPackage(await staffRecurringRealApi.confirm(String(id).replace(/^recurring-/, ""))),
  create: async (payload) => {
    try {
      const response = await axiosClient.post(
        "/api/v1/bookings",
        payload,
      );

      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.message
        || err.response?.data
        || "Không thể tạo đặt sân";

      throw new Error(message, { cause: err });
    }
  },
  getMyBookingsApi: async () => {
  const response = await axiosClient.get("/api/v1/bookings/me");
  return response.data;
},

  // Gói lịch cố định của khách
  getMyRecurringBookings: async () => (await axiosClient.get("/api/recurring-bookings/me")).data,
  getMyRecurringBookingDetail: async (id) => (await axiosClient.get(`/api/recurring-bookings/${id}`)).data,

  getBookingDetail: async(bookingId) => {
    const response = await axiosClient.get(`/api/v1/bookings/detail/${bookingId}`);
    return response.data;
  }
};

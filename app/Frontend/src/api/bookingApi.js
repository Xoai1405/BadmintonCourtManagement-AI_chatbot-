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
  if (booking.paymentStatus === "PAID" || ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.bookingStatus)) {
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
      if (action === "complete" && booking.paymentStatus !== "PAID") fail(409, "BOOKING_INVALID_STATUS", "Vui lòng xác nhận thu tiền trước khi hoàn thành.");
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
function toStaffPackage(group, includeSessions = false) {
  const sessions = packageSessions(group.id);
  const customer = mockStaffCustomers.find((item) => item.userId === group.customerId);
  return { ...group, id: `recurring-${group.id}`,
    customer: { id: customer.userId, fullName: customer.fullName, phone: customer.phoneNumber, email: customer.email },
    sessionCount: sessions.length, paidSessionCount: sessions.filter((item) => item.paymentStatus === "PAID").length,
    completedSessionCount: sessions.filter((item) => item.bookingStatus === "COMPLETED").length,
    ...(includeSessions ? { sessions: sessions.map(toStaffBooking) } : {}),
  };
}

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
    const summaries = await bookingContractApi.getBookings();
    const singles = await Promise.all(summaries.filter((item) => !sessionLink(item.bookingId)).map((item) => bookingContractApi.getBooking(item.bookingId)));
    const items = [...singles.map(toStaffBooking), ...staffRecurringStore.map((group) => toStaffPackage(group))];
    return items.filter((booking) => normalize(booking.customer.fullName).includes(normalize(query.name))
      && normalizePhone(booking.customer.phone).includes(normalizePhone(query.phone))
      && normalize(booking.customer.email).includes(normalize(query.email))
      && (!query.courtIds.length || query.courtIds.includes(String(booking.courtId)))
      && (!query.fromDate || booking.endDate >= query.fromDate) && (!query.toDate || booking.startDate <= query.toDate)
      && (!query.paymentStatus || (booking.type === "SINGLE" && booking.paymentStatus === query.paymentStatus)));
  },
  getStaffBookingDetail: async (id) => {
    const groupId = String(id).match(/^recurring-(\d+)$/)?.[1];
    if (groupId) return staffRequest(() => toStaffPackage(recurringBooking(groupId), true));
    return toStaffBooking(await bookingContractApi.getBooking(id));
  },
  getStaffBookingOptions: async () => {
    const [courts, services] = await Promise.all([bookingContractApi.getCourts(), bookingContractApi.getServices()]);
    return { courts: courts.map((court) => ({ ...court, id: court.courtId })),
      services: services.map((service) => ({ ...service, id: service.serviceId })),
      customers: mockStaffCustomers.map((customer) => ({ id: customer.userId, fullName: customer.fullName, phone: customer.phoneNumber, email: customer.email })),
    };
  },
  updateStaffBookingStatus: async (id, status, input = {}) => {
    const actions = { CONFIRMED: () => bookingContractApi.confirm(id), CANCELLED: () => bookingContractApi.cancel(id, { reason: input.reason }),
      CHECKED_IN: () => bookingContractApi.checkIn(id), NO_SHOW: () => bookingContractApi.noShow(id), COMPLETED: () => bookingContractApi.complete(id) };
    if (!actions[status]) throw new Error("Không thể chuyển sang trạng thái này.");
    const booking = await actions[status]();
    if (input.staffName) staffNames.set(booking.bookingId, input.staffName);
    return toStaffBooking(booking);
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
  collectStaffBookingPayment: (id, input = {}) => {
    const body = { ...input };
    return staffRequest(() => {
      const booking = staffBooking(id);
      requireActivePackage(booking);
      if (!["CONFIRMED", "CHECKED_IN"].includes(booking.bookingStatus)) throw new Error("Chỉ thu tiền booking đã xác nhận hoặc đã nhận sân.");
      if (booking.paymentStatus === "PAID") throw new Error("Booking đã được thanh toán.");
      if (!["Tiền mặt", "Chuyển khoản"].includes(body.paymentMethod)) throw new Error("Vui lòng chọn phương thức thanh toán.");
      Object.assign(booking, { paymentStatus: "PAID", paymentMethod: body.paymentMethod, paidAt: new Date().toISOString(),
        paidBy: body.staffName || staffNames.get(booking.bookingId) });
      return toStaffBooking(booking);
    });
  },
  cancelStaffRecurringBooking: (id, input = {}) => {
    const body = { ...input };
    return staffRequest(() => {
      const group = recurringBooking(String(id).replace(/^recurring-/, ""));
      if (group.status !== "ACTIVE") throw new Error("Chỉ hủy được gói đang hoạt động.");
      const sessions = packageSessions(group.id);
      const remaining = sessions.filter((item) => ["PENDING", "CONFIRMED"].includes(item.bookingStatus));
      if (!remaining.length) throw new Error("Gói không còn buổi có thể hủy.");
      if (sessions.some((item) => item.bookingStatus === "CHECKED_IN")) throw new Error("Cần xử lý buổi đang nhận sân trước khi hủy gói.");
      if (remaining.some((item) => item.paymentStatus === "PAID")) throw new Error("Cần xử lý hoàn tiền các buổi đã thu trước khi hủy gói.");
      const reason = body.reason?.trim();
      if (!reason || reason.length > 500) throw new Error("Vui lòng nhập lý do hủy từ 1 đến 500 ký tự.");
      remaining.forEach((item) => {
        Object.assign(item, { bookingStatus: "CANCELLED", cancelReason: reason, cancelledAt: new Date().toISOString(), expireAt: null });
        if (body.staffName) staffNames.set(item.bookingId, body.staffName);
      });
      Object.assign(group, { status: "CANCELLED", cancellationReason: reason });
      return toStaffPackage(group, true);
    });
  },
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
}
};

import axiosClient from "./axiosClient";
import { mockBookings, mockCustomers, mockRecurringSessions } from "../mocks/apiContract.js";

// Store chỉ nằm trong frontend: dữ liệu giữ khi chuyển menu và reset khi reload.
// Clone để component không sửa trực tiếp dữ liệu gốc hoặc dữ liệu trong store.
const bookingStore = structuredClone(mockBookings);
const sessionStore = structuredClone(mockRecurringSessions);
// const discountConfigStore = structuredClone(mockDiscountConfigs);
// let nextDiscountConfigId = Math.max(0, ...discountConfigStore.map((item) => item.id)) + 1;
// const staffAccountStore = [
//   { id: 1, fullName: "Lê Thị C", phone: "0909 123 456", email: "c.le@email.com", status: "ACTIVE" },
//   { id: 2, fullName: "Phạm Văn D", phone: "0909 456 789", email: "PVD42@email.com", status: "LOCKED" },
// ];
// let nextStaffAccountId = Math.max(0, ...staffAccountStore.map((item) => item.id)) + 1;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
// const normalizeName = (value) => value.trim().toLocaleLowerCase("vi-VN")
//   .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
// const normalizePhone = (value) => value.replace(/[\s().+-]/g, "");

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
  getStaffAccounts: async () => {
    const response = await axiosClient.get("/api/admin/staffs");
    return response.data;
  },

  createStaffAccount: async (payload) => {
    try {
      const response = await axiosClient.post("/api/admin/staffs", payload);
      return response.data;
    } catch (err) {
      const data = err.response?.data;
      const message = (typeof data === "string" ? data : data?.message) || "Không thể tạo tài khoản nhân viên";
      throw new Error(message, { cause: err });
    }
  },

  updateStaffAccount: async (id, payload) => {
    try {
      const response = await axiosClient.put(`/api/admin/staffs/${id}`, payload);
      return response.data;
    } catch (err) {
      const data = err.response?.data;
      const message = (typeof data === "string" ? data : data?.message) || "Không thể cập nhật tài khoản nhân viên";
      throw new Error(message, { cause: err });
    }
  },

  deleteStaffAccount: async (id) => {
    try {
      await axiosClient.delete(`/api/admin/staffs/${id}`);
    } catch (err) {
      const data = err.response?.data;
      const message = (typeof data === "string" ? data : data?.message) || "Không thể xóa tài khoản nhân viên";
      throw new Error(message, { cause: err });
    }
  },

  setStaffAccountStatus: async (id, status) => {
    try {
      const response = await axiosClient.patch(`/api/admin/staffs/${id}/status`, { status });
      return response.data;
    } catch (err) {
      const data = err.response?.data;
      const message = (typeof data === "string" ? data : data?.message) || "Không thể đổi trạng thái tài khoản";
      throw new Error(message, { cause: err });
    }
  },

  getCustomers: async (filters = {}) => {
    const params = {};
    if (filters.name?.trim()) params.name = filters.name.trim();
    if (filters.phone?.trim()) params.phone = filters.phone.trim();
    if (filters.email?.trim()) params.email = filters.email.trim();

    const response = await axiosClient.get("/api/admin/customers", { params });
    return response.data;
  },

  getCustomerBookings: async (id) => {
    try {
      const response = await axiosClient.get(`/api/admin/customers/${id}/bookings`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  getCustomerBookingDetail: async (customerId, bookingId) => {
    try {
      const response = await axiosClient.get(`/api/admin/customers/bookings/${bookingId}/detail`);
      return response.data;
    } catch {
      return null;
    }
  },

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

  getDiscountConfigs: async () => {
    const response = await axiosClient.get("/api/admin/discount_configs");
    return response.data;
  },

  createDiscountConfig: async (payload) => {
    try {
      const response = await axiosClient.post("/api/admin/discount_configs", payload);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || "Không thể tạo mức chiết khấu";
      throw new Error(message, { cause: err });
    }
  },

  updateDiscountConfig: async (id, payload) => {
    try {
      const response = await axiosClient.put(`/api/admin/discount_configs/${id}`, payload);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || "Không thể cập nhật mức chiết khấu";
      throw new Error(message, { cause: err });
    }
  },

  deleteDiscountConfig: async (id) => {
    try {
      await axiosClient.delete(`/api/admin/discount_configs/${id}`);
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || "Không thể xóa mức chiết khấu";
      throw new Error(message, { cause: err });
    }
  },
};

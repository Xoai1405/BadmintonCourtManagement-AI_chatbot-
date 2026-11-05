import axiosClient from "./axiosClient";

// API cho màn hình "Tạo booking tại quầy" (StaffBookingCreate).
// Tách file riêng để không đụng bookingApi.js dùng chung.

const getErrorMessage = (err, fallback) => {
  const data = err.response?.data;
  if (typeof data === "string" && data) return data; // 404 trả về chuỗi thuần
  return data?.message || data?.error || fallback;
};

const request = async (operation, fallback) => {
  try {
    const response = await operation();
    return response.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, fallback), { cause: err });
  }
};

// Thứ trong tuần: số theo Date.getDay() (0 = CN) <-> enum DayOfWeek của backend (lưu ý WES = Thứ 4)
export const DAY_NUMBER_TO_ENUM = { 1: "MON", 2: "TUE", 3: "WES", 4: "THU", 5: "FRI", 6: "SAT", 0: "SUN" };

// "09:00" | "09:00:00" -> "09:00"
export const toHHMM = (time) => (time ? String(time).slice(0, 5) : "");
// "09:00" -> "09:00:00"
export const toApiTime = (time) => (time && time.length === 5 ? `${time}:00` : time);

export const staffBookingCreateApi = {
  // GET /api/v1/staff/customers?name=&phone=&email=
  searchCustomers: ({ name = "", phone = "", email = "" } = {}) => request(
    () => axiosClient.get("/api/v1/staff/customers", { params: { name, phone, email } }),
    "Không tìm được danh sách khách hàng",
  ),

  // POST /api/v1/staff/bookings
  createSingleBooking: (payload) => request(
    () => axiosClient.post("/api/v1/staff/bookings", payload),
    "Tạo booking thất bại, vui lòng thử lại",
  ),

  // POST /api/recurring-bookings/preview (API có sẵn, dùng chung với luồng khách)
  previewRecurringBooking: (payload) => request(
    () => axiosClient.post("/api/recurring-bookings/preview", payload),
    "Có lỗi khi kiểm tra lịch",
  ),

  // POST /api/v1/staff/recurring-bookings
  createRecurringBooking: (payload) => request(
    () => axiosClient.post("/api/v1/staff/recurring-bookings", payload),
    "Tạo booking gói thất bại, vui lòng thử lại",
  ),
};

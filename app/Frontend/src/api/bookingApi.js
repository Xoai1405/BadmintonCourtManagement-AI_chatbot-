import axiosClient from "./axiosClient";

export const bookingApi = {
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
};
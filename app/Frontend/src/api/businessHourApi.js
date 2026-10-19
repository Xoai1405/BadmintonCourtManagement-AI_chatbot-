import axiosClient from "./axiosClient";

export const businessHourApi = {
  get: async () => {
    const response = await axiosClient.get("/api/v1/business-hour-configs");
    return response.data;
  },

  update: async (payload) => {
     try {
      const response = await axiosClient.patch(
        "/api/v1/business-hour-configs",
        payload
      );

      return response.data;
    }
catch (err) {
      const message =
        err.response?.data?.message
        || err.response?.data
        || "Không thể cập nhật khung giờ mở cửa";

      throw new Error(message, { cause: err });
    }
  }
};

import axiosClient from "./axiosClient";
export const priceConfigApi = {
  getAll: async () => {
    const response = await axiosClient.get("/api/v1/price-configs");
    return response.data;
  },

  update:async (payload) => {
     try {
      const response = await axiosClient.patch(
        "/api/v1/price-configs",
        payload
      );

      return response.data;
    }
catch (err) {
      const message =
        err.response?.data?.message
        || err.response?.data
        || "Không thể cập nhật giá loại sân";

      throw new Error(message, { cause: err });
    }
  }
  
};

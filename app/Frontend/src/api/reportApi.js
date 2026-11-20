import axiosClient from "./axiosClient";

export const reportApi = {
  async getReport(startDate, endDate, signal) {
    try {
      const response = await axiosClient.get("/api/v1/reports", {
        params: { startDate, endDate }, signal,
      });
      return response.data;
    } catch (error) {
      if (error.code === "ERR_CANCELED") throw error;
      throw new Error(
        error.response?.data?.message
          || (typeof error.response?.data === "string" ? error.response.data : "")
          || "Không tải được báo cáo.",
        { cause: error },
      );
    }
  },
};

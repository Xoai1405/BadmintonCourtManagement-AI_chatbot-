import axiosClient from "./axiosClient";

const getErrorMessage = (err, fallback) => (
  err.response?.data?.message || err.response?.data?.error || fallback
);

const request = async (operation, fallback) => {
  try {
    const response = await operation();
    return response.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, fallback), { cause: err });
  }
};

export const courtApi = {
  getAllCourt: () => request(
    () => axiosClient.get("/api/v1/courts"),
    "Không lấy được dữ liệu danh sách sân",
  ),

  // Backend currently accepts the ID as a query parameter: /courts/id?id={id}.
  getCourt: (id) => request(
    () => axiosClient.get("/api/v1/courts/id", { params: { id } }),
    "Không lấy được dữ liệu sân",
  ),

  createCourt: (payload) => request(
    () => axiosClient.post("/api/v1/courts", payload),
    "Không tạo được sân",
  ),

  // UpdateCourtRequest requires courtId in the JSON body.
  updateCourt: (id, payload) => request(
    () => axiosClient.patch("/api/v1/courts/id", { courtId: id, ...payload }),
    "Không cập nhật được sân",
  ),

  getAvailability: (courtId, date) => request(
    () => axiosClient.get(`/api/v1/courts/${courtId}/availability`, { params: { date } }),
    "Không lấy được lịch trống của sân",
  ),
};

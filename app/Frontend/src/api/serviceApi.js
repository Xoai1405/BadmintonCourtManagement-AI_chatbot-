import axiosClient from "./axiosClient";

const serviceError = (error, fallback) => new Error(
  error.response?.data?.message
  || (typeof error.response?.data === "string" ? error.response.data : "")
  || error.message
  || fallback,
  { cause: error },
);

const request = async (operation, fallback) => {
  try {
    return (await operation()).data;
  } catch (error) {
    throw serviceError(error, fallback);
  }
};

export const serviceApi = {
  getAllServices: () => request(() => axiosClient.get("/api/v1/services"), "Không tải được danh sách dịch vụ."),
  createService: (payload) => request(() => axiosClient.post("/api/v1/services", payload), "Không thể thêm dịch vụ."),
  updateService: (id, payload) => request(() => axiosClient.put(`/api/v1/services/${id}`, payload), "Không thể sửa dịch vụ."),
  setServiceStatus: (id, status) => request(() => axiosClient.patch(`/api/v1/services/${id}/status`, { status }), "Không thể đổi trạng thái dịch vụ."),
  deleteService: (id) => request(() => axiosClient.delete(`/api/v1/services/${id}`), "Không thể xóa dịch vụ."),
};

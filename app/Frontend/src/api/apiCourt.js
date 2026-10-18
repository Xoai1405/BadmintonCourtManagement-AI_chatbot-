import axiosClient from "./axiosClient";
const getErrorMessage = (err, fallback) => {
  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    fallback
  );
};

export const courtApi = {
    getAllCourt: async () => {
        try{
            const response = await axiosClient.get("/api/v1/courts");
            return response.data;
        }
        catch (err) {
            throw new Error(getErrorMessage(err, "Không lấy được dữ liệu danh sách sân"));
        }
    },
    getCourt: async (id) => {
        try {
            const response = await axiosClient.get(`/api/v1/courts/id`, {params: {id},});
            return response.data;

        }
        catch (err) {
            
                 throw new Error(getErrorMessage(err, "Không lấy được dữ liệu sân"));
        }
    },
    getAvailability: async (courtId, date) => {
  try {
    const response = await axiosClient.get(
      `/api/v1/courts/${courtId}/availability`,
      {
        params: { date },
      },
    );

    return response.data;
  } catch (err) {
    throw new Error(
      getErrorMessage(err, "Không lấy được lịch trống của sân"),
      { cause: err },
    );
  }
},
}
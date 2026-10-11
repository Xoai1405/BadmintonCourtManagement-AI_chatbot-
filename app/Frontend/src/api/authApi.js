import axiosClient from "./axiosClient";
const getErrorMessage = (err, fallback) => {
  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    fallback
  );
};

export const authApi = {
  login: async (credentials) => {
    try {
       const response = await axiosClient.post(
    "/api/v1/auth/login",
    credentials
  );
      return response.data;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Sai tài khoản hoặc mật khẩu"));
    }
  },

  register: async (userData) => {
    try {
      const response = await axiosClient.post(
    "/api/v1/auth/register",
    userData
  );;
      return response.data;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Đăng ký thất bại"));
    }
  },
};
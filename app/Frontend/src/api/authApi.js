import axiosClient from "./axiosClient";
const getErrorMessage = (err, fallback) => {
  return err.response?.data?.message || err.response?.data?.error || fallback;
};

export const authApi = {
  login: async (credentials) => {
    try {
      const response = await axiosClient.post(
        "/api/v1/auth/login",
        credentials,
      );
      return response.data;
    } catch (err) {
      const error = new Error(
        getErrorMessage(err, "Sai tài khoản hoặc mật khẩu"),
      );
      error.code = err.response?.data?.code; // giữ lại mã lỗi cho trang Login dùng
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await axiosClient.post(
        "/api/v1/auth/register",
        userData,
      );
      return response.data;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Đăng ký thất bại"));
    }
  },

  verifyEmail: async (token) => {
    try {
      const response = await axiosClient.post("/api/v1/auth/verify-email", {
        token,
      });
      return response.data;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Xác thực email thất bại"));
    }
  },
   resendVerification: async (emailOrPhoneNumber) => {
    try {
      const response = await axiosClient.post(
        "/api/v1/auth/resend-verification",
        { emailOrPhoneNumber }
      );
      return response.data;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Không thể gửi lại email"));
    }
  },
};

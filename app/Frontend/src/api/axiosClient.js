import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosClient.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register");

    if (status === 401 && !isAuthEndpoint) {
      window.dispatchEvent(
        new Event("auth:unauthorized")
      );
    }

    return Promise.reject(error);
  }
);
export default axiosClient;
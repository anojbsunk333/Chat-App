import axios from "axios";

const apiBaseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : "https://chat-app-ujty.vercel.app/api");

export const axiosInstance = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

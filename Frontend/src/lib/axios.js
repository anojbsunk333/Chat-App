import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://chat-app-ujty.vercel.app/api",
  withCredentials: true,
});

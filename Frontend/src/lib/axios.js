import axios from "axios";

const apiBaseURL =
  import.meta.env.MODE === "development" ? "http://localhost:3000/api" : "/api";

export const axiosInstance = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

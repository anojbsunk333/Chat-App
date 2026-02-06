import axios from "axios";

const apiBaseURL = "/api";

export const axiosInstance = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

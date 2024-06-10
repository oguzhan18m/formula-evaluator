import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://652f91320b8d8ddac0b2b62b.mockapi.io",
  headers: {
    "Content-type": "application/json",
    "cache-control": "no-cache",
  },
});

export default axiosInstance;

import axios from "axios";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
const api = axios.create({ baseURL: API_BASE, withCredentials: false });
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("qulf_access");
    if (token) config.headers.Authorization = "Bearer " + token;
    const branch = localStorage.getItem("qulf_branch");
    if (branch) config.headers["X-Branch-Id"] = branch;
    const project = localStorage.getItem("qulf_project");
    if (project) config.headers["X-Project-Id"] = project;
  }
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e?.response?.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return Promise.reject(e);
  }
);
export default api;

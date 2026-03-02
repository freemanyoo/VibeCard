import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const reqUrl = String(config.url || "");
  const normalizedUrl = reqUrl.replace(/^\/+/, "");
  const publicAuthEndpoints = new Set([
    "auth/login",
    "auth/register",
    "auth/register/send-code",
    "auth/social/google",
    "auth/social/naver",
    "auth/social/kakao",
    "auth/promote-admin",
    "auth/check-role",
  ]);
  const isPublicAuthEndpoint = publicAuthEndpoints.has(normalizedUrl);
  if (token && !isPublicAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const reqUrl = String(error.config?.url || "");
      const normalizedUrl = reqUrl.replace(/^\/+/, "");
      const isAuthEndpoint = normalizedUrl.startsWith("auth/");
      const isAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/signup";
      if (!isAuthEndpoint && !isAuthPage && !error.config?.__skip401Redirect) {
        window.location.href = "/login";
      }
    }
    if (error.response?.status === 403) {
      const msg = error.response?.data?.message || error.response?.data?.error || "권한이 없습니다.";
      const hint = "관리자 전용 기능입니다. promote-admin 후에는 로그아웃 후 다시 로그인해 주세요.";
      if (typeof window !== "undefined" && !error.config?.__skip403Alert) {
        const reqUrl = String(error.config?.url || "");
        const normalizedUrl = reqUrl.replace(/^\/+/, "");
        const isAdminApi =
          normalizedUrl.startsWith("admin/") ||
          normalizedUrl.startsWith("api/admin/") ||
          reqUrl.includes("/admin/");
        const isAdminPage = window.location.pathname.startsWith("/admin");
        if (isAdminApi && isAdminPage) {
          alert(`${msg}\n\n${hint}`);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

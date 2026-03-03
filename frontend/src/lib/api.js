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
    "auth/refresh-token",
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

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const {
      config,
      response: { status },
    } = error;
    const originalRequest = config;

    if (status === 401) {
      const reqUrl = String(originalRequest.url || "");
      const normalizedUrl = reqUrl.replace(/^\/+/, "");

      // If it's a login or other auth endpoint, don't try to refresh
      if (normalizedUrl.startsWith("auth/login") || normalizedUrl.startsWith("auth/refresh-token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        return Promise.reject(error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = localStorage.getItem("refreshToken");

        if (refreshToken) {
          try {
            const { data } = await api.post("/auth/refresh-token", { refreshToken }, { __skip401Redirect: true });
            const newToken = data.accessToken;
            localStorage.setItem("token", newToken);
            isRefreshing = false;
            onRefreshed(newToken);
            return api(originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            window.location.href = "/login";
            return Promise.reject(refreshError);
          }
        } else {
          isRefreshing = false;
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          const isAuthPage =
            window.location.pathname === "/login" ||
            window.location.pathname === "/signup";
          if (!isAuthPage && !originalRequest.__skip401Redirect) {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }
      }

      return new Promise((resolve) => {
        subscribeTokenRefresh((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    if (status === 403) {
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

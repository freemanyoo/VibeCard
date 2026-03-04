import { createContext, useContext, useState, useEffect } from "react";
import api from "./api";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get("/auth/me")
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: newToken, refreshToken: newRefreshToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const sendRegisterCode = async (email) => {
    await api.post("/auth/register/send-code", { email });
  };

  const register = async (email, password, verificationCode) => {
    await api.post("/auth/register", { email, password, verificationCode });
  };

  const socialGoogleLogin = async (idToken) => {
    const res = await api.post("/auth/social/google", { idToken });
    const { token: newToken, refreshToken: newRefreshToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    if (newUser?.email) {
      localStorage.setItem("google_login_hint", newUser.email);
    }
  };

  const buildNaverAuthUrl = () => {
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID || "";
    if (!clientId) throw new Error("네이버 로그인 설정이 필요합니다.");
    if (typeof window === "undefined") throw new Error("브라우저 환경이 아닙니다.");
    const redirectUri = `${window.location.origin}/auth/naver/callback`;
    const state = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("naver_oauth_state", state);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
  };

  const socialNaverLogin = async (code, state) => {
    if (typeof window === "undefined") throw new Error("브라우저 환경이 아닙니다.");
    const expectedState = sessionStorage.getItem("naver_oauth_state");
    if (!state || !expectedState || state !== expectedState) {
      throw new Error("네이버 인증 state 검증에 실패했습니다. 다시 시도해 주세요.");
    }
    const redirectUri = `${window.location.origin}/auth/naver/callback`;
    const res = await api.post("/auth/social/naver", { code, state, redirectUri });
    const { token: newToken, refreshToken: newRefreshToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    sessionStorage.removeItem("naver_oauth_state");
  };

  const buildKakaoAuthUrl = () => {
    const clientId = import.meta.env.VITE_KAKAO_REST_API_KEY || "";
    if (!clientId) throw new Error("카카오 로그인 설정이 필요합니다.");
    if (typeof window === "undefined") throw new Error("브라우저 환경이 아닙니다.");
    const redirectUri = `${window.location.origin}/auth/kakao/callback`;
    const state = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("kakao_oauth_state", state);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  };

  const socialKakaoLogin = async (code, state) => {
    if (typeof window === "undefined") throw new Error("브라우저 환경이 아닙니다.");
    const expectedState = sessionStorage.getItem("kakao_oauth_state");
    if (!state || !expectedState || state !== expectedState) {
      throw new Error("카카오 인증 state 검증에 실패했습니다. 다시 시도해 주세요.");
    }
    const redirectUri = `${window.location.origin}/auth/kakao/callback`;
    const res = await api.post("/auth/social/kakao", { code, state, redirectUri });
    const { token: newToken, refreshToken: newRefreshToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    sessionStorage.removeItem("kakao_oauth_state");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, sendRegisterCode, register, socialGoogleLogin, buildNaverAuthUrl, socialNaverLogin, buildKakaoAuthUrl, socialKakaoLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

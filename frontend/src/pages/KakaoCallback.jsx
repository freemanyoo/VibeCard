import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function KakaoCallback() {
  const navigate = useNavigate();
  const { socialKakaoLogin } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let pollTimer = null;
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    const state = query.get("state");
    const oauthError = query.get("error");
    const oauthErrorDescription = query.get("error_description");

    if (oauthError) {
      setError(oauthErrorDescription || "카카오 로그인에 실패했습니다.");
      return;
    }
    if (!code || !state) {
      setError("카카오 인증 응답이 올바르지 않습니다.");
      return;
    }

    const lockKey = `kakao_oauth_lock_${code}`;
    const existingLock = sessionStorage.getItem(lockKey);
    if (existingLock) {
      const startedAt = Date.now();
      pollTimer = window.setInterval(() => {
        const hasToken = Boolean(localStorage.getItem("token"));
        if (hasToken) {
          window.clearInterval(pollTimer);
          navigate("/dashboard", { replace: true });
          return;
        }
        if (Date.now() - startedAt > 2500) {
          window.clearInterval(pollTimer);
          sessionStorage.removeItem(lockKey);
        }
      }, 120);
      return () => {
        if (pollTimer) window.clearInterval(pollTimer);
      };
    }
    sessionStorage.setItem(lockKey, "1");

    socialKakaoLogin(code, state)
      .then(() => {
        sessionStorage.removeItem(lockKey);
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        const hasToken = Boolean(localStorage.getItem("token"));
        sessionStorage.removeItem(lockKey);
        if (hasToken) {
          navigate("/dashboard", { replace: true });
          return;
        }
        setError(err?.response?.data?.error || err?.message || "카카오 로그인에 실패했습니다.");
      });

    return () => {
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [navigate, socialKakaoLogin]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-xl text-center">
        {!error && <p className="text-sm text-zinc-600">카카오 로그인 처리 중입니다...</p>}
        {error && (
          <>
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              로그인으로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

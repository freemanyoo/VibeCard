import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function NaverCallback() {
  const navigate = useNavigate();
  const { socialNaverLogin } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    const state = query.get("state");
    const oauthError = query.get("error");
    const oauthErrorDescription = query.get("error_description");

    if (oauthError) {
      setError(oauthErrorDescription || "네이버 로그인에 실패했습니다.");
      return;
    }
    if (!code || !state) {
      setError("네이버 인증 응답이 올바르지 않습니다.");
      return;
    }

    socialNaverLogin(code, state)
      .then(() => navigate("/dashboard", { replace: true }))
      .catch((err) => setError(err?.response?.data?.error || err?.message || "네이버 로그인에 실패했습니다."));
  }, [navigate, socialNaverLogin]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-xl text-center">
        {!error && <p className="text-sm text-zinc-600">네이버 로그인 처리 중입니다...</p>}
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

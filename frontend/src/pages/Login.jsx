import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import GoogleAuthButton from "../components/GoogleAuthButton";
import NaverAuthButton from "../components/NaverAuthButton";
import KakaoAuthButton from "../components/KakaoAuthButton";

export default function Login() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login, socialGoogleLogin } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await login(fd.get("email"), fd.get("password"));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  }

  async function handleGoogle(credential) {
    setError(null);
    console.log("[GoogleAuth] credential callback received", { hasCredential: Boolean(credential), length: credential?.length || 0 });
    try {
      await socialGoogleLogin(credential);
      navigate("/dashboard");
    } catch (err) {
      console.error("[GoogleAuth] social login failed", err?.response?.status, err?.response?.data || err);
      setError(err.response?.data?.error || "구글 로그인에 실패했습니다.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">로그인</h2>
          <p className="mt-2 text-sm text-zinc-600">환영합니다! 청첩장 편집을 계속하세요.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-zinc-700">이메일</label><input name="email" type="email" required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm" /></div>
            <div><label className="block text-sm font-medium text-zinc-700">비밀번호</label><input name="password" type="password" required className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm" /></div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors">로그인</button>
        </form>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs text-zinc-400">또는</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
        <div className="flex items-center justify-center gap-3">
          <GoogleAuthButton
            variant="icon"
            className=""
            onCredential={handleGoogle}
            onError={(msg) => {
              console.error("[GoogleAuth] button/render error", msg);
              setError(msg);
            }}
          />
          <NaverAuthButton
            variant="icon"
            onError={(msg) => setError(msg)}
          />
          <KakaoAuthButton
            variant="icon"
            onError={(msg) => setError(msg)}
          />
        </div>
        <div className="text-center text-sm">계정이 없으신가요? <Link to="/signup" className="font-semibold text-black hover:underline">회원가입하기</Link></div>
      </div>
    </div>
  );
}

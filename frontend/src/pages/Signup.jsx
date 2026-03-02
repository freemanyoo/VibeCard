import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import GoogleAuthButton from "../components/GoogleAuthButton";
import NaverAuthButton from "../components/NaverAuthButton";
import KakaoAuthButton from "../components/KakaoAuthButton";

export default function Signup() {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const navigate = useNavigate();
  const { sendRegisterCode, register, socialGoogleLogin } = useAuth();

  async function handleSendCode(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget.form || e.currentTarget.closest("form");
    const fd = new FormData(form);
    const email = String(fd.get("email") || "");
    if (!email) {
      setError("이메일을 먼저 입력해 주세요.");
      return;
    }
    try {
      setSendingCode(true);
      await sendRegisterCode(email);
      setCodeSent(true);
      setSuccess("인증코드를 전송했습니다.");
    } catch (err) {
      setError(err.response?.data?.error || "인증코드 전송에 실패했습니다.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setSuccess(null);
    const fd = new FormData(e.currentTarget);
    try {
      await register(fd.get("email"), fd.get("password"), fd.get("verificationCode"));
      navigate("/login", {
        replace: true,
        state: { flashMessage: "회원가입이 완료되었습니다. 가입하신 아이디로 로그인해 주세요." },
      });
    } catch (err) {
      setError(err.response?.data?.error || "회원가입 중 오류가 발생했습니다.");
    }
  }

  async function handleGoogle(credential) {
    setError(null);
    setSuccess(null);
    console.log("[GoogleAuth] credential callback received", { hasCredential: Boolean(credential), length: credential?.length || 0 });
    try {
      await socialGoogleLogin(credential);
      navigate("/dashboard");
    } catch (err) {
      console.error("[GoogleAuth] social signup failed", err?.response?.status, err?.response?.data || err);
      setError(err.response?.data?.error || "구글 회원가입에 실패했습니다.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">회원가입</h2>
          <p className="mt-2 text-sm text-zinc-600">청첩장 제작을 위해 가입해 주세요.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-zinc-700">이메일</label><input name="email" type="email" required autoComplete="email" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm" /></div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">이메일 인증코드</label>
              <div className="mt-1 flex gap-2">
                <input
                  name="verificationCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  onInput={(e) => {
                    const next = e.currentTarget.value.replace(/\D/g, "").slice(0, 6);
                    if (e.currentTarget.value !== next) {
                      e.currentTarget.value = next;
                    }
                  }}
                  className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="6자리 숫자"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode}
                  className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                >
                  {sendingCode ? "전송 중..." : (codeSent ? "재전송" : "코드 발송")}
                </button>
              </div>
            </div>
            <div><label className="block text-sm font-medium text-zinc-700">비밀번호</label><input name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm" /></div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}
          <button type="submit" className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors">가입하기</button>
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
        <div className="text-center text-sm">이미 계정이 있으신가요? <Link to="/login" className="font-semibold text-black hover:underline">로그인하기</Link></div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { useAuth } from "../lib/auth";

export default function NaverAuthButton({ className = "", onError, variant = "full" }) {
  const { buildNaverAuthUrl } = useAuth();
  const clientId = useMemo(() => import.meta.env.VITE_NAVER_CLIENT_ID || "", []);

  function handleClick() {
    try {
      const url = buildNaverAuthUrl();
      window.location.href = url;
    } catch (err) {
      onError?.(err?.message || "네이버 로그인 URL 생성에 실패했습니다.");
    }
  }

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className={variant === "icon"
          ? `h-10 w-10 rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-500 ${className}`
          : `w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-500 ${className}`}
      >
        {variant === "icon" ? "N" : "Naver 로그인 (설정 필요)"}
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`h-10 w-10 rounded-full bg-[#03C75A] text-white hover:brightness-95 transition ${className}`}
        aria-label="네이버 로그인"
      >
        <span className="inline-grid h-full w-full place-items-center text-[23px] font-black leading-none tracking-[-0.04em] [font-family:'Arial_Black',Arial,sans-serif]">N</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full rounded-md border border-[#03C75A] bg-[#03C75A] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95 transition ${className}`}
    >
      네이버로 계속하기
    </button>
  );
}

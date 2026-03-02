import { useMemo } from "react";
import { useAuth } from "../lib/auth";

export default function KakaoAuthButton({ className = "", onError, variant = "full" }) {
  const { buildKakaoAuthUrl } = useAuth();
  const clientId = useMemo(() => import.meta.env.VITE_KAKAO_REST_API_KEY || "", []);

  function handleClick() {
    try {
      const url = buildKakaoAuthUrl();
      window.location.href = url;
    } catch (err) {
      onError?.(err?.message || "카카오 로그인 URL 생성에 실패했습니다.");
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
        {variant === "icon" ? "K" : "Kakao 로그인 (설정 필요)"}
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`h-10 w-10 rounded-full bg-[#FEE500] text-[#191919] hover:brightness-95 transition ${className}`}
        aria-label="카카오 로그인"
      >
        <span className="inline-grid h-full w-full place-items-center text-[20px] font-black leading-none [font-family:Arial,sans-serif]">K</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full rounded-md border border-[#FEE500] bg-[#FEE500] px-3 py-2 text-sm font-semibold text-[#191919] shadow-sm hover:brightness-95 transition ${className}`}
    >
      카카오로 계속하기
    </button>
  );
}

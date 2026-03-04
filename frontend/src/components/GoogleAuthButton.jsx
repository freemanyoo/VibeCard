import { useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-client";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("window unavailable"));
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("google script load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("google script load failed"));
    document.head.appendChild(script);
  });
}

export default function GoogleAuthButton({ onCredential, onError, className = "", variant = "full" }) {
  const containerRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const clientId = useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || "", []);

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    let cancelled = false;
    if (!clientId) {
      setReady(false);
      return;
    }
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
        const loginHint = localStorage.getItem("google_login_hint") || "";
        console.log("[GoogleAuth] script loaded, initializing button", { origin: window.location.origin, clientIdSet: Boolean(clientId) });
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              console.error("[GoogleAuth] callback without credential", response);
              onErrorRef.current?.("구글 인증 토큰을 가져오지 못했습니다.");
              return;
            }
            console.log("[GoogleAuth] callback credential received", { length: response.credential.length });
            onCredentialRef.current?.(response.credential);
          },
          ux_mode: "popup",
          auto_select: true,
          ...(loginHint ? { login_hint: loginHint } : {}),
        });
        containerRef.current.innerHTML = "";
        const isIcon = variant === "icon";
        window.google.accounts.id.renderButton(containerRef.current, {
          type: isIcon ? "icon" : "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: isIcon ? "circle" : "pill",
          logo_alignment: "left",
          ...(isIcon ? {} : { width: 320 }),
        });
        setReady(true);
      })
      .catch(() => {
        console.error("[GoogleAuth] script load failed");
        if (!cancelled) onErrorRef.current?.("구글 SDK 로딩에 실패했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, variant]);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className={`w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-500 ${className}`}
      >
        Google 로그인 (설정 필요)
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <div className={`relative h-10 w-10 ${className}`} aria-label={ready ? "Google 로그인" : "Google 로딩 중"}>
        <div ref={containerRef} className="absolute inset-0 z-20 opacity-0" />
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-full border border-zinc-300 bg-white shadow-sm">
          <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} aria-label={ready ? "Google 로그인" : "Google 로딩 중"} />;
}

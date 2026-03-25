const KAKAO_SHARE_SDK_VERSION = "2.8.0";

let kakaoShareSdkPromise = null;

export function loadKakaoShareSdk(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error("Missing Kakao JavaScript key"));
  }
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Kakao Share SDK is only available in the browser"));
  }

  const ensureInitialized = () => {
    const kakao = window.Kakao;
    if (!kakao) {
      throw new Error("Kakao SDK unavailable");
    }
    if (typeof kakao.isInitialized === "function" && !kakao.isInitialized()) {
      kakao.init(apiKey);
    }
    return kakao;
  };

  if (window.Kakao?.Share && typeof window.Kakao.Share.sendDefault === "function") {
    try {
      return Promise.resolve(ensureInitialized());
    } catch (error) {
      return Promise.reject(error);
    }
  }

  if (kakaoShareSdkPromise) {
    return kakaoShareSdkPromise.then(() => ensureInitialized());
  }

  kakaoShareSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kakao-share-sdk="1"]');
    if (existing) {
      existing.addEventListener("load", () => {
        try {
          resolve(ensureInitialized());
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      existing.addEventListener("error", () => reject(new Error("Kakao Share SDK load failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://t1.kakaocdn.net/kakao_js_sdk/${KAKAO_SHARE_SDK_VERSION}/kakao.min.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.kakaoShareSdk = "1";
    script.onload = () => {
      try {
        resolve(ensureInitialized());
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => reject(new Error("Kakao Share SDK load failed"));
    document.head.appendChild(script);
  });

  return kakaoShareSdkPromise;
}

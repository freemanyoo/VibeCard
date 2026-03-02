import { useEffect, useRef } from "react";
import { WeddingData } from "../lib/data";

let kakaoScriptPromise = null;

function loadKakaoScript(apiKey) {
  if (!apiKey) return Promise.reject(new Error("Missing kakao api key"));
  if (typeof window !== "undefined" && window.kakao?.maps) return Promise.resolve();
  if (kakaoScriptPromise) return kakaoScriptPromise;
  kakaoScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kakao-maps="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Kakao maps load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.async = true;
    script.dataset.kakaoMaps = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao maps load failed"));
    document.head.appendChild(script);
  });
  return kakaoScriptPromise;
}

export default function KakaoMap({ venueAddress = "", fallbackVenueName = "", allowZoom = false, onResolvedPosition }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const zoomControlRef = useRef(null);
  const apiKey = import.meta.env.VITE_KAKAO_MAP_JS_KEY || WeddingData.kakaoApiKey;

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadKakaoScript(apiKey)
      .then(() => {
        if (cancelled) return;
        if (!window.kakao?.maps || !mapRef.current) return;
        window.kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;
          const ensureMap = (position) => {
            if (!mapInstanceRef.current) {
              const options = { center: position, level: 3 };
              mapInstanceRef.current = new window.kakao.maps.Map(mapRef.current, options);
              mapInstanceRef.current.setZoomable(Boolean(allowZoom));
              markerRef.current = new window.kakao.maps.Marker({ position });
              markerRef.current.setMap(mapInstanceRef.current);
              if (allowZoom) {
                zoomControlRef.current = new window.kakao.maps.ZoomControl();
                mapInstanceRef.current.addControl(zoomControlRef.current, window.kakao.maps.ControlPosition.RIGHT);
              }
              return;
            }
            mapInstanceRef.current.setCenter(position);
            mapInstanceRef.current.setZoomable(Boolean(allowZoom));
            if (allowZoom && !zoomControlRef.current) {
              zoomControlRef.current = new window.kakao.maps.ZoomControl();
              mapInstanceRef.current.addControl(zoomControlRef.current, window.kakao.maps.ControlPosition.RIGHT);
            }
            if (!allowZoom && zoomControlRef.current) {
              mapInstanceRef.current.removeControl(zoomControlRef.current);
              zoomControlRef.current = null;
            }
            if (markerRef.current) markerRef.current.setPosition(position);
            if (typeof onResolvedPosition === "function") {
              onResolvedPosition({ lat: position.getLat(), lng: position.getLng() });
            }
          };

          const fallbackPosition = new window.kakao.maps.LatLng(WeddingData.venue.lat, WeddingData.venue.lng);
          const query = String(venueAddress || fallbackVenueName || "").trim();
          if (!query || !window.kakao?.maps?.services?.Geocoder) {
            ensureMap(fallbackPosition);
            return;
          }

          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.addressSearch(query, (result, status) => {
            if (cancelled) return;
            if (status === window.kakao.maps.services.Status.OK && result?.[0]) {
              const first = result[0];
              const position = new window.kakao.maps.LatLng(Number(first.y), Number(first.x));
              ensureMap(position);
              return;
            }
            ensureMap(fallbackPosition);
          });
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiKey, venueAddress, fallbackVenueName, allowZoom, onResolvedPosition]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 text-zinc-400">
        <p className="text-sm">카카오 API 키가 필요합니다.</p>
        <p className="text-[10px] opacity-70 mt-1">.env의 VITE_KAKAO_MAP_JS_KEY를 확인해 주세요.</p>
      </div>
    );
  }
  return <div ref={mapRef} className="h-full w-full" />;
}

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Phone, ChevronDown, ChevronLeft, ChevronRight, Music, Music2, X } from "lucide-react";
import { usePhoneFrameHeight } from "../context/PhoneFrameContext";
import { getTypoForTemplate } from "../lib/skinDefaults";
import { toThumbnailUrl } from "../lib/imageUrl";
import api from "../lib/api";
import KakaoMap from "./KakaoMap";

const parseRgbFromColor = (color) => {
  const raw = String(color || "").trim();
  const hex = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const normalized = hex[1].length === 3
      ? hex[1].split("").map((c) => c + c).join("")
      : hex[1];
    const n = Number.parseInt(normalized, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const rgb = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((v) => Number.parseFloat(v.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every((v) => Number.isFinite(v))) {
      return {
        r: Math.max(0, Math.min(255, parts[0])),
        g: Math.max(0, Math.min(255, parts[1])),
        b: Math.max(0, Math.min(255, parts[2])),
      };
    }
  }
  return null;
};

const isDarkBackground = (color) => {
  const rgb = parseRgbFromColor(color);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.55;
};
const clampReadabilityValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};
const getReadabilityStyle = (baseOpacity, value) => {
  const strength = clampReadabilityValue(value) / 100;
  const opacity = Math.max(0, Math.min(1, baseOpacity + (1 - baseOpacity) * strength));
  if (strength <= 0) return { opacity };
  const blur = 2 + Math.round(strength * 8);
  const alpha = 0.2 + strength * 0.4;
  return {
    opacity,
    textShadow: `0 1px ${blur}px rgba(0, 0, 0, ${alpha})`,
  };
};

const LightboxHost = forwardRef(function LightboxHost(_, ref) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [loadedMap, setLoadedMap] = useState({});
  const [requestedMap, setRequestedMap] = useState({});
  const [ready, setReady] = useState(false);
  const startXRef = useRef(null);
  const deltaXRef = useRef(0);

  useImperativeHandle(ref, () => ({
    open(nextItems, nextIndex = 0) {
      if (!Array.isArray(nextItems) || nextItems.length === 0) return;
      const clamped = Math.max(0, Math.min(nextItems.length - 1, nextIndex));
      setItems(nextItems);
      setIndex(clamped);
      setDragOffset(0);
      setLoadedMap({});
      setRequestedMap({});
      setReady(false);
      setOpen(true);
      requestAnimationFrame(() => setReady(true));
    },
    close() {
      setOpen(false);
    },
  }), []);

  const goPrev = () => {
    if (items.length <= 1) return;
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  };
  const goNext = () => {
    if (items.length <= 1) return;
    setIndex((prev) => (prev + 1) % items.length);
  };
  const startDrag = (clientX) => {
    startXRef.current = clientX;
    deltaXRef.current = 0;
    setDragOffset(0);
  };
  const moveDrag = (clientX) => {
    if (startXRef.current == null) return;
    deltaXRef.current = clientX - startXRef.current;
    setDragOffset(deltaXRef.current);
  };
  const endDrag = () => {
    if (startXRef.current == null) return;
    const delta = deltaXRef.current;
    startXRef.current = null;
    deltaXRef.current = 0;
    setDragOffset(0);
    if (Math.abs(delta) < 50) return;
    if (delta < 0) goNext(); else goPrev();
  };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const current = items[index];
    if (!current || loadedMap[index] || requestedMap[index]) return;
    setRequestedMap((prev) => ({ ...prev, [index]: true }));
    const img = new Image();
    img.onload = () => setLoadedMap((prev) => ({ ...prev, [index]: true }));
    img.onerror = () => setLoadedMap((prev) => ({ ...prev, [index]: true }));
    img.src = current.full;
  }, [open, items, index, loadedMap, requestedMap]);

  useEffect(() => {
    if (!open) return;
    if (!items.length) return;
    let cancelled = false;
    const preloadOne = (idx) => {
      const item = items[idx];
      if (!item || loadedMap[idx] || requestedMap[idx]) return;
      setRequestedMap((prev) => ({ ...prev, [idx]: true }));
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setLoadedMap((prev) => ({ ...prev, [idx]: true }));
      };
      img.onerror = () => {
        if (cancelled) return;
        setLoadedMap((prev) => ({ ...prev, [idx]: true }));
      };
      img.src = item.full;
    };

    const priority = Array.from(new Set([index, index - 1, index + 1])).filter((i) => i >= 0 && i < items.length);
    priority.forEach(preloadOne);
    const rest = items.map((_, i) => i).filter((i) => !priority.includes(i));

    if (rest.length === 0) return () => { cancelled = true; };

    if (typeof requestIdleCallback === "function") {
      const rid = requestIdleCallback(() => rest.forEach(preloadOne));
      return () => {
        cancelled = true;
        if (typeof cancelIdleCallback === "function") cancelIdleCallback(rid);
      };
    }

    const timer = setTimeout(() => rest.forEach(preloadOne), 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, items, index, loadedMap, requestedMap]);

  if (!open || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/90 cursor-zoom-out" onClick={() => setOpen(false)} aria-label="닫기" />
      <div
        className="relative w-full max-w-[95vw] h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => startDrag(e.clientX)}
        onMouseMove={(e) => moveDrag(e.clientX)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={(e) => startDrag(e.touches[0]?.clientX ?? 0)}
        onTouchMove={(e) => moveDrag(e.touches[0]?.clientX ?? 0)}
        onTouchEnd={endDrag}
      >
        <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center" aria-label="닫기">
          <X size={18} />
        </button>
        <div className={`flex h-full ${ready ? "transition-transform duration-300 ease-out" : ""}`} style={{ transform: `translateX(calc(${-index * 100}% + ${dragOffset}px))` }}>
          {items.map((item, i) => {
            const resolvedSrc = loadedMap[i] ? item.full : item.preview;
            return (
              <div key={`${item.full}-${i}`} className="min-w-full h-full flex items-center justify-center">
                <img
                  src={resolvedSrc}
                  alt="Full Screen"
                  className="max-w-full max-h-full object-contain select-none"
                  loading={i === index ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={i === index ? "high" : "auto"}
                  onError={(e) => {
                    if (e.currentTarget.dataset.fallback === "1") return;
                    e.currentTarget.dataset.fallback = "1";
                    e.currentTarget.src = item.full;
                  }}
                />
              </div>
            );
          })}
        </div>
        {items.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-0 top-0 bottom-0 w-1/4 z-10" aria-label="이전 사진 영역" />
            <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-0 top-0 bottom-0 w-1/4 z-10" aria-label="다음 사진 영역" />
            <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center z-20" aria-label="이전 사진">
              <ChevronLeft size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center z-20" aria-label="다음 사진">
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold z-20">
              {index + 1} / {items.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

function InteractiveSection({ id, className, children, dataSection, style, isPreview, onSelectSection, activeSection, pointColor, showPreviewOutline = true, disableActiveScale = false, containerRef = null }) {
  const activeClass = isPreview && activeSection === id
    ? (disableActiveScale ? "z-10" : "z-10 scale-[1.02]")
    : "";
  return (
    <div
      ref={containerRef}
      data-section={dataSection}
      onClick={(e) => {
        if (!isPreview || !onSelectSection) return;
        const target = e.target;
        if (target instanceof Element && target.closest("[data-text-pick='1']")) return;
        e.stopPropagation();
        onSelectSection(id);
      }}
      className={`${className} ${isPreview ? "relative group cursor-pointer transition-all duration-300" : ""} ${activeClass} ${isPreview && activeSection !== id ? "hover:bg-zinc-50/50" : ""}`}
      style={style}
    >
      {isPreview && showPreviewOutline && <div className="absolute inset-0 border-2 border-transparent transition-all duration-300 pointer-events-none" style={activeSection === id ? { borderColor: pointColor, opacity: 0.2 } : {}} />}
      {isPreview && activeSection === id && <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-2xl animate-bounce tracking-widest uppercase z-30">EDITING</div>}
      {children}
    </div>
  );
}

export default function InvitationView({ data, template, isPreview = false, compactPreview = false, onSelectSection, activeSection, onMouseDown, onTouchStart, onPhotoClick, previewPhotoContainerRef, enableMainPhotoLightbox = true, showFormsInPreview = false, onTextSizePick = null, disableMainPhotoOverlay = false, syncCoverRender = false, previewUseLivePhotoLayout = false, forceFullImageDarken = false, autoContrastHeroTextWhenNoPhotoFull = false }) {
  const PREVIEW_STD_BASE_RATIO = 303 / 440;
  const PREVIEW_STD_BASE_W = 351; // 375 frame - 24 border
  const PREVIEW_STD_BASE_H = PREVIEW_STD_BASE_W / PREVIEW_STD_BASE_RATIO;
  const usePreviewPhotoSizing = (isPreview || compactPreview) && !previewUseLivePhotoLayout;
  const heroSectionRef = useRef(null);
  const [previewStandardBaseWidth, setPreviewStandardBaseWidth] = useState(PREVIEW_STD_BASE_W);
  const [showContacts, setShowContacts] = useState(false);
  const [openBankSide, setOpenBankSide] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({ name: "", side: "신랑측", attending: true, count: 1, meal: false, message: "" });
  const [guestbookForm, setGuestbookForm] = useState({ writerName: "", content: "" });
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [isSubmittingGuestbook, setIsSubmittingGuestbook] = useState(false);
  const [stableViewportHeight, setStableViewportHeight] = useState(null);
  const [mainPhotoLoaded, setMainPhotoLoaded] = useState(false);  const audioRef = useRef(null);
  const [shareCopied, setShareCopied] = useState(false);
  const lightboxRef = useRef(null);
  const fullImageDragRef = useRef(null);
  const standardPhotoDragRef = useRef(null);
  const heroNamesWrapRef = useRef(null);
  const heroGroomNameRef = useRef(null);
  const heroBrideNameRef = useRef(null);
  const heroDividerRef = useRef(null);
  const heroGroomMeasureRef = useRef(null);
  const heroBrideMeasureRef = useRef(null);
  const [stackGroomChars, setStackGroomChars] = useState(false);
  const [stackBrideChars, setStackBrideChars] = useState(false);
  const groomFamilyButtonRef = useRef(null);
  const groomFamilyRelationRef = useRef(null);
  const groomFamilyNameRef = useRef(null);
  const groomFamilyPhoneRef = useRef(null);
  const groomFamilyMeasureRef = useRef(null);
  const brideFamilyButtonRef = useRef(null);
  const brideFamilyRelationRef = useRef(null);
  const brideFamilyNameRef = useRef(null);
  const brideFamilyPhoneRef = useRef(null);
  const brideFamilyMeasureRef = useRef(null);
  const [splitGroomParents, setSplitGroomParents] = useState(false);
  const [splitBrideParents, setSplitBrideParents] = useState(false);

  useEffect(() => {
    if (!usePreviewPhotoSizing) {
      setPreviewStandardBaseWidth(PREVIEW_STD_BASE_W);
      return undefined;
    }

    const updatePreviewStandardBaseWidth = () => {
      const node = heroSectionRef.current;
      if (!(node instanceof HTMLElement)) return;
      const next = Math.max(0, Math.round(node.clientWidth));
      setPreviewStandardBaseWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };

    updatePreviewStandardBaseWidth();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => updatePreviewStandardBaseWidth());
      if (heroSectionRef.current) observer.observe(heroSectionRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updatePreviewStandardBaseWidth);
    return () => window.removeEventListener("resize", updatePreviewStandardBaseWidth);
  }, [usePreviewPhotoSizing]);

  const weddingDate = data.weddingDate instanceof Date ? data.weddingDate : new Date(data.weddingDate || Date.now());
  const endOfMonth = new Date(weddingDate.getFullYear(), weddingDate.getMonth() + 1, 0);
  const days = Array.from({ length: endOfMonth.getDate() }, (_, i) => i + 1);
  const startDay = new Date(weddingDate.getFullYear(), weddingDate.getMonth(), 1).getDay();
  const blanks = Array.from({ length: startDay }, (_, i) => i);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const targetDate = new Date(weddingDate); targetDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const dDayText = diffDays === 0 ? "D-Day" : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
  const dDayEnabled = data.dDayEnabled !== false;
  const heroDateText = weddingDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const heroWeekdayText = weddingDate.toLocaleDateString("ko-KR", { weekday: "long" });

  const getMobileLikeViewport = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    const narrowViewport = window.matchMedia("(max-width: 1024px)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const touchPoints = typeof navigator !== "undefined" && typeof navigator.maxTouchPoints === "number"
      ? navigator.maxTouchPoints > 0
      : false;
    return narrowViewport || coarsePointer || touchPoints;
  };
  const [isMobileViewport, setIsMobileViewport] = useState(() => getMobileLikeViewport());

  const rawAlbumPhotos = Array.isArray(data.albumPhotos) ? data.albumPhotos : (typeof data.albumPhotos === "string" ? JSON.parse(data.albumPhotos || "[]") : []);
  const previewGallerySlots = Array.from({ length: 9 }, (_, i) => {
    const url = rawAlbumPhotos[i];
    return typeof url === "string" && String(url).trim().length > 0 ? url : null;
  });
  const currentPhotos = previewGallerySlots.filter(Boolean);
  const bankAccounts = Array.isArray(data.bankAccounts) ? data.bankAccounts : [];
  const groupedAccounts = bankAccounts.reduce((acc, curr) => {
    const side = curr.ownerType?.includes("신랑") ? "신랑측" : curr.ownerType?.includes("신부") ? "신부측" : "마음 전하실 곳";
    if (!acc[side]) acc[side] = [];
    acc[side].push(curr);
    return acc;
  }, {});
  const previewGalleryItems = previewGallerySlots;

  const config = typeof data.config === "string" ? JSON.parse(data.config || "{}") : (data.config || {});
  const templateDefaults = {
    modern: { bg: "#f1f5f9", sub: "#e2e8f0", text: "#0f172a", point: "#475569" },
    classic: { bg: "#faf6f1", sub: "#f5efe6", text: "#4a4035", point: "#8b6914" },
    elegant: { bg: "#1a1a1a", sub: "#252525", text: "#fafafa", point: "#d4af37" },
  };
  const t = templateDefaults[template] || templateDefaults.modern;
  const bgColor = config.bgColor || t.bg;
  const subBgColor = config.subBgColor || t.sub;
  const textColor = config.textColor || t.text;
  const pointColor = config.pointColor || t.point;
  const fontFamily = config.fontFamily || (template === "modern" ? "'Noto Sans KR', sans-serif" : template === "classic" ? "'Nanum Myeongjo', serif" : template === "elegant" ? "'Noto Serif KR', serif" : "serif");
  const isModern = template === "modern";
  const isClassic = template === "classic";
  const saveTheDateText = String(config.saveTheDateText || (isClassic ? "SAVE THE DATE" : "Save The Date"));
  const mainTitleText = String(config.mainTitleText || data.invitationTitle || "우리\n결혼합니다");
  const groomDisplayName = String(config.groomDisplayName || data.groomName || data.groom || "신랑");
  const brideDisplayName = String(config.brideDisplayName || data.brideName || data.bride || "신부");
  const venueDisplayName = String(config.venueDisplayName || config.heroVenueNameText || data.venueName || "예식장 정보");
  const invitationBodyText = String(config.invitationBodyText || data.invitationMessage || "");
  const legacyGroomParentLine = String(config.groomParentLineText || "");
  const legacyGroomParts = legacyGroomParentLine.split("·").map((v) => v.trim()).filter(Boolean);
  const groomFatherText = String(config.groomFatherText || legacyGroomParts[0] || data.groomFather || "");
  const groomMotherText = String(config.groomMotherText || legacyGroomParts[1] || data.groomMother || "");
  const groomParentLineText = `${groomFatherText}${groomFatherText && groomMotherText ? " · " : ""}${groomMotherText}` || "신랑측 부모";
  const groomParentNames = [groomFatherText, groomMotherText].filter((v) => String(v || "").trim().length > 0);
  const groomRelationText = String(config.groomRelationText || data.groomRelation || "차남");
  const legacyBrideParentLine = String(config.brideParentLineText || "");
  const legacyBrideParts = legacyBrideParentLine.split("·").map((v) => v.trim()).filter(Boolean);
  const brideFatherText = String(config.brideFatherText || legacyBrideParts[0] || data.brideFather || "");
  const brideMotherText = String(config.brideMotherText || legacyBrideParts[1] || data.brideMother || "");
  const brideParentLineText = `${brideFatherText}${brideFatherText && brideMotherText ? " · " : ""}${brideMotherText}` || "신부측 부모";
  const brideParentNames = [brideFatherText, brideMotherText].filter((v) => String(v || "").trim().length > 0);
  const brideRelationText = String(config.brideRelationText || data.brideRelation || "장녀");

  const typoFallback = getTypoForTemplate(template);
  const titleSize = config.titleSize ?? typoFallback.titleSize;
  const namesSize = config.namesSize ?? typoFallback.namesSize;
  const dateSize = config.dateSize ?? typoFallback.dateSize;
  const heroWeekdaySize = dateSize;
  const heroTimeSize = dateSize;
  const saveTheDateSize = config.saveTheDateSize ?? typoFallback.saveTheDateSize ?? dateSize;
  const contentSize = config.contentSize ?? typoFallback.contentSize;
  const heroVenueNameSize = config.heroVenueNameSize ?? typoFallback.heroVenueNameSize ?? 18;
  const heroDDaySize = config.heroDDaySize ?? typoFallback.heroDDaySize ?? 10;
  const familyLineSize = config.familyLineSize ?? typoFallback.familyLineSize ?? 16;
  const fallbackFamilyRelationSize = typoFallback.familyRelationSize ?? 10;
  const fallbackFamilyLineSize = typoFallback.familyLineSize ?? 16;
  const rawFamilyRelationRatio = Number(
    (
      config.familyRelationSize
        ? Number(config.familyRelationSize) / Number(fallbackFamilyLineSize)
        : (fallbackFamilyRelationSize / Number(fallbackFamilyLineSize))
    )
  );
  const familyRelationRatio = Number.isFinite(rawFamilyRelationRatio) ? Math.max(0.35, Math.min(0.95, rawFamilyRelationRatio)) : 0.625;
  const familyRelationSize = Math.round(familyLineSize * familyRelationRatio * 10) / 10;
  const calendarTitleSize = config.calendarTitleSize ?? typoFallback.calendarTitleSize ?? 28;
  const calendarDaySize = config.calendarDaySize ?? typoFallback.calendarDaySize ?? 13;
  const calendarWeekdaySize = calendarDaySize;
  const calendarCellSize = Math.max(28, Math.min(48, Math.round(Number(calendarDaySize) + 14)));
  const galleryTitleSize = config.galleryTitleSize ?? typoFallback.galleryTitleSize ?? 10;
  const locationTitleSize = config.locationTitleSize ?? typoFallback.locationTitleSize ?? 10;
  const locationVenueNameSize = config.locationVenueNameSize ?? typoFallback.locationVenueNameSize ?? 30;
  const accountTitleSize = config.accountTitleSize ?? typoFallback.accountTitleSize ?? 10;
  const attendanceTitleSize = config.attendanceTitleSize ?? typoFallback.attendanceTitleSize ?? 10;
  const guestbookTitleSize = config.guestbookTitleSize ?? typoFallback.guestbookTitleSize ?? attendanceTitleSize;
  const locationAddressSize = config.locationAddressSize ?? typoFallback.locationAddressSize ?? 14;
  const navButtonTextSize = config.navButtonTextSize ?? typoFallback.navButtonTextSize ?? 9;
  const accountSubtitleSize = config.accountSubtitleSize ?? typoFallback.accountSubtitleSize ?? 12;
  const accountToggleLabelSize = config.accountToggleLabelSize ?? typoFallback.accountToggleLabelSize ?? 11;
  const bankNameSize = config.bankNameSize ?? typoFallback.bankNameSize ?? 11;
  const copyButtonTextSize = config.copyButtonTextSize ?? typoFallback.copyButtonTextSize ?? 9;
  const accountHeaderSize = config.accountHeaderSize ?? typoFallback.accountHeaderSize ?? Math.max(bankNameSize, copyButtonTextSize, 11);
  const accountInfoSize = config.accountInfoSize ?? typoFallback.accountInfoSize ?? 20;
  const attendanceDescSize = config.attendanceDescSize ?? typoFallback.attendanceDescSize ?? 12;
  const guestbookDescSize = config.guestbookDescSize ?? typoFallback.guestbookDescSize ?? attendanceDescSize;
  const attendanceLabelSize = config.attendanceLabelSize ?? typoFallback.attendanceLabelSize ?? 11;
  const attendanceOptionTextSize = config.attendanceOptionTextSize ?? typoFallback.attendanceOptionTextSize ?? 12;
  const formPlaceholderSize = config.formPlaceholderSize ?? typoFallback.formPlaceholderSize ?? 14;
  const footerWeddingOfSize = config.footerWeddingOfSize ?? typoFallback.footerWeddingOfSize ?? 10;
  const textScale = Math.max(0.8, Math.min(1.4, (Number(config.textScale) || 100) / 100));
  const s = (n) => Math.round(Number(n) * textScale * 10) / 10;
  const pickSize = (e, key) => {
    if (!isPreview || typeof onTextSizePick !== "function") return;
    const targetEl = e.currentTarget;
    const pickGroup = targetEl instanceof HTMLElement ? targetEl.getAttribute("data-pick-group") : null;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.nativeEvent?.stopImmediatePropagation === "function") {
      e.nativeEvent.stopImmediatePropagation();
    }
    if (targetEl instanceof HTMLElement) {
      const flashTargets = pickGroup
        ? Array.from(document.querySelectorAll(`[data-pick-group="${pickGroup}"]`))
        : [targetEl];
      flashTargets.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.classList.remove("inv-picked-flash");
        // Restart animation when clicking the same element repeatedly.
        void el.offsetWidth;
        el.classList.add("inv-picked-flash");
        setTimeout(() => el.classList.remove("inv-picked-flash"), 980);
      });
    }
    onTextSizePick(key);
  };
  const pickableStyle = isPreview && typeof onTextSizePick === "function" ? { cursor: "pointer" } : {};

  const photoUrl = data.mainPhotoUrl || data.photoUrl;
  const mainRenderUrl = photoUrl;
  const imageStyle = config.imageStyle || "standard";
  const imageHeight = config.imageHeight || 450;
  const imageWidth = config.imageWidth || 100;
  const legacyImageGradient = Math.max(0, Math.min(100, Number(config.imageGradient ?? 40)));
  const standardImageGradient = Math.max(0, Math.min(100, Number(config.standardImageGradient ?? legacyImageGradient)));
  const fullImageGradient = Math.max(0, Math.min(100, Number(config.fullImageGradient ?? legacyImageGradient)));
  const bottomImageGradient = Math.max(0, Math.min(100, Number(config.bottomImageGradient ?? legacyImageGradient)));
  const shouldForceFullDarken = forceFullImageDarken && imageStyle === "full";
  const effectiveFullImageGradient = shouldForceFullDarken ? 65 : fullImageGradient;
  const effectiveBottomImageGradient = shouldForceFullDarken ? 0 : bottomImageGradient;
  const mainPhotoZoom = Math.max(40, Math.min(180, Number(config.mainPhotoZoom) || 100));
  const isFullImage = imageStyle === "full" && photoUrl;
  const useCompactHeroTopSpacing = isPreview && !compactPreview && !previewUseLivePhotoLayout && !isFullImage;
  const [mainPhotoAspectRatio, setMainPhotoAspectRatio] = useState(Number(config.mainPhotoAspectRatio) > 0 ? Number(config.mainPhotoAspectRatio) : 1);
  const [fullContainerRatio, setFullContainerRatio] = useState(0.5);
  const [standardContainerRatio, setStandardContainerRatio] = useState(303 / 440);
  const [navPosition, setNavPosition] = useState(null);

  const titleColor = config.titleColor || textColor;
  const nameColor = config.nameColor || textColor;
  const dateColor = config.dateColor || textColor;
  const messageColor = config.messageColor || textColor;
  const sectionTitleColor = config.sectionTitleColor || pointColor;
  const calendarBgColor = config.calendarBgColor || subBgColor;
  const calendarDayColor = config.calendarDayColor || textColor;
  const calendarActiveColor = config.calendarActiveColor || pointColor;
  const buttonColor = config.buttonColor || pointColor;
  const buttonTextColor = config.buttonTextColor || "#ffffff";
  const showMainPhotoOverlay = !disableMainPhotoOverlay;
  const footerColor = config.footerColor || textColor;
  const shouldAutoContrastNoPhotoFull = isPreview && autoContrastHeroTextWhenNoPhotoFull && imageStyle === "full" && !photoUrl;
  const noPhotoFullTextColor = isDarkBackground(bgColor) ? "#FFFFFF" : "#111111";
  const heroTextColorMode = String(config.heroTextColorMode || "auto").toLowerCase();
  const useWhiteHeroText = isFullImage && heroTextColorMode !== "custom";
  const saveTheDateBaseColor = config.saveTheDateColor || pointColor;
  const heroVenueBaseColor = config.heroVenueColor || textColor;
  const heroDdayBaseColor = config.heroDdayColor || buttonColor;
  const heroSaveDateColor = shouldAutoContrastNoPhotoFull ? noPhotoFullTextColor : (useWhiteHeroText ? "#FFFFFF" : saveTheDateBaseColor);
  const heroTitleColor = shouldAutoContrastNoPhotoFull ? noPhotoFullTextColor : (useWhiteHeroText ? "#FFFFFF" : titleColor);
  const heroNamesColor = shouldAutoContrastNoPhotoFull ? noPhotoFullTextColor : (useWhiteHeroText ? "#FFFFFF" : nameColor);
  const heroDateColor = shouldAutoContrastNoPhotoFull ? noPhotoFullTextColor : (useWhiteHeroText ? "#FFFFFF" : dateColor);
  const heroVenueColor = shouldAutoContrastNoPhotoFull ? noPhotoFullTextColor : (useWhiteHeroText ? "#FFFFFF" : heroVenueBaseColor);
  const heroDdayColor = shouldAutoContrastNoPhotoFull ? noPhotoFullTextColor : (useWhiteHeroText ? "#FFFFFF" : heroDdayBaseColor);
  const heroSaveDateReadabilityStyle = getReadabilityStyle(
    isClassic ? 0.7 : (isModern ? 0.5 : 0.3),
    config.saveTheDateReadability
  );
  const heroTitleReadabilityStyle = getReadabilityStyle(1, config.heroTitleReadability);
  const heroNamesReadabilityStyle = getReadabilityStyle(1, config.heroNamesReadability);
  const heroDateReadabilityStyle = getReadabilityStyle(0.5, config.heroDateReadability);
  const heroVenueReadabilityStyle = getReadabilityStyle(1, config.heroVenueReadability);
  const heroDdayReadabilityStyle = getReadabilityStyle(
    (useWhiteHeroText || shouldAutoContrastNoPhotoFull) ? 0.8 : 0.2,
    config.heroDdayReadability
  );
  const navAddressQuery = String(data.venueAddress || "").trim();
  const navNameQuery = String(data.venueName || "").trim();
  const navSearchQuery = navAddressQuery || navNameQuery || "예식장";
  const navLat = navPosition?.lat;
  const navLng = navPosition?.lng;
  const hasNavCoord = Number.isFinite(navLat) && Number.isFinite(navLng);
  const encodedQuery = encodeURIComponent(navSearchQuery);
  const encodedName = encodeURIComponent(data.venueName || "예식장");
  const appName = encodeURIComponent(typeof window !== "undefined" ? (window.location.host || "localhost") : "localhost");
  const isMobileClient = typeof window !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `${data.groomName || data.groom || "신랑"} · ${data.brideName || data.bride || "신부"} 결혼식에 초대합니다.\n${shareUrl}`;

  const openAppWithFallback = (appUrl, webUrl) => {
    let hiddenAt = 0;
    let appOpened = false;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = appUrl;
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      document.removeEventListener("visibilitychange", handleVisibility, true);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      // Return from hidden state: if stayed hidden enough, app launch likely succeeded.
      if (hiddenAt > 0 && Date.now() - hiddenAt > 800) {
        appOpened = true;
      }
      hiddenAt = 0;
    };

    document.addEventListener("visibilitychange", handleVisibility, true);

    const timer = setTimeout(() => {
      if (!appOpened) window.location.href = webUrl;
      cleanup();
    }, 1200);

    // Safety cleanup on navigation race.
    setTimeout(() => {
      clearTimeout(timer);
      cleanup();
    }, 5000);
  };

  const handleOpenNavigation = (provider) => {
    if (isPreview) return;
    if (provider === "kakao") {
      const appUrl = hasNavCoord
        ? `kakaomap://look?p=${navLat},${navLng}`
        : `kakaomap://search?q=${encodedQuery}`;
      const webUrl = hasNavCoord
        ? `https://map.kakao.com/link/to/${encodedName},${navLat},${navLng}`
        : `https://map.kakao.com/?q=${encodedQuery}`;
      if (!isMobileClient) {
        window.open(webUrl, "_blank", "noopener,noreferrer");
        return;
      }
      openAppWithFallback(appUrl, webUrl);
      return;
    }
    if (provider === "naver") {
      const appUrl = hasNavCoord
        ? `nmap://route/car?dlat=${navLat}&dlng=${navLng}&dname=${encodedName}&appname=${appName}`
        : `nmap://search?query=${encodedQuery}&appname=${appName}`;
      const webUrl = hasNavCoord
        ? `https://map.naver.com/v5/search/${encodeURIComponent(`${navLat},${navLng}`)}`
        : `https://map.naver.com/v5/search/${encodedQuery}`;
      if (!isMobileClient) {
        window.open(webUrl, "_blank", "noopener,noreferrer");
        return;
      }
      openAppWithFallback(appUrl, webUrl);
      return;
    }
    if (provider === "tmap") {
      const appUrl = hasNavCoord
        ? `tmap://route?goalx=${navLng}&goaly=${navLat}&goalname=${encodedName}`
        : `tmap://search?name=${encodedQuery}`;
      const webUrl = hasNavCoord
        ? `https://www.google.com/maps?q=${navLat},${navLng}`
        : `https://www.google.com/maps?q=${encodedQuery}`;
      if (!isMobileClient) {
        window.open(webUrl, "_blank", "noopener,noreferrer");
        return;
      }
      openAppWithFallback(appUrl, webUrl);
    }
  };

  const copyShareLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard || !shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    } catch {}
  };

  const openKakaoAfterCopy = () => {
    if (typeof window === "undefined") return;
    if (isMobileClient) {
      window.location.href = "kakaotalk://";
      return;
    }
    window.location.href = "kakaotalk://";
    setTimeout(() => {
      alert("PC 웹 카카오톡 링크는 지원되지 않습니다. 카카오톡 데스크톱 앱 또는 모바일 카카오톡에서 붙여넣어 공유해 주세요.");
    }, 600);
  };

  const openSmsAfterCopy = () => {
    if (typeof window === "undefined") return;
    window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
  };

  const parsedMainPhotoPos = (() => {
    const [rawX = "50%", rawY = "50%"] = String(data.mainPhotoPosition || "50% 50%").trim().split(/\s+/);
    const toPercent = (v) => {
      const n = Number.parseFloat(String(v).replace("%", ""));
      if (Number.isNaN(n)) return 50;
      return Math.max(0, Math.min(100, n));
    };
    return { x: toPercent(rawX), y: toPercent(rawY) };
  })();
  const previewCoverObjectPosition = isPreview && data.mainPhotoFit === "cover"
    ? "var(--photo-x, 50%) var(--photo-y, 50%)"
    : (data.mainPhotoPosition || "50% 50%");
  const getCoverMetrics = (containerRatio) => {
    const safeRatio = containerRatio > 0 ? containerRatio : (303 / 440);
    const baseW = mainPhotoAspectRatio >= safeRatio ? (mainPhotoAspectRatio / safeRatio) * 100 : 100;
    const baseH = mainPhotoAspectRatio >= safeRatio ? 100 : (safeRatio / mainPhotoAspectRatio) * 100;
    const shouldClampFullImageMinZoom = isFullImage && mainPhotoAspectRatio < safeRatio;
    const minScale = shouldClampFullImageMinZoom ? 1 : 0.4;
    const scale = Math.max(minScale, mainPhotoZoom / 100);
    const width = baseW * scale;
    const height = baseH * scale;
    return { width, height, lockX: width <= 100, lockY: height <= 100 };
  };
  const getCoverBgSize = (containerRatio) => {
    const m = getCoverMetrics(containerRatio);
    return `${m.width}% ${m.height}%`;
  };
  const getCoverBgPosition = (containerRatio) => {
    const m = getCoverMetrics(containerRatio);
    const x = m.lockX ? "50%" : (isPreview ? "var(--photo-x, 50%)" : `${parsedMainPhotoPos.x}%`);
    const y = m.lockY ? "0%" : (isPreview ? "var(--photo-y, 50%)" : `${parsedMainPhotoPos.y}%`);
    return `${x} ${y}`;
  };
  const getImageRectPercent = (containerRatio) => {
    const ratio = mainPhotoAspectRatio || 1;
    const safeRatio = containerRatio > 0 ? containerRatio : (303 / 440);
    const posX = parsedMainPhotoPos.x;
    const posY = parsedMainPhotoPos.y;

    let imgW = 100;
    let imgH = 100;
    let lockX = false;
    let lockY = false;

    if (data.mainPhotoFit === "contain") {
      if (ratio >= safeRatio) {
        imgW = 100;
        imgH = (safeRatio / ratio) * 100;
      } else {
        imgW = (ratio / safeRatio) * 100;
        imgH = 100;
      }
      lockX = imgW >= 100;
      lockY = imgH >= 100;
    } else {
      const m = getCoverMetrics(containerRatio);
      imgW = m.width;
      imgH = m.height;
      lockX = m.lockX;
      lockY = m.lockY;
    }

    const visibleW = Math.min(100, imgW);
    const visibleH = Math.min(100, imgH);
    const left = imgW < 100 ? (100 - imgW) * ((lockX ? 50 : posX) / 100) : 0;
    const top = imgH < 100 ? (100 - imgH) * ((lockY ? 0 : posY) / 100) : 0;

    return {
      left: Math.max(0, Math.min(100 - visibleW, left)),
      top: Math.max(0, Math.min(100 - visibleH, top)),
      width: Math.max(0, visibleW),
      height: Math.max(0, visibleH),
    };
  };
  const imageWidthRatio = Math.max(0.3, Math.min(1, (Number(imageWidth) || 100) / 100));
  const shouldUseOuterEdgeStandardPhotoWidth = Boolean(isPreview && previewUseLivePhotoLayout);
  const standardContentMaxWidth = usePreviewPhotoSizing
    ? previewStandardBaseWidth
    : (shouldUseOuterEdgeStandardPhotoWidth ? 600 : 552);
  const standardBaseWidth = standardContentMaxWidth * imageWidthRatio;
  const standardBaseHeight = standardBaseWidth / PREVIEW_STD_BASE_RATIO;
  const standardPhotoMetrics = getCoverMetrics(PREVIEW_STD_BASE_RATIO);
  const standardPhotoFrameSize = {
    width: Math.round(standardBaseWidth),
    height: Math.round(standardBaseHeight),
  };
  const getPreviewStandardBgSize = () => {
    const w = (standardBaseWidth * standardPhotoMetrics.width) / 100;
    const h = (standardBaseHeight * standardPhotoMetrics.height) / 100;
    return `${w}px ${h}px`;
  };
  const getPreviewStandardBgPosition = () => {
    const x = standardPhotoMetrics.lockX ? "50%" : (isPreview ? "var(--photo-x, 50%)" : `${parsedMainPhotoPos.x}%`);
    const y = standardPhotoMetrics.lockY ? "0%" : (isPreview ? "var(--photo-y, 50%)" : `${parsedMainPhotoPos.y}%`);
    return `${x} ${y}`;
  };
  const fullImageRect = getImageRectPercent(fullContainerRatio);
  const fullOverlayBoxStyle = {
    left: `${fullImageRect.left}%`,
    top: `${fullImageRect.top}%`,
    width: `${fullImageRect.width}%`,
    height: `${fullImageRect.height}%`,
  };
  const fullBottomGradientStyle = {
    left: `${fullImageRect.left}%`,
    top: `${fullImageRect.top + (fullImageRect.height / 3)}%`,
    width: `${fullImageRect.width}%`,
    height: `${fullImageRect.height * (2 / 3)}%`,
  };
  const standardRatio = syncCoverRender ? PREVIEW_STD_BASE_RATIO : (usePreviewPhotoSizing ? PREVIEW_STD_BASE_RATIO : standardContainerRatio);
  const standardImageRect = getImageRectPercent(standardRatio);
  const standardSharedRectStyle = {
    left: `${standardImageRect.left}%`,
    top: `${standardImageRect.top}%`,
    width: `${standardImageRect.width}%`,
    height: `${standardImageRect.height}%`,
  };
  const standardBottomSlackPx = Math.max(
    0,
    Math.round(
      standardPhotoFrameSize.height * Math.max(0, 100 - (standardImageRect.top + standardImageRect.height)) / 100,
    ),
  );
  const shouldUseStandardPhotoInnerZoom = data.mainPhotoFit === "cover" && mainPhotoZoom > 100;
  const useDynamicFullPreviewSelectionBox = isPreview && previewUseLivePhotoLayout;
  const radiusPreset = isModern
    ? { min: 12, max: 16 }
    : isClassic
      ? { min: 24, max: 40 }
      : { min: 16, max: 32 };
  const standardPhotoTouchesHorizontalEdges =
    Math.abs(standardImageRect.left) < 0.01 &&
    Math.abs((standardImageRect.left + standardImageRect.width) - 100) < 0.01;
  const shouldFlattenStandardPhotoCorners = standardPhotoTouchesHorizontalEdges;
  const shouldDisableStandardPhotoHoverScale = imageWidthRatio >= 0.999;
  const standardPhotoRadiusPx = shouldFlattenStandardPhotoCorners ? 0 : radiusPreset.max;
  const standardPhotoRadiusValue = `${standardPhotoRadiusPx}px`;
  const previewFullBgLayer = data.mainPhotoFit === "cover" && photoUrl
    ? {
        backgroundImage: `url("${mainRenderUrl}")`,
        backgroundSize: getCoverBgSize(fullContainerRatio),
        backgroundRepeat: "no-repeat",
        backgroundPosition: getCoverBgPosition(fullContainerRatio),
      }
    : null;
  const previewStandardBgLayer = data.mainPhotoFit === "cover" && photoUrl
    ? {
        backgroundImage: `url("${mainRenderUrl}")`,
        backgroundSize: syncCoverRender
          ? getPreviewStandardBgSize()
          : (usePreviewPhotoSizing ? getPreviewStandardBgSize() : getCoverBgSize(standardContainerRatio)),
        backgroundRepeat: "no-repeat",
        backgroundPosition: syncCoverRender
          ? getPreviewStandardBgPosition()
          : (usePreviewPhotoSizing ? getPreviewStandardBgPosition() : getCoverBgPosition(standardContainerRatio)),
      }
    : null;
  const setFullPhotoContainerRef = (node) => {
    fullImageDragRef.current = node;
    if (isPreview && data.mainPhotoFit === "cover" && previewPhotoContainerRef) {
      previewPhotoContainerRef.current = node;
    }
  };
  const setStandardPhotoContainerRef = (node) => {
    standardPhotoDragRef.current = node;
    if (isPreview && data.mainPhotoFit === "cover" && previewPhotoContainerRef) {
      previewPhotoContainerRef.current = node;
    }
  };

  const toggleBgm = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const phoneFrameHeight = usePhoneFrameHeight();
  useEffect(() => {
    if (!photoUrl) return;
    setMainPhotoLoaded(false);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setMainPhotoAspectRatio(img.naturalWidth / img.naturalHeight);
      }
      setMainPhotoLoaded(true);
    };
    img.onerror = () => setMainPhotoLoaded(true);
    img.src = photoUrl;
  }, [photoUrl]);

  useEffect(() => {
    const updateRatio = (el, setter, fallback) => {
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      setter(w > 0 && h > 0 ? w / h : fallback);
    };
    const fullEl = fullImageDragRef.current;
    const standardEl = standardPhotoDragRef.current;
    updateRatio(fullEl, setFullContainerRatio, 0.5);
    updateRatio(standardEl, setStandardContainerRatio, 303 / 440);
    if (typeof ResizeObserver === "undefined") return;
    const observers = [];
    if (fullEl) {
      const ro = new ResizeObserver(() => updateRatio(fullEl, setFullContainerRatio, 0.5));
      ro.observe(fullEl);
      observers.push(ro);
    }
    if (standardEl) {
      const ro = new ResizeObserver(() => updateRatio(standardEl, setStandardContainerRatio, 303 / 440));
      ro.observe(standardEl);
      observers.push(ro);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [isPreview, isFullImage, imageStyle, imageHeight, imageWidth, photoUrl, data.mainPhotoFit]);

  const openLightbox = (items, index = 0) => {
    if (!Array.isArray(items) || items.length === 0) return;
    lightboxRef.current?.open(
      items.map((url) => ({ full: url, preview: toThumbnailUrl(url) })),
      Math.max(0, Math.min(items.length - 1, index))
    );
  };
  const submitAttendance = async () => {
    if (isPreview || !data?.id || isSubmittingAttendance) return;
    const name = attendanceForm.name.trim();
    if (!name) {
      alert("성함을 입력해 주세요.");
      return;
    }
    setIsSubmittingAttendance(true);
    try {
      const isAttending = Boolean(attendanceForm.attending);
      const count = isAttending ? Math.max(1, Number(attendanceForm.count) || 1) : 0;
      const isMeal = isAttending ? Boolean(attendanceForm.meal) : false;
      const mealCount = isMeal ? count : 0;
      const payload = {
        name,
        side: attendanceForm.side,
        attending: isAttending,
        count,
        meal: isMeal,
        mealCount,
        message: attendanceForm.message.trim(),
      };
      const res = await api.post(`/invitations/${data.id}/attendance`, payload);
      if (res.data?.success) {
        alert("참석 여부가 전달되었습니다.");
        setAttendanceForm({ name: "", side: "신랑측", attending: true, count: 1, meal: false, message: "" });
      } else {
        alert(res.data?.error || "참석 여부 전달에 실패했습니다.");
      }
    } catch (e) {
      alert(e.response?.data?.error || "참석 여부 전달에 실패했습니다.");
    } finally {
      setIsSubmittingAttendance(false);
    }
  };
  const submitGuestbook = async () => {
    if (isPreview || !data?.id || isSubmittingGuestbook) return;
    const writerName = guestbookForm.writerName.trim();
    const content = guestbookForm.content.trim();
    if (!writerName || !content) {
      alert("이름과 축하 메시지를 입력해 주세요.");
      return;
    }
    setIsSubmittingGuestbook(true);
    try {
      const res = await api.post(`/invitations/${data.id}/guestbook`, { writerName, content });
      if (res.data?.success) {
        alert("축하 메시지가 저장되었습니다.");
        setGuestbookForm({ writerName: "", content: "" });
      } else {
        alert(res.data?.error || "메시지 저장에 실패했습니다.");
      }
    } catch (e) {
      alert(e.response?.data?.error || "메시지 저장에 실패했습니다.");
    } finally {
      setIsSubmittingGuestbook(false);
    }
  };
  const preserveScrollWhile = (fn) => {
    if (typeof window === "undefined") {
      fn();
      return;
    }
    const y = window.scrollY;
    fn();
    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
    });
  };


  useEffect(() => {
    if (!isPreview || !onTouchStart) return;
    const handler = (e) => { e.stopPropagation(); e.preventDefault(); onTouchStart(e); };
    const opts = { passive: false };
    const a = fullImageDragRef.current;
    const b = standardPhotoDragRef.current;
    a?.addEventListener("touchstart", handler, opts);
    b?.addEventListener("touchstart", handler, opts);
    return () => {
      a?.removeEventListener("touchstart", handler, opts);
      b?.removeEventListener("touchstart", handler, opts);
    };
  }, [isPreview, onTouchStart]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPreview || compactPreview) return;
    const updateStableHeight = () => setStableViewportHeight(window.innerHeight);
    updateStableHeight();
    window.addEventListener("orientationchange", updateStableHeight);
    return () => window.removeEventListener("orientationchange", updateStableHeight);
  }, [isPreview, compactPreview]);
  const heroFullHeight = isFullImage && compactPreview
    ? { height: 750, minHeight: 750, maxHeight: 750 }
    : isFullImage && phoneFrameHeight != null
      ? { height: phoneFrameHeight, minHeight: phoneFrameHeight, maxHeight: phoneFrameHeight }
      : isFullImage && stableViewportHeight != null
        ? { height: stableViewportHeight, minHeight: stableViewportHeight, maxHeight: stableViewportHeight }
      : isFullImage
        ? { height: "100svh", minHeight: "100vh", maxHeight: "100svh" }
        : undefined;
  const heroSectionStyle = heroFullHeight;

  const sectionRadius = isModern ? "24px" : isClassic ? "40px" : "32px";
  const sectionTitleClass = isModern ? "text-[10px] font-black uppercase tracking-[0.5em] opacity-40" : isClassic ? "text-xs font-semibold tracking-[0.3em] opacity-70" : "text-[10px] font-black uppercase tracking-[0.4em] opacity-30";
  const dividerLine = isModern ? "w-12 h-px bg-current opacity-30" : isClassic ? "w-16 h-px bg-current opacity-50" : "w-8 h-px bg-current opacity-20";
  const fullImageBoxClass = "inset-0";
  const toCharStack = (value) => Array.from(String(value || "").replace(/\n/g, "")).join("\n");
  const groomDisplayText = stackGroomChars ? toCharStack(groomDisplayName) : groomDisplayName;
  const brideDisplayText = stackBrideChars ? toCharStack(brideDisplayName) : brideDisplayName;

  useEffect(() => {
    const recalcHeroNames = () => {
      const wrapEl = heroNamesWrapRef.current;
      const groomMeasureEl = heroGroomMeasureRef.current;
      const brideMeasureEl = heroBrideMeasureRef.current;
      const dividerEl = heroDividerRef.current;
      if (!wrapEl || !groomMeasureEl || !brideMeasureEl || !dividerEl) return;
      const dividerWidth = dividerEl.offsetWidth || 1;
      const totalAvailable = wrapEl.clientWidth;
      const availablePerName = Math.max(20, Math.floor((totalAvailable - dividerWidth - 40) / 2));
      const groomNaturalWidth = groomMeasureEl.scrollWidth;
      const brideNaturalWidth = brideMeasureEl.scrollWidth;

      const groomShouldCharStack = String(groomDisplayName).includes("\n") || groomNaturalWidth > availablePerName;
      const brideShouldCharStack = String(brideDisplayName).includes("\n") || brideNaturalWidth > availablePerName;
      const shouldStackBoth = groomShouldCharStack || brideShouldCharStack;
      setStackGroomChars(shouldStackBoth);
      setStackBrideChars(shouldStackBoth);

    };

    recalcHeroNames();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recalcHeroNames);
    if (heroNamesWrapRef.current) ro.observe(heroNamesWrapRef.current);
    return () => ro.disconnect();
  }, [groomDisplayName, brideDisplayName, namesSize, textScale]);

  useEffect(() => {
    const measureParentWrap = (buttonRef, relationRef, nameRef, phoneRef, measureRef, setter) => {
      const buttonEl = buttonRef.current;
      const relationEl = relationRef.current;
      const nameEl = nameRef.current;
      const phoneEl = phoneRef.current;
      const measureEl = measureRef.current;
      if (!buttonEl || !relationEl || !nameEl || !phoneEl || !measureEl) return;
      const parentWidth = measureEl.scrollWidth;
      const otherWidth = relationEl.offsetWidth + nameEl.offsetWidth + phoneEl.offsetWidth + 64;
      const available = Math.max(60, buttonEl.clientWidth - otherWidth);
      return parentWidth > available;
    };

    const recalc = () => {
      const groomNeedSplit = measureParentWrap(groomFamilyButtonRef, groomFamilyRelationRef, groomFamilyNameRef, groomFamilyPhoneRef, groomFamilyMeasureRef, setSplitGroomParents);
      const brideNeedSplit = measureParentWrap(brideFamilyButtonRef, brideFamilyRelationRef, brideFamilyNameRef, brideFamilyPhoneRef, brideFamilyMeasureRef, setSplitBrideParents);
      const splitBoth = Boolean(groomNeedSplit || brideNeedSplit);
      setSplitGroomParents(splitBoth);
      setSplitBrideParents(splitBoth);
    };

    recalc();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recalc);
    if (groomFamilyButtonRef.current) ro.observe(groomFamilyButtonRef.current);
    if (brideFamilyButtonRef.current) ro.observe(brideFamilyButtonRef.current);
    return () => ro.disconnect();
  }, [familyLineSize, familyRelationSize, groomParentLineText, brideParentLineText, groomDisplayName, brideDisplayName, textScale]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const widthMedia = window.matchMedia("(max-width: 1024px)");
    const pointerMedia = window.matchMedia("(pointer: coarse)");
    const updateViewportMode = () => setIsMobileViewport(getMobileLikeViewport());
    updateViewportMode();
    if (typeof widthMedia.addEventListener === "function" && typeof pointerMedia.addEventListener === "function") {
      widthMedia.addEventListener("change", updateViewportMode);
      pointerMedia.addEventListener("change", updateViewportMode);
      return () => {
        widthMedia.removeEventListener("change", updateViewportMode);
        pointerMedia.removeEventListener("change", updateViewportMode);
      };
    }
    widthMedia.addListener(updateViewportMode);
    pointerMedia.addListener(updateViewportMode);
    return () => {
      widthMedia.removeListener(updateViewportMode);
      pointerMedia.removeListener(updateViewportMode);
    };
  }, []);

  return (
    <div style={{ backgroundColor: bgColor, color: textColor, fontFamily, ...((compactPreview ? { width: "100%", maxWidth: "100%", margin: 0, minHeight: 750, overflow: "hidden", boxSizing: "border-box" } : {})) }} className={`inv-root w-full max-w-[600px] mx-auto shadow-2xl transition-colors duration-500 min-h-screen ${compactPreview ? "flex flex-col" : ""} ${isClassic && !compactPreview ? "border-l border-r border-current/10 max-w-[580px]" : ""}`}>
      {data.bgmUrl && <audio ref={audioRef} src={data.bgmUrl} loop />}

      {showContacts && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center px-4" onClick={() => setShowContacts(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-[500px] rounded-t-[40px] p-10 pb-12 space-y-10 shadow-2xl" style={{ backgroundColor: bgColor }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 opacity-10 rounded-full mx-auto" style={{ backgroundColor: textColor }} />
            <div className="grid grid-cols-2 gap-10">
              {[
                { side: "GROOM", name: data.groomName, phone: data.groomPhone, f: data.groomFather, fp: data.groomFatherPhone, m: data.groomMother, mp: data.groomMotherPhone },
                { side: "BRIDE", name: data.brideName, phone: data.bridePhone, f: data.brideFather, fp: data.brideFatherPhone, m: data.brideMother, mp: data.brideMotherPhone },
              ].map((p) => (
                <div key={p.side} className="space-y-6">
                  <p className="text-[10px] font-black opacity-20 uppercase tracking-widest border-b pb-2" style={{ color: textColor, borderColor: "currentColor" }}>{p.side}</p>
                  <div className="flex justify-between items-center font-bold text-lg"><span>{p.name}</span><a href={`tel:${p.phone}`} className="p-3 rounded-full" style={{ backgroundColor: subBgColor, color: textColor }}><Phone size={14} /></a></div>
                  <div className="space-y-4 opacity-70">
                    {p.f && <div className="flex justify-between items-center"><span className="text-sm">{p.f}</span><a href={`tel:${p.fp}`} className="p-2 rounded-full" style={{ backgroundColor: subBgColor, color: textColor }}><Phone size={12} /></a></div>}
                    {p.m && <div className="flex justify-between items-center"><span className="text-sm">{p.m}</span><a href={`tel:${p.mp}`} className="p-2 rounded-full" style={{ backgroundColor: subBgColor, color: textColor }}><Phone size={12} /></a></div>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowContacts(false)} className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all" style={{ backgroundColor: subBgColor, color: textColor }}>Close</button>
          </div>
        </div>
      )}

      {/* ===== HERO SECTION ===== */}
      <InteractiveSection id="main" dataSection="hero" className={`inv-hero text-center relative ${isFullImage ? "overflow-hidden py-12 flex flex-col items-center justify-center box-border" : `${useCompactHeroTopSpacing ? "pt-16 pb-24" : "py-20 sm:py-24"} ${compactPreview ? "px-0" : "px-5 sm:px-6"} space-y-12 sm:space-y-16`}`} style={heroSectionStyle} isPreview={isPreview} onSelectSection={onSelectSection} activeSection={activeSection} pointColor={pointColor} showPreviewOutline={false} disableActiveScale containerRef={heroSectionRef}>
        {isFullImage && (
          <div
            ref={setFullPhotoContainerRef}
            {...(isPreview && data.mainPhotoFit === "cover" ? { "data-drag-photo": "" } : {})}
            className={`absolute ${fullImageBoxClass} z-0 overflow-hidden`}
            style={{
              ...(isPreview && data.mainPhotoFit === "cover" ? { cursor: "grab" } : {}),
            }}
            onMouseDown={isPreview ? (e) => { e.stopPropagation(); onMouseDown?.(e); } : undefined}
            onClick={isPreview && onPhotoClick && data.mainPhotoFit !== "contain"
              ? (e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                onPhotoClick(x, y, rect.width / rect.height);
              }
              : (!isPreview && enableMainPhotoLightbox && photoUrl ? (e) => { e.stopPropagation(); openLightbox([photoUrl], 0); } : undefined)
            }
          >
            {previewFullBgLayer ? (
              <div className="absolute inset-0 w-full h-full pointer-events-none" style={previewFullBgLayer} />
            ) : (
              <img src={mainRenderUrl} alt="Background" draggable={false} onDragStart={(e) => e.preventDefault()} className={`absolute inset-0 w-full h-full pointer-events-none object-${data.mainPhotoFit || "cover"}`} style={{ objectPosition: previewCoverObjectPosition }} loading="eager" decoding="async" fetchPriority="high" />
            )}
            {showMainPhotoOverlay && (
              <>
                <div className="absolute bg-black/40 z-[5] pointer-events-none" style={{ ...fullOverlayBoxStyle, opacity: effectiveFullImageGradient / 100 }} />
                <div className="absolute bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 pointer-events-none" style={{ ...fullBottomGradientStyle, opacity: effectiveBottomImageGradient / 100 }} />
              </>
            )}
            {isPreview && activeSection === "main" && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  ...(useDynamicFullPreviewSelectionBox ? fullOverlayBoxStyle : { left: "0%", top: "0%", width: "100%", height: "100%" }),
                  boxSizing: "border-box",
                  boxShadow: `inset 0 0 0 2px ${pointColor}`,
                  opacity: 0.45,
                }}
              />
            )}
          </div>
        )}

        <div className={`inv-title-wrap relative z-20 px-6 sm:px-10 w-full flex flex-col items-center justify-center text-center ${isFullImage ? "mb-8" : ""}`}>
          <p data-text-pick="1" onClick={(e) => pickSize(e, "saveTheDateSize")} className="inv-subtitle mb-4 w-full" style={{ color: heroSaveDateColor, ...pickableStyle }}>
            {isModern && <span data-text-pick="1" onClick={(e) => pickSize(e, "saveTheDateSize")} className="font-black uppercase tracking-[0.6em]" style={{ fontSize: `${s(saveTheDateSize)}px`, whiteSpace: "pre-line", ...heroSaveDateReadabilityStyle }}>{saveTheDateText}</span>}
            {isClassic && <span data-text-pick="1" onClick={(e) => pickSize(e, "saveTheDateSize")} className="font-black uppercase tracking-[0.5em]" style={{ fontSize: `${s(saveTheDateSize)}px`, whiteSpace: "pre-line", ...heroSaveDateReadabilityStyle }}>{saveTheDateText}</span>}
            {!isModern && !isClassic && <span data-text-pick="1" onClick={(e) => pickSize(e, "saveTheDateSize")} className="font-black uppercase tracking-[0.5em]" style={{ fontSize: `${s(saveTheDateSize)}px`, whiteSpace: "pre-line", ...heroSaveDateReadabilityStyle }}>{saveTheDateText}</span>}
          </p>
          <h1 data-text-pick="1" onClick={(e) => pickSize(e, "titleSize")} className={`inv-title leading-tight w-full max-w-full ${isModern ? "font-extralight tracking-[0.35em]" : isClassic ? "font-medium tracking-[0.15em]" : "font-extralight tracking-widest"}`} style={{ fontSize: `${titleSize}px`, color: heroTitleColor, whiteSpace: "pre-line", textAlign: "center", ...heroTitleReadabilityStyle, ...pickableStyle }}>{mainTitleText}</h1>
        </div>

        {!isFullImage && photoUrl && (
          <div
            className="flex justify-center"
            style={usePreviewPhotoSizing
              ? {
                  width: "calc(100% + 3rem)",
                  marginLeft: "-1.5rem",
                  marginRight: "-1.5rem",
                }
              : shouldUseOuterEdgeStandardPhotoWidth
              ? {
                  width: isClassic ? "calc(100% + 4rem)" : "calc(100% + 3rem)",
                  marginLeft: isClassic ? "-2rem" : "-1.5rem",
                  marginRight: isClassic ? "-2rem" : "-1.5rem",
                }
              : { width: "100%" }}
          >
            <div
              ref={setStandardPhotoContainerRef}
              {...(isPreview && data.mainPhotoFit === "cover" ? { "data-drag-photo": "" } : {})}
              className={`inv-photo relative overflow-hidden z-10 transition-transform duration-200 ${shouldDisableStandardPhotoHoverScale ? "" : "hover:scale-[1.01]"} ${shouldFlattenStandardPhotoCorners ? "rounded-none" : isModern ? "rounded-2xl" : isClassic ? "rounded-[40px]" : "rounded-[32px]"}`}
              style={{
                width: `${standardPhotoFrameSize.width}px`,
                height: `${standardPhotoFrameSize.height}px`,
                marginBottom: isPreview ? `${-standardBottomSlackPx}px` : undefined,
                backgroundColor: data.mainPhotoFit === "cover" ? "transparent" : subBgColor,
                borderRadius: standardPhotoRadiusValue,
                ...(isPreview && data.mainPhotoFit === "cover" ? { cursor: "grab" } : {}),
              }}
              onMouseDown={(e) => { e.stopPropagation(); onMouseDown?.(e); }}
              onClick={isPreview && onPhotoClick && data.mainPhotoFit !== "contain"
                ? (e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                  const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                  onPhotoClick(x, y, rect.width / rect.height);
                }
                : (!isPreview && enableMainPhotoLightbox && photoUrl ? (e) => { e.stopPropagation(); openLightbox([photoUrl], 0); } : undefined)
              }
            >
              {data.mainPhotoFit === "cover" ? (
                <>
                  <div
                    className="absolute pointer-events-none overflow-hidden"
                    style={{
                      ...standardSharedRectStyle,
                      borderRadius: standardPhotoRadiusValue,
                    }}
                  >
                    {shouldUseStandardPhotoInnerZoom && previewStandardBgLayer ? (
                      <div className="absolute inset-0 w-full h-full" style={previewStandardBgLayer} />
                    ) : (
                      <img
                        src={mainRenderUrl}
                        alt="Wedding"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        className={`absolute inset-0 w-full h-full object-${data.mainPhotoFit || "cover"}`}
                        style={{ objectPosition: previewCoverObjectPosition }}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                      />
                    )}
                  </div>
                  {showMainPhotoOverlay && (
                    <div
                      className="absolute z-[5] pointer-events-none overflow-hidden"
                      style={{
                        ...standardSharedRectStyle,
                        borderRadius: standardPhotoRadiusValue,
                      }}
                    >
                      <div className="absolute inset-0 bg-black/40" style={{ opacity: standardImageGradient / 100 }} />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent z-10" style={{ opacity: bottomImageGradient / 100 }} />
                    </div>
                  )}
                  {isPreview && activeSection === "main" && (
                    <div
                      className="absolute z-20 pointer-events-none"
                      style={{
                        ...standardSharedRectStyle,
                        borderRadius: standardPhotoRadiusValue,
                        boxSizing: "border-box",
                        border: `2px solid ${pointColor}`,
                        opacity: 0.45,
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: standardPhotoRadiusValue }}>
                    <img
                      src={mainRenderUrl}
                      alt="Wedding"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      className={`absolute inset-0 w-full h-full object-${data.mainPhotoFit || "cover"}`}
                      style={{
                        objectPosition: previewCoverObjectPosition,
                      }}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                    />
                  </div>
                  {showMainPhotoOverlay && (
                    <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden" style={{ borderRadius: standardPhotoRadiusValue }}>
                      <div className="absolute inset-0 bg-black/40" style={{ opacity: standardImageGradient / 100 }} />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent z-10" style={{ opacity: bottomImageGradient / 100 }} />
                    </div>
                  )}
                  {isPreview && activeSection === "main" && (
                    <div
                      className="absolute inset-0 z-20 pointer-events-none"
                      style={{
                        borderRadius: standardPhotoRadiusValue,
                        boxSizing: "border-box",
                        border: `2px solid ${pointColor}`,
                        opacity: 0.45,
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className={`inv-hero-info space-y-8 sm:space-y-10 relative z-20 ${isFullImage ? "px-6 sm:px-10 w-full" : ""}`}>
          <div
            ref={heroNamesWrapRef}
            data-text-pick="1"
            onClick={(e) => pickSize(e, "namesSize")}
            className="inv-names flex flex-nowrap items-center justify-center gap-4 sm:gap-10 font-extralight tracking-[0.2em] min-w-0"
            style={{
              fontSize: `clamp(16px, min(${namesSize}px, 8vw), ${namesSize}px)`,
              color: heroNamesColor,
              ...heroNamesReadabilityStyle,
              ...pickableStyle,
            }}
          >
            <span ref={heroGroomNameRef} className="flex-shrink-0" style={{ whiteSpace: stackGroomChars ? "pre-line" : "nowrap" }}>{groomDisplayText}</span>
            <span
              ref={heroDividerRef}
              className="flex-shrink-0 opacity-30 bg-current w-[1px] h-8 sm:h-10"
            />
            <span ref={heroBrideNameRef} className="flex-shrink-0" style={{ whiteSpace: stackBrideChars ? "pre-line" : "nowrap" }}>{brideDisplayText}</span>
            <span ref={heroGroomMeasureRef} className="absolute pointer-events-none opacity-0 -z-10 whitespace-nowrap" style={{ fontSize: `clamp(16px, min(${namesSize}px, 8vw), ${namesSize}px)` }}>{String(groomDisplayName || "").replace(/\n/g, "")}</span>
            <span ref={heroBrideMeasureRef} className="absolute pointer-events-none opacity-0 -z-10 whitespace-nowrap" style={{ fontSize: `clamp(16px, min(${namesSize}px, 8vw), ${namesSize}px)` }}>{String(brideDisplayName || "").replace(/\n/g, "")}</span>
          </div>
          <div className="inv-date space-y-3" style={{ color: heroDateColor, ...heroDateReadabilityStyle }}>
            <p className="tracking-[0.1em]">
              <span data-text-pick="1" data-pick-group="hero-date-time" onClick={(e) => pickSize(e, "dateSize")} style={{ fontSize: `${s(dateSize)}px`, ...pickableStyle }}>{heroDateText}</span>
              <span className="mx-1"> </span>
              <span data-text-pick="1" data-pick-group="hero-date-time" onClick={(e) => pickSize(e, "dateSize")} style={{ fontSize: `${s(heroWeekdaySize)}px`, ...pickableStyle }}>{heroWeekdayText}</span>
            </p>
            <p data-text-pick="1" data-pick-group="hero-date-time" onClick={(e) => pickSize(e, "dateSize")} className="font-medium tracking-widest" style={{ fontSize: `${s(heroTimeSize)}px`, ...pickableStyle }}>{weddingDate.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "numeric", hour12: true })}</p>
          </div>
          <div className="inv-venue pt-4 space-y-4">
            <p data-text-pick="1" onClick={(e) => pickSize(e, "heroVenueNameSize")} className="tracking-[0.2em] font-light" style={{ color: heroVenueColor, fontSize: `${s(heroVenueNameSize)}px`, whiteSpace: "pre-line", ...heroVenueReadabilityStyle, ...pickableStyle }}>{venueDisplayName}</p>
            {dDayEnabled && (
              <div><span data-text-pick="1" onClick={(e) => pickSize(e, "heroDDaySize")} className="inv-dday px-6 py-2 rounded-full border font-black tracking-widest uppercase border-current" style={{ borderColor: heroDdayColor, color: heroDdayColor, fontSize: `${s(heroDDaySize)}px`, ...heroDdayReadabilityStyle, ...pickableStyle }}>{dDayText}</span></div>
            )}
          </div>
        </div>
      </InteractiveSection>

      {/* ===== MESSAGE SECTION ===== */}
      <InteractiveSection id="message" dataSection="message" className={`inv-message ${isModern ? "py-16 sm:py-20 px-5 sm:px-6" : isClassic ? "py-20 sm:py-28 px-5 sm:px-8" : "py-18 sm:py-24 px-5 sm:px-6"}`} isPreview={isPreview} onSelectSection={onSelectSection} activeSection={activeSection} pointColor={pointColor}>
        <div className="max-w-[600px] mx-auto py-12 sm:py-16 px-6 sm:px-12 shadow-sm" style={{ backgroundColor: subBgColor, borderRadius: sectionRadius }}>
          <div className="text-center space-y-10 sm:space-y-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className={dividerLine} style={{ color: pointColor }} />
              <h2 data-text-pick="1" onClick={(e) => pickSize(e, "galleryTitleSize")} className={`inv-section-title ${sectionTitleClass}`} style={{ color: sectionTitleColor, fontSize: `${s(galleryTitleSize)}px`, ...pickableStyle }}>{isClassic ? "초대의 말씀" : "Invitation"}</h2>
              <div className={dividerLine} style={{ color: pointColor }} />
            </div>
            <p data-text-pick="1" onClick={(e) => pickSize(e, "contentSize")} className="inv-message-text leading-[1.7] whitespace-pre-wrap font-light opacity-80 mx-auto max-w-[440px]" style={{ fontSize: `${contentSize}px`, color: messageColor, ...pickableStyle }}>{invitationBodyText}</p>
            {(data.groomFather || data.brideFather) && (
              <div className="pt-8 space-y-6">
                <div className="inv-family flex flex-col items-center gap-6 font-light opacity-60">
                  <button ref={groomFamilyButtonRef} onClick={(e) => { e.stopPropagation(); if (!isPreview) setShowContacts(true); }} className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4 gap-y-1 hover:opacity-100 transition-all group text-left w-full max-w-md">
                    <span data-text-pick="1" data-pick-group="family-intro" onClick={(e) => pickSize(e, "familyLineSize")} className={splitGroomParents ? "flex flex-col items-center leading-tight" : "leading-tight"} style={{ fontSize: `${s(familyLineSize)}px`, ...pickableStyle }}>
                      {splitGroomParents
                        ? (groomParentNames.length ? groomParentNames : [groomParentLineText]).map((name, idx) => (
                            <span key={`groom-parent-${idx}`} style={{ whiteSpace: "pre-line" }}>{name}</span>
                          ))
                        : <span style={{ whiteSpace: "pre-line" }}>{groomParentLineText}</span>}
                    </span>
                    <span ref={groomFamilyRelationRef} data-text-pick="1" data-pick-group="family-intro" onClick={(e) => pickSize(e, "familyLineSize")} className="opacity-50 flex-shrink-0" style={{ fontSize: `${s(familyRelationSize)}px`, whiteSpace: "pre-line", ...pickableStyle }}>의 {groomRelationText}</span>
                    <span ref={groomFamilyNameRef} data-text-pick="1" data-pick-group="family-intro" onClick={(e) => pickSize(e, "familyLineSize")} className="font-normal flex-shrink-0" style={{ fontSize: `${s(familyLineSize)}px`, whiteSpace: "pre-line", ...pickableStyle }}>{groomDisplayName}</span>
                    <span ref={groomFamilyPhoneRef} className="flex-shrink-0">
                      <Phone size={14} className="text-blue-500 opacity-40 group-hover:opacity-100" />
                    </span>
                    <span ref={groomFamilyMeasureRef} className="absolute pointer-events-none opacity-0 -z-10 whitespace-nowrap" style={{ fontSize: `${s(familyLineSize)}px` }}>{groomParentLineText}</span>
                  </button>
                  <button ref={brideFamilyButtonRef} onClick={(e) => { e.stopPropagation(); if (!isPreview) setShowContacts(true); }} className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4 gap-y-1 hover:opacity-100 transition-all group text-left w-full max-w-md">
                    <span data-text-pick="1" data-pick-group="family-intro" onClick={(e) => pickSize(e, "familyLineSize")} className={splitBrideParents ? "flex flex-col items-center leading-tight" : "leading-tight"} style={{ fontSize: `${s(familyLineSize)}px`, ...pickableStyle }}>
                      {splitBrideParents
                        ? (brideParentNames.length ? brideParentNames : [brideParentLineText]).map((name, idx) => (
                            <span key={`bride-parent-${idx}`} style={{ whiteSpace: "pre-line" }}>{name}</span>
                          ))
                        : <span style={{ whiteSpace: "pre-line" }}>{brideParentLineText}</span>}
                    </span>
                    <span ref={brideFamilyRelationRef} data-text-pick="1" data-pick-group="family-intro" onClick={(e) => pickSize(e, "familyLineSize")} className="opacity-50 flex-shrink-0" style={{ fontSize: `${s(familyRelationSize)}px`, whiteSpace: "pre-line", ...pickableStyle }}>의 {brideRelationText}</span>
                    <span ref={brideFamilyNameRef} data-text-pick="1" data-pick-group="family-intro" onClick={(e) => pickSize(e, "familyLineSize")} className="font-normal flex-shrink-0" style={{ fontSize: `${s(familyLineSize)}px`, whiteSpace: "pre-line", ...pickableStyle }}>{brideDisplayName}</span>
                    <span ref={brideFamilyPhoneRef} className="flex-shrink-0">
                      <Phone size={14} className="text-pink-500 opacity-40 group-hover:opacity-100" />
                    </span>
                    <span ref={brideFamilyMeasureRef} className="absolute pointer-events-none opacity-0 -z-10 whitespace-nowrap" style={{ fontSize: `${s(familyLineSize)}px` }}>{brideParentLineText}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </InteractiveSection>

      {/* ===== CALENDAR SECTION ===== */}
      <InteractiveSection id="info" dataSection="calendar" className={`inv-calendar ${isModern ? "py-16 sm:py-20 px-5 sm:px-6" : isClassic ? "py-20 sm:py-28 px-5 sm:px-8" : "py-18 sm:py-24 px-5 sm:px-6"}`} isPreview={isPreview} onSelectSection={onSelectSection} activeSection={activeSection} pointColor={pointColor}>
        <div className="max-w-[700px] mx-auto py-8 px-6 sm:px-12 shadow-sm transition-all" style={{ backgroundColor: calendarBgColor, borderRadius: sectionRadius }}>
          <div className="max-w-[320px] mx-auto text-center" style={{ color: calendarDayColor }}>
            <h2 data-text-pick="1" onClick={(e) => pickSize(e, "calendarTitleSize")} className={`mb-6 opacity-80 ${isModern ? "font-extralight tracking-[0.4em]" : isClassic ? "font-medium tracking-[0.2em]" : "font-light tracking-[0.3em]"}`} style={{ fontSize: `${calendarTitleSize}px`, ...pickableStyle }}>{weddingDate.getFullYear()}. {weddingDate.getMonth() + 1}. {weddingDate.getDate()}</h2>
            <div className="grid grid-cols-7 gap-y-2 font-light" style={{ fontSize: `${s(calendarDaySize)}px` }}>
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d} data-text-pick="1" data-pick-group="calendar-grid" onClick={(e) => pickSize(e, "calendarDaySize")} className="font-black opacity-20" style={pickableStyle}>{d}</div>
              ))}
              {blanks.map((i) => <div key={`b-${i}`} />)}
              {days.map((d) => (
                <div data-text-pick="1" data-pick-group="calendar-grid" onClick={(e) => pickSize(e, "calendarDaySize")} key={d} className={`flex items-center justify-center rounded-full transition-all ${d === weddingDate.getDate() ? "font-bold scale-110 shadow-lg" : ""}`} style={{ height: `${calendarCellSize}px`, ...(d === weddingDate.getDate() ? { backgroundColor: calendarActiveColor, color: "#fff" } : {}), ...pickableStyle }}>
                  {d}
                </div>
              ))}
            </div>
            <style>{`.inv-calendar .grid > div:nth-child(-n+7){font-size:${s(calendarWeekdaySize)}px}`}</style>
          </div>
        </div>
      </InteractiveSection>

      {/* ===== GALLERY SECTION ===== */}
      <InteractiveSection id="album" dataSection="gallery" className={`inv-gallery ${isModern ? "py-18 sm:py-24 px-5 sm:px-6" : isClassic ? "py-20 sm:py-32 px-5 sm:px-8" : "py-20 sm:py-32 px-5 sm:px-6"}`} isPreview={isPreview} onSelectSection={onSelectSection} activeSection={activeSection} pointColor={pointColor}>
        <div className="text-center mb-10 sm:mb-16"><h2 data-text-pick="1" onClick={(e) => pickSize(e, "galleryTitleSize")} className={`inv-section-title ${sectionTitleClass}`} style={{ color: sectionTitleColor, fontSize: `${s(galleryTitleSize)}px`, ...pickableStyle }}>{isClassic ? "갤러리" : "Gallery"}</h2></div>
        <div
          className={`grid grid-cols-3 overflow-hidden gap-1 ${isPreview ? "" : "shadow-2xl"}`}
          style={{ borderRadius: sectionRadius }}
        >
          {isPreview ? (
            previewGalleryItems.length > 0 ? previewGalleryItems.map((url, i) => (
              <div key={i} className="aspect-[3/4] relative group overflow-hidden">
                {url ? (
                  <img
                    src={toThumbnailUrl(url)}
                    alt="Gallery"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    onError={(e) => {
                      if (e.currentTarget.dataset.fallback === "1") return;
                      e.currentTarget.dataset.fallback = "1";
                      e.currentTarget.src = url;
                    }}
                  />
                ) : null}
              </div>
            )) : (
              <div className="col-span-3 py-10 rounded-3xl flex items-center justify-center text-xs font-bold tracking-widest italic opacity-30" style={{ backgroundColor: subBgColor, color: textColor }}>GALLERY IS EMPTY</div>
            )
          ) : currentPhotos.length > 0 ? (
            currentPhotos.map((url, i) => (
              <div key={i} className="aspect-[3/4] relative group overflow-hidden" style={{ backgroundColor: subBgColor }}>
                <img
                  src={toThumbnailUrl(url)}
                  alt="Gallery"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 cursor-zoom-in"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fallback === "1") return;
                    e.currentTarget.dataset.fallback = "1";
                    e.currentTarget.src = url;
                  }}
                  onClick={() => openLightbox(currentPhotos, i)}
                />
              </div>
            ))
          ) : (
            <div className="col-span-3 py-10 rounded-3xl flex items-center justify-center text-xs font-bold tracking-widest italic opacity-30" style={{ backgroundColor: subBgColor, color: textColor }}>GALLERY IS EMPTY</div>
          )}
        </div>
      </InteractiveSection>

      <LightboxHost ref={lightboxRef} />

      {/* ===== VIDEO SECTION ===== */}
      {data.youtubeUrl && (
        <section data-section="video" className="inv-video py-20 sm:py-32 px-5 sm:px-10">
          <div className="text-center mb-10 sm:mb-16"><h2 className="inv-section-title text-[10px] font-black uppercase tracking-[0.4em] opacity-30" style={{ color: sectionTitleColor }}>Video</h2></div>
          <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black">
            <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${data.youtubeUrl.split("v=")[1]?.split("&")[0] || data.youtubeUrl.split("/").pop()}`} title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </section>
      )}

      {/* ===== NOTICE SECTION ===== */}
      {data.noticeContent && (
        <section data-section="notice" className="inv-notice py-20 sm:py-32 px-5 sm:px-10 border-y border-current/5" style={{ backgroundColor: subBgColor }}>
          <div className="max-w-[500px] mx-auto space-y-8 sm:space-y-12">
            <div className="text-center"><h2 className="inv-section-title text-[10px] font-black uppercase tracking-[0.4em] opacity-30" style={{ color: sectionTitleColor }}>{data.noticeTitle || "알림 사항"}</h2></div>
            <div className="p-6 sm:p-10 rounded-[40px] text-sm leading-[1.6] whitespace-pre-wrap font-light opacity-80 shadow-sm" style={{ backgroundColor: bgColor, color: textColor }}>{data.noticeContent}</div>
          </div>
        </section>
      )}

      {/* ===== LOCATION SECTION ===== */}
      <InteractiveSection id="location" dataSection="location" className={`inv-location ${isClassic ? "py-16 sm:py-20 px-5 sm:px-8" : "py-14 sm:py-16 px-5 sm:px-6"} flex flex-col items-center gap-6 sm:gap-8`} isPreview={isPreview} onSelectSection={onSelectSection} activeSection={activeSection} pointColor={pointColor}>
        <div className="text-center space-y-5 sm:space-y-6">
          <h2 data-text-pick="1" onClick={(e) => pickSize(e, "locationTitleSize")} className={`inv-section-title ${sectionTitleClass}`} style={{ color: sectionTitleColor, fontSize: `${s(locationTitleSize)}px`, ...pickableStyle }}>{isClassic ? "오시는 길" : "Location"}</h2>
          <p data-text-pick="1" onClick={(e) => pickSize(e, "locationVenueNameSize")} className="inv-venue-name font-light tracking-widest" style={{ fontSize: `${s(locationVenueNameSize)}px`, whiteSpace: "pre-line", ...pickableStyle }}>{venueDisplayName}</p>
          <p data-text-pick="1" onClick={(e) => pickSize(e, "locationAddressSize")} className="inv-venue-address opacity-50 font-light tracking-wide" style={{ fontSize: `${s(locationAddressSize)}px`, ...pickableStyle }}>{data.venueAddress}</p>
        </div>
        <div
          className="w-full max-w-[1000px] h-[240px] sm:h-[300px] overflow-hidden border border-current/10 shadow-inner"
          style={{ backgroundColor: subBgColor, borderRadius: sectionRadius }}
        >
          <KakaoMap
            venueAddress={data.venueAddress}
            fallbackVenueName={data.venueName}
            allowZoom={!isPreview}
            onResolvedPosition={setNavPosition}
          />
        </div>
        {data.navigationEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-[500px]">
            {[
              { key: "kakao", name: "KakaoNavi", color: "bg-[#FEE500]" },
              { key: "tmap", name: "Tmap", color: "bg-zinc-900" },
              { key: "naver", name: "Naver Map", color: "bg-[#2DB400]" },
            ].map((nav) => (
              <button
                data-text-pick="1"
                data-pick-group="nav-buttons"
                key={nav.name}
                type="button"
                onClick={(e) => {
                  if (isPreview) {
                    pickSize(e, "navButtonTextSize");
                    return;
                  }
                  e.stopPropagation();
                  handleOpenNavigation(nav.key);
                }}
                className={`py-4 rounded-2xl font-bold uppercase tracking-widest shadow-sm active:scale-95 transition-all ${nav.color}`}
                style={{ fontSize: `${s(navButtonTextSize)}px`, color: buttonTextColor, ...(isPreview ? pickableStyle : {}) }}
              >
                {nav.name}
              </button>
            ))}
          </div>
        )}
      </InteractiveSection>

      {/* ===== ACCOUNT SECTION ===== */}
      {bankAccounts.length > 0 && (
        <InteractiveSection id="account" dataSection="account" className="inv-account py-20 sm:py-32 px-5 sm:px-6 border-t border-current/10" isPreview={isPreview} onSelectSection={onSelectSection} activeSection={activeSection} pointColor={pointColor}>
          <div className="max-w-[440px] mx-auto space-y-10 sm:space-y-16">
            <div className="text-center space-y-4"><h2 data-text-pick="1" onClick={(e) => pickSize(e, "accountTitleSize")} className={`inv-section-title ${sectionTitleClass}`} style={{ color: sectionTitleColor, fontSize: `${s(accountTitleSize)}px`, ...pickableStyle }}>{isClassic ? "마음 전하실 곳" : "Account"}</h2><p data-text-pick="1" onClick={(e) => pickSize(e, "accountSubtitleSize")} className="font-light opacity-50 italic" style={{ fontSize: `${s(accountSubtitleSize)}px`, ...pickableStyle }}>축하의 마음을 보내실 곳</p></div>
            <div className="space-y-4">
              {Object.entries(groupedAccounts).map(([side, accounts]) => (
                <div key={side} className="space-y-2">
                  <div
                    className={`w-full p-5 sm:p-6 flex justify-between items-center transition-all ${isClassic ? "rounded-[28px]" : "rounded-3xl"} ${openBankSide === side ? (template === "elegant" ? "bg-white text-zinc-900 shadow-2xl" : "bg-zinc-900 text-white shadow-2xl") : "bg-current/5 hover:bg-current/10"}`}
                    style={openBankSide === side && isClassic ? { backgroundColor: pointColor, color: "#fff" } : {}}
                  >
                    <span
                      data-text-pick="1"
                      onClick={(e) => pickSize(e, "accountToggleLabelSize")}
                      onDoubleClick={(e) => pickSize(e, "accountToggleLabelSize")}
                      className="font-black uppercase tracking-widest"
                      style={{ fontSize: `${s(accountToggleLabelSize)}px`, ...(isPreview ? pickableStyle : {}) }}
                    >
                      {side} 계좌번호 보기
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenBankSide(openBankSide === side ? null : side);
                      }}
                      className="p-1 rounded-md hover:bg-black/10"
                      aria-label={`${side} 계좌 토글`}
                    >
                      <ChevronDown size={14} className={`transition-all ${openBankSide === side ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {openBankSide === side && (
                    <div className="p-2 space-y-2">
                      {accounts.map((acc, i) => (
                        <div key={i} className="p-8 rounded-[32px] border border-current/10 shadow-sm flex flex-col gap-6" style={{ backgroundColor: bgColor, color: textColor }}>
                          <div className="flex justify-between items-center">
                            <span data-text-pick="1" data-pick-group="account-header" onClick={(e) => pickSize(e, "accountHeaderSize")} className="font-extrabold tracking-[0.08em] opacity-80" style={{ fontSize: `${s(accountHeaderSize)}px`, ...pickableStyle }}>{acc.bankName}</span>
                            <button data-text-pick="1" data-pick-group="account-header" onClick={(e) => { if (isPreview) { pickSize(e, "accountHeaderSize"); return; } e.stopPropagation(); navigator.clipboard.writeText(acc.accountNumber); alert("복사되었습니다."); }} className="font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-colors" style={{ backgroundColor: subBgColor, fontSize: `${s(accountHeaderSize)}px`, ...(isPreview ? pickableStyle : {}) }}>Copy</button>
                          </div>
                          <div className="flex justify-between items-end">
                            <span data-text-pick="1" data-pick-group="account-info" onClick={(e) => pickSize(e, "accountInfoSize")} className="font-light tracking-tighter" style={{ fontSize: `${s(accountInfoSize)}px`, ...pickableStyle }}>{acc.accountNumber}</span>
                            <span data-text-pick="1" data-pick-group="account-info" onClick={(e) => pickSize(e, "accountInfoSize")} className="font-bold border-b pb-1" style={{ borderColor: pointColor, fontSize: `${s(Math.round(accountInfoSize * 0.7 * 10) / 10)}px`, ...pickableStyle }}>{acc.ownerName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </InteractiveSection>
      )}

      {(!isPreview || showFormsInPreview) && (
        <InteractiveSection id="attendance" dataSection="attendance" className="inv-attendance py-16 sm:py-20 px-5 sm:px-6 border-t border-current/10" isPreview={isPreview} onSelectSection={onSelectSection} activeSection={activeSection} pointColor={pointColor}>
          <div className="max-w-[760px] mx-auto space-y-8 sm:space-y-10">
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-px opacity-40" style={{ backgroundColor: pointColor }} />
              <h2 data-text-pick="1" onClick={(e) => pickSize(e, "attendanceTitleSize")} className={`inv-section-title ${sectionTitleClass}`} style={{ color: sectionTitleColor, fontSize: `${s(attendanceTitleSize)}px`, ...pickableStyle }}>참석 여부</h2>
              <p data-text-pick="1" onClick={(e) => pickSize(e, "attendanceDescSize")} className="opacity-55 tracking-wide" style={{ fontSize: `${s(attendanceDescSize)}px`, ...pickableStyle }}>간단한 응답을 남겨주시면 예식 준비에 큰 도움이 됩니다.</p>
            </div>
            <div className="rounded-[24px] border border-current/10 p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]" style={{ backgroundColor: subBgColor }}>
              <div className="space-y-2">
                <p data-text-pick="1" data-pick-group="form-labels" onClick={(e) => pickSize(e, "attendanceLabelSize")} className="font-semibold opacity-60" style={{ fontSize: `${s(attendanceLabelSize)}px`, ...pickableStyle }}>성함</p>
                <input
                  data-text-pick="1"
                  data-pick-group="form-placeholders"
                  value={attendanceForm.name}
                  readOnly={isPreview}
                  onMouseDown={(e) => { if (isPreview) pickSize(e, "formPlaceholderSize"); }}
                  onClick={(e) => { if (isPreview) pickSize(e, "formPlaceholderSize"); }}
                  onChange={(e) => preserveScrollWhile(() => setAttendanceForm((prev) => ({ ...prev, name: e.target.value })))}
                  className="inv-form-placeholder w-full px-4 py-3 rounded-xl border border-current/10 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-black/15"
                  style={{ "--placeholder-size": `${s(formPlaceholderSize)}px` }}
                  placeholder="이름을 입력하세요"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p data-text-pick="1" data-pick-group="form-labels" onClick={(e) => pickSize(e, "attendanceLabelSize")} className="font-semibold opacity-60" style={{ fontSize: `${s(attendanceLabelSize)}px`, ...pickableStyle }}>구분</p>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white border border-current/10">
                    <button data-text-pick="1" data-pick-group="attendance-options" onClick={(e) => { if (isPreview) { pickSize(e, "attendanceOptionTextSize"); return; } setAttendanceForm((prev) => ({ ...prev, side: "신랑측" })); }} className={`py-2.5 rounded-lg font-semibold transition-all ${attendanceForm.side === "신랑측" ? "shadow-sm" : "text-zinc-500 hover:bg-zinc-100/70"}`} style={{ fontSize: `${attendanceOptionTextSize}px`, ...(attendanceForm.side === "신랑측" ? { backgroundColor: buttonColor, color: buttonTextColor } : {}), ...(isPreview ? pickableStyle : {}) }}>신랑측</button>
                    <button data-text-pick="1" data-pick-group="attendance-options" onClick={(e) => { if (isPreview) { pickSize(e, "attendanceOptionTextSize"); return; } setAttendanceForm((prev) => ({ ...prev, side: "신부측" })); }} className={`py-2.5 rounded-lg font-semibold transition-all ${attendanceForm.side === "신부측" ? "shadow-sm" : "text-zinc-500 hover:bg-zinc-100/70"}`} style={{ fontSize: `${attendanceOptionTextSize}px`, ...(attendanceForm.side === "신부측" ? { backgroundColor: buttonColor, color: buttonTextColor } : {}), ...(isPreview ? pickableStyle : {}) }}>신부측</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p data-text-pick="1" data-pick-group="form-labels" onClick={(e) => pickSize(e, "attendanceLabelSize")} className="font-semibold opacity-60" style={{ fontSize: `${s(attendanceLabelSize)}px`, ...pickableStyle }}>참석 여부</p>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white border border-current/10">
                    <button data-text-pick="1" data-pick-group="attendance-options" onClick={(e) => { if (isPreview) { pickSize(e, "attendanceOptionTextSize"); return; } setAttendanceForm((prev) => ({ ...prev, attending: true })); }} className={`py-2.5 rounded-lg font-semibold transition-all ${attendanceForm.attending ? "shadow-sm" : "text-zinc-500 hover:bg-zinc-100/70"}`} style={{ fontSize: `${attendanceOptionTextSize}px`, ...(attendanceForm.attending ? { backgroundColor: buttonColor, color: buttonTextColor } : {}), ...(isPreview ? pickableStyle : {}) }}>참석</button>
                    <button data-text-pick="1" data-pick-group="attendance-options" onClick={(e) => { if (isPreview) { pickSize(e, "attendanceOptionTextSize"); return; } setAttendanceForm((prev) => ({ ...prev, attending: false, meal: false })); }} className={`py-2.5 rounded-lg font-semibold transition-all ${!attendanceForm.attending ? "shadow-sm" : "text-zinc-500 hover:bg-zinc-100/70"}`} style={{ fontSize: `${attendanceOptionTextSize}px`, ...(!attendanceForm.attending ? { backgroundColor: buttonColor, color: buttonTextColor } : {}), ...(isPreview ? pickableStyle : {}) }}>불참</button>
                  </div>
                </div>
              </div>

              {attendanceForm.attending && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p data-text-pick="1" data-pick-group="form-labels" onClick={(e) => pickSize(e, "attendanceLabelSize")} className="font-semibold opacity-60" style={{ fontSize: `${s(attendanceLabelSize)}px`, ...pickableStyle }}>참석 인원</p>
                    <div className="h-12 flex items-center justify-between rounded-xl border border-current/10 bg-white px-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          preserveScrollWhile(() => setAttendanceForm((prev) => ({ ...prev, count: Math.max(1, (Number(prev.count) || 1) - 1) })));
                        }}
                        className="w-9 h-9 rounded-lg border border-current/10 text-zinc-900 text-lg font-semibold leading-none hover:bg-zinc-50"
                      >
                        -
                      </button>
                      <div className="min-w-[64px] text-center">
                        <span className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap text-zinc-900 leading-none">
                          <span className="text-[18px] font-semibold tabular-nums">{Math.max(1, Number(attendanceForm.count) || 1)}</span>
                          <span className="text-[15px] font-medium opacity-80">명</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          preserveScrollWhile(() => setAttendanceForm((prev) => ({ ...prev, count: Math.max(1, (Number(prev.count) || 1) + 1) })));
                        }}
                        className="w-9 h-9 rounded-lg border border-current/10 text-zinc-900 text-lg font-semibold leading-none hover:bg-zinc-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p data-text-pick="1" data-pick-group="form-labels" onClick={(e) => pickSize(e, "attendanceLabelSize")} className="font-semibold opacity-60" style={{ fontSize: `${s(attendanceLabelSize)}px`, ...pickableStyle }}>식사 여부</p>
                    <div className="h-12 grid grid-cols-2 gap-2 p-1 rounded-xl bg-white border border-current/10">
                      <button
                        data-text-pick="1"
                        data-pick-group="attendance-options"
                        onClick={(e) => {
                          if (isPreview) { pickSize(e, "attendanceOptionTextSize"); return; }
                          setAttendanceForm((prev) => ({ ...prev, meal: true }));
                        }}
                        className={`h-full rounded-lg text-sm font-bold uppercase tracking-[0.12em] transition-all ${attendanceForm.meal ? "shadow-sm" : "text-zinc-500 hover:bg-zinc-100/70"}`}
                        style={{ ...(attendanceForm.meal ? { backgroundColor: buttonColor, color: buttonTextColor } : {}), ...(isPreview ? { fontSize: `${attendanceOptionTextSize}px`, ...pickableStyle } : {}) }}
                      >
                        O
                      </button>
                      <button
                        data-text-pick="1"
                        data-pick-group="attendance-options"
                        onClick={(e) => {
                          if (isPreview) { pickSize(e, "attendanceOptionTextSize"); return; }
                          setAttendanceForm((prev) => ({ ...prev, meal: false }));
                        }}
                        className={`h-full rounded-lg text-sm font-bold uppercase tracking-[0.12em] transition-all ${!attendanceForm.meal ? "shadow-sm" : "text-zinc-500 hover:bg-zinc-100/70"}`}
                        style={{ ...(!attendanceForm.meal ? { backgroundColor: buttonColor, color: buttonTextColor } : {}), ...(isPreview ? { fontSize: `${attendanceOptionTextSize}px`, ...pickableStyle } : {}) }}
                      >
                        X
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p data-text-pick="1" data-pick-group="form-labels" onClick={(e) => pickSize(e, "attendanceLabelSize")} className="font-semibold opacity-60" style={{ fontSize: `${s(attendanceLabelSize)}px`, ...pickableStyle }}>메모</p>
                <textarea
                  data-text-pick="1"
                  data-pick-group="form-placeholders"
                  value={attendanceForm.message}
                  readOnly={isPreview}
                  onMouseDown={(e) => { if (isPreview) pickSize(e, "formPlaceholderSize"); }}
                  onClick={(e) => { if (isPreview) pickSize(e, "formPlaceholderSize"); }}
                  onChange={(e) => preserveScrollWhile(() => setAttendanceForm((prev) => ({ ...prev, message: e.target.value })))}
                  className="inv-form-placeholder w-full h-24 px-4 py-3 rounded-xl border border-current/10 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/15"
                  style={{ "--placeholder-size": `${s(formPlaceholderSize)}px` }}
                  placeholder={attendanceForm.attending ? "전달 메모 (선택)" : "불참 사유 또는 전달 메모 (선택)"}
                />
              </div>

              <button onClick={submitAttendance} disabled={isSubmittingAttendance || !data?.id} className="w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-sm transition-all hover:brightness-105 active:scale-[0.99]" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>
                {isSubmittingAttendance ? "전송 중..." : "참석 의사 전달"}
              </button>
            </div>
          </div>
        </InteractiveSection>
      )}

      {(!isPreview || showFormsInPreview) && (
        <InteractiveSection id="guestbook" dataSection="guestbook" className="inv-guestbook py-16 sm:py-20 px-5 sm:px-6 border-t border-current/10" isPreview={isPreview} onSelectSection={onSelectSection} activeSection={activeSection} pointColor={pointColor}>
          <div className="max-w-[760px] mx-auto space-y-8 sm:space-y-10">
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-px opacity-40" style={{ backgroundColor: pointColor }} />
              <h2 data-text-pick="1" onClick={(e) => pickSize(e, "guestbookTitleSize")} className={`inv-section-title ${sectionTitleClass}`} style={{ color: sectionTitleColor, fontSize: `${s(guestbookTitleSize)}px`, ...pickableStyle }}>축하 메시지</h2>
              <p data-text-pick="1" onClick={(e) => pickSize(e, "guestbookDescSize")} className="opacity-55 tracking-wide" style={{ fontSize: `${s(guestbookDescSize)}px`, ...pickableStyle }}>짧은 한 줄도 두 분에게는 오래 남는 축복이 됩니다.</p>
            </div>
            <div className="rounded-[24px] border border-current/10 p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]" style={{ backgroundColor: subBgColor }}>
              <div className="space-y-2">
                <p data-text-pick="1" data-pick-group="form-labels" onClick={(e) => pickSize(e, "attendanceLabelSize")} className="font-semibold opacity-60" style={{ fontSize: `${s(attendanceLabelSize)}px`, ...pickableStyle }}>작성자</p>
                <input
                  data-text-pick="1"
                  data-pick-group="form-placeholders"
                  value={guestbookForm.writerName}
                  readOnly={isPreview}
                  onMouseDown={(e) => { if (isPreview) pickSize(e, "formPlaceholderSize"); }}
                  onClick={(e) => { if (isPreview) pickSize(e, "formPlaceholderSize"); }}
                  onChange={(e) => preserveScrollWhile(() => setGuestbookForm((prev) => ({ ...prev, writerName: e.target.value })))}
                  className="inv-form-placeholder w-full px-4 py-3 rounded-xl border border-current/10 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-black/15"
                  style={{ "--placeholder-size": `${s(formPlaceholderSize)}px` }}
                  placeholder="이름"
                />
              </div>
              <div className="space-y-2">
                <p data-text-pick="1" data-pick-group="form-labels" onClick={(e) => pickSize(e, "attendanceLabelSize")} className="font-semibold opacity-60" style={{ fontSize: `${s(attendanceLabelSize)}px`, ...pickableStyle }}>메시지</p>
                <textarea
                  data-text-pick="1"
                  data-pick-group="form-placeholders"
                  value={guestbookForm.content}
                  readOnly={isPreview}
                  onMouseDown={(e) => { if (isPreview) pickSize(e, "formPlaceholderSize"); }}
                  onClick={(e) => { if (isPreview) pickSize(e, "formPlaceholderSize"); }}
                  onChange={(e) => preserveScrollWhile(() => setGuestbookForm((prev) => ({ ...prev, content: e.target.value })))}
                  className="inv-form-placeholder w-full h-36 px-4 py-3 rounded-xl border border-current/10 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/15"
                  style={{ "--placeholder-size": `${s(formPlaceholderSize)}px` }}
                  placeholder="축하 메시지를 남겨주세요"
                />
              </div>
              <button onClick={submitGuestbook} disabled={isSubmittingGuestbook || !data?.id} className="w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-sm transition-all hover:brightness-105 active:scale-[0.99]" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>
                {isSubmittingGuestbook ? "저장 중..." : "축하 메시지 남기기"}
              </button>
            </div>
          </div>
        </InteractiveSection>
      )}
      <style>{`.inv-form-placeholder::placeholder{font-size:var(--placeholder-size,14px);} .inv-picked-flash{animation:inv-picked-flash .45s ease-out 2;} @keyframes inv-picked-flash{0%{box-shadow:0 0 0 0 rgba(15,23,42,.35);background-color:rgba(15,23,42,.08);}100%{box-shadow:0 0 0 10px rgba(15,23,42,0);background-color:transparent;}}`}</style>

      {/* ===== FOOTER ===== */}
      <footer data-section="footer" className="inv-footer py-16 sm:py-20 px-5 sm:px-10 text-center border-t border-current/5">
        {!isPreview && (
          <div className="max-w-[520px] mx-auto mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={copyShareLink}
                className="py-3 rounded-xl text-[12px] font-bold tracking-wide border border-current/15 hover:bg-current/5 transition-colors"
              >
                링크 복사
              </button>
              <button
                type="button"
                onClick={openKakaoAfterCopy}
                className="py-3 rounded-xl text-[12px] font-bold tracking-wide border border-current/15 hover:bg-current/5 transition-colors"
              >
                카카오톡 열기
              </button>
              <button
                type="button"
                onClick={openSmsAfterCopy}
                className="py-3 rounded-xl text-[12px] font-bold tracking-wide border border-current/15 hover:bg-current/5 transition-colors"
              >
                문자 열기
              </button>
            </div>
            {shareCopied && (
              <p className="mt-2 text-[11px] opacity-60">복사됨. 카카오톡/문자에서 붙여넣어 전송하세요.</p>
            )}
          </div>
        )}
        <p data-text-pick="1" onClick={(e) => pickSize(e, "footerWeddingOfSize")} className="font-bold tracking-widest uppercase opacity-40" style={{ color: footerColor, fontSize: `${s(footerWeddingOfSize)}px`, ...pickableStyle }}>Wedding of {groomDisplayName} & {brideDisplayName}</p>
      </footer>

      {!isPreview && data.bgmUrl && (
        <div className="fixed bottom-10 right-10 z-[100]">
          <button onClick={toggleBgm} className="p-4 rounded-full shadow-2xl border transition-all hover:scale-110 active:scale-90" style={{ backgroundColor: isPlaying ? pointColor : bgColor, color: isPlaying ? "#fff" : textColor, borderColor: `${textColor}22` }}>
            {isPlaying ? <Music size={20} /> : <Music2 size={20} />}
          </button>
        </div>
      )}
    </div>
  );
}

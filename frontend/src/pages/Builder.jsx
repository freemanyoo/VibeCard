import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Upload, ChevronLeft, ChevronRight, Monitor, Smartphone, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import api from "../lib/api";
import { TYPO_DEFAULTS, getTypoForTemplate } from "../lib/skinDefaults";
import { toThumbnailUrl, formatImageUrl } from "../lib/imageUrl";
import MobileFrame from "../components/MobileFrame";
import InvitationView from "../components/InvitationView";

let kakaoPlaceScriptPromise = null;

const HERO_TEXT_COLOR_ITEMS = [
  { label: "Save The Date", key: "saveTheDateColor", fallback: "#475569" },
  { label: "메인 제목", key: "titleColor", fallback: "#0f172a" },
  { label: "신랑·신부 이름", key: "nameColor", fallback: "#0f172a" },
  { label: "히어로 날짜/시간", key: "dateColor", fallback: "#0f172a" },
  { label: "히어로 예식장명", key: "heroVenueColor", fallback: "#0f172a" },
  { label: "D-day 배지", key: "heroDdayColor", fallback: "#475569" },
];
const HERO_TEXT_COLOR_KEYS = new Set(HERO_TEXT_COLOR_ITEMS.map((item) => item.key));
const HERO_TEXT_READABILITY_KEY_BY_COLOR_KEY = {
  saveTheDateColor: "saveTheDateReadability",
  titleColor: "heroTitleReadability",
  nameColor: "heroNamesReadability",
  dateColor: "heroDateReadability",
  heroVenueColor: "heroVenueReadability",
  heroDdayColor: "heroDdayReadability",
};

const normalizeHex = (hex) => {
  const raw = String(hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
};
const resolveHeroColorValue = (cfg, key) => {
  const direct = normalizeHex(cfg?.[key]);
  if (direct) return direct;
  if (key === "saveTheDateColor") return normalizeHex(cfg?.saveTheDateColor) || normalizeHex(cfg?.pointColor) || "#475569";
  if (key === "heroDdayColor") return normalizeHex(cfg?.heroDdayColor) || normalizeHex(cfg?.buttonColor) || normalizeHex(cfg?.pointColor) || "#475569";
  if (key === "heroVenueColor") return normalizeHex(cfg?.heroVenueColor) || normalizeHex(cfg?.textColor) || "#0F172A";
  if (key === "titleColor" || key === "nameColor" || key === "dateColor") {
    return normalizeHex(cfg?.textColor) || "#0F172A";
  }
  const meta = HERO_TEXT_COLOR_ITEMS.find((item) => item.key === key);
  return normalizeHex(meta?.fallback) || "#0F172A";
};
const hexToRgba = (hex, alpha = 1) => {
  const safe = normalizeHex(hex);
  if (!safe) return `rgba(15,23,42,${alpha})`;
  const n = Number.parseInt(safe.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const getUiVisibleColor = (hex, forceReadable = true) => {
  const safe = normalizeHex(hex) || "#111111";
  if (forceReadable && safe === "#FFFFFF") return "#111111";
  return safe;
};
const normalizeSlugValue = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || "my-wedding";
};
const isDuplicateSlugError = (message) => {
  const raw = String(message || "");
  if (!raw) return false;
  const lower = raw.toLowerCase();
  return (
    lower.includes("unique index") ||
    lower.includes("unique constraint") ||
    lower.includes("public.uk") ||
    lower.includes("sqlstate: 23505") ||
    raw.includes("이미 사용 중인 청첩장 주소")
  );
};
const clampReadabilityValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};
const resolveHeroReadabilityValue = (cfg, colorKey) => {
  const readabilityKey = HERO_TEXT_READABILITY_KEY_BY_COLOR_KEY[colorKey];
  if (!readabilityKey) return 0;
  return clampReadabilityValue(cfg?.[readabilityKey]);
};

const INVITATION_TYPE_OPTIONS = [
  {
    value: "standard",
    label: "일반 결혼식",
    description: "지금처럼 예식 일정, 장소, 지도, 참석 여부를 일반적으로 받는 기본형입니다.",
  },
  {
    value: "family",
    label: "가족예식",
    description: "가족끼리만 진행하는 예식 안내형입니다. 하객 참석보다는 소식 전달에 맞춰집니다.",
  },
  {
    value: "reception",
    label: "피로연 초대",
    description: "예식은 가족끼리 진행하고, 하객은 피로연에 초대하는 타입입니다. 메인 일정과 장소는 피로연 기준으로 작성합니다.",
  },
  {
    value: "congrats",
    label: "축하마음 전하기",
    description: "가족예식으로 진행하고 직접 초대보다는 축하 인사나 마음 전달 중심으로 구성하는 타입입니다.",
  },
];

const BUILDER_TEXT_PICKER_META = {
  titleSize: { label: "메인 제목", min: 20, max: 80, visibilityKey: "showHeroTitle", visibilityLabel: "메인 제목 표시", textFields: [{ key: "mainTitleText", label: "제목 문구", placeholder: "예: 우리 결혼합니다" }] },
  saveTheDateSize: { label: "Save The Date", min: 8, max: 24, visibilityKey: "showSaveTheDate", visibilityLabel: "Save The Date 표시", textFields: [{ key: "saveTheDateText", label: "문구", placeholder: "예: Save The Date" }] },
  namesSize: {
    label: "신랑·신부 이름", min: 16, max: 60, visibilityKey: "showHeroNames", visibilityLabel: "신랑·신부 이름 표시", textFields: [
      { key: "groomDisplayName", label: "신랑 이름", placeholder: "신랑 이름" },
      { key: "brideDisplayName", label: "신부 이름", placeholder: "신부 이름" },
    ],
    toggleKey: "reverseHeroNames",
    toggleLabel: "이름 좌우 위치 바꾸기",
  },
  dateSize: { label: "히어로 날짜/시간", min: 10, max: 30, visibilityKey: "showHeroDate", visibilityLabel: "히어로 날짜/시간 표시" },
  heroVenueNameSize: { label: "히어로 예식장명", min: 12, max: 40, visibilityKey: "showHeroVenue", visibilityLabel: "히어로 예식장명 표시", textFields: [{ key: "venueDisplayName", label: "예식장명", placeholder: "예식장명" }] },
  heroDDaySize: { label: "D-day 배지", min: 8, max: 24, visibilityKey: "showHeroDday", visibilityLabel: "D-day 배지 표시" },
  messageTitleSize: {
    label: "메시지 제목",
    min: 8,
    max: 32,
    visibilityKey: "showGalleryTitle",
    visibilityLabel: "메시지 제목 표시",
    textFields: [{ key: "messageSectionTitleText", label: "머릿글", placeholder: "예: 전하는 마음" }],
  },
  contentSize: {
    label: "메시지 본문",
    min: 12,
    max: 40,
    visibilityKey: "showInvitationMessage",
    visibilityLabel: "메시지 본문 표시",
    textFields: [
      { key: "messageSectionTitleText", label: "섹션 제목", placeholder: "예: 전하는 마음" },
      { key: "invitationBodyText", label: "본문 문구", placeholder: "메시지 내용을 입력하세요." },
    ],
  },
  noticeTitleSize: { label: "안내 제목", min: 8, max: 32, visibilityKey: "showNoticeTitle", visibilityLabel: "안내 제목 표시", textFields: [{ key: "noticeTitleText", label: "제목 문구", placeholder: "예: 안내 말씀" }] },
  noticeContentSize: { label: "안내 내용", min: 10, max: 28, visibilityKey: "showNoticeContent", visibilityLabel: "안내 내용 표시", textFields: [{ key: "noticeContentText", label: "안내 문구", placeholder: "안내 내용을 입력하세요." }] },
  familyLineSize: {
    label: "가족 소개", min: 10, max: 30, visibilityKey: "showFamilyInfo", visibilityLabel: "가족 소개 표시", textFields: [
      { key: "groomFatherText", label: "신랑측 아버지", placeholder: "예: 김아버지" },
      { key: "groomMotherText", label: "신랑측 어머니", placeholder: "예: 이어머니" },
      { key: "groomRelationText", label: "신랑측 관계", placeholder: "예: 장남" },
      { key: "groomPhone", label: "신랑 연락처", placeholder: "010-1234-5678", inputType: "tel", rows: 1 },
      { key: "groomFatherPhone", label: "신랑측 아버지 연락처", placeholder: "010-1234-5678", inputType: "tel", rows: 1 },
      { key: "groomMotherPhone", label: "신랑측 어머니 연락처", placeholder: "010-1234-5678", inputType: "tel", rows: 1 },
      { key: "brideFatherText", label: "신부측 아버지", placeholder: "예: 박아버지" },
      { key: "brideMotherText", label: "신부측 어머니", placeholder: "예: 최어머니" },
      { key: "brideRelationText", label: "신부측 관계", placeholder: "예: 장녀" },
      { key: "bridePhone", label: "신부 연락처", placeholder: "010-1234-5678", inputType: "tel", rows: 1 },
      { key: "brideFatherPhone", label: "신부측 아버지 연락처", placeholder: "010-1234-5678", inputType: "tel", rows: 1 },
      { key: "brideMotherPhone", label: "신부측 어머니 연락처", placeholder: "010-1234-5678", inputType: "tel", rows: 1 },
    ]
  },
  calendarTitleSize: { label: "달력 제목", min: 12, max: 42, visibilityKey: "showCalendarTitle", visibilityLabel: "달력 제목 표시" },
  calendarDaySize: { label: "달력 요일/날짜", min: 10, max: 24, visibilityKey: "showCalendarGrid", visibilityLabel: "달력 날짜 표시" },
  galleryTitleSize: { label: "Gallery 제목", min: 8, max: 32, visibilityKey: "showGalleryTitle", visibilityLabel: "Gallery 제목 표시" },
  locationTitleSize: { label: "Location 제목", min: 8, max: 24, visibilityKey: "showLocationTitle", visibilityLabel: "Location 제목 표시" },
  locationVenueNameSize: { label: "Location 예식장명", min: 10, max: 40, visibilityKey: "showLocationVenue", visibilityLabel: "Location 예식장명 표시" },
  locationAddressSize: { label: "Location 주소", min: 10, max: 24, visibilityKey: "showLocationAddress", visibilityLabel: "Location 주소 표시" },
  navButtonTextSize: { label: "내비 버튼 텍스트", min: 10, max: 24, visibilityKey: "showNavigationButtons", visibilityLabel: "내비 버튼 표시" },
  accountTitleSize: { label: "Account 제목", min: 8, max: 32, visibilityKey: "showAccountTitle", visibilityLabel: "Account 제목 표시" },
  accountSubtitleSize: { label: "Account 보조문구", min: 9, max: 24, visibilityKey: "showAccountSubtitle", visibilityLabel: "Account 보조문구 표시" },
  accountToggleLabelSize: { label: "계좌 토글 라벨", min: 9, max: 24 },
  accountHeaderSize: { label: "계좌 상단(은행/Copy)", min: 8, max: 22 },
  accountInfoSize: { label: "계좌 정보(번호/예금주)", min: 10, max: 36 },
  attendanceTitleSize: { label: "참석 제목", min: 8, max: 32, visibilityKey: "showAttendanceTitle", visibilityLabel: "참석 제목 표시" },
  attendanceDescSize: { label: "참석 설명", min: 9, max: 24, visibilityKey: "showAttendanceDesc", visibilityLabel: "참석 설명 표시" },
  guestbookTitleSize: { label: "축하 메시지 제목", min: 8, max: 32, visibilityKey: "showGuestbookTitle", visibilityLabel: "축하 메시지 제목 표시" },
  guestbookDescSize: { label: "축하 메시지 설명", min: 9, max: 24, visibilityKey: "showGuestbookDesc", visibilityLabel: "축하 메시지 설명 표시" },
  attendanceLabelSize: { label: "폼 라벨", min: 9, max: 24 },
  attendanceOptionTextSize: { label: "참석 옵션", min: 9, max: 24 },
  formPlaceholderSize: { label: "폼 placeholder", min: 9, max: 24 },
  footerWeddingOfSize: { label: "하단 Wedding of", min: 8, max: 24, visibilityKey: "showFooterWeddingOf", visibilityLabel: "하단 Wedding of 표시" },
};

function loadKakaoPlaceServiceScript(apiKey) {
  if (!apiKey) return Promise.reject(new Error("Missing Kakao JS key"));
  if (typeof window !== "undefined" && window.kakao?.maps?.services) return Promise.resolve();
  if (kakaoPlaceScriptPromise) return kakaoPlaceScriptPromise;
  kakaoPlaceScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kakao-services="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Kakao services load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.async = true;
    script.dataset.kakaoServices = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao services load failed"));
    document.head.appendChild(script);
  });
  return kakaoPlaceScriptPromise;
}

const pickNonEmptyText = (nextValue, fallbackValue) => {
  const raw = typeof nextValue === "string" ? nextValue : (nextValue ?? "");
  return String(raw).trim() ? raw : fallbackValue;
};

const DEFAULT_INVITATION_TITLE = "우리\n결혼합니다";
const DEFAULT_INVITATION_MESSAGE = "약속된 시간이 다가와 사랑의 결실을 맺으려 합니다.\n오직 사랑 하나로 맺어지는 저희의 축복된 시작을 함께해 주십시오.";
const AI_INVITATION_MODEL_OPTIONS = [
  { value: "openclaw1", label: "OpenAI" },
  { value: "openclaw3", label: "Local LLM" },
];
const GALLERY_SORT_OPTIONS = [
  { value: "upload", label: "업로드 순서" },
  { value: "landscape-first", label: "가로 우선" },
  { value: "portrait-first", label: "세로 우선" },
];
const INVITATION_CONTENT_CONFIG_KEYS = [
  "mainTitleText",
  "saveTheDateText",
  "messageSectionTitleText",
  "groomDisplayName",
  "brideDisplayName",
  "venueDisplayName",
  "heroVenueNameText",
  "invitationBodyText",
  "noticeTitleText",
  "noticeContentText",
  "groomFatherText",
  "groomMotherText",
  "groomRelationText",
  "brideFatherText",
  "brideMotherText",
  "brideRelationText",
  "groomParentLineText",
  "brideParentLineText",
];
const getInvitationMessageSectionTitle = (invitationType) => {
  if (invitationType === "reception") return "초대의 말씀";
  if (invitationType === "family") return "전하는 말씀";
  if (invitationType === "congrats") return "전하는 마음";
  return "초대의 말씀";
};
const isVisibilityConfigKey = (key) => /^show[A-Z]/.test(String(key || ""));
const padDateTimeLocalUnit = (value) => String(value).padStart(2, "0");
const formatDateTimeLocalValue = (value) => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${padDateTimeLocalUnit(date.getMonth() + 1)}-${padDateTimeLocalUnit(date.getDate())}T${padDateTimeLocalUnit(date.getHours())}:${padDateTimeLocalUnit(date.getMinutes())}`;
};
const toApiDateTimeValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, datePart, timePart, secondPart] = match;
  return `${datePart}T${timePart}:${secondPart || "00"}`;
};
const normalizeAlbumPhotos = (photos) =>
  Array.from({ length: 9 }, (_, i) => {
    const url = Array.isArray(photos) ? photos[i] : null;
    return typeof url === "string" && String(url).trim().length > 0 ? url : null;
  });
const compactAlbumPhotos = (photos) => {
  const filled = normalizeAlbumPhotos(photos).filter(Boolean);
  return Array.from({ length: 9 }, (_, i) => filled[i] || null);
};
const areAlbumPhotosEqual = (left, right) => {
  const a = normalizeAlbumPhotos(left);
  const b = normalizeAlbumPhotos(right);
  return a.every((value, index) => value === b[index]);
};
const normalizeGalleryUploadOrder = (value) => (
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && String(item).trim().length > 0)
    : []
);
const hasOwnKey = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
const omitInvitationContentConfig = (value) => {
  const next = { ...(value || {}) };
  INVITATION_CONTENT_CONFIG_KEYS.forEach((key) => {
    delete next[key];
  });
  return next;
};
const syncGalleryUploadOrder = (order, photos) => {
  const normalizedPhotos = normalizeAlbumPhotos(photos).filter(Boolean);
  const availableCounts = normalizedPhotos.reduce((acc, url) => {
    acc[url] = (acc[url] || 0) + 1;
    return acc;
  }, {});
  const nextOrder = [];
  normalizeGalleryUploadOrder(order).forEach((url) => {
    if ((availableCounts[url] || 0) <= 0) return;
    nextOrder.push(url);
    availableCounts[url] -= 1;
  });
  normalizedPhotos.forEach((url) => {
    if ((availableCounts[url] || 0) <= 0) return;
    nextOrder.push(url);
    availableCounts[url] -= 1;
  });
  return nextOrder;
};

export default function Builder() {
  const EDITOR_BASE_W = 303;
  const EDITOR_BASE_H = 440;
  const EDITOR_BASE_RATIO = EDITOR_BASE_W / EDITOR_BASE_H;
  const { user } = useAuth();
  const isAdminUser = user?.role === "ADMIN";
  const aiModelOptions = isAdminUser
    ? AI_INVITATION_MODEL_OPTIONS
    : AI_INVITATION_MODEL_OPTIONS.filter((option) => option.value === "openclaw1");
  const emailPrefixToSlug = (email) => {
    const prefix = String(email || "").split("@")[0] || "";
    const normalized = prefix
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 40);
    return normalized || "my-wedding";
  };
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const querySlug = searchParams.get("slug");
  const queryTemplate = searchParams.get("template");
  const [initialData, setInitialData] = useState(null);
  const [loadingData, setLoadingData] = useState(!!querySlug);
  const [showAiInvitationModal, setShowAiInvitationModal] = useState(false);
  const [aiInvitationMode, setAiInvitationMode] = useState("image");
  const [aiInvitationModelAlias, setAiInvitationModelAlias] = useState("openclaw1");
  const [aiInvitationImageStyle, setAiInvitationImageStyle] = useState("standard");
  const [aiInvitationPhotoUrl, setAiInvitationPhotoUrl] = useState(null);
  const [aiInvitationAnalysisImageUrl, setAiInvitationAnalysisImageUrl] = useState(null);
  const [aiInvitationSourceImageId, setAiInvitationSourceImageId] = useState(null);
  const [aiInvitationPhotoDirty, setAiInvitationPhotoDirty] = useState(false);
  const [aiInvitationPrompt, setAiInvitationPrompt] = useState("");
  const [aiInvitationHistory, setAiInvitationHistory] = useState([]);
  const [isAiInvitationGenerating, setIsAiInvitationGenerating] = useState(false);
  const [aiInvitationAnalysis, setAiInvitationAnalysis] = useState("");
  const [aiInvitationColorStrategy, setAiInvitationColorStrategy] = useState("");
  const [aiInvitationCongrats, setAiInvitationCongrats] = useState("");
  const [aiInvitationPendingResult, setAiInvitationPendingResult] = useState(null);
  const [mainPhotoMediaFileId, setMainPhotoMediaFileId] = useState(null);
  const [mainPhotoAnalysisUrl, setMainPhotoAnalysisUrl] = useState(null);

  useEffect(() => {
    // 일반 유저는 OpenAI 고정, 관리자는 OpenAI/Local LLM 중 선택
    if (!isAdminUser) {
      if (aiInvitationModelAlias !== "openclaw1") setAiInvitationModelAlias("openclaw1");
      return;
    }
    if (!AI_INVITATION_MODEL_OPTIONS.some((option) => option.value === aiInvitationModelAlias)) {
      setAiInvitationModelAlias("openclaw1");
    }
  }, [isAdminUser, aiInvitationModelAlias]);

  useEffect(() => {
    if (querySlug) {
      api.get(`/invitations/slug/${querySlug}`).then((res) => setInitialData(res.data.invitation)).catch(() => setInitialData(null)).finally(() => setLoadingData(false));
    }
  }, [querySlug]);

  const [formData, setFormData] = useState({
    groom: "", bride: "", slug: "my-wedding", photoUrl: null,
    weddingDate: formatDateTimeLocalValue(new Date(new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).setHours(12, 0, 0, 0))),
    venueName: "", venueAddress: "", invitationTitle: DEFAULT_INVITATION_TITLE,
    invitationMessage: DEFAULT_INVITATION_MESSAGE,
    groomFather: "", groomMother: "", groomRelation: "장남", groomPhone: "",
    brideFather: "", brideMother: "", brideRelation: "장녀", bridePhone: "",
    groomFatherPhone: "", groomMotherPhone: "", brideFatherPhone: "", brideMotherPhone: "",
    youtubeUrl: "", bgmUrl: "", noticeTitle: "알림 사항", noticeContent: "",
    dDayEnabled: true, navigationEnabled: true, albumPhotos: [], bankAccounts: [],
  });
  const initializedDefaultSlugRef = useRef(false);

  useEffect(() => {
    if (initializedDefaultSlugRef.current) return;
    if (querySlug || initialData) return;
    if (!user?.email) return;
    setFormData((prev) => {
      if (prev.slug && prev.slug !== "my-wedding") return prev;
      return { ...prev, slug: emailPrefixToSlug(user.email) };
    });
    initializedDefaultSlugRef.current = true;
  }, [user?.email, querySlug, initialData]);

  useEffect(() => {
    if (initialData) {
      let parsedConfig = {};
      let parsedAlbumPhotos = [];
      try {
        parsedConfig = JSON.parse(initialData.config || "{}");
      } catch {
        parsedConfig = {};
      }
      try {
        parsedAlbumPhotos = initialData.albumPhotos ? JSON.parse(initialData.albumPhotos) : [];
      } catch {
        parsedAlbumPhotos = [];
      }
      const resolvedInvitationMessage =
        String(initialData.invitationMessage || "").trim()
        || String(parsedConfig.invitationBodyText || "").trim();
      setFormData({
        groom: initialData.groomName ?? "", bride: initialData.brideName ?? "",
        slug: initialData.slug ?? "my-wedding", photoUrl: initialData.mainPhotoUrl ?? null,
        weddingDate: initialData.weddingDate ? formatDateTimeLocalValue(initialData.weddingDate) : formData.weddingDate,
        venueName: initialData.venueName ?? "", venueAddress: initialData.venueAddress ?? "",
        invitationTitle: initialData.invitationTitle ?? "",
        invitationMessage: resolvedInvitationMessage,
        groomFather: initialData.groomFather ?? "", groomMother: initialData.groomMother ?? "",
        groomRelation: initialData.groomRelation ?? "", groomPhone: initialData.groomPhone ?? "",
        brideFather: initialData.brideFather ?? "", brideMother: initialData.brideMother ?? "",
        brideRelation: initialData.brideRelation ?? "", bridePhone: initialData.bridePhone ?? "",
        groomFatherPhone: initialData.groomFatherPhone ?? "", groomMotherPhone: initialData.groomMotherPhone ?? "",
        brideFatherPhone: initialData.brideFatherPhone ?? "", brideMotherPhone: initialData.brideMotherPhone ?? "",
        youtubeUrl: initialData.youtubeUrl ?? "", bgmUrl: initialData.bgmUrl ?? "",
        noticeTitle: initialData.noticeTitle ?? "", noticeContent: initialData.noticeContent ?? "",
        dDayEnabled: initialData.dDayEnabled ?? true, navigationEnabled: initialData.navigationEnabled ?? true,
        albumPhotos: normalizeAlbumPhotos(parsedAlbumPhotos),
        bankAccounts: initialData.bankAccounts ?? [],
      });
      if (initialData.template) setTemplate(initialData.template);
      if (initialData.mainPhotoPosition) setPhotoPosition(initialData.mainPhotoPosition);
      if (initialData.skinId) setSelectedSkinId(initialData.skinId);
      try {
        const p = parsedConfig;
        const nextConfig = buildStoredInvitationConfig(initialData, p, parsedAlbumPhotos);
        const zoom = Number(nextConfig.mainPhotoZoom);
        if (!Number.isNaN(zoom)) setPhotoZoom(Math.max(40, Math.min(180, zoom)));
        const ratio = Number(nextConfig.mainPhotoAspectRatio);
        if (!Number.isNaN(ratio) && ratio > 0) setPhotoAspectRatio(ratio);
        setConfig(nextConfig);
        setGalleryUploadOrder(nextConfig.galleryUploadOrder, normalizeAlbumPhotos(parsedAlbumPhotos));
      } catch { }
    }
  }, [initialData]);

  const updateFormData = (updates) => setFormData((prev) => {
    const resolved = typeof updates === "function" ? updates(prev) : updates;
    if (!resolved || typeof resolved !== "object") return prev;
    if (resolved === prev) return prev;
    return { ...prev, ...resolved };
  });

  const [skins, setSkins] = useState([]);
  const [selectedSkinId, setSelectedSkinId] = useState(null);
  const defaultFullConfig = {
    theme: "modern",
    invitationType: "standard",
    fontFamily: "'Noto Sans KR', sans-serif",
    bgColor: "#f1f5f9",
    subBgColor: "#e2e8f0",
    textColor: "#0f172a",
    pointColor: "#475569",
    showSaveTheDate: true,
    heroTextOffsetX: 0,
    heroTextOffsetY: 0,
    heroSaveDateOffsetX: 0,
    heroSaveDateOffsetY: 0,
    heroTitleOffsetX: 0,
    heroTitleOffsetY: 0,
    heroNamesOffsetX: 0,
    heroNamesOffsetY: 0,
    reverseHeroNames: false,
    heroDateOffsetX: 0,
    heroDateOffsetY: 0,
    heroVenueOffsetX: 0,
    heroVenueOffsetY: 0,
    heroDdayOffsetX: 0,
    heroDdayOffsetY: 0,
    saveTheDateColor: "",
    heroVenueColor: "",
    heroDdayColor: "",
    ...TYPO_DEFAULTS.modern,
    imageStyle: "standard",
    heroTextColorMode: "auto",
    imageHeight: 460,
    imageWidth: 100,
    imageGradient: 38,
    mapHeight: 300,
    mapMaxWidth: 1000,
    gallerySortMode: "upload",
    galleryUploadOrder: [],
  };
  const skinDefaultsBySlug = {
    modern: { bgColor: "#f1f5f9", subBgColor: "#e2e8f0", textColor: "#0f172a", pointColor: "#475569", fontFamily: "'Noto Sans KR', sans-serif", ...TYPO_DEFAULTS.modern, imageHeight: 460, imageGradient: 38, mapHeight: 300, mapMaxWidth: 1000 },
    elegant: { bgColor: "#1a1a1a", subBgColor: "#252525", textColor: "#fafafa", pointColor: "#d4af37", fontFamily: "'Noto Serif KR', serif", ...TYPO_DEFAULTS.elegant, imageHeight: 450, imageGradient: 50, mapHeight: 300, mapMaxWidth: 1000 },
    classic: { bgColor: "#faf6f1", subBgColor: "#f5efe6", textColor: "#4a4035", pointColor: "#8b6914", fontFamily: "'Nanum Myeongjo', serif", ...TYPO_DEFAULTS.classic, imageHeight: 420, imageGradient: 42, mapHeight: 300, mapMaxWidth: 1000 },
  };
  function buildStoredInvitationConfig(invitation, parsedConfig = {}, albumPhotos = []) {
    const templateKey = invitation?.template || "modern";
    const fallback = skinDefaultsBySlug[templateKey] || {};
    const shouldUseCustomHeroText =
      String(parsedConfig.heroTextColorMode || "").toLowerCase() === "custom" || hasExplicitHeroColorConfig(parsedConfig);
    const syncedGalleryUploadOrder = syncGalleryUploadOrder(parsedConfig.galleryUploadOrder, normalizeAlbumPhotos(albumPhotos));
    return {
      ...defaultFullConfig,
      ...(fallback || {}),
      ...parsedConfig,
      invitationType: String(parsedConfig.invitationType || defaultFullConfig.invitationType || "standard"),
      gallerySortMode: String(parsedConfig.gallerySortMode || defaultFullConfig.gallerySortMode || "upload"),
      galleryUploadOrder: syncedGalleryUploadOrder,
      ...(hasOwnKey(parsedConfig, "messageSectionTitleText") ? { messageSectionTitleText: String(parsedConfig.messageSectionTitleText ?? "") } : {}),
      mainTitleText: invitation?.invitationTitle != null ? String(invitation.invitationTitle) : (hasOwnKey(parsedConfig, "mainTitleText") ? String(parsedConfig.mainTitleText ?? "") : ""),
      invitationBodyText: invitation?.invitationMessage != null ? String(invitation.invitationMessage) : (hasOwnKey(parsedConfig, "invitationBodyText") ? String(parsedConfig.invitationBodyText ?? "") : ""),
      groomDisplayName: invitation?.groomName != null ? String(invitation.groomName) : (hasOwnKey(parsedConfig, "groomDisplayName") ? String(parsedConfig.groomDisplayName ?? "") : ""),
      brideDisplayName: invitation?.brideName != null ? String(invitation.brideName) : (hasOwnKey(parsedConfig, "brideDisplayName") ? String(parsedConfig.brideDisplayName ?? "") : ""),
      venueDisplayName: invitation?.venueName != null ? String(invitation.venueName) : (hasOwnKey(parsedConfig, "venueDisplayName") ? String(parsedConfig.venueDisplayName ?? "") : ""),
      heroVenueNameText: invitation?.venueName != null ? String(invitation.venueName) : (hasOwnKey(parsedConfig, "heroVenueNameText") ? String(parsedConfig.heroVenueNameText ?? "") : ""),
      noticeTitleText: invitation?.noticeTitle != null ? String(invitation.noticeTitle) : (hasOwnKey(parsedConfig, "noticeTitleText") ? String(parsedConfig.noticeTitleText ?? "") : ""),
      noticeContentText: invitation?.noticeContent != null ? String(invitation.noticeContent) : (hasOwnKey(parsedConfig, "noticeContentText") ? String(parsedConfig.noticeContentText ?? "") : ""),
      groomFatherText: invitation?.groomFather != null ? String(invitation.groomFather) : (hasOwnKey(parsedConfig, "groomFatherText") ? String(parsedConfig.groomFatherText ?? "") : ""),
      groomMotherText: invitation?.groomMother != null ? String(invitation.groomMother) : (hasOwnKey(parsedConfig, "groomMotherText") ? String(parsedConfig.groomMotherText ?? "") : ""),
      groomRelationText: invitation?.groomRelation != null ? String(invitation.groomRelation) : (hasOwnKey(parsedConfig, "groomRelationText") ? String(parsedConfig.groomRelationText ?? "") : ""),
      brideFatherText: invitation?.brideFather != null ? String(invitation.brideFather) : (hasOwnKey(parsedConfig, "brideFatherText") ? String(parsedConfig.brideFatherText ?? "") : ""),
      brideMotherText: invitation?.brideMother != null ? String(invitation.brideMother) : (hasOwnKey(parsedConfig, "brideMotherText") ? String(parsedConfig.brideMotherText ?? "") : ""),
      brideRelationText: invitation?.brideRelation != null ? String(invitation.brideRelation) : (hasOwnKey(parsedConfig, "brideRelationText") ? String(parsedConfig.brideRelationText ?? "") : ""),
      ...(shouldUseCustomHeroText ? { heroTextColorMode: "custom" } : {}),
      theme: templateKey,
    };
  }
  const [template, setTemplate] = useState(queryTemplate ?? "modern");
  const photoFit = "cover";
  const [photoPosition, setPhotoPosition] = useState("50% 50%");
  const [photoZoom, setPhotoZoom] = useState(100);
  const [photoAspectRatio, setPhotoAspectRatio] = useState(1);
  const [selectedSection, setSelectedSection] = useState(null);
  const [pickedTextKey, setPickedTextKey] = useState(null);
  const [heroBulkColor, setHeroBulkColor] = useState("#475569");
  const [heroBulkReadability, setHeroBulkReadability] = useState(0);
  const [heroSelectedColorKeys, setHeroSelectedColorKeys] = useState(() => HERO_TEXT_COLOR_ITEMS.map((item) => item.key));
  const colorPatchRef = useRef({});
  const colorFrameRef = useRef(null);
  const galleryImageMetaCacheRef = useRef(new Map());
  const galleryUploadOrderRef = useRef([]);
  const handleSectionSelect = (id) => { setSelectedSection(id); const el = document.getElementById(`control-${id}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const [config, setConfig] = useState(() => ({ ...defaultFullConfig }));
  const updateConfig = (updates) => setConfig((prev) => ({ ...prev, ...updates }));
  const gallerySortMode = String(config.gallerySortMode || "upload");
  const getGalleryUploadOrder = (photos = formData.albumPhotos, order = galleryUploadOrderRef.current) => (
    syncGalleryUploadOrder(
      normalizeGalleryUploadOrder(order).length > 0 ? order : config.galleryUploadOrder,
      photos,
    )
  );
  const setGalleryUploadOrder = (nextOrder, nextPhotos = formData.albumPhotos) => {
    const synced = syncGalleryUploadOrder(nextOrder, nextPhotos);
    galleryUploadOrderRef.current = synced;
    updateConfig({ galleryUploadOrder: synced });
    return synced;
  };
  useEffect(() => {
    galleryUploadOrderRef.current = getGalleryUploadOrder();
  }, [config.galleryUploadOrder, formData.albumPhotos]);
  const loadGalleryImageMeta = (url) => {
    const key = String(url || "").trim();
    if (!key) return Promise.resolve({ width: 0, height: 0 });
    const cached = galleryImageMetaCacheRef.current.get(key);
    if (cached) return cached;
    const pending = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = formatImageUrl(key);
    });
    galleryImageMetaCacheRef.current.set(key, pending);
    return pending;
  };
  const sortAlbumPhotosByMode = async (photos, mode = gallerySortMode, uploadOrder = galleryUploadOrderRef.current) => {
    const normalized = normalizeAlbumPhotos(photos);
    const syncedUploadOrder = syncGalleryUploadOrder(uploadOrder, normalized);
    if (mode === "upload") return compactAlbumPhotos(syncedUploadOrder);
    const filled = normalized
      .map((url, index) => ({ url, index }))
      .filter((item) => Boolean(item.url));
    if (filled.length <= 1) return compactAlbumPhotos(normalized);
    const measured = await Promise.all(filled.map(async (item) => ({
      ...item,
      ...(await loadGalleryImageMeta(item.url)),
    })));
    const sorted = [...measured].sort((left, right) => {
      const leftScore = mode === "portrait-first"
        ? (left.height - left.width)
        : (left.width - left.height);
      const rightScore = mode === "portrait-first"
        ? (right.height - right.width)
        : (right.width - right.height);
      if (rightScore !== leftScore) return rightScore - leftScore;
      const primarySizeDiff = mode === "portrait-first"
        ? (right.height - left.height)
        : (right.width - left.width);
      if (primarySizeDiff !== 0) return primarySizeDiff;
      const secondarySizeDiff = mode === "portrait-first"
        ? (right.width - left.width)
        : (right.height - left.height);
      if (secondarySizeDiff !== 0) return secondarySizeDiff;
      return left.index - right.index;
    });
    return compactAlbumPhotos(sorted.map((item) => item.url));
  };
  const handleGallerySortModeChange = async (nextMode) => {
    const syncedUploadOrder = setGalleryUploadOrder(galleryUploadOrderRef.current, formData.albumPhotos);
    updateConfig({ gallerySortMode: nextMode, galleryUploadOrder: syncedUploadOrder });
    const sorted = await sortAlbumPhotosByMode(formData.albumPhotos, nextMode, syncedUploadOrder);
    if (!areAlbumPhotosEqual(sorted, formData.albumPhotos)) {
      updateFormData({ albumPhotos: sorted });
    }
  };
  const removeGalleryPhotoUrl = (targetUrl) => {
    const nextOrder = (() => {
      let removed = false;
      return normalizeGalleryUploadOrder(galleryUploadOrderRef.current).filter((url) => {
        if (!removed && url === targetUrl) {
          removed = true;
          return false;
        }
        return true;
      });
    })();
    setGalleryUploadOrder(nextOrder, normalizeAlbumPhotos(formData.albumPhotos).map((url) => (url === targetUrl ? null : url)));
    updateFormData((prevFormData) => {
      const latestAlbumPhotos = normalizeAlbumPhotos(prevFormData.albumPhotos);
      const nextAlbumPhotos = latestAlbumPhotos.map((url) => (url === targetUrl ? null : url));
      if (typeof targetUrl === "string" && targetUrl.startsWith("blob:")) {
        URL.revokeObjectURL(targetUrl);
      }
      return {
        ...prevFormData,
        albumPhotos: gallerySortMode === "upload" ? nextAlbumPhotos : compactAlbumPhotos(nextAlbumPhotos),
      };
    });
  };
  const replaceGalleryPhotoUrl = (fromUrl, toUrl) => {
    const nextOrder = (() => {
      let replaced = false;
      return normalizeGalleryUploadOrder(galleryUploadOrderRef.current).map((url) => {
        if (!replaced && url === fromUrl) {
          replaced = true;
          return toUrl;
        }
        return url;
      });
    })();
    setGalleryUploadOrder(nextOrder, normalizeAlbumPhotos(formData.albumPhotos).map((url) => (url === fromUrl ? toUrl : url)));
    updateFormData((prevFormData) => {
      const latestAlbumPhotos = normalizeAlbumPhotos(prevFormData.albumPhotos);
      const targetIndex = latestAlbumPhotos.findIndex((url) => url === fromUrl);
      if (targetIndex === -1) {
        if (typeof fromUrl === "string" && fromUrl.startsWith("blob:")) {
          URL.revokeObjectURL(fromUrl);
        }
        return prevFormData;
      }
      latestAlbumPhotos[targetIndex] = toUrl;
      if (typeof fromUrl === "string" && fromUrl.startsWith("blob:")) {
        URL.revokeObjectURL(fromUrl);
      }
      return { ...prevFormData, albumPhotos: latestAlbumPhotos };
    });
  };
  const uploadGalleryAsset = async (file, localUrl) => {
    const compressed = await compressImage(file);
    const data = new FormData();
    data.append("file", compressed);
    try {
      const res = await api.post("/invitations/upload", data, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success && res.data.url) {
        replaceGalleryPhotoUrl(localUrl, res.data.url);
      } else {
        removeGalleryPhotoUrl(localUrl);
      }
    } catch {
      removeGalleryPhotoUrl(localUrl);
    }
  };
  const addGalleryFiles = async (files, preferredIndex = null) => {
    const inputFiles = Array.from(files || []).filter(Boolean);
    if (inputFiles.length === 0) return [];
    const currentAlbumPhotos = normalizeAlbumPhotos(formData.albumPhotos);
    const localEntries = [];

    if (gallerySortMode === "upload") {
      const nextAlbumPhotos = [...currentAlbumPhotos];
      let searchIndex = preferredIndex ?? 0;
      for (const file of inputFiles) {
        const emptyIndex = nextAlbumPhotos.findIndex((url, index) => !url && index >= searchIndex);
        if (emptyIndex === -1) break;
        const localUrl = URL.createObjectURL(file);
        nextAlbumPhotos[emptyIndex] = localUrl;
        localEntries.push({ file, localUrl });
        searchIndex = emptyIndex + 1;
      }
      if (localEntries.length > 0) {
        setGalleryUploadOrder([
          ...normalizeGalleryUploadOrder(galleryUploadOrderRef.current),
          ...localEntries.map((entry) => entry.localUrl),
        ], nextAlbumPhotos);
        updateFormData({ albumPhotos: nextAlbumPhotos });
      }
      return localEntries;
    }

    const existingPhotos = currentAlbumPhotos.filter(Boolean);
    const availableSlots = Math.max(0, 9 - existingPhotos.length);
    for (const file of inputFiles.slice(0, availableSlots)) {
      localEntries.push({ file, localUrl: URL.createObjectURL(file) });
    }
    if (localEntries.length === 0) return [];
    const nextUploadOrder = setGalleryUploadOrder([
      ...normalizeGalleryUploadOrder(galleryUploadOrderRef.current),
      ...localEntries.map((entry) => entry.localUrl),
    ], [
      ...existingPhotos,
      ...localEntries.map((entry) => entry.localUrl),
    ]);
    const sortedAlbumPhotos = await sortAlbumPhotosByMode([
      ...existingPhotos,
      ...localEntries.map((entry) => entry.localUrl),
    ], gallerySortMode, nextUploadOrder);
    updateFormData({ albumPhotos: sortedAlbumPhotos });
    return localEntries;
  };
  const invitationType = String(config.invitationType || "standard");
  const invitationTypeFieldMeta = invitationType === "reception"
    ? {
      infoSectionLabel: "피로연 정보",
      dateLabel: "피로연 일시",
      venueNameLabel: "피로연 장소명",
      venueNamePlaceholder: "피로연 장소 검색어 입력",
      venueAddressLabel: "피로연 주소",
      helperText: "메인 일정, 장소, 지도는 피로연 기준으로 작성됩니다.",
    }
    : invitationType === "family"
      ? {
        infoSectionLabel: "가족예식 정보",
        dateLabel: "가족예식 일시",
        venueNameLabel: "가족예식 장소명",
        venueNamePlaceholder: "가족예식 장소 검색어 입력",
        venueAddressLabel: "가족예식 주소",
        helperText: "참석 여부는 숨겨지고, 장소는 입력한 경우에만 레이아웃에 표시됩니다.",
      }
      : invitationType === "congrats"
        ? {
          infoSectionLabel: "안내 정보",
          dateLabel: "기념일 일시",
          venueNameLabel: "장소명",
          venueNamePlaceholder: "",
          venueAddressLabel: "주소",
          helperText: "일시는 작성하고, 장소는 노출되지 않습니다.",
          dateInputType: "datetime-local",
          showVenueFields: false,
        }
        : {
          infoSectionLabel: "Wedding Info",
          dateLabel: "예식 일시",
          venueNameLabel: "예식장 이름",
          venueNamePlaceholder: "장소명 검색어 입력",
          venueAddressLabel: "예식장 주소",
          helperText: "일정, 장소, 지도, 참석 여부를 포함하는 기본 청첩장 구성이 적용됩니다.",
          dateInputType: "datetime-local",
          showVenueFields: true,
        };
  const hasExplicitHeroColorConfig = (source) => {
    if (!source || typeof source !== "object") return false;
    return HERO_TEXT_COLOR_ITEMS.some((item) => {
      const value = source[item.key];
      return typeof value === "string" && value.trim() !== "";
    });
  };
  const scheduleColorConfigUpdate = (updates) => {
    const hasHeroColorUpdate = Object.keys(updates || {}).some((k) => HERO_TEXT_COLOR_KEYS.has(k));
    const nextUpdates = hasHeroColorUpdate ? { ...updates, heroTextColorMode: "custom" } : updates;
    colorPatchRef.current = { ...colorPatchRef.current, ...nextUpdates };
    if (colorFrameRef.current) return;
    colorFrameRef.current = requestAnimationFrame(() => {
      const patch = colorPatchRef.current;
      colorPatchRef.current = {};
      colorFrameRef.current = null;
      setConfig((prev) => ({ ...prev, ...patch }));
    });
  };
  useEffect(() => () => {
    if (colorFrameRef.current) cancelAnimationFrame(colorFrameRef.current);
  }, []);
  const hasMainPhoto = Boolean(formData.photoUrl || formData.mainPhotoUrl);
  const isFullImageStyle = String(config.imageStyle || "standard") === "full";
  const isHeroTextColorManual = String(config.heroTextColorMode || "auto") === "custom";
  const shouldMirrorFullPhotoHeroWhite = isFullImageStyle && hasMainPhoto && !isHeroTextColorManual;
  const getHeroPickerColor = (key) => (
    shouldMirrorFullPhotoHeroWhite ? "#FFFFFF" : resolveHeroColorValue(config, key)
  );
  useEffect(() => {
    const firstSelected = heroSelectedColorKeys[0] || "pointColor";
    const current = getHeroPickerColor(firstSelected);
    const readability = resolveHeroReadabilityValue(config, firstSelected);
    setHeroBulkColor((prev) => (prev === current ? prev : current));
    setHeroBulkReadability((prev) => (prev === readability ? prev : readability));
  }, [config, heroSelectedColorKeys, shouldMirrorFullPhotoHeroWhite]);
  const toggleHeroColorKey = (key) => {
    setHeroSelectedColorKeys((prev) => (
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    ));
  };
  const applySelectedHeroColor = () => {
    const safeColor = normalizeHex(heroBulkColor);
    if (!safeColor || heroSelectedColorKeys.length === 0) return;
    const updates = {};
    heroSelectedColorKeys.forEach((key) => {
      updates[key] = safeColor;
    });
    updateConfig({ ...updates, heroTextColorMode: "custom" });
  };
  const applySelectedHeroReadability = () => {
    if (heroSelectedColorKeys.length === 0) return;
    const updates = {};
    const value = clampReadabilityValue(heroBulkReadability);
    heroSelectedColorKeys.forEach((colorKey) => {
      const readabilityKey = HERO_TEXT_READABILITY_KEY_BY_COLOR_KEY[colorKey];
      if (!readabilityKey) return;
      updates[readabilityKey] = value;
    });
    updateConfig(updates);
  };
  const updateTextOverride = (key, value) => {
    if (!String(key || "").endsWith("Phone")) {
      updateConfig({ [key]: value });
    }
    if (key === "mainTitleText") updateFormData({ invitationTitle: value });
    if (key === "groomDisplayName") updateFormData({ groom: value });
    if (key === "brideDisplayName") updateFormData({ bride: value });
    if (key === "venueDisplayName") updateFormData({ venueName: value });
    if (key === "invitationBodyText") updateFormData({ invitationMessage: value });
    if (key === "groomFatherText") updateFormData({ groomFather: value });
    if (key === "groomMotherText") updateFormData({ groomMother: value });
    if (key === "groomRelationText") updateFormData({ groomRelation: value });
    if (key === "groomPhone") updateFormData({ groomPhone: value });
    if (key === "groomFatherPhone") updateFormData({ groomFatherPhone: value });
    if (key === "groomMotherPhone") updateFormData({ groomMotherPhone: value });
    if (key === "brideFatherText") updateFormData({ brideFather: value });
    if (key === "brideMotherText") updateFormData({ brideMother: value });
    if (key === "brideRelationText") updateFormData({ brideRelation: value });
    if (key === "bridePhone") updateFormData({ bridePhone: value });
    if (key === "brideFatherPhone") updateFormData({ brideFatherPhone: value });
    if (key === "brideMotherPhone") updateFormData({ brideMotherPhone: value });
    if (key === "noticeTitleText") updateFormData({ noticeTitle: value });
    if (key === "noticeContentText") updateFormData({ noticeContent: value });
  };
  const getTextFieldEditorValue = (key) => {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      return String(config[key] ?? "");
    }
    if (key === "messageSectionTitleText") return getInvitationMessageSectionTitle(String(config.invitationType || "standard"));
    if (key === "mainTitleText") return String(formData.invitationTitle ?? "");
    if (key === "groomDisplayName") return String(formData.groom ?? "");
    if (key === "brideDisplayName") return String(formData.bride ?? "");
    if (key === "venueDisplayName") return String(formData.venueName ?? "");
    if (key === "invitationBodyText") return String(formData.invitationMessage ?? "");
    if (key === "groomFatherText") return String(formData.groomFather ?? "");
    if (key === "groomMotherText") return String(formData.groomMother ?? "");
    if (key === "groomRelationText") return String(formData.groomRelation ?? "");
    if (key === "groomPhone") return String(formData.groomPhone ?? "");
    if (key === "groomFatherPhone") return String(formData.groomFatherPhone ?? "");
    if (key === "groomMotherPhone") return String(formData.groomMotherPhone ?? "");
    if (key === "brideFatherText") return String(formData.brideFather ?? "");
    if (key === "brideMotherText") return String(formData.brideMother ?? "");
    if (key === "brideRelationText") return String(formData.brideRelation ?? "");
    if (key === "bridePhone") return String(formData.bridePhone ?? "");
    if (key === "brideFatherPhone") return String(formData.brideFatherPhone ?? "");
    if (key === "brideMotherPhone") return String(formData.brideMotherPhone ?? "");
    if (key === "noticeTitleText") return String(formData.noticeTitle ?? "");
    if (key === "noticeContentText") return String(formData.noticeContent ?? "");
    return String(config[key] ?? "");
  };
  const handleTextSizePick = (key) => {
    setPickedTextKey(key);
    setSelectedSection("typography");
    const el = document.getElementById("control-typography");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const hiddenTextPickerItems = Object.entries(BUILDER_TEXT_PICKER_META).filter(([, meta]) => meta.visibilityKey && config[meta.visibilityKey] === false);
  const [venueKeyword, setVenueKeyword] = useState("");
  const [venueSearchMode, setVenueSearchMode] = useState("address");
  const [showVenueSearchModal, setShowVenueSearchModal] = useState(false);
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState("");

  useEffect(() => {
    api.get("/skins").then((res) => setSkins(res.data.skins || [])).catch(() => setSkins([]));
  }, []);

  const appliedInitialSkin = useRef(false);
  useEffect(() => {
    if (skins.length === 0 || appliedInitialSkin.current) return;
    if (initialData) return;
    if (querySlug && !initialData) return;
    appliedInitialSkin.current = true;
    const match = skins.find((sk) => sk.slug === template);
    if (match) applySkinConfig(match, { applyTextDefaults: !initialData });
  }, [skins, template, initialData, querySlug]);

  const appliedQueryTemplate = useRef(false);
  useEffect(() => {
    if (!queryTemplate || skins.length === 0 || appliedQueryTemplate.current) return;
    if (initialData) return;
    if (querySlug && !initialData) return;
    const s = skins.find((sk) => sk.slug === queryTemplate);
    if (s) {
      appliedQueryTemplate.current = true;
      applySkinConfig(s, { applyTextDefaults: !initialData });
    }
  }, [queryTemplate, skins, initialData, querySlug]);

  function applySkinConfig(skin, options = {}) {
    if (!skin) return;
    const { applyTextDefaults = false } = options;
    try {
      const raw = skin.config;
      const parsedSource = typeof raw === "string" ? JSON.parse(raw || "{}") : (raw || {});
      const parsed = applyTextDefaults ? parsedSource : omitInvitationContentConfig(parsedSource);
      const fallback = skinDefaultsBySlug[skin.slug];
      const currentVenueName = String(formData.venueName || "").trim();
      const currentInvitationType = String(config.invitationType || defaultFullConfig.invitationType || "standard");
      const currentGallerySortMode = String(config.gallerySortMode || defaultFullConfig.gallerySortMode || "upload");
      const currentGalleryUploadOrder = getGalleryUploadOrder();
      const preservedVisibilityConfig = Object.entries(config || {}).reduce((acc, [key, value]) => {
        if (isVisibilityConfigKey(key)) acc[key] = value;
        return acc;
      }, {});
      const preservedContentConfig = applyTextDefaults
        ? {}
        : INVITATION_CONTENT_CONFIG_KEYS.reduce((acc, key) => {
          if (hasOwnKey(config, key)) acc[key] = config[key];
          return acc;
        }, {});
      const shouldUseCustomHeroText =
        String(parsed.heroTextColorMode || "").toLowerCase() === "custom" || hasExplicitHeroColorConfig(parsed);
      const merged = {
        ...defaultFullConfig,
        ...(fallback || {}),
        ...parsed,
        ...preservedVisibilityConfig,
        ...preservedContentConfig,
        invitationType: currentInvitationType,
        gallerySortMode: currentGallerySortMode,
        galleryUploadOrder: currentGalleryUploadOrder,
        ...(shouldUseCustomHeroText ? { heroTextColorMode: "custom" } : {}),
        theme: skin.slug,
      };
      if (applyTextDefaults) {
        if (currentVenueName) {
          merged.venueDisplayName = currentVenueName;
        } else {
          merged.venueDisplayName = "";
          merged.heroVenueNameText = "";
        }
      }
      if (!merged.bgColor && fallback) merged.bgColor = fallback.bgColor;
      if (!merged.subBgColor && fallback) merged.subBgColor = fallback.subBgColor;
      setConfig(merged);
      if (applyTextDefaults) {
        setFormData((prev) => ({
          ...prev,
          invitationTitle: pickNonEmptyText(parsed.mainTitleText, prev.invitationTitle),
          invitationMessage: pickNonEmptyText(parsed.invitationBodyText, prev.invitationMessage),
          groom: pickNonEmptyText(parsed.groomDisplayName, prev.groom),
          bride: pickNonEmptyText(parsed.brideDisplayName, prev.bride),
          groomFather: pickNonEmptyText(parsed.groomFatherText, prev.groomFather),
          groomMother: pickNonEmptyText(parsed.groomMotherText, prev.groomMother),
          groomRelation: pickNonEmptyText(parsed.groomRelationText, prev.groomRelation),
          brideFather: pickNonEmptyText(parsed.brideFatherText, prev.brideFather),
          brideMother: pickNonEmptyText(parsed.brideMotherText, prev.brideMother),
          brideRelation: pickNonEmptyText(parsed.brideRelationText, prev.brideRelation),
        }));
      }
      setTemplate(skin.slug);
      setSelectedSkinId(skin.id);
    } catch { }
  }
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState("mobile");
  const dragStart = useRef({ x: 0, y: 0, pos: "", lockX: false, lockY: false, fixedX: 50, fixedY: 0 });
  const isDraggingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const containerRef = useRef(null);
  const audioRef = useRef(null);
  const pendingPosRef = useRef(null);
  const previewPhotoContainerRef = useRef(null);
  const editorPhotoContainerRef = useRef(null);
  const prevImageStyleRef = useRef(String(config.imageStyle || "standard"));
  const compressImage = async (file, maxWidth = 1800, maxHeight = 1800, quality = 0.82) => {
    if (!file.type.startsWith("image/")) return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) return resolve(file);
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" }));
          }, "image/jpeg", quality);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const parsePhotoPosition = (pos) => {
    const [rawX = "50%", rawY = "50%"] = String(pos || "50% 50%").trim().split(/\s+/);
    const toPercent = (v) => {
      const n = Number.parseFloat(String(v).replace("%", ""));
      if (Number.isNaN(n)) return "50%";
      return `${Math.max(0, Math.min(100, n))}%`;
    };
    return { x: toPercent(rawX), y: toPercent(rawY) };
  };
  const getCoverMetrics = (containerRatio) => {
    const ratio = photoAspectRatio || 1;
    const safeRatio = containerRatio > 0 ? containerRatio : EDITOR_BASE_RATIO;
    const baseW = ratio >= safeRatio ? (ratio / safeRatio) * 100 : 100;
    const baseH = ratio >= safeRatio ? 100 : (safeRatio / ratio) * 100;
    const shouldClampFullImageMinZoom = String(config.imageStyle || "standard") === "full" && ratio < safeRatio;
    const minScale = shouldClampFullImageMinZoom ? 1 : 0.4;
    const scale = Math.max(minScale, Math.min(180, photoZoom) / 100);
    const width = baseW * scale;
    const height = baseH * scale;
    return { width, height, lockX: width <= 100, lockY: height <= 100 };
  };
  const getContainerRatio = (el) => {
    if (!el) return EDITOR_BASE_RATIO;
    const w = el.clientWidth;
    const h = el.clientHeight;
    return w > 0 && h > 0 ? (w / h) : EDITOR_BASE_RATIO;
  };
  const getEditorCoverMetrics = () => getCoverMetrics(EDITOR_BASE_RATIO);
  const getEditorCoverBgSize = () => {
    const m = getEditorCoverMetrics();
    const bgW = (EDITOR_BASE_W * m.width) / 100;
    const bgH = (EDITOR_BASE_H * m.height) / 100;
    return `${bgW}px ${bgH}px`;
  };
  const getEditorCoverBgPosition = () => {
    const m = getEditorCoverMetrics();
    const x = m.lockX ? "50%" : "var(--photo-x, 50%)";
    const y = m.lockY ? "0%" : "var(--photo-y, 50%)";
    return `${x} ${y}`;
  };
  const getEditorMinZoom = () => {
    const ratio = photoAspectRatio || 1;
    const shouldClampFullImageMinZoom = String(config.imageStyle || "standard") === "full" && ratio < EDITOR_BASE_RATIO;
    return shouldClampFullImageMinZoom ? 100 : 40;
  };
  const normalizeCoverPosition = (pos, containerRatio) => {
    const m = getCoverMetrics(containerRatio);
    const parsed = parsePhotoPosition(pos);
    const xNum = Number.parseFloat(String(parsed.x).replace("%", ""));
    const yNum = Number.parseFloat(String(parsed.y).replace("%", ""));
    const nx = m.lockX ? 50 : Math.max(0, Math.min(100, Number.isNaN(xNum) ? 50 : xNum));
    const ny = m.lockY ? 0 : Math.max(0, Math.min(100, Number.isNaN(yNum) ? 50 : yNum));
    return `${nx}% ${ny}%`;
  };
  useEffect(() => {
    if (!formData.photoUrl || photoFit !== "cover") return;
    const minZoom = getEditorMinZoom();
    if (photoZoom < minZoom) setPhotoZoom(minZoom);
  }, [config.imageStyle, photoAspectRatio, photoFit, formData.photoUrl, photoZoom]);
  useEffect(() => {
    if (!formData.photoUrl || photoFit !== "cover") return;
    const previewRatio = getContainerRatio(previewPhotoContainerRef.current);
    const normalized = normalizeCoverPosition(photoPosition, previewRatio);
    if (normalized !== photoPosition) {
      setPhotoPosition(normalized);
      return;
    }
    applyPhotoPositionVars(normalized);
  }, [photoZoom, photoAspectRatio, photoFit, formData.photoUrl]);
  useEffect(() => {
    if (!formData.photoUrl || photoFit !== "cover") {
      prevImageStyleRef.current = String(config.imageStyle || "standard");
      return;
    }
    const currentImageStyle = String(config.imageStyle || "standard");
    if (prevImageStyleRef.current === currentImageStyle) return;
    prevImageStyleRef.current = currentImageStyle;
    requestAnimationFrame(() => {
      const previewRatio = getContainerRatio(previewPhotoContainerRef.current);
      const normalized = normalizeCoverPosition(photoPosition, previewRatio);
      if (normalized !== photoPosition) {
        setPhotoPosition(normalized);
        return;
      }
      applyPhotoPositionVars(normalized);
    });
  }, [config.imageStyle, formData.photoUrl, photoFit, photoPosition]);
  const applyPhotoPositionVars = (pos) => {
    const { x, y } = parsePhotoPosition(pos);
    [previewPhotoContainerRef.current, editorPhotoContainerRef.current].forEach((el) => {
      if (!el) return;
      el.style.setProperty("--photo-x", x);
      el.style.setProperty("--photo-y", y);
    });
  };
  useEffect(() => {
    if (photoFit !== "cover" || isPointerDownRef.current) return;
    applyPhotoPositionVars(photoPosition);
  }, [photoPosition, photoFit]);

  const startPointer = (clientX, clientY, containerRatio) => {
    hasDraggedRef.current = false;
    const m = getCoverMetrics(containerRatio);
    const parsed = parsePhotoPosition(photoPosition.includes("%") ? photoPosition : "50% 50%");
    const x = m.lockX ? "50%" : parsed.x;
    const y = m.lockY ? "0%" : parsed.y;
    const pos = `${x} ${y}`;
    dragStart.current = { x: clientX, y: clientY, pos, lockX: m.lockX, lockY: m.lockY, fixedX: 50, fixedY: 0 };
    pendingPosRef.current = pos;
    applyPhotoPositionVars(pos);
    isPointerDownRef.current = true;
    document.body.style.userSelect = "none";
  };
  const handleMouseDown = (e) => {
    if (photoFit !== "cover" || e.button !== 0) return;
    e.preventDefault();
    startPointer(e.clientX, e.clientY, getContainerRatio(e.currentTarget));
  };
  const handlePhotoClick = (xPercent, yPercent, containerRatio) => {
    if (hasDraggedRef.current || photoFit !== "cover") return;
    const m = getCoverMetrics(containerRatio);
    const x = m.lockX ? 50 : xPercent;
    const y = m.lockY ? 0 : yPercent;
    setPhotoPosition(`${x}% ${y}%`);
  };

  const getClient = (e) => (e.touches ? e.touches[0] : e.changedTouches ? e.changedTouches[0] : e);
  const handleTouchStart = (e) => {
    if (photoFit !== "cover") return;
    const t = getClient(e);
    if (!t) return;
    e.preventDefault();
    startPointer(t.clientX, t.clientY, getContainerRatio(e.currentTarget));
  };

  useEffect(() => {
    const dragThreshold = 3;
    const onMove = (e) => {
      if (!isPointerDownRef.current || photoFit !== "cover") return;
      const c = e.touches ? e.touches[0] : e;
      const cp = dragStart.current.pos.split(/\s+/);
      const dx = c.clientX - dragStart.current.x;
      const dy = c.clientY - dragStart.current.y;
      if (!isDraggingRef.current && Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) return;
      e.preventDefault();
      hasDraggedRef.current = true;
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      const startX = parseFloat(String(cp[0]).replace("%", ""));
      const startY = parseFloat(String(cp[1]).replace("%", ""));
      const nx = dragStart.current.lockX ? dragStart.current.fixedX : Math.max(0, Math.min(100, startX - dx / 1.5));
      const ny = dragStart.current.lockY ? dragStart.current.fixedY : Math.max(0, Math.min(100, startY - dy / 1.5));
      const next = `${nx}% ${ny}%`;
      pendingPosRef.current = next;
      applyPhotoPositionVars(next);
    };
    const onUp = () => {
      if (!isPointerDownRef.current) return;
      isPointerDownRef.current = false;
      if (hasDraggedRef.current) {
        const finalPos = pendingPosRef.current ?? dragStart.current.pos;
        pendingPosRef.current = finalPos;
        setPhotoPosition(finalPos);
        applyPhotoPositionVars(finalPos);
      }
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [photoFit]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const resolvedInvitationMessage =
        String(config.invitationBodyText || "").trim() ||
        String(formData.invitationMessage || "").trim() ||
        DEFAULT_INVITATION_MESSAGE;
      const persistedConfig = {
        ...config,
        galleryUploadOrder: getGalleryUploadOrder(),
        mainTitleText: String(formData.invitationTitle ?? ""),
        invitationBodyText: resolvedInvitationMessage,
        groomDisplayName: String(formData.groom ?? ""),
        brideDisplayName: String(formData.bride ?? ""),
        venueDisplayName: String(formData.venueName ?? ""),
        heroVenueNameText: hasOwnKey(config, "heroVenueNameText") ? String(config.heroVenueNameText ?? "") : String(formData.venueName ?? ""),
        noticeTitleText: String(formData.noticeTitle ?? ""),
        noticeContentText: String(formData.noticeContent ?? ""),
        groomFatherText: String(formData.groomFather ?? ""),
        groomMotherText: String(formData.groomMother ?? ""),
        groomRelationText: String(formData.groomRelation ?? ""),
        brideFatherText: String(formData.brideFather ?? ""),
        brideMotherText: String(formData.brideMother ?? ""),
        brideRelationText: String(formData.brideRelation ?? ""),
        mainPhotoZoom: photoZoom,
        mainPhotoAspectRatio: photoAspectRatio,
      };
      const res = await api.post("/invitations", {
        id: initialData?.id, slug: formData.slug, groomName: formData.groom, brideName: formData.bride,
        weddingDate: toApiDateTimeValue(formData.weddingDate), venueName: formData.venueName, venueAddress: formData.venueAddress,
        mainPhotoUrl: formData.photoUrl || undefined, mainPhotoFit: photoFit, mainPhotoPosition: photoPosition, template,
        skinId: selectedSkinId || undefined,
        invitationTitle: formData.invitationTitle, invitationMessage: resolvedInvitationMessage,
        groomFather: formData.groomFather, groomMother: formData.groomMother, groomRelation: formData.groomRelation, groomPhone: formData.groomPhone,
        brideFather: formData.brideFather, brideMother: formData.brideMother, brideRelation: formData.brideRelation, bridePhone: formData.bridePhone,
        groomFatherPhone: formData.groomFatherPhone, groomMotherPhone: formData.groomMotherPhone,
        brideFatherPhone: formData.brideFatherPhone, brideMotherPhone: formData.brideMotherPhone,
        albumPhotos: JSON.stringify(normalizeAlbumPhotos(formData.albumPhotos)), bankAccounts: formData.bankAccounts,
        youtubeUrl: formData.youtubeUrl, bgmUrl: formData.bgmUrl, noticeTitle: formData.noticeTitle, noticeContent: formData.noticeContent,
        dDayEnabled: formData.dDayEnabled,
        navigationEnabled: formData.navigationEnabled,
        config: JSON.stringify(persistedConfig),
      });
      if (res.data.success) {
        alert("저장 완료되었습니다. 대시보드로 이동합니다.");
        navigate("/dashboard");
      }
      else alert(`저장 실패: ${res.data.error}`);
    } catch (err) {
      const rawError = err.response?.data?.error || err.message || "";
      if (isDuplicateSlugError(rawError)) {
        const base = normalizeSlugValue(formData.slug);
        const suggested = `${base}-${String(Date.now()).slice(-4)}`;
        updateFormData({ slug: suggested });
        alert(`이미 사용 중인 주소입니다.\n다른 주소로 저장해 주세요.\n추천 주소: ${suggested}`);
        return;
      }
      alert(`저장 실패: ${rawError}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;

    // 1. Show local preview instantly
    const localUrl = URL.createObjectURL(file);
    updateFormData({ photoUrl: localUrl });
    if (!aiInvitationPhotoDirty) {
      setAiInvitationPhotoUrl(localUrl);
    }

    try {
      // 2. Background compression and upload
      const compressed = await compressImage(file);
      const data = new FormData(); data.append("file", compressed);
      const res = await api.post("/invitations/upload", data, { headers: { "Content-Type": "multipart/form-data" } });

      if (res.data.success && res.data.url) {
        // 3. Swap local preview with server URL
        updateFormData({ photoUrl: res.data.url });
        setMainPhotoMediaFileId(res.data.mediaFileId || null);
        setMainPhotoAnalysisUrl(res.data.analysisImageUrl || res.data.url);
        if (!aiInvitationPhotoDirty) {
          setAiInvitationPhotoUrl(res.data.url);
          setAiInvitationAnalysisImageUrl(res.data.analysisImageUrl || res.data.url);
          setAiInvitationSourceImageId(res.data.mediaFileId || null);
        }
      } else {
        alert("업로드 실패");
      }
    } catch {
      alert("업로드 실패");
    }
  };
  const closeAiInvitationModal = () => {
    setShowAiInvitationModal(false);
    setAiInvitationPendingResult(null);
    setAiInvitationAnalysis("");
    setAiInvitationColorStrategy("");
    setAiInvitationCongrats("");
  };
  const openAiInvitationModal = () => {
    setAiInvitationImageStyle(String(config.imageStyle || "standard") === "full" ? "full" : "standard");
    setAiInvitationPhotoUrl(formData.photoUrl || null);
    setAiInvitationAnalysisImageUrl(mainPhotoAnalysisUrl || formData.photoUrl || null);
    setAiInvitationSourceImageId(mainPhotoMediaFileId || null);
    setAiInvitationPhotoDirty(false);
    setAiInvitationPendingResult(null);
    setAiInvitationAnalysis("");
    setAiInvitationColorStrategy("");
    setAiInvitationCongrats("");
    setShowAiInvitationModal(true);
  };
  const handleAiInvitationPhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;

    // Show local preview instantly
    const localUrl = URL.createObjectURL(file);
    setAiInvitationPhotoUrl(localUrl);
    setAiInvitationAnalysisImageUrl(localUrl);
    setAiInvitationSourceImageId(null);
    setAiInvitationPhotoDirty(true);
    setAiInvitationPendingResult(null);
    setAiInvitationAnalysis("");
    setAiInvitationColorStrategy("");
    setAiInvitationCongrats("");

    try {
      const compressed = await compressImage(file);
      const data = new FormData(); data.append("file", compressed);
      const res = await api.post("/invitations/upload", data, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success && res.data.url) {
        setAiInvitationPhotoUrl(res.data.url);
        setAiInvitationAnalysisImageUrl(res.data.analysisImageUrl || res.data.url);
        setAiInvitationSourceImageId(res.data.mediaFileId || null);
      }
      else alert("업로드 실패");
    } catch {
      alert("업로드 실패");
    }
  };
  const handleAiInvitationImageGenerate = async () => {
    if (!aiInvitationPhotoUrl) {
      alert("참고 이미지를 먼저 업로드해 주세요.");
      return;
    }
    let aiPhotoInput = aiInvitationPhotoUrl;
    try {
      aiPhotoInput = new URL(String(aiInvitationAnalysisImageUrl || aiInvitationPhotoUrl), window.location.origin).toString();
    } catch {
      aiPhotoInput = aiInvitationAnalysisImageUrl || aiInvitationPhotoUrl;
    }
    const effectiveModelAlias = isAdminUser ? aiInvitationModelAlias : "openclaw1";
    console.log("[AI Invitation] image request", {
      modelAlias: effectiveModelAlias,
      imageStyle: aiInvitationImageStyle,
      aiInvitationPhotoUrl,
      aiInvitationAnalysisImageUrl,
      formPhotoUrl: formData.photoUrl,
      aiInvitationPhotoDirty,
      analysisImageUrl: aiPhotoInput,
      sourceImageId: aiInvitationSourceImageId,
    });
    const selectedModelLabel = AI_INVITATION_MODEL_OPTIONS.find((item) => item.value === effectiveModelAlias)?.label || "OpenAI";
    const historyLabel = `이미지 기반 · ${selectedModelLabel} · ${aiInvitationImageStyle === "full" ? "전체 사진" : "일반 박스"} · ${aiInvitationPhotoUrl ? "사진 업로드됨" : "기본 이미지"}`;
    setIsAiInvitationGenerating(true);
    try {
      const res = await api.post("/invitations/ai-generate-from-image", {
        sourceImageId: aiInvitationSourceImageId || null,
        analysisImageUrl: aiPhotoInput,
        imageStyle: aiInvitationImageStyle,
        modelAlias: effectiveModelAlias,
      });
      const configPatch = res.data?.configPatch && typeof res.data.configPatch === "object" ? res.data.configPatch : {};
      setAiInvitationAnalysis(String(res.data?.analysisSummary || ""));
      setAiInvitationColorStrategy(String(res.data?.colorStrategy || ""));
      setAiInvitationCongrats(String(res.data?.congratulatoryMessage || ""));
      setAiInvitationHistory((prev) => [historyLabel, ...prev.filter((item) => item !== historyLabel)].slice(0, 6));
      setAiInvitationPendingResult({
        configPatch,
        photoUrl: aiInvitationPhotoUrl,
        analysisImageUrl: aiInvitationAnalysisImageUrl || aiInvitationPhotoUrl || null,
        sourceImageId: aiInvitationSourceImageId || null,
        imageStyle: aiInvitationImageStyle,
      });
      setSelectedSection("main");
    } catch (err) {
      const message = err.response?.data?.error || err.message || "AI 청첩장 생성 실패";
      alert(message);
    } finally {
      setIsAiInvitationGenerating(false);
    }
  };
  const handleAiInvitationPromptGenerate = async () => {
    const trimmed = aiInvitationPrompt.trim();
    if (!trimmed) {
      alert("AI 프롬프트를 입력해 주세요.");
      return;
    }

    const effectiveModelAlias = isAdminUser ? aiInvitationModelAlias : "openclaw1";
    const selectedModelLabel = AI_INVITATION_MODEL_OPTIONS.find((item) => item.value === effectiveModelAlias)?.label || "OpenAI";
    const historyLabel = `명령어 기반 · ${selectedModelLabel} · ${trimmed}`;
    let aiPhotoInput = aiInvitationPhotoUrl;
    try {
      aiPhotoInput = new URL(String(aiInvitationAnalysisImageUrl || aiInvitationPhotoUrl || ""), window.location.origin).toString();
    } catch {
      aiPhotoInput = aiInvitationAnalysisImageUrl || aiInvitationPhotoUrl || null;
    }
    setIsAiInvitationGenerating(true);
    try {
      const res = await api.post("/invitations/ai-generate-from-prompt", {
        prompt: trimmed,
        sourceImageId: aiInvitationSourceImageId || null,
        analysisImageUrl: aiPhotoInput,
        photoUrl: aiInvitationPhotoUrl || null,
        imageStyle: aiInvitationImageStyle,
        modelAlias: effectiveModelAlias,
      });
      const configPatch = res.data?.configPatch && typeof res.data.configPatch === "object" ? res.data.configPatch : {};
      setAiInvitationAnalysis(String(res.data?.analysisSummary || ""));
      setAiInvitationColorStrategy(String(res.data?.colorStrategy || ""));
      setAiInvitationCongrats(String(res.data?.congratulatoryMessage || ""));
      setAiInvitationHistory((prev) => [historyLabel, ...prev.filter((item) => item !== historyLabel)].slice(0, 6));
      setAiInvitationPendingResult({
        configPatch,
        photoUrl: aiInvitationPhotoUrl || null,
        analysisImageUrl: aiInvitationAnalysisImageUrl || aiInvitationPhotoUrl || null,
        sourceImageId: aiInvitationSourceImageId || null,
        imageStyle: aiInvitationImageStyle,
      });
      setSelectedSection("main");
    } catch (err) {
      const message = err.response?.data?.error || err.message || "AI 청첩장 생성 실패";
      alert(message);
    } finally {
      setIsAiInvitationGenerating(false);
    }
  };
  const handleApplyAiInvitationResult = () => {
    if (!aiInvitationPendingResult) return;
    const nextPatch = aiInvitationPendingResult.configPatch && typeof aiInvitationPendingResult.configPatch === "object"
      ? aiInvitationPendingResult.configPatch
      : {};
    updateConfig({ imageStyle: aiInvitationPendingResult.imageStyle || aiInvitationImageStyle, ...nextPatch });
    if (aiInvitationPendingResult.photoUrl) {
      updateFormData({ photoUrl: aiInvitationPendingResult.photoUrl });
      setMainPhotoMediaFileId(aiInvitationPendingResult.sourceImageId || null);
      setMainPhotoAnalysisUrl(aiInvitationPendingResult.analysisImageUrl || aiInvitationPendingResult.photoUrl);
      setAiInvitationPhotoDirty(false);
    }
    setAiInvitationPendingResult(null);
    setShowAiInvitationModal(false);
    setSelectedSection("main");
  };

  const aiInvitationPreviewData = {
    ...formData,
    mainPhotoUrl: aiInvitationPhotoUrl || formData.photoUrl,
    mainPhotoFit: photoFit,
    mainPhotoPosition: photoPosition,
    id: initialData?.id,
    config: {
      ...config,
      ...(aiInvitationPendingResult?.configPatch && typeof aiInvitationPendingResult.configPatch === "object" ? aiInvitationPendingResult.configPatch : {}),
      imageStyle: aiInvitationPendingResult?.imageStyle || aiInvitationImageStyle,
      mainPhotoZoom: photoZoom,
      mainPhotoAspectRatio: photoAspectRatio,
    },
  };

  useEffect(() => {
    if (!formData.photoUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setPhotoAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = formData.photoUrl;
  }, [formData.photoUrl]);

  const openVenueSearchModal = () => {
    setVenueSearchMode("place");
    setVenueKeyword(String(formData.venueName || "").trim());
    setPlaceResults([]);
    setPlaceSearchError("");
    setShowVenueSearchModal(true);
  };
  const closeVenueSearchModal = () => {
    setShowVenueSearchModal(false);
  };
  const handleAddressKeywordSearch = async (initialKeyword = "") => {
    const keyword = String(initialKeyword || venueKeyword || formData.venueAddress || "").trim();
    if (!venueKeyword && keyword) setVenueKeyword(keyword);
    if (!keyword) {
      setPlaceSearchError("주소를 입력해 주세요.");
      setPlaceResults([]);
      return;
    }
    const kakaoRestKey = import.meta.env.VITE_KAKAO_REST_API_KEY || "";
    if (!kakaoRestKey) {
      setPlaceSearchError("카카오 REST 키(VITE_KAKAO_REST_API_KEY)가 필요합니다.");
      return;
    }
    setPlaceSearching(true);
    setPlaceSearchError("");
    setPlaceResults([]);
    try {
      const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(keyword)}&size=6`;
      const res = await fetch(url, {
        headers: {
          Authorization: `KakaoAK ${kakaoRestKey}`,
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        setPlaceSearchError(`주소 검색에 실패했습니다. (${res.status}) ${txt}`);
        return;
      }
      const data = await res.json();
      const docs = Array.isArray(data?.documents) ? data.documents : [];
      if (!docs.length) {
        setPlaceSearchError("검색 결과가 없습니다.");
        return;
      }
      setPlaceResults(docs.map((d) => ({
        id: `${d.x || ""}_${d.y || ""}_${d.address_name || ""}`,
        place_name: "",
        road_address_name: d.road_address?.address_name || "",
        address_name: d.address_name || "",
      })));
    } catch {
      setPlaceSearchError("주소 검색 중 오류가 발생했습니다.");
    } finally {
      setPlaceSearching(false);
    }
  };
  const handlePlaceKeywordSearch = async (initialKeyword = "") => {
    const keyword = String(initialKeyword || venueKeyword || formData.venueName || "").trim();
    if (!venueKeyword && keyword) setVenueKeyword(keyword);
    if (!keyword) {
      setPlaceSearchError("장소명을 입력해 주세요.");
      setPlaceResults([]);
      return;
    }
    const kakaoJsKey = import.meta.env.VITE_KAKAO_MAP_JS_KEY || "";
    const kakaoRestKey = import.meta.env.VITE_KAKAO_REST_API_KEY || "";
    if (!kakaoJsKey && !kakaoRestKey) {
      setPlaceSearchError("카카오 키(VITE_KAKAO_MAP_JS_KEY 또는 VITE_KAKAO_REST_API_KEY)가 필요합니다.");
      return;
    }
    setPlaceSearching(true);
    setPlaceSearchError("");
    setPlaceResults([]);
    try {
      if (kakaoJsKey) {
        await loadKakaoPlaceServiceScript(kakaoJsKey);
      }
      if (window.kakao?.maps?.services) {
        await new Promise((resolve) => {
          window.kakao.maps.load(() => {
            const places = new window.kakao.maps.services.Places();
            places.keywordSearch(keyword, (data, status) => {
              if (status === window.kakao.maps.services.Status.OK) {
                setPlaceResults(data.slice(0, 6));
                if (!data.length) setPlaceSearchError("검색 결과가 없습니다.");
              } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                setPlaceSearchError("검색 결과가 없습니다.");
              } else {
                setPlaceSearchError("장소 검색에 실패했습니다.");
              }
              resolve();
            });
          });
        });
        return;
      }

      if (!kakaoRestKey) {
        setPlaceSearchError("카카오 장소 검색을 불러오지 못했습니다.");
        return;
      }
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&size=6`;
      const res = await fetch(url, {
        headers: {
          Authorization: `KakaoAK ${kakaoRestKey}`,
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        setPlaceSearchError(`장소 검색에 실패했습니다. (${res.status}) ${txt}`);
        return;
      }
      const data = await res.json();
      const docs = Array.isArray(data?.documents) ? data.documents : [];
      if (!docs.length) {
        setPlaceSearchError("검색 결과가 없습니다.");
        return;
      }
      setPlaceResults(docs.map((d) => ({
        id: d.id,
        place_name: d.place_name,
        road_address_name: d.road_address_name,
        address_name: d.address_name,
      })));
    } catch {
      setPlaceSearchError("카카오 장소 검색 초기화에 실패했습니다.");
    } finally {
      setPlaceSearching(false);
    }
  };
  const handleSelectPlaceResult = (place) => {
    const nextVenueName = place.place_name ? place.place_name : formData.venueName;
    const address = place.road_address_name || place.address_name || "";
    updateFormData({
      venueName: nextVenueName,
      venueAddress: address || formData.venueAddress,
    });
    updateConfig({ venueDisplayName: nextVenueName });
    setPlaceResults([]);
    setPlaceSearchError("");
    setShowVenueSearchModal(false);
  };

  if (loadingData) return <div className="min-h-screen flex items-center justify-center"><div className="text-zinc-400 text-sm">로딩 중...</div></div>;

  const renderMainPhotoSection = () => (
    <div id="control-main" className={`p-6 border-b border-zinc-100 transition-all ${selectedSection === "main" ? "bg-zinc-50" : "bg-white"}`} onClick={() => setSelectedSection("main")}>
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Main Photo</label>
      <div className="mt-6 space-y-4">
        {formData.photoUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); document.getElementById("main-photo-upload")?.click(); }}
            className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold tracking-wide"
          >
            메인 사진 업로드
          </button>
        )}
        <input id="main-photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
        <div
          ref={editorPhotoContainerRef}
          className={`relative w-[303px] h-[440px] mx-auto bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl overflow-hidden ${formData.photoUrl ? "cursor-grab" : "cursor-default"}`}
          style={{
            "--photo-x": parsePhotoPosition(photoPosition).x,
            "--photo-y": parsePhotoPosition(photoPosition).y,
          }}
          onMouseDown={formData.photoUrl ? (e) => { e.stopPropagation(); handleMouseDown(e); } : undefined}
          onTouchStart={formData.photoUrl ? (e) => { e.stopPropagation(); handleTouchStart(e); } : undefined}
          onClick={!formData.photoUrl
            ? (e) => { e.stopPropagation(); document.getElementById("main-photo-upload")?.click(); }
            : ((e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
              const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
              handlePhotoClick(x, y, rect.width / rect.height);
            })
          }
        >
          {formData.photoUrl ? (
            <div
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                backgroundImage: `url("${formData.photoUrl}")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: getEditorCoverBgPosition(),
                backgroundSize: getEditorCoverBgSize(),
              }}
            />
          ) : <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-2"><Upload size={24} /><span className="text-[10px] font-bold">사진을 업로드해 주세요</span></div>}
        </div>
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-400 mt-2">사진을 드래그하면 위치를 조절할 수 있습니다.</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
              <span>사진 크기</span>
              <span>{photoZoom}%</span>
            </div>
            <input
              type="range"
              min={getEditorMinZoom()}
              max={180}
              value={photoZoom}
              onChange={(e) => setPhotoZoom(Math.max(getEditorMinZoom(), Number(e.target.value)))}
              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
            />
          </div>
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <p className="text-[10px] text-zinc-400">사진 위 텍스트 색상</p>
            {(() => {
              const forceReadable = true;
              const bulkUiColor = getUiVisibleColor(heroBulkColor, forceReadable);
              return (
                <div
                  className="space-y-2 px-2.5 py-2 border border-zinc-200 rounded-lg"
                  style={{ backgroundColor: hexToRgba(bulkUiColor, 0.08), borderColor: hexToRgba(bulkUiColor, 0.28) }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-600 leading-none">선택 변경</span>
                    <span className="text-[10px] text-zinc-500">{heroSelectedColorKeys.length}개 선택됨</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={heroBulkColor}
                      onChange={(e) => setHeroBulkColor(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded border-0 p-0 bg-transparent cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        applySelectedHeroColor();
                      }}
                      disabled={heroSelectedColorKeys.length === 0}
                      className="flex-1 py-1.5 rounded-lg bg-zinc-900 text-white text-[10px] font-bold disabled:opacity-40"
                    >
                      선택 항목에 적용
                    </button>
                  </div>
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>가독성</span>
                      <span>{clampReadabilityValue(heroBulkReadability)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={clampReadabilityValue(heroBulkReadability)}
                      onChange={(e) => setHeroBulkReadability(clampReadabilityValue(e.target.value))}
                      className="w-full h-1 bg-zinc-300 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        applySelectedHeroReadability();
                      }}
                      disabled={heroSelectedColorKeys.length === 0}
                      className="w-full py-1.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-[10px] font-bold disabled:opacity-40"
                    >
                      선택 항목 가독성 적용
                    </button>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-2">
              {HERO_TEXT_COLOR_ITEMS.map((item) => {
                const itemColor = getHeroPickerColor(item.key);
                const forceReadable = true;
                const itemUiColor = getUiVisibleColor(itemColor, forceReadable);
                const isSelected = heroSelectedColorKeys.includes(item.key);
                return (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 border rounded-lg"
                    style={{
                      backgroundColor: hexToRgba(itemUiColor, isSelected ? 0.18 : 0.08),
                      borderColor: isSelected ? itemUiColor : hexToRgba(itemUiColor, 0.35),
                    }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleHeroColorKey(item.key)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 accent-zinc-900"
                      />
                      <span className="text-[10px] font-bold text-zinc-600 leading-none truncate">{item.label}</span>
                    </span>
                    <input
                      type="color"
                      value={itemColor}
                      onChange={(e) => scheduleColorConfigUpdate({ [item.key]: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded border-0 p-0 bg-transparent cursor-pointer"
                    />
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex w-full h-[calc(100vh-64px)] bg-zinc-50 font-sans overflow-hidden">
      <div ref={containerRef} className="w-[400px] h-full border-r border-zinc-100 bg-white overflow-y-auto scrollbar-hide z-20 shadow-xl flex flex-col">
        <div className="p-6 border-b border-zinc-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-zinc-800 tracking-tight">청첩장 편집기</h2>
          <span className="text-[10px] bg-zinc-100 px-2.5 py-1 rounded-full text-zinc-500 font-medium">{user?.email}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Template / Skin */}
          <div id="control-template" className={`p-6 border-b border-zinc-100 transition-all ${selectedSection === "template" ? "bg-zinc-50" : "bg-white"}`} onClick={() => setSelectedSection("template")}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">디자인 스킨</label>
            {skins.length > 0 ? (
              <div className="mt-4 flex items-center justify-between gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = skins.findIndex((s) => s.slug === template || s.id === selectedSkinId);
                    const prevIdx = currentIdx > 0 ? currentIdx - 1 : skins.length - 1;
                    applySkinConfig(skins[prevIdx], { applyTextDefaults: true });
                  }}
                  className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-900 transition-colors shrink-0"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 flex flex-col items-center min-w-0">
                  {(() => {
                    const currentSkin = skins.find((s) => s.slug === template || s.id === selectedSkinId) || skins[0];
                    const skinConfig = (() => {
                      try {
                        return typeof currentSkin.config === "string" ? JSON.parse(currentSkin.config || "{}") : (currentSkin.config || {});
                      } catch { return {}; }
                    })();
                    const previewConfig = { ...getTypoForTemplate(currentSkin.slug), ...skinDefaultsBySlug[currentSkin.slug], ...skinConfig, theme: currentSkin.slug, invitationType: config.invitationType, imageHeight: config.imageHeight, imageWidth: config.imageWidth, imageStyle: config.imageStyle, imageGradient: config.imageGradient, mainPhotoZoom: photoZoom, mainPhotoAspectRatio: photoAspectRatio };
                    const previewData = {
                      groomName: "신랑", brideName: "신부",
                      weddingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                      venueName: "", venueAddress: "",
                      invitationTitle: "우리\n결혼합니다",
                      invitationMessage: "",
                      mainPhotoUrl: formData.photoUrl || formData.mainPhotoUrl || "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200&auto=format&fit=crop",
                      mainPhotoFit: photoFit,
                      mainPhotoPosition: photoPosition,
                      dDayEnabled: true, navigationEnabled: true,
                      albumPhotos: [], bankAccounts: [], config: previewConfig,
                    };
                    const bgColor = previewConfig.bgColor || skinDefaultsBySlug[currentSkin.slug]?.bgColor || "#f1f5f9";

                    // 원본 375:750 = 1:2. 작은 폰도 1:2로 맞춤.
                    const W = 375, H = 750;
                    const SCREEN_W = 100, SCREEN_H = 200; // 1:2
                    const BORDER = 6;
                    const FRAME_W = SCREEN_W + BORDER * 2, FRAME_H = SCREEN_H + BORDER * 2;
                    const SCALE = SCREEN_W / W; // 100/375

                    return (
                      <>
                        <div
                          className="relative shrink-0 overflow-hidden rounded-[22px] shadow-lg"
                          style={{
                            width: FRAME_W,
                            height: FRAME_H,
                            border: `${BORDER}px solid #18181b`,
                            borderRadius: 22,
                            backgroundColor: "#18181b",
                            boxSizing: "border-box",
                          }}
                        >
                          {/* 테두리 안쪽 = content box (0,0)에 화면 배치 */}
                          <div
                            className="absolute overflow-hidden rounded-[16px]"
                            style={{
                              left: 0,
                              top: 0,
                              width: SCREEN_W,
                              height: SCREEN_H,
                              backgroundColor: bgColor,
                            }}
                          >
                            <div
                              className="absolute left-0 top-0 origin-top-left"
                              style={{
                                width: W,
                                height: H,
                                transform: `scale(${SCALE})`,
                              }}
                            >
                              <div className="overflow-hidden" style={{ width: W, height: H, backgroundColor: bgColor }}>
                                <InvitationView
                                  data={previewData}
                                  template={currentSkin.slug}
                                  isPreview={false}
                                  compactPreview
                                  enableMainPhotoLightbox={false}
                                  disableMainPhotoOverlay={String(previewConfig.imageStyle || "standard") !== "full"}
                                  forceFullImageDarken
                                />
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-zinc-900 rounded-b-md z-10 pointer-events-none" />
                        </div>
                        <span className="block text-sm font-bold text-zinc-900 truncate w-full mt-2 text-center">{currentSkin.name}</span>
                        <span className="block text-[10px] text-zinc-400 font-mono text-center">/{currentSkin.slug}</span>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIdx = skins.findIndex((s) => s.slug === template || s.id === selectedSkinId);
                    const nextIdx = currentIdx < skins.length - 1 ? currentIdx + 1 : 0;
                    applySkinConfig(skins[nextIdx], { applyTextDefaults: true });
                  }}
                  className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-900 transition-colors shrink-0"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-4">
                <button onClick={(e) => { e.stopPropagation(); const l = ["modern", "elegant", "classic"]; setTemplate(l[(l.indexOf(template) - 1 + l.length) % l.length]); }} className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-900"><ChevronLeft size={20} /></button>
                <div className="text-center flex-1"><span className="block text-sm font-bold capitalize text-zinc-900">{template}</span><span className="text-[10px] text-zinc-400">테마</span></div>
                <button onClick={(e) => { e.stopPropagation(); const l = ["modern", "elegant", "classic"]; setTemplate(l[(l.indexOf(template) + 1) % l.length]); }} className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-900"><ChevronRight size={20} /></button>
              </div>
            )}
          </div>
          <div id="control-invitation-type" className={`p-6 border-b border-zinc-100 transition-all ${selectedSection === "invitation-type" ? "bg-zinc-50" : "bg-white"}`} onClick={() => setSelectedSection("invitation-type")}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">초대 유형</label>
            <p className="mt-3 text-[11px] leading-5 text-zinc-500">{invitationTypeFieldMeta.helperText}</p>
            <div className="mt-4 space-y-2">
              {INVITATION_TYPE_OPTIONS.map((option) => {
                const isSelected = String(config.invitationType || "standard") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSection("invitation-type");
                      updateConfig({ invitationType: option.value });
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${isSelected ? "border-zinc-900 bg-zinc-900 text-white shadow-sm" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black tracking-tight">{option.label}</span>
                      {isSelected && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">선택됨</span>}
                    </div>
                    <p className={`mt-1.5 text-xs leading-5 ${isSelected ? "text-white/85" : "text-zinc-500"}`}>{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          {renderMainPhotoSection()}
          {/* Typography */}
          <div id="control-typography" className={`p-6 border-b border-zinc-100 transition-all ${selectedSection === "typography" ? "bg-zinc-50" : "bg-white"}`} onClick={() => setSelectedSection("typography")}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Typography & Hero Text</label>
            <div className="mt-6 space-y-4">
              <p className="text-[11px] text-zinc-500">미리보기 텍스트를 클릭하면 아래에서 문구/크기를 바로 수정할 수 있습니다.</p>
              {hiddenTextPickerItems.length > 0 && (
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">숨겨진 항목</div>
                  <div className="flex flex-wrap gap-2">
                    {hiddenTextPickerItems.map(([key, meta]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTextSizePick(key);
                        }}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-bold text-zinc-700"
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pickedTextKey && BUILDER_TEXT_PICKER_META[pickedTextKey] && (
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="text-[10px] font-black text-zinc-500 uppercase">선택 항목: {BUILDER_TEXT_PICKER_META[pickedTextKey].label}</div>
                  {BUILDER_TEXT_PICKER_META[pickedTextKey].visibilityKey && (
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">{BUILDER_TEXT_PICKER_META[pickedTextKey].visibilityLabel || "표시 여부"}</span>
                      <input
                        type="checkbox"
                        checked={config[BUILDER_TEXT_PICKER_META[pickedTextKey].visibilityKey] !== false}
                        onChange={(e) => updateConfig({ [BUILDER_TEXT_PICKER_META[pickedTextKey].visibilityKey]: e.target.checked })}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-zinc-900"
                      />
                    </label>
                  )}
                  {Array.isArray(BUILDER_TEXT_PICKER_META[pickedTextKey].textFields) && BUILDER_TEXT_PICKER_META[pickedTextKey].textFields.length > 0 && (
                    <div className="space-y-2">
                      {BUILDER_TEXT_PICKER_META[pickedTextKey].textFields.map((f) => (
                        <div key={f.key} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500">{f.label}</label>
                          {f.inputType === "tel" ? (
                            <input
                              type="tel"
                              value={getTextFieldEditorValue(f.key)}
                              onChange={(e) => updateTextOverride(f.key, e.target.value)}
                              className="w-full p-2.5 border rounded-lg text-xs"
                              placeholder={f.placeholder || "010-1234-5678"}
                            />
                          ) : (
                            <textarea
                              value={getTextFieldEditorValue(f.key)}
                              onChange={(e) => updateTextOverride(f.key, e.target.value)}
                              rows={f.rows || 2}
                              className="w-full p-2.5 border rounded-lg text-xs resize-y"
                              placeholder={f.placeholder || "텍스트를 입력하세요"}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {BUILDER_TEXT_PICKER_META[pickedTextKey].toggleKey && (
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">{BUILDER_TEXT_PICKER_META[pickedTextKey].toggleLabel}</span>
                      <input
                        type="checkbox"
                        checked={config[BUILDER_TEXT_PICKER_META[pickedTextKey].toggleKey] === true}
                        onChange={(e) => updateConfig({ [BUILDER_TEXT_PICKER_META[pickedTextKey].toggleKey]: e.target.checked })}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-zinc-900"
                      />
                    </label>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">크기</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={BUILDER_TEXT_PICKER_META[pickedTextKey].min}
                          max={BUILDER_TEXT_PICKER_META[pickedTextKey].max}
                          value={Number(config[pickedTextKey] ?? getTypoForTemplate(template)[pickedTextKey] ?? BUILDER_TEXT_PICKER_META[pickedTextKey].min)}
                          onChange={(e) => {
                            const min = BUILDER_TEXT_PICKER_META[pickedTextKey].min;
                            const max = BUILDER_TEXT_PICKER_META[pickedTextKey].max;
                            const n = Math.max(min, Math.min(max, Number(e.target.value) || min));
                            updateConfig({ [pickedTextKey]: n });
                          }}
                          className="w-16 py-1.5 px-2 border border-zinc-200 rounded-lg text-xs font-mono text-right"
                        />
                        <span className="text-[10px] font-bold text-zinc-400">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={BUILDER_TEXT_PICKER_META[pickedTextKey].min}
                      max={BUILDER_TEXT_PICKER_META[pickedTextKey].max}
                      value={Number(config[pickedTextKey] ?? getTypoForTemplate(template)[pickedTextKey] ?? BUILDER_TEXT_PICKER_META[pickedTextKey].min)}
                      onChange={(e) => updateConfig({ [pickedTextKey]: Number(e.target.value) })}
                      className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Info */}
          <div id="control-info" className={`p-6 border-b border-zinc-100 transition-all ${selectedSection === "info" ? "bg-zinc-50" : "bg-white"}`} onClick={() => setSelectedSection("info")}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{invitationTypeFieldMeta.infoSectionLabel}</label>
            <div className="mt-6 space-y-4">
              <div><label className="text-[11px] font-bold text-zinc-500 mb-1.5 block">URL 주소</label><input type="text" value={formData.slug} onChange={(e) => updateFormData({ slug: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" placeholder="예: cheolsu-wedding" /></div>
              <div><label className="text-[11px] font-bold text-zinc-500 mb-1.5 block">{invitationTypeFieldMeta.dateLabel}</label><input type={invitationTypeFieldMeta.dateInputType || "datetime-local"} value={formData.weddingDate} onChange={(e) => updateFormData({ weddingDate: e.target.value })} className="w-full p-2.5 border rounded-xl text-sm" /></div>
              {invitationTypeFieldMeta.showVenueFields !== false && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-500 mb-1.5 block">{invitationTypeFieldMeta.venueNameLabel}</label>
                    <input
                      type="text"
                      value={formData.venueName}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateFormData({ venueName: value });
                        updateConfig({ venueDisplayName: value });
                      }}
                      className="w-full p-2.5 border rounded-xl text-sm"
                      placeholder={invitationTypeFieldMeta.venueNamePlaceholder}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-500 mb-1.5 block">{invitationTypeFieldMeta.venueAddressLabel}</label>
                    <div className="flex gap-2">
                      <input type="text" value={formData.venueAddress} readOnly className="flex-1 p-2.5 bg-zinc-50 border rounded-xl text-sm" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openVenueSearchModal();
                          setTimeout(() => {
                            const q = String(formData.venueName || "").trim();
                            if (q) handlePlaceKeywordSearch(q);
                          }, 0);
                        }}
                        className="px-4 py-2.5 bg-zinc-900 text-white text-[11px] font-bold rounded-xl whitespace-nowrap"
                      >
                        검색
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Album */}
          <div id="control-album" className={`p-6 border-b border-zinc-100 transition-all ${selectedSection === "album" ? "bg-zinc-50" : "bg-white"}`} onClick={() => setSelectedSection("album")}>
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Gallery (Max 9)</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500">정렬 기준</span>
                  <select
                    value={gallerySortMode}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleGallerySortModeChange(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-zinc-700"
                  >
                    {GALLERY_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-zinc-400">
                  업로드 순서 유지 또는 가로/세로 비율 우선으로 자동 정렬됩니다.
                </p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); document.getElementById("bulk-upload")?.click(); }} className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-bold rounded-lg">일괄 업로드
                <input id="bulk-upload" type="file" multiple accept="image/*" className="hidden" onChange={async (e) => {
                  const files = Array.from(e.target.files || []).slice(0, 9);
                  if (!files.length) return;
                  const localEntries = await addGalleryFiles(files);
                  for (const entry of localEntries) {
                    await uploadGalleryAsset(entry.file, entry.localUrl);
                  }
                  e.target.value = "";
                }} />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={`${i}-${formData.albumPhotos[i] || "empty"}`} className="relative aspect-square bg-zinc-50 border border-zinc-100 rounded-xl overflow-hidden group">
                  {formData.albumPhotos[i] ? (<><img src={toThumbnailUrl(formData.albumPhotos[i])} alt={`album-${i}`} className="absolute inset-0 w-full h-full object-cover" onLoad={(e) => { delete e.currentTarget.dataset.fallback; }} onError={(e) => { if (e.currentTarget.dataset.fallback === "1") return; e.currentTarget.dataset.fallback = "1"; e.currentTarget.src = formatImageUrl(formData.albumPhotos[i]); }} /><button onClick={() => removeGalleryPhotoUrl(formData.albumPhotos[i])} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button></>) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-300"><Upload size={16} /><input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const localEntries = await addGalleryFiles([f], i);
                      if (localEntries[0]) {
                        await uploadGalleryAsset(localEntries[0].file, localEntries[0].localUrl);
                      }
                      e.target.value = "";
                    }} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Bank Accounts */}
          <div id="control-account" className={`p-6 border-b border-zinc-100 transition-all ${selectedSection === "account" ? "bg-zinc-50" : "bg-white"}`} onClick={() => setSelectedSection("account")}>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Bank Accounts</label>
            <div className="mt-6 space-y-4">
              {formData.bankAccounts.map((acc, i) => (
                <div key={i} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3 relative">
                  <button onClick={() => updateFormData({ bankAccounts: formData.bankAccounts.filter((_, idx) => idx !== i) })} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500"><X size={14} /></button>
                  <input type="text" value={acc.ownerType} onChange={(e) => { const n = [...formData.bankAccounts]; n[i] = { ...n[i], ownerType: e.target.value }; updateFormData({ bankAccounts: n }); }} className="bg-transparent text-[10px] font-black uppercase tracking-widest text-zinc-400" placeholder="신랑측 / 신부측" />
                  <div className="grid grid-cols-2 gap-2"><input type="text" value={acc.bankName} onChange={(e) => { const n = [...formData.bankAccounts]; n[i] = { ...n[i], bankName: e.target.value }; updateFormData({ bankAccounts: n }); }} className="p-2 border rounded-lg text-xs" placeholder="은행명" /><input type="text" value={acc.ownerName} onChange={(e) => { const n = [...formData.bankAccounts]; n[i] = { ...n[i], ownerName: e.target.value }; updateFormData({ bankAccounts: n }); }} className="p-2 border rounded-lg text-xs" placeholder="예금주" /></div>
                  <input type="text" value={acc.accountNumber} onChange={(e) => { const n = [...formData.bankAccounts]; n[i] = { ...n[i], accountNumber: e.target.value }; updateFormData({ bankAccounts: n }); }} className="w-full p-2 border rounded-lg text-xs" placeholder="계좌번호" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => updateFormData({ bankAccounts: [...formData.bankAccounts, { ownerType: "신랑측", bankName: "", accountNumber: "", ownerName: "" }] })} className="py-3 border-2 border-dashed border-zinc-200 rounded-2xl text-[10px] font-black text-zinc-400 uppercase">+ 신랑측</button>
                <button onClick={() => updateFormData({ bankAccounts: [...formData.bankAccounts, { ownerType: "신부측", bankName: "", accountNumber: "", ownerName: "" }] })} className="py-3 border-2 border-dashed border-zinc-200 rounded-2xl text-[10px] font-black text-zinc-400 uppercase">+ 신부측</button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white border-t border-zinc-100 shadow-2xl">
          <button
            type="button"
            onClick={openAiInvitationModal}
            className="w-full mb-3 py-3 border border-zinc-200 rounded-2xl bg-zinc-50 text-zinc-900 font-bold tracking-wide text-sm hover:bg-zinc-100 transition-colors"
          >
            AI 청첩장 생성
          </button>
          <button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all disabled:bg-zinc-300">{isSaving ? "저장 중..." : "청첩장 저장"}</button>
        </div>
      </div>
      <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-100">
        <div className="absolute top-6 right-6 z-30 flex bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-zinc-200 shadow-xl">
          <button onClick={() => setViewMode("mobile")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === "mobile" ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-600"}`}><Smartphone size={14} /> 모바일</button>
          <button onClick={() => setViewMode("web")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === "web" ? "bg-zinc-900 text-white shadow-lg" : "text-zinc-400 hover:text-zinc-600"}`}><Monitor size={14} /> 웹</button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className={`min-h-full flex flex-col items-center ${viewMode === "mobile" ? "pt-20" : ""}`}>
            {viewMode === "mobile" ? (
              <MobileFrame backgroundColor={config.bgColor || "#ffffff"}><div className="absolute inset-0 overflow-y-auto hide-scrollbar" style={{ backgroundColor: config.bgColor || "#ffffff" }}>{formData.bgmUrl && <audio ref={audioRef} src={formData.bgmUrl} loop />}<InvitationView data={{ ...formData, mainPhotoUrl: formData.photoUrl, mainPhotoFit: photoFit, mainPhotoPosition: photoPosition, id: initialData?.id, config: { ...config, mainPhotoZoom: photoZoom, mainPhotoAspectRatio: photoAspectRatio } }} template={template} isPreview onSelectSection={handleSectionSelect} activeSection={selectedSection} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onPhotoClick={handlePhotoClick} previewPhotoContainerRef={previewPhotoContainerRef} onTextSizePick={handleTextSizePick} onHeroTextOffsetChange={updateConfig} disableMainPhotoOverlay={String(config.imageStyle || "standard") !== "full"} forceFullImageDarken /></div></MobileFrame>
            ) : (
              <div className="w-full max-w-[800px] shadow-2xl overflow-hidden" style={{ backgroundColor: config.bgColor || "#ffffff" }}>{formData.bgmUrl && <audio ref={audioRef} src={formData.bgmUrl} loop />}<InvitationView data={{ ...formData, mainPhotoUrl: formData.photoUrl, mainPhotoFit: photoFit, mainPhotoPosition: photoPosition, id: initialData?.id, config: { ...config, mainPhotoZoom: photoZoom, mainPhotoAspectRatio: photoAspectRatio } }} template={template} isPreview previewUseLivePhotoLayout onSelectSection={handleSectionSelect} activeSection={selectedSection} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onPhotoClick={handlePhotoClick} previewPhotoContainerRef={previewPhotoContainerRef} onTextSizePick={handleTextSizePick} onHeroTextOffsetChange={updateConfig} disableMainPhotoOverlay={String(config.imageStyle || "standard") !== "full"} forceFullImageDarken /></div>
            )}
          </div>
        </div>
      </div>
      {showVenueSearchModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6" onClick={closeVenueSearchModal}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h3 className="text-sm font-black tracking-wide text-zinc-800">예식장 검색</h3>
              <button type="button" onClick={closeVenueSearchModal} className="text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex gap-2 rounded-xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => { setVenueSearchMode("place"); setPlaceSearchError(""); }}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold ${venueSearchMode === "place" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500"}`}
                >
                  장소명 검색
                </button>
                <button
                  type="button"
                  onClick={() => { setVenueSearchMode("address"); setVenueKeyword(formData.venueAddress || ""); setPlaceResults([]); setPlaceSearchError(""); }}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold ${venueSearchMode === "address" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500"}`}
                >
                  주소 검색
                </button>
              </div>

              {venueSearchMode === "address" ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">주소 키워드를 입력하고 검색 결과에서 선택하세요.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={venueKeyword}
                      onChange={(e) => setVenueKeyword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddressKeywordSearch(); } }}
                      className="flex-1 rounded-xl border p-2.5 text-sm"
                      placeholder="예: 강남구 테헤란로 123"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddressKeywordSearch()}
                      className="rounded-xl bg-zinc-900 px-4 py-2.5 text-[11px] font-bold text-white whitespace-nowrap"
                    >
                      {placeSearching ? "검색중" : "검색"}
                    </button>
                  </div>
                  {placeSearchError && <p className="text-[11px] text-red-500">{placeSearchError}</p>}
                  {placeResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-200 bg-white">
                      {placeResults.map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() => handleSelectPlaceResult(place)}
                          className="w-full border-b border-zinc-100 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-zinc-50"
                        >
                          <p className="text-[12px] font-bold text-zinc-800">{place.road_address_name || place.address_name}</p>
                          <p className="text-[11px] text-zinc-500">{place.address_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">지역 + 예식장명으로 검색해 선택하세요. (예: 서울 아펠가모)</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={venueKeyword}
                      onChange={(e) => setVenueKeyword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handlePlaceKeywordSearch(); } }}
                      className="flex-1 rounded-xl border p-2.5 text-sm"
                      placeholder="예: 서울 아펠가모, 강남 더채플, 송파 웨딩헤너스"
                    />
                    <button
                      type="button"
                      onClick={() => handlePlaceKeywordSearch()}
                      className="rounded-xl bg-zinc-900 px-4 py-2.5 text-[11px] font-bold text-white whitespace-nowrap"
                    >
                      {placeSearching ? "검색중" : "검색"}
                    </button>
                  </div>
                  {placeSearchError && <p className="text-[11px] text-red-500">{placeSearchError}</p>}
                  {placeResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-200 bg-white">
                      {placeResults.map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() => handleSelectPlaceResult(place)}
                          className="w-full border-b border-zinc-100 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-zinc-50"
                        >
                          <p className="text-[12px] font-bold text-zinc-800">{place.place_name}</p>
                          <p className="text-[11px] text-zinc-500">{place.road_address_name || place.address_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showAiInvitationModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-black text-zinc-900">AI 청첩장 생성</h3>
              </div>
              <button type="button" onClick={closeAiInvitationModal} className="text-zinc-400 hover:text-zinc-700">
                <X size={18} />
              </button>
            </div>
            <input
              id="ai-main-photo-upload"
              type="file"
              accept="image/*"
              onChange={handleAiInvitationPhotoUpload}
              className="hidden"
            />
            <div className="p-6 space-y-6">
              {aiInvitationMode === "image" ? (
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-5">
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1">
                      <button
                        type="button"
                        onClick={() => setAiInvitationMode("image")}
                        className={`rounded-2xl py-3 text-sm font-bold transition-colors ${aiInvitationMode === "image" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                      >
                        이미지 기반
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiInvitationMode("prompt")}
                        className={`rounded-2xl py-3 text-sm font-bold transition-colors ${aiInvitationMode === "prompt" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                      >
                        명령어 기반
                      </button>
                    </div>
                    {isAdminUser && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-zinc-600">AI 모델</p>
                        <select
                          value={aiInvitationModelAlias}
                          onChange={(e) => setAiInvitationModelAlias(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900"
                        >
                          {aiModelOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-600">레이아웃 선택</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAiInvitationImageStyle("standard")}
                          className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${aiInvitationImageStyle === "standard" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600"}`}
                        >
                          일반 박스
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiInvitationImageStyle("full")}
                          className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${aiInvitationImageStyle === "full" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600"}`}
                        >
                          전체 사진
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById("ai-main-photo-upload")?.click()}
                        className="w-full py-3 rounded-2xl bg-zinc-900 text-white text-sm font-bold"
                      >
                        사진 업로드
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-600">청첩장 생성 이력</p>
                        {aiInvitationHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setAiInvitationHistory([])}
                            className="text-[11px] font-bold text-zinc-400 hover:text-zinc-600"
                          >
                            이력 지우기
                          </button>
                        )}
                      </div>
                      <div className="max-h-32 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50">
                        {aiInvitationHistory.length === 0 ? (
                          <div className="px-4 py-5 text-xs text-zinc-400">아직 저장된 생성 이력이 없습니다.</div>
                        ) : (
                          aiInvitationHistory.map((item, idx) => (
                            <div
                              key={`${item}-${idx}`}
                              className="border-b border-zinc-200 px-4 py-3 text-left text-xs text-zinc-600 last:border-b-0"
                            >
                              {item}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {(aiInvitationAnalysis || aiInvitationColorStrategy || aiInvitationCongrats) && (
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm leading-6 text-zinc-700">
                          {[aiInvitationAnalysis, aiInvitationColorStrategy, aiInvitationCongrats]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      </div>
                    )}
                    {aiInvitationPendingResult && (
                      <button
                        type="button"
                        onClick={handleApplyAiInvitationResult}
                        className="w-full py-3 rounded-2xl border border-zinc-900 bg-white text-zinc-900 text-sm font-bold"
                      >
                        사용하기
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAiInvitationImageGenerate}
                      disabled={isAiInvitationGenerating}
                      className="w-full py-3 rounded-2xl bg-zinc-900 text-white text-sm font-bold"
                    >
                      {isAiInvitationGenerating ? "생성 중..." : "청첩장 생성"}
                    </button>
                  </div>
                  <div className="flex w-[460px] flex-none justify-end overflow-visible">
                    <MobileFrame compact compactScale={1} backgroundColor={config.bgColor || "#ffffff"}>
                      <div
                        className="absolute inset-0 overflow-y-auto hide-scrollbar bg-white"
                        style={{ backgroundColor: config.bgColor || "#ffffff" }}
                        onClick={() => document.getElementById("ai-main-photo-upload")?.click()}
                      >
                        <InvitationView
                          data={aiInvitationPreviewData}
                          template={template}
                          isPreview
                          enableMainPhotoLightbox={false}
                          disableMainPhotoOverlay={String(aiInvitationImageStyle || "standard") !== "full"}
                          forceFullImageDarken
                        />
                      </div>
                    </MobileFrame>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-5">
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1">
                      <button
                        type="button"
                        onClick={() => setAiInvitationMode("image")}
                        className={`rounded-2xl py-3 text-sm font-bold transition-colors ${aiInvitationMode === "image" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                      >
                        이미지 기반
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiInvitationMode("prompt")}
                        className={`rounded-2xl py-3 text-sm font-bold transition-colors ${aiInvitationMode === "prompt" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                      >
                        명령어 기반
                      </button>
                    </div>
                    {isAdminUser && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-zinc-600">AI 모델</p>
                        <select
                          value={aiInvitationModelAlias}
                          onChange={(e) => setAiInvitationModelAlias(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900"
                        >
                          {aiModelOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-600">레이아웃 선택</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAiInvitationImageStyle("standard")}
                          className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${aiInvitationImageStyle === "standard" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600"}`}
                        >
                          일반 박스
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiInvitationImageStyle("full")}
                          className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${aiInvitationImageStyle === "full" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600"}`}
                        >
                          전체 사진
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById("ai-main-photo-upload")?.click()}
                        className="w-full py-3 rounded-2xl bg-zinc-900 text-white text-sm font-bold"
                      >
                        사진 업로드
                      </button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-600">명령어</p>
                      <textarea
                        value={aiInvitationPrompt}
                        onChange={(e) => setAiInvitationPrompt(e.target.value)}
                        className="w-full min-h-[132px] rounded-2xl border border-zinc-200 p-4 text-sm resize-none"
                        placeholder="예: 따뜻한 크림톤, 잔잔한 꽃무늬, 단정한 예식장 분위기의 청첩장 문구와 구성을 만들어줘"
                      />
                      <p className="text-[11px] text-zinc-400">폰트는 AI가 스킨디자인과 같은 무료 폰트 목록 안에서 자동 선택합니다.</p>
                      <p className="text-[11px] text-zinc-400">사진을 업로드해 두면 명령어 기반 생성에서도 참고 이미지로 함께 사용합니다.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-600">청첩장 생성 이력</p>
                        {aiInvitationHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setAiInvitationHistory([])}
                            className="text-[11px] font-bold text-zinc-400 hover:text-zinc-600"
                          >
                            이력 지우기
                          </button>
                        )}
                      </div>
                      <div className="max-h-40 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50">
                        {aiInvitationHistory.length === 0 ? (
                          <div className="px-4 py-5 text-xs text-zinc-400">아직 저장된 생성 이력이 없습니다.</div>
                        ) : (
                          aiInvitationHistory.map((item, idx) => (
                            <div
                              key={`${item}-${idx}`}
                              className="border-b border-zinc-200 px-4 py-3 text-left text-xs text-zinc-600 last:border-b-0"
                            >
                              {item}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAiInvitationPromptGenerate}
                      disabled={isAiInvitationGenerating}
                      className="w-full py-3 rounded-2xl bg-zinc-900 text-white text-sm font-bold"
                    >
                      {isAiInvitationGenerating ? "생성 중..." : "청첩장 생성"}
                    </button>
                  </div>
                  <div className="flex w-[460px] flex-none justify-end overflow-visible">
                    <MobileFrame compact compactScale={1} backgroundColor={config.bgColor || "#ffffff"}>
                      <div
                        className="absolute inset-0 overflow-y-auto hide-scrollbar bg-white"
                        style={{ backgroundColor: config.bgColor || "#ffffff" }}
                      >
                        <InvitationView
                          data={aiInvitationPreviewData}
                          template={template}
                          isPreview
                          enableMainPhotoLightbox={false}
                          disableMainPhotoOverlay={String(aiInvitationImageStyle || "standard") !== "full"}
                          forceFullImageDarken
                        />
                      </div>
                    </MobileFrame>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

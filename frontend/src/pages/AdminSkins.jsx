import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit2, Check, X, Palette, Type, Palette as PaletteIcon, ChevronDown, ChevronLeft, ChevronRight, Smartphone, Monitor, LayoutDashboard, Globe, Wand2, Upload } from "lucide-react";
import api from "../lib/api";
import { TYPO_DEFAULTS, getTypoForTemplate } from "../lib/skinDefaults";
import InvitationView from "../components/InvitationView";
import MobileFrame from "../components/MobileFrame";

const FONTS = [
  { name: "기본 (Pretendard)", value: "sans-serif", category: "고딕" },
  { name: "Noto Sans KR", value: "'Noto Sans KR', sans-serif", category: "고딕" },
  { name: "나눔고딕 (Nanum Gothic)", value: "'Nanum Gothic', sans-serif", category: "고딕" },
  { name: "IBM Plex Sans KR", value: "'IBM Plex Sans KR', sans-serif", category: "고딕" },
  { name: "Gothic A1", value: "'Gothic A1', sans-serif", category: "고딕" },
  { name: "Do Hyeon (도현)", value: "'Do Hyeon', sans-serif", category: "고딕" },
  { name: "Jua (주아)", value: "'Jua', sans-serif", category: "고딕" },
  { name: "Black Han Sans", value: "'Black Han Sans', sans-serif", category: "고딕" },
  { name: "Noto Serif KR", value: "'Noto Serif KR', serif", category: "명조" },
  { name: "나눔명조 (Nanum Myeongjo)", value: "'Nanum Myeongjo', serif", category: "명조" },
  { name: "고운바탕 (Gowun Batang)", value: "'Gowun Batang', serif", category: "명조" },
  { name: "고운돋움 (Gowun Dodum)", value: "'Gowun Dodum', sans-serif", category: "명조" },
  { name: "송명 (Song Myung)", value: "'Song Myung', serif", category: "명조" },
  { name: "Hahmlet", value: "'Hahmlet', serif", category: "명조" },
  { name: "나눔 손글씨 펜 (Nanum Pen Script)", value: "'Nanum Pen Script', cursive", category: "손글씨" },
  { name: "나눔 손글씨 붓 (Nanum Brush Script)", value: "'Nanum Brush Script', cursive", category: "손글씨" },
  { name: "Stylish", value: "'Stylish', sans-serif", category: "손글씨" },
  { name: "Gaegu (개구)", value: "'Gaegu', cursive", category: "손글씨" },
  { name: "Hi Melody", value: "'Hi Melody', cursive", category: "손글씨" },
  { name: "Gamja Flower", value: "'Gamja Flower', cursive", category: "손글씨" },
  { name: "Single Day", value: "'Single Day', cursive", category: "손글씨" },
  { name: "Cormorant Garamond", value: "'Cormorant Garamond', serif", category: "영문" },
  { name: "Playfair Display", value: "'Playfair Display', serif", category: "영문" },
  { name: "Lora", value: "'Lora', serif", category: "영문" },
  { name: "Montserrat", value: "'Montserrat', sans-serif", category: "영문" },
  { name: "Inter", value: "'Inter', sans-serif", category: "영문" },
  { name: "Roboto", value: "'Roboto', sans-serif", category: "영문" },
  { name: "Open Sans", value: "'Open Sans', sans-serif", category: "영문" },
  { name: "Dancing Script", value: "'Dancing Script', cursive", category: "영문" },
  { name: "Great Vibes", value: "'Great Vibes', cursive", category: "영문" },
  { name: "Satisfy", value: "'Satisfy', cursive", category: "영문" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif", category: "영문" },
  { name: "Crimson Text", value: "'Crimson Text', serif", category: "영문" },
];

const EDITOR_BASE_W = 303;
const EDITOR_BASE_H = 440;
const EDITOR_BASE_RATIO = EDITOR_BASE_W / EDITOR_BASE_H;

const defaultConfig = {
  theme: "modern",
  textScale: 100,
  fontFamily: "'Noto Sans KR', sans-serif",
  bgColor: "#f1f5f9",
  subBgColor: "#e2e8f0",
  textColor: "#0f172a",
  pointColor: "#475569",
  saveTheDateColor: "",
  heroVenueColor: "",
  heroDdayColor: "",
  titleColor: "",
  nameColor: "",
  dateColor: "",
  messageColor: "",
  sectionTitleColor: "",
  calendarBgColor: "",
  calendarDayColor: "",
  calendarActiveColor: "",
  buttonColor: "",
  buttonTextColor: "",
  footerColor: "",
  imageStyle: "standard",
  imageHeight: 460,
  imageWidth: 100,
  imageGradient: 0,
  standardImageGradient: 0,
  fullImageGradient: 0,
  bottomImageGradient: 0,
  mainPhotoZoom: 100,
  mainPhotoAspectRatio: 1,
  mainPhotoPosition: "50% 50%",
  saveTheDateText: "",
  mainTitleText: "",
  groomDisplayName: "",
  brideDisplayName: "",
  venueDisplayName: "",
  heroVenueNameText: "",
  invitationBodyText: "",
  groomFatherText: "",
  groomMotherText: "",
  groomRelationText: "",
  brideFatherText: "",
  brideMotherText: "",
  brideRelationText: "",
  ...TYPO_DEFAULTS.modern,
};

const TEXT_PICKER_META = {
  titleSize: { label: "메인 제목", colorKey: "titleColor", fallbackColorKey: "textColor", min: 20, max: 80, textKey: "mainTitleText", textLabel: "제목 문구" },
  namesSize: {
    label: "신랑·신부 이름",
    colorKey: "nameColor",
    fallbackColorKey: "textColor",
    min: 16,
    max: 60,
    textFields: [
      { key: "groomDisplayName", label: "신랑 이름", placeholder: "신랑 이름" },
      { key: "brideDisplayName", label: "신부 이름", placeholder: "신부 이름" },
    ],
  },
  dateSize: { label: "히어로 날짜/시간", colorKey: "dateColor", fallbackColorKey: "textColor", min: 10, max: 30 },
  saveTheDateSize: { label: "Save The Date", colorKey: "saveTheDateColor", fallbackColorKey: "pointColor", min: 8, max: 24, textKey: "saveTheDateText", textLabel: "문구" },
  heroVenueNameSize: { label: "히어로 예식장명", colorKey: "heroVenueColor", fallbackColorKey: "textColor", min: 12, max: 40, textKey: "venueDisplayName", textLabel: "예식장명 문구(공통)" },
  heroDDaySize: { label: "D-day 배지", colorKey: "heroDdayColor", fallbackColorKey: "buttonColor", min: 8, max: 24 },
  contentSize: { label: "초대 메시지 본문", colorKey: "messageColor", fallbackColorKey: "textColor", min: 12, max: 40, textKey: "invitationBodyText", textLabel: "본문 문구" },
  familyLineSize: {
    label: "가족 소개 이름행",
    colorKey: "textColor",
    fallbackColorKey: "textColor",
    min: 10,
    max: 30,
    textFields: [
      { key: "groomFatherText", label: "신랑측 아버지", placeholder: "예: 김아빠" },
      { key: "groomMotherText", label: "신랑측 어머니", placeholder: "예: 이엄마" },
      { key: "groomRelationText", label: "신랑측 관계 문구", placeholder: "예: 차남" },
      { key: "brideFatherText", label: "신부측 아버지", placeholder: "예: 이아빠" },
      { key: "brideMotherText", label: "신부측 어머니", placeholder: "예: 박엄마" },
      { key: "brideRelationText", label: "신부측 관계 문구", placeholder: "예: 장녀" },
    ],
  },
  galleryTitleSize: { label: "Gallery 제목", colorKey: "sectionTitleColor", fallbackColorKey: "pointColor", min: 8, max: 32 },
  locationTitleSize: { label: "Location 제목", colorKey: "sectionTitleColor", fallbackColorKey: "pointColor", min: 8, max: 32 },
  locationVenueNameSize: { label: "Location 예식장명", colorKey: "textColor", fallbackColorKey: "textColor", min: 12, max: 48, textKey: "venueDisplayName", textLabel: "예식장명 문구(공통)" },
  locationAddressSize: { label: "Location 주소", colorKey: "textColor", fallbackColorKey: "textColor", min: 10, max: 28 },
  navButtonTextSize: { label: "내비 버튼 텍스트", colorKey: "buttonTextColor", fallbackColorKey: "buttonTextColor", min: 8, max: 20 },
  accountTitleSize: { label: "Account 제목", colorKey: "sectionTitleColor", fallbackColorKey: "pointColor", min: 8, max: 32 },
  accountSubtitleSize: { label: "Account 보조문구", colorKey: "textColor", fallbackColorKey: "textColor", min: 9, max: 24 },
  accountToggleLabelSize: { label: "계좌 토글(신랑측/신부측)", colorKey: "textColor", fallbackColorKey: "textColor", min: 9, max: 24 },
  accountHeaderSize: { label: "계좌 상단(은행/Copy)", colorKey: "textColor", fallbackColorKey: "textColor", min: 8, max: 24 },
  accountInfoSize: { label: "계좌 정보(번호/예금주)", colorKey: "textColor", fallbackColorKey: "textColor", min: 12, max: 36 },
  attendanceTitleSize: { label: "참석 여부 제목", colorKey: "sectionTitleColor", fallbackColorKey: "pointColor", min: 8, max: 32 },
  attendanceDescSize: { label: "참석 안내문", colorKey: "textColor", fallbackColorKey: "textColor", min: 10, max: 24 },
  guestbookTitleSize: { label: "축하 메시지 제목", colorKey: "sectionTitleColor", fallbackColorKey: "pointColor", min: 8, max: 32 },
  guestbookDescSize: { label: "축하 메시지 안내문", colorKey: "textColor", fallbackColorKey: "textColor", min: 10, max: 24 },
  attendanceLabelSize: { label: "폼 라벨(성함/구분/참석여부/참석인원/식사여부/메모/작성자/메시지)", colorKey: "textColor", fallbackColorKey: "textColor", min: 9, max: 20 },
  attendanceOptionTextSize: { label: "참석 옵션", colorKey: "buttonTextColor", fallbackColorKey: "buttonTextColor", min: 10, max: 24 },
  formPlaceholderSize: { label: "폼 placeholder", colorKey: "textColor", fallbackColorKey: "textColor", min: 10, max: 24 },
  calendarTitleSize: { label: "달력 제목", colorKey: "calendarDayColor", fallbackColorKey: "textColor", min: 16, max: 44 },
  calendarDaySize: { label: "달력 날짜", colorKey: "calendarDayColor", fallbackColorKey: "textColor", min: 10, max: 26 },
  footerWeddingOfSize: { label: "하단 Wedding of", colorKey: "footerColor", fallbackColorKey: "textColor", min: 8, max: 24 },
};

const TEXT_OVERRIDE_PLACEHOLDER = {
  saveTheDateText: "Save The Date",
  mainTitleText: "우리\n결혼합니다",
  groomDisplayName: "김철수",
  brideDisplayName: "이영희",
  venueDisplayName: "아름다운 웨딩홀",
  invitationBodyText: "약속된 시간이 다가와\n사랑의 결실을 맺으려 합니다.",
  groomFatherText: "김아빠",
  groomMotherText: "이엄마",
  groomRelationText: "차남",
  brideFatherText: "이아빠",
  brideMotherText: "박엄마",
  brideRelationText: "장녀",
};

const AI_MODEL_OPTIONS = [
  { value: "openai", label: "OpenAI", backend: "openclaw1" },
  { value: "local", label: "Local LLM", backend: "openclaw3" },
];

const AI_LOCAL_PURPOSE_OPTIONS = [
  { value: "general", label: "general" },
  { value: "coding", label: "coding" },
];

const AI_LOCKED_IMAGE_KEYS = new Set([
  "imageStyle",
  "imageHeight",
  "imageWidth",
  "imageGradient",
  "standardImageGradient",
  "fullImageGradient",
  "bottomImageGradient",
  "mainPhotoZoom",
  "mainPhotoAspectRatio",
]);

const AI_META_NOISE_PATTERNS = [
  /스킨/gi,
  /생성(해줘|해|해주세요)?/gi,
  /만들(어줘|어|어주세요)?/gi,
  /제작(해줘|해|해주세요)?/gi,
  /부탁(해|해요|드립니다)?/gi,
  /느낌(으로|에|의)?/gi,
  /스타일(로|의)?/gi,
  /컨셉(으로|의)?/gi,
  /테마(로|의)?/gi,
];

const AI_META_TYPO_RULES = [
  { re: /(화이티|화아티|화잍|화이트이)/gi, to: "화이트" },
  { re: /(브랙|블렉|블랙크)/gi, to: "블랙" },
  { re: /(엘레갱트|엘레간트|엘리강트)/gi, to: "엘레강트" },
  { re: /(모던느낌|모던한느낌)/gi, to: "모던" },
];

const AI_SLUG_KEYWORDS = [
  { key: "green", re: /(초록|녹색|그린)/i },
  { key: "nature", re: /(자연|포레스트|forest)/i },
  { key: "luxe", re: /(화려|고급|럭셔리|elegant|luxury)/i },
  { key: "romantic", re: /(로맨틱|낭만|romantic)/i },
  { key: "minimal", re: /(미니멀|심플|minimal|simple)/i },
  { key: "classic", re: /(클래식|classic|빈티지|vintage)/i },
  { key: "modern", re: /(모던|modern|세련)/i },
  { key: "warm", re: /(따뜻|웜톤|warm)/i },
  { key: "cool", re: /(차분|쿨톤|cool)/i },
  { key: "pink", re: /(핑크|분홍|rose)/i },
  { key: "blue", re: /(블루|파랑|푸른|blue)/i },
];

const AI_NAME_STYLE_KEYWORDS = [
  { label: "클래식", key: "classic", re: /(클래식|classic|빈티지|vintage)/i },
  { label: "엘레강트", key: "elegant", re: /(엘레강트|고급|우아|화려|elegant|luxury)/i },
  { label: "모던", key: "modern", re: /(모던|modern|세련|미니멀|minimal|심플|simple)/i },
  { label: "내추럴", key: "natural", re: /(자연|내추럴|natural|forest)/i },
  { label: "로맨틱", key: "romantic", re: /(로맨틱|낭만|romantic)/i },
  { label: "웜", key: "warm", re: /(따뜻|웜톤|warm)/i },
  { label: "쿨", key: "cool", re: /(차분|쿨톤|cool)/i },
];

const slugify = (text) => {
  if (!text) return "";
  const ascii = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii;
};

const compactText = (text) => (text || "").replace(/\s+/g, " ").trim();
const formatLocalModelLabel = (modelName) => {
  const raw = String(modelName || "").trim();
  if (!raw) return "";
  return raw.replace(/^ollama\//i, "");
};

const normalizePromptForMeta = (prompt) => {
  let value = compactText(prompt);
  AI_META_TYPO_RULES.forEach(({ re, to }) => {
    value = value.replace(re, to);
  });
  AI_META_NOISE_PATTERNS.forEach((pattern) => {
    value = value.replace(pattern, " ");
  });
  return compactText(value);
};

const inferSlugSeed = (normalizedPrompt, fallbackText) => {
  const matched = AI_SLUG_KEYWORDS
    .filter((item) => item.re.test(normalizedPrompt))
    .map((item) => item.key)
    .slice(0, 3);
  if (matched.length > 0) return matched.join("-");
  return slugify(normalizedPrompt) || slugify(fallbackText);
};

const detectStyleLabels = (normalizedPrompt) => {
  const hits = AI_NAME_STYLE_KEYWORDS
    .map((item) => {
      const m = normalizedPrompt.match(item.re);
      if (!m) return null;
      return { ...item, index: m.index ?? Number.MAX_SAFE_INTEGER };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

  const labels = [];
  for (const hit of hits) {
    if (!labels.includes(hit.label)) labels.push(hit.label);
    if (labels.length >= 3) break;
  }
  return labels;
};

const parseHexColor = (value) => {
  const v = String(value || "").trim();
  const m = v.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = m[1];
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
};

const isDarkHex = (value) => {
  const rgb = parseHexColor(value);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.55;
};

const normalizeConfigForSave = (rawConfig = {}) => {
  const next = { ...rawConfig };
  const imageStyle = String(next.imageStyle || "standard").toLowerCase();
  if (imageStyle !== "full") return next;
  const darkBg = isDarkHex(next.bgColor) || isDarkHex(next.subBgColor);
  const heroColor = darkBg ? "#FFFFFF" : "#111111";
  next.titleColor = heroColor;
  next.nameColor = heroColor;
  next.dateColor = heroColor;
  next.saveTheDateColor = heroColor;
  next.heroVenueColor = heroColor;
  next.heroDdayColor = heroColor;
  next.heroTextColorMode = "custom";
  return next;
};

const rgbToHsl = ({ r, g, b }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) h = 60 * (((gn - bn) / d) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / d + 2);
  else h = 60 * ((rn - gn) / d + 4);
  if (h < 0) h += 360;
  return { h, s, l };
};

const inferColorMoodLabel = (config = {}) => {
  const sample = parseHexColor(config.pointColor) || parseHexColor(config.bgColor) || parseHexColor(config.buttonColor);
  if (!sample) return "";
  const { h, s, l } = rgbToHsl(sample);
  if (s < 0.12) return l < 0.42 ? "모노 다크" : "모노";
  if (h >= 330 || h < 20) return "로즈";
  if (h >= 20 && h < 48) return "골드";
  if (h >= 48 && h < 75) return "허니";
  if (h >= 75 && h < 160) return "그린";
  if (h >= 160 && h < 260) return "블루";
  if (h >= 260 && h < 330) return "퍼플";
  return "";
};

const inferToneLabel = (config = {}) => {
  const sample = parseHexColor(config.bgColor) || parseHexColor(config.subBgColor) || parseHexColor(config.pointColor);
  if (!sample) return "";
  const { s, l } = rgbToHsl(sample);
  if (l < 0.35) return "다크";
  if (l > 0.82 && s < 0.2) return "클린";
  if (l > 0.78) return "라이트";
  if (s < 0.18) return "무드";
  return "";
};

const inferThemeLabel = (normalizedPrompt, template, config = {}) => {
  const labels = detectStyleLabels(normalizedPrompt);
  if (labels.length > 0) return labels[0];
  const theme = String(config.theme || template || "").toLowerCase();
  if (theme.includes("classic")) return "클래식";
  if (theme.includes("pink")) return "로맨틱";
  if (theme.includes("modern")) return "모던";
  const font = String(config.fontFamily || "").toLowerCase();
  if (font.includes("cursive") || font.includes("pen") || font.includes("brush")) return "감성";
  if (font.includes("serif") || font.includes("myeongjo") || font.includes("batang")) return "클래식";
  return "모던";
};

const CREATIVE_PREFIX_BY_THEME = {
  "모던": ["노바", "아크", "루멘", "시티", "메트로"],
  "클래식": ["헤리티지", "오브", "그레이스", "노블", "에스테"],
  "로맨틱": ["로지", "블룸", "루비아", "세레나", "벨라"],
  "내추럴": ["포레", "브리즈", "오로라", "버드", "그로브"],
  "감성": ["멜로", "스케치", "무드", "하모니", "소프트"],
};

const CREATIVE_SUFFIX_BY_COLOR = {
  "블루": ["오션", "미스트", "레이크", "새틴", "듄"],
  "그린": ["가든", "리프", "포레스트", "모스", "듀"],
  "로즈": ["블러시", "로제", "페탈", "핑크문", "샤인"],
  "골드": ["골든", "브론즈", "샴페인", "허니", "글로우"],
  "퍼플": ["바이올렛", "라일락", "플럼", "이브닝", "트와일라잇"],
  "모노": ["미니멀", "미스트", "샤도우", "퓨어", "씬"],
  "모노 다크": ["미드나잇", "블랙벨", "노아르", "이클립스", "딥"],
};

const CREATIVE_CORE_BY_TONE = {
  "다크": ["시그니처", "오브제", "에디션", "아틀리에", "무드"],
  "클린": ["클래스", "라인", "에어", "퓨어", "에센스"],
  "라이트": ["글로우", "브리즈", "라이트", "소프트", "샤인"],
  "무드": ["무드", "하모니", "밸런스", "톤", "페이즈"],
};

const hashText = (text) => {
  const s = String(text || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
};

const pickByHash = (arr, hash, offset = 0) => arr[(hash + offset) % arr.length];

const inferStyleName = (normalizedPrompt, template, config = {}) => {
  const color = inferColorMoodLabel(config);
  const tone = inferToneLabel(config);
  const theme = inferThemeLabel(normalizedPrompt, template, config);
  const signature = `${normalizedPrompt}|${template}|${config.theme || ""}|${config.bgColor || ""}|${config.pointColor || ""}|${config.fontFamily || ""}|${config.imageStyle || ""}`;
  const h = hashText(signature);

  const prefixes = CREATIVE_PREFIX_BY_THEME[theme] || CREATIVE_PREFIX_BY_THEME["모던"];
  const cores = CREATIVE_CORE_BY_TONE[tone] || ["무드", "시그니처", "에디션", "클래스", "오브제"];
  const suffixes = CREATIVE_SUFFIX_BY_COLOR[color] || ["웨이브", "스케이프", "캔버스", "팔레트", "씬"];

  return `${pickByHash(prefixes, h)} ${pickByHash(suffixes, h, 7)} ${pickByHash(cores, h, 13)}`;
};

const inferStyleDescription = (normalizedPrompt, template, config = {}) => {
  const color = inferColorMoodLabel(config);
  const tone = inferToneLabel(config);
  const theme = inferThemeLabel(normalizedPrompt, template, config);
  const imageStyle = String(config.imageStyle || "").toLowerCase();
  const imageLabel = imageStyle === "full" ? "몰입형 메인 이미지" : imageStyle === "bottom" ? "하단 집중형 메인 이미지" : "균형형 메인 이미지";
  const font = String(config.fontFamily || "").toLowerCase();
  const fontLabel = font.includes("cursive") || font.includes("pen") || font.includes("brush")
    ? "손글씨 무드"
    : (font.includes("serif") || font.includes("myeongjo") || font.includes("batang"))
      ? "명조 무드"
      : "고딕 무드";
  const mood = [color, tone, theme].filter(Boolean).join(" ");
  if (mood) return `${mood} 분위기의 ${imageLabel}, ${fontLabel} 디자인입니다.`;
  return `${imageLabel}, ${fontLabel} 디자인입니다.`;
};

const buildUniqueSlug = (base, usedSlugs) => {
  const normalizedBase = base && base.trim() ? base.trim() : "ai-skin";
  if (!usedSlugs.has(normalizedBase)) return normalizedBase;
  let idx = 2;
  while (usedSlugs.has(`${normalizedBase}-${idx}`)) idx += 1;
  return `${normalizedBase}-${idx}`;
};

const buildAutoSkinMeta = ({ prompt, template, usedSlugs, generatedConfig }) => {
  const normalizedPrompt = normalizePromptForMeta(prompt);
  const styleName = inferStyleName(normalizedPrompt, template, generatedConfig);
  const name = styleName;
  const description = inferStyleDescription(normalizedPrompt, template, generatedConfig);
  const slugSeed = inferSlugSeed(normalizedPrompt, `${template}-${styleName}`) || "ai-skin";
  const slug = buildUniqueSlug(slugSeed, usedSlugs);
  return { name, slug, description };
};

const getPreviewWeddingDateIso = (daysAhead = 30) => {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

const formatCreatedDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR");
};

function FontSelector({ config, updateConfig, selectedElement, setSelectedElement }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const currentFont = FONTS.find((f) => f.value === config.fontFamily) || FONTS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      id="control-fontFamily"
      ref={ref}
      className={`space-y-4 p-4 rounded-2xl transition-all duration-300 ${selectedElement === "fontFamily" ? "bg-zinc-100 ring-2 ring-zinc-900 shadow-lg" : "hover:bg-zinc-50"}`}
      onClick={() => setSelectedElement("fontFamily")}
    >
      <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
        <Type size={12} /> 폰트
      </h3>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="w-full pl-4 pr-10 py-3 bg-white border border-zinc-100 rounded-xl text-sm font-bold text-left cursor-pointer shadow-sm hover:border-zinc-300 transition-colors"
          style={{ fontFamily: currentFont.value }}
        >
          {currentFont.name}
        </button>
        <ChevronDown
          size={16}
          className={`absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`}
        />
        {open && (
          <div className="absolute z-50 mt-2 w-full bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden max-h-[320px] overflow-y-auto">
            {["고딕", "명조", "손글씨", "영문"].map((cat) => (
              <div key={cat}>
                <div className="px-4 py-2 bg-zinc-50 text-[9px] font-black text-zinc-400 uppercase tracking-widest sticky top-0 border-b border-zinc-100">{cat}</div>
                {FONTS.filter((f) => f.category === cat).map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateConfig({ fontFamily: f.value });
                      setOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${config.fontFamily === f.value ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-700"}`}
                    style={{ fontFamily: f.value }}
                  >
                    {f.name}
                    <span className="ml-2 opacity-40" style={{ fontFamily: f.value }}>가나다라 ABC</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSkins() {
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [previewMode, setPreviewMode] = useState("mobile"); // "mobile" | "web"
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [description, setDescription] = useState(""); const [thumbnail, setThumbnail] = useState("");
  const [config, setConfig] = useState({ ...defaultConfig });
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModel, setAiModel] = useState("openai");
  const [aiLocalPurpose, setAiLocalPurpose] = useState("general");
  const [aiLocalPurposeOptions, setAiLocalPurposeOptions] = useState(AI_LOCAL_PURPOSE_OPTIONS);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [pickedTextKey, setPickedTextKey] = useState(null);
  const [showAdvancedTypography, setShowAdvancedTypography] = useState(false);

  // --- Photo Editor State & Refs ---
  const editorPhotoContainerRef = useRef(null);
  const previewPhotoContainerRef = useRef(null);
  const prevImageStyleRef = useRef(String(config.imageStyle || "standard"));
  const isPhotoDraggingRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, pos: "", lockX: false, lockY: false, fixedX: 50, fixedY: 0 });
  const pendingPosRef = useRef("");
  const hasDraggedRef = useRef(false);
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

  const photoFit = "cover";
  const photoZoom = config.mainPhotoZoom ?? 100;
  const photoAspectRatio = config.mainPhotoAspectRatio ?? 1;
  const photoPosition = config.mainPhotoPosition || "50% 50%";

  const parsePhotoPosition = (pos) => {
    const [rawX = "50%", rawY = "50%"] = String(pos || "50% 50%").trim().split(/\s+/);
    const toPercent = (v) => {
      const n = Number.parseFloat(String(v).replace("%", ""));
      return Number.isNaN(n) ? "50%" : `${Math.max(0, Math.min(100, n))}%`;
    };
    return { x: toPercent(rawX), y: toPercent(rawY) };
  };

  const getCoverMetrics = (containerRatio) => {
    const ratio = photoAspectRatio || 1;
    const safeRatio = containerRatio > 0 ? containerRatio : EDITOR_BASE_RATIO;
    const baseW = ratio >= safeRatio ? (ratio / safeRatio) * 100 : 100;
    const baseH = ratio >= safeRatio ? 100 : (safeRatio / ratio) * 100;
    const shouldClamp = String(config.imageStyle || "standard") === "full" && ratio < safeRatio;
    const minScale = shouldClamp ? 1 : 0.4;
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
    const shouldClamp = String(config.imageStyle || "standard") === "full" && ratio < EDITOR_BASE_RATIO;
    return shouldClamp ? 100 : 40;
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

  const fallbackImage = "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200&auto=format&fit=crop";
  const displayPhotoUrl = thumbnail || fallbackImage;

  useEffect(() => {
    if (!displayPhotoUrl) return;
    const minZoom = getEditorMinZoom();
    if (photoZoom < minZoom) updateConfig({ mainPhotoZoom: minZoom });
  }, [config.imageStyle, photoAspectRatio, displayPhotoUrl, photoZoom]);

  useEffect(() => {
    if (!displayPhotoUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        updateConfig({ mainPhotoAspectRatio: img.naturalWidth / img.naturalHeight });
      }
    };
    img.src = displayPhotoUrl;
  }, [displayPhotoUrl]);

  useEffect(() => {
    if (!displayPhotoUrl) return;
    const previewRatio = getContainerRatio(previewPhotoContainerRef.current);
    const normalized = normalizeCoverPosition(photoPosition, previewRatio);
    if (normalized !== photoPosition) {
      updateConfig({ mainPhotoPosition: normalized });
      return;
    }
    applyPhotoPositionVars(normalized);
  }, [photoZoom, photoAspectRatio, displayPhotoUrl]);

  useEffect(() => {
    if (!displayPhotoUrl) {
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
        updateConfig({ mainPhotoPosition: normalized });
        return;
      }
      applyPhotoPositionVars(normalized);
    });
  }, [config.imageStyle, displayPhotoUrl, photoPosition]);

  const applyPhotoPositionVars = (pos) => {
    const { x, y } = parsePhotoPosition(pos);
    [previewPhotoContainerRef.current, editorPhotoContainerRef.current].forEach((el) => {
      if (!el) return;
      el.style.setProperty("--photo-x", x);
      el.style.setProperty("--photo-y", y);
    });
  };

  useEffect(() => {
    if (isPointerDownRef.current) return;
    applyPhotoPositionVars(photoPosition);
  }, [photoPosition]);

  const startPointer = (clientX, clientY, containerRatio) => {
    hasDraggedRef.current = false;
    const m = getCoverMetrics(containerRatio);
    const parsed = parsePhotoPosition(photoPosition);
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
    if (e.button !== 0) return;
    e.preventDefault();
    startPointer(e.clientX, e.clientY, getContainerRatio(e.currentTarget));
  };
  const handlePhotoClick = (xPercent, yPercent, containerRatio) => {
    if (hasDraggedRef.current) return;
    const m = getCoverMetrics(containerRatio);
    const x = m.lockX ? 50 : xPercent;
    const y = m.lockY ? 0 : yPercent;
    updateConfig({ mainPhotoPosition: `${x}% ${y}%` });
  };
  const getClient = (e) => (e.touches ? e.touches[0] : e.changedTouches ? e.changedTouches[0] : e);
  const handleTouchStart = (e) => {
    const t = getClient(e);
    if (!t) return;
    e.preventDefault();
    startPointer(t.clientX, t.clientY, getContainerRatio(e.currentTarget));
  };

  useEffect(() => {
    const dragThreshold = 3;
    const onMove = (e) => {
      if (!isPointerDownRef.current) return;
      const c = e.touches ? e.touches[0] : e;
      const cp = dragStart.current.pos.split(/\s+/);
      const dx = c.clientX - dragStart.current.x;
      const dy = c.clientY - dragStart.current.y;
      if (!isPhotoDraggingRef.current && Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) return;
      e.preventDefault();
      hasDraggedRef.current = true;
      if (!isPhotoDraggingRef.current) {
        isPhotoDraggingRef.current = true;
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
        updateConfig({ mainPhotoPosition: finalPos });
        applyPhotoPositionVars(finalPos);
      }
      isPhotoDraggingRef.current = false;
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
  }, []);

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;

    // 1. Show local preview instantly
    const localUrl = URL.createObjectURL(file);
    setThumbnail(localUrl);

    try {
      // 2. Background compression and upload
      const compressed = await compressImage(file);
      const data = new FormData(); data.append("file", compressed);
      const res = await api.post("/invitations/upload", data, { headers: { "Content-Type": "multipart/form-data" } });

      if (res.data.success && res.data.url) {
        // 3. Swap with server URL
        setThumbnail(res.data.url);
        URL.revokeObjectURL(localUrl);
      } else {
        alert("업로드 실패");
      }
    } catch {
      alert("업로드 실패");
    }
  };
  // --- End Photo Editor ---

  useEffect(() => { api.get("/admin/skins").then((res) => setSkins(res.data.skins)).catch(console.error).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    api.get("/admin/skins/ai-model-options")
      .then((res) => {
        const local = res.data?.local || {};
        setAiLocalPurposeOptions([
          { value: "general", label: formatLocalModelLabel(local.general) || "general" },
          { value: "coding", label: formatLocalModelLabel(local.coding) || "coding" },
        ]);
      })
      .catch(() => {
        setAiLocalPurposeOptions(AI_LOCAL_PURPOSE_OPTIONS);
      });
  }, []);
  const updateConfig = (u) => setConfig((p) => ({ ...p, ...u }));
  const resetForm = () => { setName(""); setSlug(""); setDescription(""); setThumbnail(""); setConfig({ ...defaultConfig }); setAiPrompt(""); setAiModel("openai"); setAiLocalPurpose("general"); setPickedTextKey(null); setShowAdvancedTypography(false); };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return alert("AI 프롬프트를 입력해 주세요.");
    const template = (slug || "modern").trim();
    const modelLabel = AI_MODEL_OPTIONS.find((m) => m.value === aiModel)?.label || aiModel;
    const fontCatalogText = FONTS.map((f, idx) => `${idx + 1}. ${f.name} | ${f.category} | ${f.value}`).join("\n");
    const enhancedPrompt = `[디자인 목표]
고급스럽고 일관된 웨딩 청첩장 스킨을 설계하되, 실제 서비스에서 바로 쓸 수 있는 수준으로 완성도 높게 구성하세요.

[사용자 요청]
${aiPrompt.trim()}

[아트 디렉션]
- 색상: 배경/포인트/텍스트 대비가 충분하고 읽기 쉬울 것
- 타이포: 섹션 위계(제목 > 본문 > 보조 텍스트)가 명확할 것
- 레이아웃: 모바일 우선, 과도한 장식보다 안정적인 균형 우선
- 버튼/폼: 접근성 대비와 클릭 가독성 확보

[폰트 지침]
- 반드시 아래 목록 중 하나만 fontFamily로 선택할 것
- 요청 분위기에 가장 어울리는 폰트를 선택할 것
- 임의 폰트/시스템 기본 폰트는 금지

[사용 가능 폰트 목록]
${fontCatalogText}

[메타 생성 지침]
- skinName: 브랜드처럼 자연스럽고 기억에 남는 한국어 이름
- skinSlug: 영어 kebab-case, 짧고 명확하게
- skinDescription: 실제 결과(톤/색감/타이포/이미지 무드)를 반영한 1문장`;
    try {
      setAiGenerating(true);
      const res = await api.post("/admin/skins/ai-generate", {
        prompt: enhancedPrompt,
        template,
        model: aiModel,
        localPurpose: aiLocalPurpose,
      });
      const generated = res.data?.config;
      const meta = res.data?.meta || {};
      if (!generated || typeof generated !== "object") {
        alert("AI 응답 형식이 올바르지 않습니다.");
        return;
      }
      const filteredGenerated = Object.fromEntries(
        Object.entries(generated).filter(([key]) => !AI_LOCKED_IMAGE_KEYS.has(key))
      );
      updateConfig(filteredGenerated);
      const aiName = String(meta.skinName || "").trim();
      const aiSlug = String(meta.skinSlug || "").trim();
      const aiDescription = String(meta.skinDescription || "").trim();
      if (aiName) setName(aiName);
      if (aiDescription) setDescription(aiDescription);
      if (!editingId && aiSlug) setSlug(aiSlug);
      alert(`AI 생성 완료 (${modelLabel})`);
    } catch (e) {
      alert(e.response?.data?.error || e.message || "AI 생성에 실패했습니다.");
    } finally {
      setAiGenerating(false);
    }
  };

  // 새 스킨 추가 시 slug(테마)가 바뀌면 해당 테마 글자 크기로 맞춰서 메인/청첩장 만들기와 동일하게 보이게 (편집 시에는 DB에서 불러온 값 유지)
  useEffect(() => {
    if (!isAdding || editingId) return;
    const template = slug || "modern";
    const typo = getTypoForTemplate(template);
    setConfig((p) => ({ ...p, ...typo }));
  }, [slug, isAdding, editingId]);

  const handleCreate = async () => {
    if (!name || !slug) return alert("이름과 슬러그를 입력해주세요.");
    try {
      const configToSave = normalizeConfigForSave(config);
      const res = await api.post("/admin/skins", { name, slug, description, config: JSON.stringify(configToSave), thumbnail });
      if (res.data.success) {
        setSkins([res.data.skin, ...skins]);
        setConfig(configToSave);
        setIsAdding(false);
        resetForm();
      }
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };
  const handleUpdate = async (id) => {
    try {
      const configToSave = normalizeConfigForSave(config);
      const res = await api.put(`/admin/skins/${id}`, { name, description, config: JSON.stringify(configToSave), thumbnail });
      if (res.data.success) {
        setSkins(skins.map(s => s.id === id ? { ...s, name, description, config: JSON.stringify(configToSave), thumbnail } : s));
        setConfig(configToSave);
        setEditingId(null);
        resetForm();
        alert("저장되었습니다. 변경한 색상·설정이 DB에 반영되었습니다.");
      }
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };
  const handleDelete = async (id) => { if (!confirm("정말 삭제하시겠습니까?")) return; try { const res = await api.delete(`/admin/skins/${id}`); if (res.data.success) setSkins(skins.filter(s => s.id !== id)); } catch (e) { alert(e.response?.data?.error || e.message); } };
  const startEdit = (skin) => {
    setEditingId(skin.id);
    setName(skin.name);
    setSlug(skin.slug);
    setDescription(skin.description || "");
    setThumbnail(skin.thumbnail || "");
    try {
      const p = JSON.parse(skin.config);
      const merged = { ...defaultConfig, ...p };
      const legacyGradient = Number(merged.imageGradient);
      if (!Number.isNaN(legacyGradient)) {
        if (merged.standardImageGradient == null) merged.standardImageGradient = legacyGradient;
        if (merged.fullImageGradient == null) merged.fullImageGradient = legacyGradient;
        if (merged.bottomImageGradient == null) merged.bottomImageGradient = legacyGradient;
      }
      setConfig(merged);
    } catch {
      resetForm();
    }
  };
  const [skinCardScale, setSkinCardScale] = useState(1);
  const skinScrollRef = useRef(null);
  const skinScrollState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });
  const isDraggingRef = useRef(false);
  const [scrollHint, setScrollHint] = useState({ left: false, right: false });

  const updateScrollHint = useRef(() => {
    if (isDraggingRef.current) return;
    const el = skinScrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 8;
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 8;
    setScrollHint((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }).current;

  useEffect(() => {
    updateScrollHint();
    const el = skinScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollHint, { passive: true });
    const ro = new ResizeObserver(updateScrollHint);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateScrollHint); ro.disconnect(); };
  }, [skins.length, updateScrollHint]);

  const handleSkinScrollStart = (e) => {
    const el = skinScrollRef.current;
    if (!el || e.button !== 0 || e.target.closest("button, a, input, [role='button']")) return;
    isDraggingRef.current = true;
    skinScrollState.current = { isDown: true, startX: e.pageX, scrollLeft: el.scrollLeft };
  };
  const handleSkinScrollEnd = () => {
    skinScrollState.current.isDown = false;
    isDraggingRef.current = false;
    updateScrollHint();
  };
  const handleSkinScrollMove = (e) => {
    const el = skinScrollRef.current;
    const st = skinScrollState.current;
    if (!el || !st.isDown) return;
    e.preventDefault();
    const walk = (e.pageX - st.startX) * 1.2;
    el.scrollLeft = st.scrollLeft - walk;
  };
  useEffect(() => {
    const onMove = (e) => handleSkinScrollMove(e);
    const onUp = () => handleSkinScrollEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  useEffect(() => {
    const CARD_BASE_HEIGHT = 860;
    const RESERVED_HEIGHT = 300;
    const MIN_SCALE = 0.62;
    const updateScale = () => {
      if (typeof window === "undefined") return;
      const available = window.innerHeight - RESERVED_HEIGHT;
      const next = Math.max(MIN_SCALE, Math.min(1, available / CARD_BASE_HEIGHT));
      setSkinCardScale(next);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-zinc-400 text-sm">로딩 중...</div></div>;

  if (isAdding || editingId) {
    const template = slug || "modern";
    const typoFallback = getTypoForTemplate(template);
    const previewConfig = { ...typoFallback, ...config, mainPhotoZoom: config.mainPhotoZoom ?? 100, mainPhotoAspectRatio: config.mainPhotoAspectRatio ?? 1 };
    const previewData = {
      groomName: "김철수", brideName: "이영희",
      weddingDate: getPreviewWeddingDateIso(30),
      venueName: "아름다운 웨딩홀", venueAddress: "서울특별시 강남구 테헤란로 123",
      invitationTitle: "우리\n결혼합니다",
      invitationMessage: "약속된 시간이 다가와\n사랑의 결실을 맺으려 합니다.\n오직 사랑 하나로 맺어지는\n저희의 축복된 시작을 함께해 주십시오.",
      mainPhotoUrl: displayPhotoUrl,
      mainPhotoFit: "cover",
      mainPhotoPosition: config.mainPhotoPosition || "50% 50%",
      groomFather: "김아빠", groomMother: "이엄마", groomRelation: "차남", groomPhone: "010-1234-5678",
      brideFather: "이아빠", brideMother: "박엄마", brideRelation: "장녀", bridePhone: "010-9876-5432",
      dDayEnabled: true, navigationEnabled: true,
      albumPhotos: [
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800",
        "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800",
      ],
      bankAccounts: [
        { ownerType: "신랑측", bankName: "국민은행", accountNumber: "110-123-456789", ownerName: "김철수" },
        { ownerType: "신부측", bankName: "하나은행", accountNumber: "123-456789-01234", ownerName: "이영희" },
      ],
      config: previewConfig,
    };
    return (
      <div className="fixed inset-x-0 bottom-0 top-[56px] bg-white z-[90] flex">
        <div className="w-[400px] h-full border-r border-zinc-100 flex flex-col bg-zinc-50/50">
          <div className="p-6 border-b border-zinc-100 bg-white flex justify-between items-center"><div className="flex items-center gap-2"><div className="p-2 bg-zinc-900 rounded-xl text-white"><PaletteIcon size={18} /></div><h2 className="font-black text-zinc-900">{editingId ? "스킨 수정" : "새 스킨 디자인"}</h2></div><button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 text-zinc-300 hover:text-black hover:bg-zinc-100 rounded-lg"><X size={20} /></button></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <div className="space-y-4"><h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Globe size={12} /> 기본 정보</h3>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="스킨 이름" className="w-full px-4 py-3 bg-white border border-zinc-100 rounded-xl text-sm shadow-sm" />
              <input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!!editingId} placeholder="고유 키" className="w-full px-4 py-3 bg-white border border-zinc-100 rounded-xl text-sm shadow-sm disabled:opacity-50" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명..." className="w-full px-4 py-3 bg-white border border-zinc-100 rounded-xl text-sm h-20 resize-none shadow-sm" />
              <div className="space-y-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest"><Wand2 size={12} /> AI 스킨 생성</div>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="예: 석양빛 코랄과 샴페인 골드 톤, 고급 호텔 무드, 메인 타이틀은 우아하게, 본문 가독성 높게, 버튼 대비는 선명하게"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs resize-y"
                />
                <div className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className={`${aiModel === "local" ? "col-span-4" : "col-span-8"} min-w-0 w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold`}
                  >
                    {AI_MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  {aiModel === "local" && (
                    <select
                      value={aiLocalPurpose}
                      onChange={(e) => setAiLocalPurpose(e.target.value)}
                      className="col-span-5 min-w-0 w-full px-2 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold"
                    >
                      {aiLocalPurposeOptions.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiGenerating}
                    className={`${aiModel === "local" ? "col-span-3" : "col-span-4"} w-full px-2 py-2.5 rounded-lg bg-zinc-900 text-white text-xs font-black tracking-wide disabled:opacity-50`}
                  >
                    {aiGenerating ? "생성 중..." : "AI 생성"}
                  </button>
                </div>
              </div>
            </div>
            <FontSelector config={config} updateConfig={updateConfig} selectedElement={selectedElement} setSelectedElement={setSelectedElement} />
            <div id="control-typography" className="space-y-6 p-4 rounded-2xl transition-all bg-white border border-zinc-100 shadow-sm">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Type size={12} /> 글자 크기</h3>
              <p className="text-[9px] text-zinc-400">미리보기 텍스트를 클릭하면 해당 항목의 크기/색상을 여기서 바로 조절할 수 있습니다.</p>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                  <span>전체 텍스트 배율</span>
                  <span>{config.textScale ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="140"
                  value={config.textScale ?? 100}
                  onChange={(e) => updateConfig({ textScale: Number(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                />
              </div>
              {pickedTextKey && TEXT_PICKER_META[pickedTextKey] && (
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-[10px] font-black text-zinc-500 uppercase">선택 항목: {TEXT_PICKER_META[pickedTextKey].label}</div>
                  <p className="text-[10px] text-zinc-400">입력칸을 비워두면 기본 문구를 사용합니다.</p>
                  {Array.isArray(TEXT_PICKER_META[pickedTextKey].textFields) && TEXT_PICKER_META[pickedTextKey].textFields.length > 0 && (
                    <div className="space-y-2">
                      {TEXT_PICKER_META[pickedTextKey].textFields.map((f) => (
                        <div key={f.key} className="space-y-1.5">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase">{f.label}</div>
                          <textarea
                            value={config[f.key] ?? ""}
                            onChange={(e) => updateConfig({ [f.key]: e.target.value })}
                            rows={2}
                            className="w-full py-2 px-3 border border-zinc-200 rounded-lg text-xs bg-white resize-y"
                            placeholder={f.placeholder || TEXT_OVERRIDE_PLACEHOLDER[f.key] || "텍스트를 입력하세요"}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {TEXT_PICKER_META[pickedTextKey].textKey && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">{TEXT_PICKER_META[pickedTextKey].textLabel || "텍스트"}</div>
                      <textarea
                        value={config[TEXT_PICKER_META[pickedTextKey].textKey] ?? ""}
                        onChange={(e) => updateConfig({ [TEXT_PICKER_META[pickedTextKey].textKey]: e.target.value })}
                        rows={3}
                        className="w-full py-2 px-3 border border-zinc-200 rounded-lg text-xs bg-white resize-y"
                        placeholder={TEXT_OVERRIDE_PLACEHOLDER[TEXT_PICKER_META[pickedTextKey].textKey] || "문구를 입력하세요"}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">크기</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={TEXT_PICKER_META[pickedTextKey].min}
                          max={TEXT_PICKER_META[pickedTextKey].max}
                          value={config[pickedTextKey] ?? defaultConfig[pickedTextKey]}
                          onChange={(e) => updateConfig({ [pickedTextKey]: Number(e.target.value) })}
                          className="w-14 py-1.5 px-2 border border-zinc-200 rounded-lg text-xs font-mono text-right"
                        />
                        <span className="text-[10px] font-bold text-zinc-400">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={TEXT_PICKER_META[pickedTextKey].min}
                      max={TEXT_PICKER_META[pickedTextKey].max}
                      value={config[pickedTextKey] ?? defaultConfig[pickedTextKey]}
                      onChange={(e) => updateConfig({ [pickedTextKey]: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">색상</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config[TEXT_PICKER_META[pickedTextKey].colorKey] || config[TEXT_PICKER_META[pickedTextKey].fallbackColorKey] || "#111111"}
                        onChange={(e) => updateConfig({ [TEXT_PICKER_META[pickedTextKey].colorKey]: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-white p-1 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => updateConfig({ [TEXT_PICKER_META[pickedTextKey].colorKey]: "" })}
                        className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-zinc-200 bg-white"
                      >
                        기본색
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowAdvancedTypography((p) => !p)}
                className="w-full py-2.5 rounded-xl border border-zinc-200 bg-white text-[11px] font-bold text-zinc-700"
              >
                {showAdvancedTypography ? "고급 텍스트 설정 숨기기" : "고급 텍스트 설정 열기"}
              </button>
              {showAdvancedTypography && (
                <div className="space-y-4">
                  {[
                    { label: "제목 크기", key: "titleSize", min: 20, max: 80 },
                    { label: "이름 크기", key: "namesSize", min: 16, max: 60 },
                    { label: "Save The Date 크기", key: "saveTheDateSize", min: 8, max: 24 },
                    { label: "날짜 크기", key: "dateSize", min: 10, max: 30 },
                    { label: "본문 크기", key: "contentSize", min: 12, max: 40 },
                  ].map((c) => {
                    const val = config[c.key] ?? defaultConfig[c.key];
                    const clamp = (n) => Math.max(c.min, Math.min(c.max, Number(n) || c.min));
                    return (
                      <div key={c.key} className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">{c.label}</span>
                          <div className="flex items-center gap-1.5">
                            <input type="number" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: clamp(e.target.value) })} className="w-14 py-1.5 px-2 border border-zinc-200 rounded-lg text-xs font-mono text-right" />
                            <span className="text-[10px] font-bold text-zinc-400">px</span>
                          </div>
                        </div>
                        <input type="range" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900" />
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-zinc-100 space-y-4">
                    {[
                      { label: "달력 제목 크기", key: "calendarTitleSize", min: 16, max: 44 },
                      { label: "달력 날짜 크기", key: "calendarDaySize", min: 10, max: 26 },
                    ].map((c) => {
                      const val = config[c.key] ?? defaultConfig[c.key];
                      const clamp = (n) => Math.max(c.min, Math.min(c.max, Number(n) || c.min));
                      return (
                        <div key={c.key} className="space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{c.label}</span>
                            <div className="flex items-center gap-1.5">
                              <input type="number" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: clamp(e.target.value) })} className="w-14 py-1.5 px-2 border border-zinc-200 rounded-lg text-xs font-mono text-right" />
                              <span className="text-[10px] font-bold text-zinc-400">px</span>
                            </div>
                          </div>
                          <input type="range" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 border-t border-zinc-100 space-y-4">
                    {[
                      { label: "Gallery 제목", key: "galleryTitleSize", min: 8, max: 32 },
                      { label: "Location 제목", key: "locationTitleSize", min: 8, max: 32 },
                      { label: "Account 제목", key: "accountTitleSize", min: 8, max: 32 },
                      { label: "참석 여부 제목", key: "attendanceTitleSize", min: 8, max: 32 },
                    ].map((c) => {
                      const val = config[c.key] ?? defaultConfig[c.key];
                      const clamp = (n) => Math.max(c.min, Math.min(c.max, Number(n) || c.min));
                      return (
                        <div key={c.key} className="space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{c.label}</span>
                            <div className="flex items-center gap-1.5">
                              <input type="number" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: clamp(e.target.value) })} className="w-14 py-1.5 px-2 border border-zinc-200 rounded-lg text-xs font-mono text-right" />
                              <span className="text-[10px] font-bold text-zinc-400">px</span>
                            </div>
                          </div>
                          <input type="range" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 border-t border-zinc-100 space-y-4">
                    {[
                      { label: "Location 주소", key: "locationAddressSize", min: 10, max: 28 },
                      { label: "내비 버튼 텍스트", key: "navButtonTextSize", min: 8, max: 20 },
                      { label: "Account 보조문구", key: "accountSubtitleSize", min: 9, max: 24 },
                      { label: "계좌 토글(신랑측/신부측)", key: "accountToggleLabelSize", min: 9, max: 24 },
                      { label: "계좌 상단(은행/Copy)", key: "accountHeaderSize", min: 8, max: 24 },
                      { label: "계좌 정보(번호/예금주)", key: "accountInfoSize", min: 12, max: 36 },
                    ].map((c) => {
                      const val = config[c.key] ?? defaultConfig[c.key];
                      const clamp = (n) => Math.max(c.min, Math.min(c.max, Number(n) || c.min));
                      return (
                        <div key={c.key} className="space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{c.label}</span>
                            <div className="flex items-center gap-1.5">
                              <input type="number" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: clamp(e.target.value) })} className="w-14 py-1.5 px-2 border border-zinc-200 rounded-lg text-xs font-mono text-right" />
                              <span className="text-[10px] font-bold text-zinc-400">px</span>
                            </div>
                          </div>
                          <input type="range" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 border-t border-zinc-100 space-y-4">
                    {[
                      { label: "참석 안내문", key: "attendanceDescSize", min: 10, max: 24 },
                      { label: "폼 라벨(성함/구분/참석여부/참석인원/식사여부/메모/작성자/메시지)", key: "attendanceLabelSize", min: 9, max: 20 },
                      { label: "참석 옵션 텍스트", key: "attendanceOptionTextSize", min: 10, max: 24 },
                      { label: "폼 placeholder", key: "formPlaceholderSize", min: 10, max: 24 },
                    ].map((c) => {
                      const val = config[c.key] ?? defaultConfig[c.key];
                      const clamp = (n) => Math.max(c.min, Math.min(c.max, Number(n) || c.min));
                      return (
                        <div key={c.key} className="space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{c.label}</span>
                            <div className="flex items-center gap-1.5">
                              <input type="number" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: clamp(e.target.value) })} className="w-14 py-1.5 px-2 border border-zinc-200 rounded-lg text-xs font-mono text-right" />
                              <span className="text-[10px] font-bold text-zinc-400">px</span>
                            </div>
                          </div>
                          <input type="range" min={c.min} max={c.max} value={val} onChange={(e) => updateConfig({ [c.key]: Number(e.target.value) })} className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div id="control-image" className={`space-y-6 p-4 rounded-2xl transition-all ${selectedElement === "image" ? "bg-zinc-100 ring-2 ring-zinc-900 shadow-lg" : "bg-white border border-zinc-100 shadow-sm"}`}>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><PaletteIcon size={12} /> 메인 사진 스타일</h3>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">표시 방식</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ id: "standard", name: "일반 박스" }, { id: "full", name: "전체 배경" }].map((s) => (
                    <button key={s.id} onClick={() => updateConfig({ imageStyle: s.id })} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.imageStyle === s.id ? "bg-zinc-900 text-white shadow-lg" : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100"}`}>{s.name}</button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 space-y-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">대표 사진 (미리보기/썸네일용)</label>
                <button
                  onClick={(e) => { e.stopPropagation(); document.getElementById("admin-photo-upload")?.click(); }}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold tracking-wide"
                >
                  {thumbnail ? "메인 사진 교체" : "메인 사진 업로드"}
                </button>
                <input id="admin-photo-upload" type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                <div
                  ref={editorPhotoContainerRef}
                  className={`relative w-[303px] h-[440px] mx-auto bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl overflow-hidden cursor-grab`}
                  style={{
                    "--photo-x": parsePhotoPosition(photoPosition).x,
                    "--photo-y": parsePhotoPosition(photoPosition).y,
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e); }}
                  onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e); }}
                >
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      backgroundImage: `url("${displayPhotoUrl}")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: getEditorCoverBgPosition(),
                      backgroundSize: getEditorCoverBgSize(),
                    }}
                  />
                  {!thumbnail && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-2 pointer-events-none">
                      <span className="text-[10px] font-bold">기본 제공 샘플 이미지입니다.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <p className="text-[10px] text-zinc-400 text-center">사진을 드래그하면 위치를 조절할 수 있습니다.</p>

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
                      onChange={(e) => updateConfig({ mainPhotoZoom: Math.max(getEditorMinZoom(), Number(e.target.value)) })}
                      className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                    />
                  </div>


                </div>
              </div>
            </div>

            <div id="control-colors" className="space-y-6 p-4 rounded-2xl transition-all hover:bg-zinc-50" onClick={() => setSelectedElement("colors")}>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><PaletteIcon size={12} /> 기본 색상</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "전체 배경", key: "bgColor" },
                  { label: "섹션 배경", key: "subBgColor" },
                  { label: "기본 글자", key: "textColor" },
                  { label: "강조/포인트", key: "pointColor" },
                ].map((item) => (
                  <div key={item.key} className="space-y-2"><label className="text-[10px] font-bold text-zinc-400 uppercase">{item.label}</label><div className="flex items-center gap-2"><input type="color" value={config[item.key]} onChange={(e) => updateConfig({ [item.key]: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-white p-1 shadow-sm" onClick={(e) => e.stopPropagation()} /><span className="text-[10px] font-mono text-zinc-400 uppercase">{config[item.key]}</span></div></div>
                ))}
              </div>
            </div>

            <div className="space-y-6 p-4 rounded-2xl transition-all hover:bg-zinc-50">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><PaletteIcon size={12} /> 히어로 섹션 색상</h3>
              <p className="text-[9px] text-zinc-400">비워두면 기본 색상을 따릅니다</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "제목 글자", key: "titleColor", fallback: config.textColor },
                  { label: "이름 글자", key: "nameColor", fallback: config.textColor },
                  { label: "날짜 글자", key: "dateColor", fallback: config.textColor },
                ].map((item) => (
                  <div key={item.key} className="space-y-2"><label className="text-[10px] font-bold text-zinc-400 uppercase">{item.label}</label><div className="flex items-center gap-2"><input type="color" value={config[item.key] || item.fallback} onChange={(e) => updateConfig({ [item.key]: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-white p-1 shadow-sm" onClick={(e) => e.stopPropagation()} /><span className="text-[10px] font-mono text-zinc-400 uppercase">{config[item.key] || "기본"}</span>{config[item.key] && <button onClick={(e) => { e.stopPropagation(); updateConfig({ [item.key]: "" }); }} className="text-[9px] text-red-400 hover:text-red-600">초기화</button>}</div></div>
                ))}
              </div>
            </div>

            <div className="space-y-6 p-4 rounded-2xl transition-all hover:bg-zinc-50">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><PaletteIcon size={12} /> 본문 / 달력 색상</h3>
              <p className="text-[9px] text-zinc-400">비워두면 기본 색상을 따릅니다</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "초대 메시지", key: "messageColor", fallback: config.textColor },
                  { label: "섹션 제목", key: "sectionTitleColor", fallback: config.pointColor },
                  { label: "달력 배경", key: "calendarBgColor", fallback: config.subBgColor },
                  { label: "달력 날짜", key: "calendarDayColor", fallback: config.textColor },
                  { label: "달력 하이라이트", key: "calendarActiveColor", fallback: config.pointColor },
                ].map((item) => (
                  <div key={item.key} className="space-y-2"><label className="text-[10px] font-bold text-zinc-400 uppercase">{item.label}</label><div className="flex items-center gap-2"><input type="color" value={config[item.key] || item.fallback} onChange={(e) => updateConfig({ [item.key]: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-white p-1 shadow-sm" onClick={(e) => e.stopPropagation()} /><span className="text-[10px] font-mono text-zinc-400 uppercase">{config[item.key] || "기본"}</span>{config[item.key] && <button onClick={(e) => { e.stopPropagation(); updateConfig({ [item.key]: "" }); }} className="text-[9px] text-red-400 hover:text-red-600">초기화</button>}</div></div>
                ))}
              </div>
            </div>

            <div className="space-y-6 p-4 rounded-2xl transition-all hover:bg-zinc-50">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><PaletteIcon size={12} /> 버튼 / 푸터 색상</h3>
              <p className="text-[9px] text-zinc-400">비워두면 기본 색상을 따릅니다</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "버튼 배경", key: "buttonColor", fallback: config.pointColor },
                  { label: "버튼 글자", key: "buttonTextColor", fallback: "#ffffff" },
                  { label: "푸터 글자", key: "footerColor", fallback: config.textColor },
                ].map((item) => (
                  <div key={item.key} className="space-y-2"><label className="text-[10px] font-bold text-zinc-400 uppercase">{item.label}</label><div className="flex items-center gap-2"><input type="color" value={config[item.key] || item.fallback} onChange={(e) => updateConfig({ [item.key]: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border-none bg-white p-1 shadow-sm" onClick={(e) => e.stopPropagation()} /><span className="text-[10px] font-mono text-zinc-400 uppercase">{config[item.key] || "기본"}</span>{config[item.key] && <button onClick={(e) => { e.stopPropagation(); updateConfig({ [item.key]: "" }); }} className="text-[9px] text-red-400 hover:text-red-600">초기화</button>}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 bg-white border-t border-zinc-100"><p className="text-[10px] text-zinc-400 mb-2">색상·폰트 등 변경 후 아래 버튼을 누르면 DB에 저장됩니다.</p><button onClick={editingId ? () => handleUpdate(editingId) : handleCreate} className="w-full py-4 bg-zinc-900 text-white rounded-xl text-xs font-black tracking-widest uppercase hover:bg-black shadow-xl flex items-center justify-center gap-2"><Check size={16} /> {editingId ? "변경 사항 DB 저장" : "디자인 게시"}</button></div>
        </div>
        <div className="flex-1 bg-white flex flex-col px-4 md:px-8 lg:px-12 py-8 overflow-hidden relative border-l border-zinc-100">
          <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest font-mono text-zinc-500">Live Simulation</span>
            <div className="flex rounded-xl bg-zinc-100 p-1 gap-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${previewMode === "mobile" ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                <Smartphone size={14} /> 모바일
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("web")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${previewMode === "web" ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                <Monitor size={14} /> 웹
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0 pt-14">
            {previewMode === "mobile" ? (
              <MobileFrame className="scale-[0.7] lg:scale-[0.85] xl:scale-100" backgroundColor={config.bgColor || "#ffffff"}>
                <div className="absolute inset-0 overflow-y-auto hide-scrollbar" style={{ backgroundColor: config.bgColor || "#ffffff" }}>
                  <InvitationView
                    template={template}
                    isPreview={true}
                    showFormsInPreview={true}
                    onSelectSection={(id) => { setSelectedElement(id); const el = document.getElementById(`control-${id}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                    activeSection={selectedElement}
                    onTextSizePick={setPickedTextKey}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onPhotoClick={handlePhotoClick}
                    previewPhotoContainerRef={previewPhotoContainerRef}
                    data={previewData}
                    disableMainPhotoOverlay={String(previewData?.config?.imageStyle || "standard") !== "full"}
                    forceFullImageDarken
                  />
                </div>
              </MobileFrame>
            ) : (
              <div className="w-full max-w-2xl h-full max-h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl border border-zinc-200 shadow-xl" style={{ backgroundColor: config.bgColor || "#ffffff" }}>
                <InvitationView
                  template={template}
                  isPreview={true}
                  showFormsInPreview={true}
                  onSelectSection={(id) => { setSelectedElement(id); const el = document.getElementById(`control-${id}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                  activeSection={selectedElement}
                  onTextSizePick={setPickedTextKey}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onPhotoClick={handlePhotoClick}
                  previewPhotoContainerRef={previewPhotoContainerRef}
                  data={previewData}
                  disableMainPhotoOverlay={String(previewData?.config?.imageStyle || "standard") !== "full"}
                  forceFullImageDarken
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] box-border overflow-hidden px-4 pt-4 md:px-8 md:pt-8 bg-zinc-50">
      <div className="max-w-[1400px] mx-auto h-full flex flex-col gap-6 px-4">
        <div className="flex justify-between items-center flex-wrap gap-4"><div><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center text-white"><LayoutDashboard size={20} /></div><h1 className="text-3xl font-black text-zinc-900">청첩장 스킨 라이브러리</h1></div><p className="text-zinc-500 font-medium">서비스 전체의 디자인 테마와 스타일링을 관리합니다.</p></div>
          <div className="flex gap-2">
            <button onClick={() => { setIsAdding(true); resetForm(); }} className="flex items-center gap-2 px-6 py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black shadow-xl"><Plus size={18} /> 새 디자인 스킨 출시</button>
          </div>
        </div>
        <div className="relative max-w-[1200px] mx-auto flex-1 min-h-0 flex flex-col justify-end">
          {scrollHint.left && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-3 rounded-full bg-zinc-900 text-white text-sm font-bold shadow-xl ring-2 ring-white/30 pointer-events-none animate-pulse">
              <ChevronLeft size={20} strokeWidth={2.5} /> 더 보기
            </div>
          )}
          {scrollHint.right && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-4 py-3 rounded-full bg-zinc-900 text-white text-sm font-bold shadow-xl ring-2 ring-white/30 pointer-events-none animate-pulse">
              더 보기 <ChevronRight size={20} strokeWidth={2.5} />
            </div>
          )}
          <div
            ref={skinScrollRef}
            className="overflow-x-auto overflow-y-hidden pb-2 px-4 cursor-grab active:cursor-grabbing select-none"
            style={{ scrollbarGutter: "stable both-edges" }}
            onMouseDown={handleSkinScrollStart}
            onMouseLeave={handleSkinScrollEnd}
            onMouseUp={handleSkinScrollEnd}
            onMouseMove={handleSkinScrollMove}
          >
            <div className="flex gap-6 min-w-max pr-8">
              {skins.map((skin) => {
                const skinConfig = (() => {
                  try {
                    return typeof skin.config === "string" ? JSON.parse(skin.config || "{}") : (skin.config || {});
                  } catch {
                    return {};
                  }
                })();
                const legacyGradient = Number(skinConfig.imageGradient);
                const resolvedSkinConfig = {
                  ...skinConfig,
                  ...(Number.isNaN(legacyGradient)
                    ? {}
                    : {
                      standardImageGradient: skinConfig.standardImageGradient ?? legacyGradient,
                      fullImageGradient: skinConfig.fullImageGradient ?? legacyGradient,
                      bottomImageGradient: skinConfig.bottomImageGradient ?? legacyGradient,
                    }),
                };
                const bgColor = skinConfig.bgColor || (skin.slug === "modern" ? "#f1f5f9" : skin.slug === "classic" ? "#faf6f1" : "#1a1a1a");
                const displayPhotoUrl = skin.displayPhotoUrl || skin.thumbnail || "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200&auto=format&fit=crop";
                const sampleData = {
                  groomName: "김철수", brideName: "이영희",
                  weddingDate: getPreviewWeddingDateIso(30),
                  venueName: "아름다운 웨딩홀", venueAddress: "서울특별시 강남구 테헤란로 123",
                  invitationTitle: "우리\n결혼합니다",
                  invitationMessage: "약속된 시간이 다가와\n사랑의 결실을 맺으려 합니다.",
                  mainPhotoUrl: displayPhotoUrl,
                  dDayEnabled: true, navigationEnabled: true,
                  albumPhotos: [], bankAccounts: [],
                  mainPhotoFit: "cover",
                  mainPhotoPosition: skinConfig.mainPhotoPosition || "50% 50%",
                  config: { ...getTypoForTemplate(skin.slug), ...resolvedSkinConfig, mainPhotoZoom: skinConfig.mainPhotoZoom ?? 100, mainPhotoAspectRatio: skinConfig.mainPhotoAspectRatio ?? 1 },
                };
                return (
                  <div
                    key={skin.id}
                    className="group flex-shrink-0"
                    style={{ width: `${350 * skinCardScale}px`, height: `${860 * skinCardScale}px` }}
                  >
                    <div
                      className="w-[350px] mx-auto"
                      style={{ transform: `scale(${skinCardScale})`, transformOrigin: "top center" }}
                    >
                      <div className="relative w-[350px] h-[700px] overflow-hidden shrink-0 mx-auto flex items-center justify-center">
                        <MobileFrame compact backgroundColor={bgColor}>
                          <div
                            className="absolute inset-0 overflow-y-auto hide-scrollbar"
                            style={{ backgroundColor: bgColor }}
                            onWheel={(e) => e.stopPropagation()}
                          >
                            <InvitationView
                              data={sampleData}
                              template={skin.slug}
                              isPreview={false}
                              compactPreview
                              enableMainPhotoLightbox={false}
                              disableMainPhotoOverlay={String(sampleData?.config?.imageStyle || "standard") !== "full"}
                              forceFullImageDarken
                            />
                          </div>
                        </MobileFrame>
                      </div>
                      <div className="mt-3 w-full max-w-[350px] p-2 space-y-1.5 border border-zinc-300 rounded-lg bg-zinc-50/80 shadow-sm">
                        <div className="space-y-1">
                          <div className="px-2.5 py-0.5 bg-zinc-200 rounded-full text-[10px] font-bold tracking-widest text-zinc-800 uppercase w-fit">/{skin.slug}</div>
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-base font-bold text-zinc-900">{skin.name}</h3>
                              {formatCreatedDate(skin.createdAt) && (
                                <span className="text-[10px] text-zinc-400 shrink-0">{formatCreatedDate(skin.createdAt)}</span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-600">{skin.description || "설명 없음"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); startEdit(skin); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
                            <Edit2 size={14} /> 편집하기
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(skin.id); }} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

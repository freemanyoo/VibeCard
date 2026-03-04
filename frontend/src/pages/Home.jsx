import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import api from "../lib/api";
import MobileFrame from "../components/MobileFrame";
import InvitationView from "../components/InvitationView";
import MobileTemplatePreview from "../components/MobileTemplatePreview";
import { WeddingData } from "../lib/data";

const getPreviewWeddingDateIso = (daysAhead = 30) => {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

const sampleInvitationData = {
  groomName: WeddingData.groom.name,
  brideName: WeddingData.bride.name,
  weddingDate: getPreviewWeddingDateIso(30),
  venueName: WeddingData.venue.name,
  venueAddress: WeddingData.venue.address,
  invitationTitle: WeddingData.title,
  invitationMessage: WeddingData.message,
  mainPhotoUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=1200&auto=format&fit=crop",
  groomFather: WeddingData.groom.father,
  groomMother: WeddingData.groom.mother,
  groomRelation: WeddingData.groom.relation,
  groomPhone: WeddingData.groom.phone,
  brideFather: WeddingData.bride.father,
  brideMother: WeddingData.bride.mother,
  brideRelation: WeddingData.bride.relation,
  bridePhone: WeddingData.bride.phone,
  dDayEnabled: true,
  navigationEnabled: true,
  albumPhotos: WeddingData.albumPhotos || [],
  bankAccounts: WeddingData.bankAccounts || [],
};

const HOME_PREVIEW_PHONE_WIDTH = 375;
const HOME_PREVIEW_PHONE_HEIGHT = 750;
const HOME_PREVIEW_CARD_EXTRA_HEIGHT = 205;

function SkinPhonePreview({ skin, cardScale = 1 }) {
  const scrollRef = useRef(null);
  const config = (() => {
    try {
      return typeof skin.config === "string" ? JSON.parse(skin.config || "{}") : (skin.config || {});
    } catch {
      return {};
    }
  })();
  const bgColor = config.bgColor || "#ffffff";
  const builderUrl = `/builder?template=${encodeURIComponent(skin.slug)}`;
  const previewPhotoUrl =
    skin.displayPhotoUrl ||
    skin.thumbnail ||
    skin.mainPhotoUrl ||
    skin.photoUrl ||
    sampleInvitationData.mainPhotoUrl;

  return (
    <div className="relative mx-auto flex flex-col items-center">
      <Link to={builderUrl} className="text-xl font-bold mb-3 text-zinc-800 hover:text-zinc-900">
        {skin.name}
      </Link>
      <div
        className="group relative mx-auto flex-shrink-0"
        style={{ width: `${HOME_PREVIEW_PHONE_WIDTH * cardScale}px`, height: `${HOME_PREVIEW_PHONE_HEIGHT * cardScale}px` }}
      >
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: `${HOME_PREVIEW_PHONE_WIDTH}px`,
            height: `${HOME_PREVIEW_PHONE_HEIGHT * cardScale}px`,
          }}
        >
          <div
            style={{
              width: `${HOME_PREVIEW_PHONE_WIDTH}px`,
              height: `${HOME_PREVIEW_PHONE_HEIGHT}px`,
              transform: `scale(${cardScale})`,
              transformOrigin: "top center",
            }}
          >
          <div
            className="relative shrink-0 mx-auto flex items-center justify-center"
            style={{ width: `${HOME_PREVIEW_PHONE_WIDTH}px`, height: `${HOME_PREVIEW_PHONE_HEIGHT}px` }}
          >
            <MobileFrame compact compactScale={1} className="hover:scale-[1.02]" backgroundColor={bgColor}>
              <div ref={scrollRef} className="absolute inset-0 overflow-y-auto hide-scrollbar">
                <InvitationView
                  data={{
                    ...sampleInvitationData,
                    mainPhotoUrl: previewPhotoUrl,
                    config: { ...config },
                  }}
                  template={skin.slug}
                  compactPreview
                  enableMainPhotoLightbox={false}
                  disableMainPhotoOverlay={String(config.imageStyle || "standard") !== "full"}
                  forceFullImageDarken
                />
              </div>
            </MobileFrame>
          </div>
          </div>
        </div>
      </div>
      <Link
        to={builderUrl}
        className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:gap-2 transition-all"
      >
        이 디자인으로 만들기 <ChevronRight size={18} />
      </Link>
    </div>
  );
}

export default function Home() {
  const [skins, setSkins] = useState([]);
  const [page, setPage] = useState(0);
  const [cardScale, setCardScale] = useState(1);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 1024px)").matches;
  });
  const carouselRef = useRef(null);
  const templates = ["modern", "elegant", "classic"];

  useEffect(() => {
    api.get("/skins").then((res) => setSkins(res.data.skins || [])).catch(() => setSkins([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(max-width: 1024px)");
    const updateViewportMode = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateViewportMode);
      return () => media.removeEventListener("change", updateViewportMode);
    }
    media.addListener(updateViewportMode);
    return () => media.removeListener(updateViewportMode);
  }, []);

  useEffect(() => {
    const CARD_BASE_WIDTH = HOME_PREVIEW_PHONE_WIDTH;
    const CARD_BASE_HEIGHT = HOME_PREVIEW_PHONE_HEIGHT + HOME_PREVIEW_CARD_EXTRA_HEIGHT;
    const MOBILE_SAFE_GUTTER = 64;
    const MOBILE_RESERVED_HEIGHT = 150;
    const MOBILE_MIN_SCALE = 0.58;
    const MOBILE_MAX_SCALE = 0.92;
    const updateScale = () => {
      if (typeof window === "undefined") return;
      if (window.matchMedia("(max-width: 1024px)").matches) {
        const viewportHeight =
          typeof window.visualViewport?.height === "number" && window.visualViewport.height > 0
            ? window.visualViewport.height
            : window.innerHeight;
        const availableWidth = Math.max(280, window.innerWidth - MOBILE_SAFE_GUTTER);
        const availableHeight = Math.max(440, viewportHeight - MOBILE_RESERVED_HEIGHT);
        const widthScale = availableWidth / CARD_BASE_WIDTH;
        const heightScale = availableHeight / CARD_BASE_HEIGHT;
        const shortViewportPenalty = viewportHeight <= 620 ? 0.08 : viewportHeight <= 700 ? 0.04 : 0;
        const nextScale = Math.max(
          MOBILE_MIN_SCALE,
          Math.min(MOBILE_MAX_SCALE, widthScale, heightScale) - shortViewportPenalty,
        );
        setCardScale(nextScale);
        return;
      }
      const next = 1;
      setCardScale(next);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateScale);
    }
    return () => {
      window.removeEventListener("resize", updateScale);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateScale);
      }
    };
  }, []);

  const perPage = isMobileViewport ? 1 : 3;
  const items = skins.length > 0 ? skins : templates;
  const maxPage = Math.max(0, Math.ceil(items.length / perPage) - 1);
  const currentSkins = skins.slice(page * perPage, page * perPage + perPage);
  const currentTemplates = templates.slice(page * perPage, page * perPage + perPage);
  const hasMultiplePages = items.length > perPage;

  useEffect(() => {
    setPage((prev) => Math.min(prev, maxPage));
  }, [maxPage]);

  useEffect(() => {
    if (!isMobileViewport || !carouselRef.current) return;
    const node = carouselRef.current;
    const width = node.clientWidth;
    node.scrollTo({ left: width * page, behavior: "smooth" });
  }, [isMobileViewport, page, items.length]);

  const handleCarouselScroll = () => {
    if (!isMobileViewport || !carouselRef.current) return;
    const node = carouselRef.current;
    const width = node.clientWidth;
    if (!width) return;
    const nextPage = Math.round(node.scrollLeft / width);
    setPage((prev) => (prev === nextPage ? prev : Math.max(0, Math.min(maxPage, nextPage))));
  };

  const renderCard = (item, index) => {
    if (skins.length > 0) {
      return <SkinPhonePreview key={item.id} skin={item} cardScale={cardScale} />;
    }
    return <MobileTemplatePreview key={item} template={item} cardScale={cardScale} />;
  };

  return (
    <main className={`min-h-screen bg-zinc-50 ${isMobileViewport ? "py-5 px-3" : "py-10 px-4"}`}>
      <div className={`max-w-[1400px] mx-auto ${isMobileViewport ? "space-y-4" : "space-y-6"}`}>
        <div className="text-center space-y-2 mb-8 hidden lg:block">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight">원하는 디자인을 선택하세요</h1>
          <p className="text-zinc-500 text-lg">모바일 청첩장, 이제 감각적인 템플릿으로 시작해보세요.</p>
        </div>
        {isMobileViewport ? (
          <div className="relative pb-3">
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory hide-scrollbar touch-pan-x"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {items.map((item, index) => (
                <div key={skins.length > 0 ? item.id : item} className="min-w-full max-w-full flex-none snap-start flex items-start justify-center">
                  {renderCard(item, index)}
                </div>
              ))}
            </div>
            {hasMultiplePages && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <div className="min-w-[92px] flex justify-end">
                  {page > 0 && (
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-bold shadow-lg ring-2 ring-white/30 pointer-events-none">
                      <ChevronLeft size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {items.map((item, index) => (
                    <button
                      key={skins.length > 0 ? item.id : item}
                      type="button"
                      onClick={() => setPage(index)}
                      className={`h-2.5 rounded-full transition-all ${index === page ? "w-6 bg-zinc-900" : "w-2.5 bg-zinc-300"}`}
                      aria-label={`${index + 1}번째 디자인으로 이동`}
                    />
                  ))}
                </div>
                <div className="min-w-[92px] flex justify-start">
                  {page < maxPage && (
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-bold shadow-lg ring-2 ring-white/30 pointer-events-none">
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : skins.length > 0 ? (
          <div className="relative">
            {hasMultiplePages && (
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-3 rounded-full border-2 border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
                  aria-label="이전 디자인"
                >
                  <ChevronLeft size={24} />
                </button>
                <span className="text-sm font-medium text-zinc-500 min-w-[4rem] text-center">
                  {page + 1} / {maxPage + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  disabled={page >= maxPage}
                  className="p-3 rounded-full border-2 border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
                  aria-label="다음 디자인"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 justify-items-center">
              {currentSkins.map((s) => (
                <SkinPhonePreview key={s.id} skin={s} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 justify-items-center">
            {currentTemplates.map((t) => <MobileTemplatePreview key={t} template={t} />)}
          </div>
        )}
      </div>
    </main>
  );
}

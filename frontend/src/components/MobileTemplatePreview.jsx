import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { WeddingData } from "../lib/data";
import MobileFrame from "./MobileFrame";
import InvitationView from "./InvitationView";

const getPreviewWeddingDate = (daysAhead = 30) => {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  d.setHours(12, 0, 0, 0);
  return d;
};

const PREVIEW_PHONE_W = 375;
const PREVIEW_PHONE_H = 750;

export default function MobileTemplatePreview({ template, cardScale = 1 }) {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current && scrollContainerRef.current.scrollTop > 50 && showScrollHint) {
        setShowScrollHint(false);
      }
    };
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [showScrollHint]);

  return (
    <div className="relative mx-auto flex flex-col items-center">
      <div className="text-xl font-bold mb-6 capitalize text-zinc-800">{template}</div>
      <div
        className="group relative mx-auto flex-shrink-0"
        style={{ width: `${PREVIEW_PHONE_W * cardScale}px`, height: `${PREVIEW_PHONE_H * cardScale}px` }}
      >
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: `${PREVIEW_PHONE_W}px`,
            height: `${PREVIEW_PHONE_H * cardScale}px`,
          }}
        >
          <div
            style={{
              width: `${PREVIEW_PHONE_W}px`,
              height: `${PREVIEW_PHONE_H}px`,
              transform: `scale(${cardScale})`,
              transformOrigin: "top center",
            }}
          >
          <div
            className="relative shrink-0 mx-auto flex items-center justify-center"
            style={{ width: `${PREVIEW_PHONE_W}px`, height: `${PREVIEW_PHONE_H}px` }}
          >
            <MobileFrame compact compactScale={1} className="hover:scale-[1.02]">
              <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto hide-scrollbar">
                <InvitationView
                  data={{
                    ...WeddingData,
                    groomName: WeddingData.groom.name, groomPhone: WeddingData.groom.phone,
                    groomFather: WeddingData.groom.father, groomFatherPhone: WeddingData.groom.fatherPhone,
                    groomMother: WeddingData.groom.mother, groomMotherPhone: WeddingData.groom.motherPhone,
                    groomRelation: WeddingData.groom.relation,
                    brideName: WeddingData.bride.name, bridePhone: WeddingData.bride.phone,
                    brideFather: WeddingData.bride.father, brideFatherPhone: WeddingData.bride.fatherPhone,
                    brideMother: WeddingData.bride.mother, brideMotherPhone: WeddingData.bride.motherPhone,
                    brideRelation: WeddingData.bride.relation,
                    weddingDate: getPreviewWeddingDate(30),
                    venueName: WeddingData.venue.name, venueAddress: WeddingData.venue.address,
                    invitationTitle: WeddingData.title, invitationMessage: WeddingData.message,
                  }}
                  template={template}
                  compactPreview
                  enableMainPhotoLightbox={false}
                  disableMainPhotoOverlay={String(WeddingData?.config?.imageStyle || "standard") !== "full"}
                  forceFullImageDarken
                />
              </div>
              {showScrollHint && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[60] animate-bounce pointer-events-none">
                  <div className="flex flex-col items-center gap-1 opacity-60">
                    <span className={`text-xs font-medium ${template === "elegant" ? "text-white" : "text-zinc-600"}`}>아래로 스크롤</span>
                    <ChevronDown size={20} className={template === "elegant" ? "text-white" : "text-zinc-600"} />
                  </div>
                </div>
              )}
            </MobileFrame>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

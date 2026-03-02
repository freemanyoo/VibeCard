import { useRef } from "react";
import { PhoneFrameHeightProvider } from "../context/PhoneFrameContext";

const PHONE_W = 375;
const PHONE_H = 750;
const COMPACT_SCALE = 0.9;

function PhoneFrameInner({ children, className, backgroundColor, contentRef }) {
  return (
    <div
      className={`w-[375px] h-[750px] bg-white rounded-[60px] shadow-2xl border-[12px] border-zinc-900 overflow-hidden relative flex flex-col transition-transform duration-500 ${className}`}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-30" />
      <PhoneFrameHeightProvider contentRef={contentRef}>
        <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-hide flex flex-col relative min-h-0" style={{ backgroundColor }}>
          {children}
        </div>
      </PhoneFrameHeightProvider>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-900/10 rounded-full z-30" />
    </div>
  );
}

export default function MobileFrame({ children, className = "", backgroundColor = "#ffffff", compact = false, compactScale = COMPACT_SCALE }) {
  const contentRef = useRef(null);
  const inner = (
    <PhoneFrameInner className={className} backgroundColor={backgroundColor} contentRef={contentRef}>
      {children}
    </PhoneFrameInner>
  );

  if (compact) {
    const scale = Number(compactScale) > 0 ? Number(compactScale) : COMPACT_SCALE;
    return (
      <div
        className="flex justify-center"
        style={{
          width: PHONE_W * scale,
          height: PHONE_H * scale,
          maxWidth: "100%",
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            width: PHONE_W,
            height: PHONE_H,
          }}
        >
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-full max-h-[80vh] md:max-h-[90vh] flex justify-center ${className}`}>
      <div style={{ width: PHONE_W, height: PHONE_H, maxHeight: "min(750px, 90vh)" }} className="shrink-0">
        {inner}
      </div>
    </div>
  );
}

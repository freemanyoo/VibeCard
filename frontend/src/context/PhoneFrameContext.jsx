import { createContext, useContext, useState, useEffect } from "react";

const PhoneFrameHeightContext = createContext(null);

/** MobileFrame 내부 스크롤 영역 ref를 넘기면, 그 높이를 구독해 하위에서 사용할 수 있게 함 */
export function PhoneFrameHeightProvider({ contentRef, children }) {
  const [height, setHeight] = useState(null);

  useEffect(() => {
    const node = contentRef?.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const h = entry?.contentRect?.height;
      setHeight(typeof h === "number" && h > 0 ? Math.round(h) : null);
    });
    observer.observe(node);
    setHeight(Math.round(node.getBoundingClientRect().height));
    return () => observer.disconnect();
  }, [contentRef]);

  return (
    <PhoneFrameHeightContext.Provider value={height}>
      {children}
    </PhoneFrameHeightContext.Provider>
  );
}

export function usePhoneFrameHeight() {
  return useContext(PhoneFrameHeightContext);
}

export function formatImageUrl(url) {
  if (typeof url !== "string") return url;
  if (url.startsWith("/uploads/")) {
    return "/api" + url;
  }
  return url;
}

export function toThumbnailUrl(url) {
  const formatted = formatImageUrl(url);
  if (typeof formatted !== "string") return formatted;
  if (formatted.includes("-thumb.jpg")) return formatted;

  const qIdx = formatted.indexOf("?");
  const pathOnly = qIdx >= 0 ? formatted.slice(0, qIdx) : formatted;
  const query = qIdx >= 0 ? formatted.slice(qIdx) : "";
  const dot = pathOnly.lastIndexOf(".");
  if (dot <= pathOnly.lastIndexOf("/")) return formatted;
  return `${pathOnly.slice(0, dot)}-thumb.jpg${query}`;
}

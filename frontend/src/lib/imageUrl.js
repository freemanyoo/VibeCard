export function toThumbnailUrl(url) {
  if (typeof url !== "string") return url;
  const qIdx = url.indexOf("?");
  const pathOnly = qIdx >= 0 ? url.slice(0, qIdx) : url;
  const query = qIdx >= 0 ? url.slice(qIdx) : "";
  const dot = pathOnly.lastIndexOf(".");
  if (dot <= pathOnly.lastIndexOf("/")) return url;
  return `${pathOnly.slice(0, dot)}-thumb.jpg${query}`;
}


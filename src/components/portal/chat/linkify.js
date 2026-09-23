// Linkificación mínima y segura, sin dependencias: solo http(s):// y www.
// (nunca javascript:, data:, etc.). La puntuación final (".", ")", ",")
// suele ser de la frase, no de la URL, así que se deja fuera del enlace.
const URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

export const splitLinks = (text) => {
  if (!text) return [];

  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const trailing = match[0].match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const url = trailing ? match[0].slice(0, -trailing.length) : match[0];

    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (url) {
      const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
      parts.push({ type: "link", value: url, href });
    }
    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
};

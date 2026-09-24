// Mismo corte que el breakpoint `md` de Tailwind v4 (48rem).
export const DESKTOP_QUERY = "(min-width: 768px)";

export const isDesktopViewport = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(DESKTOP_QUERY).matches;

import "@testing-library/jest-dom/vitest";

// jsdom no implementa estos dos — framer-motion (useReducedMotion) y
// PortalThread (scrollIntoView al recibir un comentario nuevo) los llaman
// incondicionalmente, así que cualquier test que monte una pantalla del
// portal los necesita aunque no sean el foco del test.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

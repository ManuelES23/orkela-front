import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// findBy*/waitFor esperan 1 s por defecto: con la suite completa en paralelo
// (lazy imports, transiciones de framer-motion) a veces no alcanza y los
// tests fallan sin que nada esté roto.
configure({ asyncUtilTimeout: 10000 });

// Con `globals: false` Testing Library no registra su cleanup automático:
// sin esto los renders se acumulan entre tests del mismo archivo.
afterEach(() => {
  cleanup();
});

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

// jsdom no implementa object URLs: las miniaturas y los adjuntos los usan.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock";
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => {};
}

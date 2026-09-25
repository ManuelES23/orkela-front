// Aplica el tema guardado antes del primer paint, para no parpadear en claro
// y luego saltar a oscuro cuando React monta ThemeProvider. Vive en un
// archivo (y no inline en index.html) para que la CSP no necesite
// 'unsafe-inline' en script-src.
(function () {
  try {
    var stored = localStorage.getItem("orkela_theme") || "system";
    var isDark =
      stored === "dark" ||
      (stored === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  } catch {
    // localStorage inaccesible (modo privado, etc.) - se queda en claro
  }
})();

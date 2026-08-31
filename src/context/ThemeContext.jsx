import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

const STORAGE_KEY = "orkela_theme";

const getSystemPrefersDark = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

// theme es la preferencia guardada ("light" | "dark" | "system");
// isDark es el valor ya resuelto que de verdad se pinta en pantalla.
const resolveIsDark = (theme) =>
  theme === "dark" || (theme === "system" && getSystemPrefersDark());

const applyTheme = (isDark) => {
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
};

/**
 * Controla el modo oscuro de toda la app. El <html> lleva data-theme="dark"
 * o "light" siempre (nunca ausente) para que @custom-variant dark de
 * index.css sea determinista; index.html tiene un script inline que aplica
 * esto mismo antes del primer paint para no parpadear en el tema equivocado.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "system"
  );

  useEffect(() => {
    applyTheme(resolveIsDark(theme));
  }, [theme]);

  // En modo "system", seguir los cambios de preferencia del SO en vivo
  // (ej. el usuario activa el modo oscuro de Windows con la app abierta)
  useEffect(() => {
    if (theme !== "system") return undefined;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme(resolveIsDark("system"));
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const value = {
    theme,
    setTheme,
    isDark: resolveIsDark(theme),
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

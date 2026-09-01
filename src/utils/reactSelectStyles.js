/**
 * Estilos compartidos para react-select, theme-aware vía las custom
 * properties --select-* definidas en index.css.
 *
 * react-select es CSS-in-JS (los valores se aplican como estilos inline
 * calculados en JS) — ninguna clase de Tailwind ni el atributo
 * data-theme lo alcanzan directamente. Referenciar var(--select-bg) etc.
 * en vez de hex fijos hace que SÍ responda al tema: el navegador resuelve
 * la custom property en el momento de pintar, así que cuando
 * ThemeContext cambia data-theme en <html>, react-select se repinta con
 * los valores correctos sin necesitar useTheme() ni un re-render.
 */
export const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "var(--select-bg)",
    borderColor: state.isFocused
      ? "var(--select-border-focus)"
      : "var(--select-border)",
    boxShadow: state.isFocused
      ? "0 0 0 2px var(--select-border-focus)"
      : "none",
    "&:hover": {
      borderColor: state.isFocused
        ? "var(--select-border-focus)"
        : "var(--select-text-muted)",
    },
    padding: "4px",
    borderRadius: "0.5rem",
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--select-text)",
  }),
  input: (base) => ({
    ...base,
    color: "var(--select-text)",
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--select-text-muted)",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--select-menu-bg)",
    borderRadius: "0.5rem",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -1px rgba(0, 0, 0, 0.15)",
    zIndex: 20,
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "var(--select-option-selected-bg)"
      : state.isFocused
        ? "var(--select-option-hover-bg)"
        : "transparent",
    color: "var(--select-text)",
    cursor: "pointer",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "transparent",
    margin: 0,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--select-text)",
  }),
  multiValueRemove: (base) => ({
    ...base,
    display: "none",
  }),
};

export default selectStyles;

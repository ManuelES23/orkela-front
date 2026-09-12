// Avatar de iniciales reutilizado en la lista de tickets y en el panel de
// detalles — sin foto real, solo iniciales sobre el degradado de marca.
const SIZES = {
  sm: "w-5 h-5 text-[9px]",
  md: "w-8 h-8 text-xs",
};

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// `decorative`: cuando el nombre ya está visible como texto junto al avatar
// (el panel de detalles), el avatar no debe volver a anunciarse — un lector
// de pantalla diría el nombre dos veces. En la lista de tickets, en cambio,
// el avatar es la única pista visual del agente en esa fila, así que ahí sí
// necesita su propio rol/etiqueta accesible.
const PortalAvatar = ({ name, size = "md", className = "", decorative = false }) => {
  if (typeof name !== "string" || !name.trim()) return null;

  const a11yProps = decorative
    ? { "aria-hidden": "true" }
    : { role: "img", "aria-label": name };

  return (
    <span
      title={name}
      {...a11yProps}
      className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 bg-linear-to-br from-brand-600 to-accent-600 ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
};

export default PortalAvatar;

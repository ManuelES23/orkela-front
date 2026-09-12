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

const PortalAvatar = ({ name, size = "md", className = "" }) => {
  if (!name) return null;

  return (
    <span
      title={name}
      aria-label={name}
      className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 bg-gradient-to-br from-brand-500 to-accent-500 ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
};

export default PortalAvatar;

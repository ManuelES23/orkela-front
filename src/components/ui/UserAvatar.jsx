import { getAssetUrl } from "../../utils/assetUrl";

/**
 * UserAvatar - Componente reutilizable para mostrar avatar de usuario
 *
 * Muestra la imagen del avatar si existe, o las iniciales del nombre como fallback.
 *
 * @param {Object} props
 * @param {Object} props.user - Objeto con datos del usuario (name, email, avatar)
 * @param {string} props.name - Nombre alternativo si no se pasa user
 * @param {string} props.avatar - Avatar alternativo si no se pasa user
 * @param {string} props.size - Tamaño del avatar: 'xs', 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} props.className - Clases adicionales
 * @param {boolean} props.showBorder - Mostrar borde blanco (útil para avatares superpuestos)
 */
const UserAvatar = ({
  user,
  name,
  avatar,
  size = "md",
  className = "",
  showBorder = false,
}) => {
  // Obtener nombre y avatar de props o del objeto user
  const displayName = name || user?.name || "?";
  const avatarPath = avatar || user?.avatar;
  const avatarUrl = getAssetUrl(avatarPath);

  // Obtener iniciales (primera letra del nombre)
  const initials = displayName.charAt(0).toUpperCase();

  // Tamaños predefinidos - con fuentes proporcionadas para evitar compresión
  const sizeClasses = {
    xs: "w-5 h-5 text-[10px] font-semibold",
    sm: "w-6 h-6 text-[11px] font-semibold",
    md: "w-8 h-8 text-sm font-semibold",
    lg: "w-10 h-10 text-base font-semibold",
    xl: "w-12 h-12 text-lg font-semibold",
    "2xl": "w-16 h-16 text-2xl font-bold",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const borderClass = showBorder ? "border-2 border-white" : "";

  // Si hay avatar, mostrar imagen
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        title={displayName}
        className={`${sizeClass} rounded-full object-cover ${borderClass} ${className}`}
        onError={(e) => {
          // Fallback a ui-avatars si falla la carga
          e.target.onerror = null;
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
            displayName
          )}&background=7c3aed&color=fff`;
        }}
      />
    );
  }

  // Fallback: mostrar iniciales con gradiente
  return (
    <div
      className={`${sizeClass} rounded-full bg-linear-to-br from-brand-600 to-accent-600 flex items-center justify-center text-white ${borderClass} ${className}`}
      title={displayName}
    >
      {initials}
    </div>
  );
};

export default UserAvatar;

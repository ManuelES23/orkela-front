/**
 * Utilidades para formatear fechas
 */

/**
 * Parsea un string de fecha (YYYY-MM-DD) a un objeto Date en zona horaria local
 * Evita el problema de UTC donde "2026-01-16" se convierte en "2026-01-15" en zonas horarias negativas
 * @param {Date|string} date - La fecha a parsear
 * @returns {Date} - Objeto Date en zona horaria local
 */
export const parseLocalDate = (date) => {
  if (!date) return new Date();

  // Si ya es un objeto Date, devolverlo tal cual
  if (date instanceof Date) return date;

  // Si es un string de fecha en formato YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS
  if (typeof date === "string") {
    // Extraer solo la parte de la fecha (ignorar la hora si existe)
    const datePart = date.split("T")[0];
    const parts = datePart.split("-");

    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }

  // Fallback: intentar parsear normalmente
  return new Date(date);
};

/**
 * Formatea la distancia desde una fecha hasta ahora en español
 * @param {Date|string} date - La fecha a formatear
 * @returns {string} - La distancia formateada (ej: "hace 5 minutos")
 */
export const formatDistanceToNow = (date) => {
  const now = new Date();
  const past = parseLocalDate(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) {
    return "hace unos segundos";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? "hace 1 minuto"
      : `hace ${diffInMinutes} minutos`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "hace 1 hora" : `hace ${diffInHours} horas`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? "hace 1 día" : `hace ${diffInDays} días`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? "hace 1 semana" : `hace ${diffInWeeks} semanas`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "hace 1 mes" : `hace ${diffInMonths} meses`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return diffInYears === 1 ? "hace 1 año" : `hace ${diffInYears} años`;
};

/**
 * Formatea una fecha en formato legible
 * @param {Date|string} date - La fecha a formatear
 * @param {object} options - Opciones de formato
 * @returns {string} - La fecha formateada
 */
export const formatDate = (date, options = {}) => {
  const d = parseLocalDate(date);
  const defaultOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  };

  return d.toLocaleDateString("es-ES", defaultOptions);
};

/**
 * Formatea una fecha con hora
 * @param {Date|string} date - La fecha a formatear
 * @returns {string} - La fecha con hora formateada
 */
export const formatDateTime = (date) => {
  const d = parseLocalDate(date);
  return d.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Comprueba si una fecha es hoy
 * @param {Date|string} date - La fecha a comprobar
 * @returns {boolean}
 */
export const isToday = (date) => {
  const d = parseLocalDate(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

/**
 * Comprueba si una fecha es mañana
 * @param {Date|string} date - La fecha a comprobar
 * @returns {boolean}
 */
export const isTomorrow = (date) => {
  const d = parseLocalDate(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.toDateString() === tomorrow.toDateString();
};

/**
 * Comprueba si una fecha está en el pasado
 * @param {Date|string} date - La fecha a comprobar
 * @returns {boolean}
 */
export const isPast = (date) => {
  const d = parseLocalDate(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
};

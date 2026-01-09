/**
 * Utilidades para formatear fechas
 */

/**
 * Formatea la distancia desde una fecha hasta ahora en español
 * @param {Date|string} date - La fecha a formatear
 * @returns {string} - La distancia formateada (ej: "hace 5 minutos")
 */
export const formatDistanceToNow = (date) => {
  const now = new Date();
  const past = new Date(date);
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
  const d = new Date(date);
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
  const d = new Date(date);
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
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

/**
 * Comprueba si una fecha es mañana
 * @param {Date|string} date - La fecha a comprobar
 * @returns {boolean}
 */
export const isTomorrow = (date) => {
  const d = new Date(date);
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
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
};

export const PASSWORD_REJECTED_MESSAGE =
  "La contraseña no cumple los requisitos o aparece en filtraciones de datos conocidas. Elige otra.";

export const getRetryMessage = (err) =>
  err?.status === 429
    ? `Demasiados intentos. Espera ${err.retryAfter ?? 60} segundos e inténtalo de nuevo.`
    : null;

// El backend corre con APP_LOCALE=en: nunca mostrar el mensaje crudo de validación.
export const getPasswordError = (err, field = "password") =>
  err?.status === 422 && err?.data?.errors?.[field] ? PASSWORD_REJECTED_MESSAGE : null;

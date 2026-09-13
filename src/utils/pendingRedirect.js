const STORAGE_KEY = "socialReturnTo";

/**
 * Guarda a dónde volver tras completar un login/registro que sigue fuera de
 * esta página: login social (ida y vuelta al proveedor) o registro por
 * email (hay que esperar a que confirme el correo, quizás en otra pestaña
 * o hasta un día después). Sin esto, un `returnTo` guardado a secas podía
 * quedar aplicado a la sesión de otra persona en el mismo navegador si el
 * registro original nunca se confirmaba.
 *
 * `email` ata el destino a la cuenta que lo generó (se ignora si el login
 * final es de otra persona); `ttlMs` lo vence solo. Por defecto 30 min,
 * suficiente para la ida y vuelta de un login social.
 */
export const setPendingRedirect = (path, { email = null, ttlMs = 30 * 60 * 1000 } = {}) => {
  if (!path) return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ path, email, expiresAt: Date.now() + ttlMs })
  );
};

/**
 * Lee y borra el destino guardado. Devuelve null si no hay ninguno, si
 * venció, o si quedó atado a un email distinto del que acaba de iniciar
 * sesión. Sigue aceptando el formato legado (string plano sin metadata)
 * para no romper un valor ya guardado en el navegador antes de este cambio.
 */
export const consumePendingRedirect = (userEmail = null) => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  localStorage.removeItem(STORAGE_KEY);

  try {
    const { path, email, expiresAt } = JSON.parse(raw);
    if (expiresAt && Date.now() > expiresAt) return null;
    if (email && userEmail && email !== userEmail) return null;
    return path || null;
  } catch {
    return raw;
  }
};

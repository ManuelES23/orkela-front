import { useCallback, useEffect, useState } from "react";
import { attachmentsAPI } from "../../utils/attachmentsApi";

// La galería y el visor piden la misma imagen: una sola descarga por
// scope:id mientras alguien la use; el object URL se libera al soltarla.
// Cada acquire devuelve la entrada y release trabaja sobre ESA entrada (no
// sobre la clave): así un reintento que creó otra entrada no se ve afectado
// por consumidores de la anterior.
const cache = new Map();

const drop = (entry) => {
  if (cache.get(entry.key) === entry) cache.delete(entry.key);
};

const acquire = (scope, id) => {
  const key = `${scope}:${id}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = { key, refs: 0, url: null };
    entry.promise = attachmentsAPI.getBlob(scope, id).then((blob) => {
      const url = URL.createObjectURL(blob);
      // Todos soltaron la entrada mientras descargaba: nadie usará este URL.
      if (entry.refs <= 0) {
        URL.revokeObjectURL(url);
        drop(entry);
        return null;
      }
      entry.url = url;
      return url;
    });
    entry.promise.catch(() => drop(entry));
    cache.set(key, entry);
  }
  entry.refs += 1;
  return entry;
};

const release = (entry) => {
  if (entry.refs <= 0) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  // Si aún descarga, la entrada se queda en caché (un remontaje inmediato,
  // p. ej. StrictMode, la reutiliza) y el then revoca si sigue sin dueños.
  if (entry.url) {
    URL.revokeObjectURL(entry.url);
    entry.url = null;
    drop(entry);
  }
};

export const useAttachmentBlob = (scope, id, { enabled = true } = {}) => {
  const [result, setResult] = useState({ key: null, url: null, status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const active = Boolean(enabled && id);
  const key = active ? `${scope}:${id}:${attempt}` : null;

  useEffect(() => {
    if (!active) return undefined;
    let current = true;
    const entry = acquire(scope, id);

    // El efecto solo se suscribe a la promesa: el estado se escribe al resolverla.
    const load = async () => {
      try {
        const url = await entry.promise;
        if (current) setResult({ key, url, status: "ready" });
      } catch {
        if (current) setResult({ key, url: null, status: "error" });
      }
    };
    load();

    return () => {
      current = false;
      release(entry);
    };
  }, [scope, id, active, attempt, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Un resultado de otra clave (id distinto, reintento o desactivado) ya no vale.
  if (!active) return { url: null, status: "idle", retry };
  if (result.key !== key) return { url: null, status: "loading", retry };
  return { url: result.url, status: result.status, retry };
};

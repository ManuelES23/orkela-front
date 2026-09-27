import { useCallback, useEffect, useState } from "react";
import { attachmentsAPI } from "../../utils/attachmentsApi";

// La galería y el visor piden la misma imagen: una sola descarga por
// scope:id mientras alguien la use; el object URL se libera al soltarla.
const cache = new Map();

const acquire = (scope, id) => {
  const key = `${scope}:${id}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = { refs: 0, url: null };
    entry.promise = attachmentsAPI.getBlob(scope, id).then((blob) => {
      entry.url = URL.createObjectURL(blob);
      return entry.url;
    });
    entry.promise.catch(() => cache.delete(key));
    cache.set(key, entry);
  }
  entry.refs += 1;
  return entry;
};

const release = (scope, id) => {
  const key = `${scope}:${id}`;
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    if (entry.url) URL.revokeObjectURL(entry.url);
    cache.delete(key);
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
      release(scope, id);
    };
  }, [scope, id, active, attempt, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Un resultado de otra clave (id distinto, reintento o desactivado) ya no vale.
  if (!active) return { url: null, status: "idle", retry };
  if (result.key !== key) return { url: null, status: "loading", retry };
  return { url: result.url, status: result.status, retry };
};

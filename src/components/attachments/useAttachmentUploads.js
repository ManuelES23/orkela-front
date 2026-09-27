import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ATTACHMENT_LIMITS, attachmentsAPI, validateImageFile } from "../../utils/attachmentsApi";

let sequence = 0;
const nextKey = () => `att-${Date.now()}-${++sequence}`;

/**
 * Imágenes pendientes de un formulario o compositor (subida previa). Cada
 * archivo se sube al elegirlo; el padre se envía después con `ids`. Si el
 * componente se desmonta sin enviar, las pendientes se borran del servidor
 * (y si eso falla, attachments:prune las limpia a las 24 h).
 */
export const useAttachmentUploads = ({ scope, max = ATTACHMENT_LIMITS.maxFiles }) => {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState(null);
  const files = useRef(new Map());
  const controllers = useRef(new Map());
  const latest = useRef(items);

  useEffect(() => {
    latest.current = items;
  });

  const patch = useCallback((key, changes) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }, []);

  const start = useCallback(
    (key) => {
      const controller = new AbortController();
      controllers.current.set(key, controller);
      attachmentsAPI
        .upload(scope, files.current.get(key), {
          signal: controller.signal,
          onProgress: (progress) => patch(key, { progress }),
        })
        .then((data) => patch(key, { status: "done", progress: 100, id: data.id, mime: data.mime }))
        .catch((error) => {
          if (error.code === "aborted") return;
          patch(key, { status: "error", error: error.message || "No se pudo subir la imagen." });
        })
        .finally(() => controllers.current.delete(key));
    },
    [scope, patch]
  );

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList ?? []);
      if (incoming.length === 0) return;

      const room = Math.max(0, max - latest.current.length);
      const accepted = incoming.slice(0, room);
      setNotice(incoming.length > room ? `Máximo ${max} ${max === 1 ? "imagen" : "imágenes"}.` : null);

      const created = accepted.map((file) => {
        const key = nextKey();
        files.current.set(key, file);
        const error = validateImageFile(file);
        return {
          key,
          name: file.name,
          size: file.size,
          mime: file.type,
          previewUrl: URL.createObjectURL(file),
          status: error ? "error" : "uploading",
          progress: 0,
          id: null,
          error,
          invalid: Boolean(error),
        };
      });

      latest.current = [...latest.current, ...created];
      setItems((prev) => [...prev, ...created]);
      created.filter((item) => !item.invalid).forEach((item) => start(item.key));
    },
    [max, start]
  );

  const retry = useCallback(
    (key) => {
      const item = latest.current.find((candidate) => candidate.key === key);
      if (!item || item.invalid) return;
      patch(key, { status: "uploading", progress: 0, error: null });
      start(key);
    },
    [patch, start]
  );

  // Solo toca refs: identidad estable.
  const forget = useCallback((item) => {
    controllers.current.get(item.key)?.abort();
    URL.revokeObjectURL(item.previewUrl);
    files.current.delete(item.key);
  }, []);

  const remove = useCallback(
    (key) => {
      const item = latest.current.find((candidate) => candidate.key === key);
      if (!item) return;
      forget(item);
      if (item.status === "done" && item.id) attachmentsAPI.remove(scope, item.id).catch(() => {});
      latest.current = latest.current.filter((candidate) => candidate.key !== key);
      setItems((prev) => prev.filter((candidate) => candidate.key !== key));
      setNotice(null);
    },
    [scope, forget]
  );

  // Tras enviar: las imágenes ya pertenecen al padre, no se borran.
  const reset = useCallback(() => {
    latest.current.forEach(forget);
    latest.current = [];
    setItems([]);
    setNotice(null);
  }, [forget]);

  const discardAll = useCallback(() => {
    latest.current.forEach((item) => {
      forget(item);
      if (item.status === "done" && item.id) attachmentsAPI.remove(scope, item.id).catch(() => {});
    });
    latest.current = [];
    setItems([]);
    setNotice(null);
  }, [scope, forget]);

  const discardRef = useRef(discardAll);
  useEffect(() => {
    discardRef.current = discardAll;
  });
  useEffect(() => () => discardRef.current(), []);

  const done = useMemo(() => items.filter((item) => item.status === "done"), [items]);

  return {
    items,
    ids: done.map((item) => item.id),
    uploaded: done.map(({ id, name, mime, size }) => ({ id, name, mime, size })),
    isUploading: items.some((item) => item.status === "uploading"),
    hasErrors: items.some((item) => item.status === "error"),
    notice,
    addFiles,
    retry,
    remove,
    reset,
    discardAll,
  };
};

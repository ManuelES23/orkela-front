import { useEffect, useRef } from "react";
import { useRealtime } from "../context/RealtimeContext";

/**
 * Escucha las señales silenciosas `{resource}.sync` de uno o varios
 * recursos (project.{id}, team.{id}) y llama a `handler(payload)` — sin
 * toast ni historial: la pantalla decide si refresca, cierra o sale.
 *
 * `debounce` (ms) agrupa ráfagas (mover una tarea emite dos señales, una
 * lista con muchos proyectos puede recibir varias seguidas) en una sola
 * llamada con el último payload.
 */
const useResourceSync = (resource, ids, handler, { debounce = 0 } = {}) => {
  const { subscribeChannel, channelEpoch } = useRealtime();
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  // Clave estable: el efecto no se rehace si la lista trae los mismos ids
  const key = [...new Set((ids || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!key) return undefined;

    let timer = null;
    const deliver = (payload) => {
      if (!debounce) {
        handlerRef.current?.(payload);
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => handlerRef.current?.(payload), debounce);
    };

    const unsubscribers = key
      .split(",")
      .map((id) => subscribeChannel(`${resource}.${id}`, `${resource}.sync`, deliver));

    return () => {
      clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [resource, key, debounce, subscribeChannel, channelEpoch]);
};

export default useResourceSync;

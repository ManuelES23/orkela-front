import { useEffect, useRef } from "react";
import { useRealtime } from "../context/RealtimeContext";

/**
 * Registra `callback` bajo varias claves de registerRefresh y agrupa las
 * ráfagas (varias notificaciones o projects.sync seguidos) en una sola
 * llamada tras `delay` ms sin señales. Pensado para las pantallas de lista,
 * donde cada recarga pide la lista completa.
 */
const useDebouncedRefresh = (keys, callback, delay = 500) => {
  const { registerRefresh } = useRealtime();
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const keyList = [...new Set(keys)].join("|");

  useEffect(() => {
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current?.(), delay);
    };
    const offs = keyList.split("|").map((key) => registerRefresh(key, schedule));

    return () => {
      clearTimeout(timer);
      offs.forEach((off) => off());
    };
  }, [keyList, delay, registerRefresh]);
};

export default useDebouncedRefresh;

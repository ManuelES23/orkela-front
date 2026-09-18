import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Abre un recurso indicado en la URL (?task=12, ?ticket=8) — así llegan los
 * clics de las notificaciones — y limpia el parámetro para que recargar la
 * página o cerrar el modal no lo vuelva a abrir.
 */
const useOpenFromQuery = (param, onOpen) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const raw = searchParams.get(param);

  useEffect(() => {
    if (!raw) return;
    const id = Number(raw);
    if (Number.isInteger(id) && id > 0) {
      onOpenRef.current({ id });
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(param);
        return next;
      },
      { replace: true }
    );
  }, [raw, param, setSearchParams]);
};

export default useOpenFromQuery;

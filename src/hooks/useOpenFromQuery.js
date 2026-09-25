import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Abre un recurso indicado en la URL (?task=12, ?ticket=8) — así llegan los
 * clics de las notificaciones — y limpia el parámetro para que recargar la
 * página o cerrar el modal no lo vuelva a abrir. También quita ?org=ID (la
 * organización del enlace, ver useLinkWorkspace): ya se usó para cambiar de
 * workspace antes de montar la página.
 */
const useOpenFromQuery = (param, onOpen) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const onOpenRef = useRef(onOpen);
  // Mantiene el ref al día tras cada render. Debe declararse ANTES del efecto
  // que lo lee: los efectos corren en orden de declaración, así el efecto de
  // abajo siempre ve el último onOpen.
  useEffect(() => {
    onOpenRef.current = onOpen;
  });

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
        next.delete("org");
        return next;
      },
      { replace: true }
    );
  }, [raw, param, setSearchParams]);
};

export default useOpenFromQuery;

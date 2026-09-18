import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserContext } from "./useOrganizationPermissions";
import { workspaceToOpen } from "../utils/workspace";

/**
 * Si el enlace indica la organización del recurso (?org=ID, clic en una
 * notificación) y el usuario está en modo personal o en otra organización,
 * cambia a ese workspace. Mientras cambia, `switching` es true: la ruta
 * muestra la pantalla de carga y la página se monta ya en el workspace del
 * recurso (sus listas se cargan con el contexto correcto).
 *
 * Si el cambio falla, la página se muestra igual en el workspace actual (el
 * detalle se abre por id, el backend no depende del workspace activo).
 */
const useLinkWorkspace = () => {
  const { user, switchContext } = useAuth();
  const { activeContextId } = useUserContext();
  const [searchParams] = useSearchParams();
  const [switchFailed, setSwitchFailed] = useState(false);

  const target = user ? workspaceToOpen(user, searchParams, activeContextId) : null;

  // Un solo intento por organización (switchContext cambia de identidad en
  // cada render del AuthProvider)
  const attemptedRef = useRef(null);
  const switchRef = useRef(switchContext);
  useEffect(() => {
    switchRef.current = switchContext;
  });

  useEffect(() => {
    if (!target || switchFailed || attemptedRef.current === target) return;
    attemptedRef.current = target;
    Promise.resolve()
      .then(() => switchRef.current?.(target))
      .catch(() => setSwitchFailed(true));
  }, [target, switchFailed]);

  return { switching: Boolean(target) && !switchFailed };
};

export default useLinkWorkspace;

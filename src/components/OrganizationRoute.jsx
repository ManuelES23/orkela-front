import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserContext } from "../hooks/useOrganizationPermissions";
import LoadingScreen from "./ui/LoadingScreen";
import { workspaceToOpen } from "../utils/workspace";

/**
 * OrganizationRoute - Componente de ruta protegida para funcionalidades
 * exclusivas de usuarios en modo organización.
 *
 * Si el enlace indica la organización del recurso (clic en una
 * notificación) cambia a ese workspace antes de mostrar la página.
 *
 * Redirige a /dashboard si:
 * - El usuario no tiene organización (ni directa ni por pivot)
 * - El usuario tiene organización pero está en modo personal (o en modo
 *   de otra organización sin datos cargados) y el enlace no dice a cuál ir
 */
const OrganizationRoute = ({ children }) => {
  const { user, loading, switchContext } = useAuth();
  const { isOrganizationContext, activeContextId } = useUserContext();
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

  if (loading) {
    return <LoadingScreen />;
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to='/login' />;
  }

  // Cambiando al workspace del enlace
  if (target && !switchFailed) {
    return <LoadingScreen />;
  }

  // Si el usuario no está activamente en modo organización, redirigir al dashboard
  if (!isOrganizationContext) {
    return <Navigate to='/dashboard' />;
  }

  return children;
};

export default OrganizationRoute;

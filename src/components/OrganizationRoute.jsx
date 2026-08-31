import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserContext } from "../hooks/useOrganizationPermissions";
import LoadingScreen from "./ui/LoadingScreen";

/**
 * OrganizationRoute - Componente de ruta protegida para funcionalidades
 * exclusivas de usuarios en modo organización.
 *
 * Redirige a /dashboard si:
 * - El usuario no tiene organización (ni directa ni por pivot)
 * - El usuario tiene organización pero está en modo personal (o en modo
 *   de otra organización sin datos cargados)
 */
const OrganizationRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { isOrganizationContext } = useUserContext();

  if (loading) {
    return <LoadingScreen />;
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to='/login' />;
  }

  // Si el usuario no está activamente en modo organización, redirigir al dashboard
  if (!isOrganizationContext) {
    return <Navigate to='/dashboard' />;
  }

  return children;
};

export default OrganizationRoute;

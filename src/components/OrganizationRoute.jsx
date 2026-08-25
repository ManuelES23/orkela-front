import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserContext } from "../hooks/useOrganizationPermissions";

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
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600'></div>
      </div>
    );
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

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * OrganizationRoute - Componente de ruta protegida para funcionalidades
 * exclusivas de usuarios en modo organización.
 *
 * Redirige a /dashboard si:
 * - El usuario no tiene organización
 * - El usuario tiene organización pero está en modo personal
 */
const OrganizationRoute = ({ children }) => {
  const { user, loading } = useAuth();

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

  // Si el usuario no tiene organización O no está en modo organización, redirigir al dashboard
  if (!user.organization_id || user.active_context !== "organization") {
    return <Navigate to='/dashboard' />;
  }

  return children;
};

export default OrganizationRoute;

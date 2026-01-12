import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { useEffect } from "react";

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { error } = useNotification();

  useEffect(() => {
    // Mostrar error solo si el usuario no es admin (y ya cargó)
    if (!loading && user && !user.isSystemAdmin) {
      error(
        "Acceso denegado. Se requieren permisos de administrador del sistema."
      );
    }
  }, [loading, user, error]);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='flex flex-col items-center gap-3'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600'></div>
          <span className='text-gray-500 text-sm'>Verificando permisos...</span>
        </div>
      </div>
    );
  }

  // No autenticado - redirigir a login
  if (!user) {
    return <Navigate to='/login' replace />;
  }

  // Autenticado pero no es admin - redirigir a dashboard
  if (!user.isSystemAdmin) {
    return <Navigate to='/dashboard' replace />;
  }

  // Es admin - permitir acceso
  return children;
};

export default AdminRoute;

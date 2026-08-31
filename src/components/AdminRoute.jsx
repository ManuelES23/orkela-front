import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { useEffect } from "react";
import LoadingScreen from "./ui/LoadingScreen";

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
    return <LoadingScreen message='Verificando permisos...' />;
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

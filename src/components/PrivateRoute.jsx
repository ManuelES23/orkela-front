import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useLinkWorkspace from "../hooks/useLinkWorkspace";
import LoadingScreen from "./ui/LoadingScreen";

/**
 * Ruta para usuarios autenticados. Si el enlace indica la organización del
 * recurso (?org=ID, clic en una notificación de tarea o proyecto) cambia a
 * ese workspace antes de mostrar la página.
 */
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { switching } = useLinkWorkspace();

  if (loading || (user && switching)) {
    return <LoadingScreen />;
  }

  return user ? children : <Navigate to='/login' />;
};

export default PrivateRoute;

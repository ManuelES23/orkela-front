import { Navigate } from "react-router-dom";
import { useOrganizationPermissions } from "../hooks/useOrganizationPermissions";

/**
 * Clientes y Bandeja de Clientes: solo owner, admin y manager
 * (canTriageClients). Un member que llega por URL directa o por un enlace
 * antiguo va a /tickets en lugar de ver una pantalla que la API rechaza con
 * 403. Va dentro de OrganizationRoute, que ya resolvió sesión y workspace.
 */
const ClientTriageRoute = ({ children }) => {
  const { canTriageClients } = useOrganizationPermissions();

  if (!canTriageClients) {
    return <Navigate to='/tickets' replace />;
  }

  return children;
};

export default ClientTriageRoute;

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Encapsula qué pasa después de tener un `userData` ya autenticado (login
 * por password, registro, o login social): navegar al destino correcto, o
 * mostrar el selector de contexto si el usuario tiene más de un workspace.
 * Compartido por Login.jsx y SocialAuthCallback.jsx para no duplicar esta
 * lógica.
 */
export const usePostLoginRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { switchContext } = useAuth();

  const returnTo = location.state?.returnTo;

  const [showContextModal, setShowContextModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  const navigateToDestination = (userData) => {
    const pendingInvitation = localStorage.getItem("pendingTeamInvitation");
    if (pendingInvitation) {
      localStorage.removeItem("pendingTeamInvitation");
      navigate(`/accept-team-invitation/${pendingInvitation}`);
      return;
    }

    if (returnTo) {
      navigate(returnTo);
    } else if (userData.isSystemAdmin) {
      navigate("/admin/users");
    } else {
      navigate("/dashboard");
    }
  };

  const completeLogin = (userData) => {
    if (userData.available_contexts?.length > 1) {
      setPendingUser(userData);
      setShowContextModal(true);
      return;
    }

    navigateToDestination(userData);
  };

  const handleContextSelect = async (contextId) => {
    if (!pendingUser) return;

    try {
      setContextLoading(true);

      if (contextId !== pendingUser.active_context) {
        await switchContext(contextId);
      }

      setShowContextModal(false);
      navigateToDestination(pendingUser);
    } catch (err) {
      console.error("Error selecting context:", err);
      setShowContextModal(false);
      navigateToDestination(pendingUser);
    } finally {
      setContextLoading(false);
    }
  };

  return {
    completeLogin,
    showContextModal,
    pendingUser,
    contextLoading,
    handleContextSelect,
  };
};

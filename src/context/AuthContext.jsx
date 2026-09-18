import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, AUTH_EXPIRED_EVENT } from "../utils/api";
import AuthRetryScreen from "../components/auth/AuthRetryScreen";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchingContext, setSwitchingContext] = useState(false);

  // true cuando no se pudo verificar la sesión por un error de red/servidor
  // (no por credenciales inválidas): se conserva el token y se ofrece reintentar.
  const [authCheckFailed, setAuthCheckFailed] = useState(false);

  // Verificar si hay un token y usuario guardado
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    setLoading(true);
    setAuthCheckFailed(false);

    if (token && savedUser) {
      try {
        // Verificar que el token sigue siendo válido
        const userData = await authAPI.getUser();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (error) {
        if (error?.status === 401 || error?.status === 419) {
          // Token inválido o vencido, limpiar
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        } else {
          // API caída, sin conexión o 5xx: no cerrar la sesión.
          setAuthCheckFailed(true);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // La API emite este evento ante un 401 (token vencido o revocado tras
  // restablecer/cambiar la contraseña): reflejarlo en el estado.
  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = async (email, password, remember = false) => {
    const data = await authAPI.login(email, password, remember);
    const userData = { ...data.user };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    return userData;
  };

  // Crea la cuenta pero NO inicia sesión: hay que confirmar el correo.
  const register = async (name, email, password) => {
    return await authAPI.register(name, email, password, password);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  };

  /**
   * Cambiar el contexto activo del usuario (organization o personal)
   * @param {string} contextId - 'organization' o 'personal'
   */
  const switchContext = async (contextId) => {
    // `user.organization_id` solo refleja la organización ACTIVA (el
    // backend lo deja en null salvo que active_context === 'organization',
    // ver AuthController::formatUserResponse) — no sirve para decidir si
    // el usuario TIENE una organización a la que cambiar. La señal
    // correcta es available_contexts, que el backend llena siempre
    // (independiente del modo activo) y es lo mismo que ya usa
    // hasMultipleContexts() para decidir si mostrar el selector.
    const hasOrganizationAccess = (user?.available_contexts?.length ?? 0) > 1;
    if (!user || !hasOrganizationAccess) {
      console.warn("Solo usuarios con organización pueden cambiar contexto");
      return;
    }

    try {
      setSwitchingContext(true);
      const response = await authAPI.switchContext(contextId);

      // Actualizar usuario con el nuevo contexto
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));

      return response.user;
    } catch (error) {
      console.error("Error switching context:", error);
      throw error;
    } finally {
      setSwitchingContext(false);
    }
  };

  /**
   * Verificar si el usuario tiene múltiples contextos disponibles
   */
  const hasMultipleContexts = () => {
    return user?.available_contexts?.length > 1;
  };

  /**
   * Obtener el contexto activo actual
   */
  const getActiveContext = () => {
    if (!user) return null;
    return user.available_contexts?.find(
      (ctx) => ctx.id === user.active_context
    );
  };

  /**
   * Refrescar datos del usuario desde el servidor
   * Útil después de aceptar invitaciones a organizaciones
   */
  const refreshUser = async () => {
    try {
      const userData = await authAPI.getUser();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Error refreshing user:", error);
      throw error;
    }
  };

  /**
   * Completa la sesión con un {token, user} ya guardado en localStorage por
   * la API (login social, verificación de correo).
   */
  const loginWithResult = (data) => {
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    loginWithResult,
    loginWithSocialResult: loginWithResult,
    // Nuevas funciones de contexto
    switchContext,
    switchingContext,
    hasMultipleContexts,
    getActiveContext,
    refreshUser,
  };

  // Sesión guardada pero no verificable (red/servidor): pantalla de reintento
  // en lugar de mandar al login con el token borrado.
  if (authCheckFailed) {
    return (
      <AuthRetryScreen
        onRetry={checkAuth}
        onLogout={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          setAuthCheckFailed(false);
        }}
      />
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de AuthProvider");
  }
  return context;
};

import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchingContext, setSwitchingContext] = useState(false);

  useEffect(() => {
    // Verificar si hay un token y usuario guardado
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (token && savedUser) {
        try {
          // Verificar que el token sigue siendo válido
          const userData = await authAPI.getUser();
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error) {
          // Token inválido, limpiar
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);

      // Debug: ver respuesta completa de la API
      console.log("AuthContext - API response data:", data);
      console.log("AuthContext - data.user:", data.user);
      console.log(
        "AuthContext - available_contexts:",
        data.user?.available_contexts
      );

      // El backend ya devuelve isSystemAdmin correctamente
      const userData = {
        ...data.user,
      };

      console.log("AuthContext - userData final:", userData);

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await authAPI.register(name, email, password, password);
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
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
   * Completa la sesión con el {token, user} que devuelven
   * socialAuthAPI.exchange()/confirm() tras un login con Google/Microsoft.
   * El token ya quedó guardado en localStorage por esas funciones; acá solo
   * falta reflejar el usuario en el estado, igual que hace login().
   */
  const loginWithSocialResult = (data) => {
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
    loginWithSocialResult,
    // Nuevas funciones de contexto
    switchContext,
    switchingContext,
    hasMultipleContexts,
    getActiveContext,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de AuthProvider");
  }
  return context;
};

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { useNotification } from "./NotificationContext";
import { getEcho, updateEchoAuth, disconnectEcho } from "../utils/echo";

const RealtimeContext = createContext();

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return context;
};

export const RealtimeProvider = ({ children }) => {
  const { user } = useAuth();
  const { success, info, warning } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Estado para el modal de "removido de organización"
  const [removedFromOrgModal, setRemovedFromOrgModal] = useState({
    isOpen: false,
    organizationName: "",
    removerName: "",
  });

  // Callbacks para refrescar datos en componentes
  const [refreshCallbacks, setRefreshCallbacks] = useState({
    projects: null,
    tasks: null,
    teams: null,
    tickets: null,
    invitations: null,
    organizations: null,
  });

  // Ref para mantener la función de notificación actualizada sin causar re-suscripciones
  const handleNotificationRef = useRef(null);

  // Registrar callback de refresco
  const registerRefresh = useCallback((type, callback) => {
    setRefreshCallbacks((prev) => ({
      ...prev,
      [type]: callback,
    }));
  }, []);

  // Desregistrar callback de refresco
  const unregisterRefresh = useCallback((type) => {
    setRefreshCallbacks((prev) => ({
      ...prev,
      [type]: null,
    }));
  }, []);

  // Agregar notificación al historial
  const addRealtimeNotification = useCallback((notification) => {
    const newNotification = {
      ...notification,
      id: Date.now(),
      read: false,
      createdAt: new Date(),
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Máximo 50 notificaciones
    setUnreadCount((prev) => prev + 1);
  }, []);

  // Marcar notificación como leída
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Limpiar notificaciones
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Disparar refresh manualmente desde cualquier componente
  const triggerRefresh = useCallback(
    (type) => {
      console.log(`🔄 Triggering refresh for: ${type}`);
      if (refreshCallbacks[type]) {
        refreshCallbacks[type]();
      }
    },
    [refreshCallbacks]
  );

  // Procesar notificación recibida
  const handleNotification = useCallback(
    (data) => {
      console.log("📩 Notification received:", data.type, data);

      // Agregar al historial
      addRealtimeNotification({
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
      });

      // Mostrar toast según el tipo
      switch (data.type) {
        case "project_created":
        case "project_collaborator_joined":
          info(data.message);
          refreshCallbacks.projects?.();
          break;

        case "project_updated":
          info(data.message);
          refreshCallbacks.projects?.();
          break;

        case "project_deleted":
          warning(data.message);
          refreshCallbacks.projects?.();
          break;

        case "task_created":
        case "task_assigned":
          info(data.message);
          refreshCallbacks.tasks?.();
          break;

        case "task_updated":
        case "task_status_changed":
          info(data.message);
          refreshCallbacks.tasks?.();
          refreshCallbacks.projects?.(); // También actualizar proyectos
          break;

        case "task_completed":
          success(data.message);
          refreshCallbacks.tasks?.();
          refreshCallbacks.projects?.(); // También actualizar proyectos (progreso)
          break;

        case "checklist_item_completed":
          success(data.message);
          refreshCallbacks.tasks?.();
          refreshCallbacks.projects?.(); // Actualizar progreso del proyecto
          break;

        case "checklist_item_updated":
          info(data.message);
          refreshCallbacks.tasks?.();
          refreshCallbacks.projects?.(); // Actualizar progreso del proyecto
          break;

        case "task_due_soon":
          warning(data.message);
          refreshCallbacks.tasks?.();
          break;

        case "task_overdue":
          warning(data.message);
          refreshCallbacks.tasks?.();
          break;

        case "team_invitation_sent":
        case "project_invitation_sent":
          success(data.message);
          break;

        case "team_created":
          info(data.message);
          refreshCallbacks.teams?.();
          refreshCallbacks.organizations?.();
          break;

        case "team_updated":
          info(data.message);
          refreshCallbacks.teams?.();
          break;

        case "team_member_joined":
          info(data.message);
          refreshCallbacks.teams?.();
          break;

        case "team_deleted":
          warning(data.message);
          refreshCallbacks.teams?.();
          refreshCallbacks.organizations?.();
          break;

        // Tickets
        case "ticket_created":
          info(data.message);
          refreshCallbacks.tickets?.();
          break;

        case "ticket_taken":
        case "ticket_assigned":
          info(data.message);
          refreshCallbacks.tickets?.();
          break;

        case "ticket_status_changed":
          info(data.message);
          refreshCallbacks.tickets?.();
          break;

        case "ticket_resolved":
          success(data.message);
          refreshCallbacks.tickets?.();
          break;

        case "ticket_returned_to_inbox":
          info(data.message);
          refreshCallbacks.tickets?.();
          break;

        case "ticket_comment_added":
          info(data.message);
          refreshCallbacks.tickets?.();
          break;

        // Invitaciones recibidas
        case "project_invitation_received":
        case "team_invitation_received":
        case "organization_invitation_received":
          info(data.message);
          refreshCallbacks.invitations?.();
          break;

        // Invitaciones aceptadas/rechazadas (para quien invitó)
        case "project_invitation_accepted":
        case "team_invitation_accepted":
        case "organization_invitation_accepted":
          success(data.message);
          refreshCallbacks.projects?.();
          refreshCallbacks.teams?.();
          refreshCallbacks.organizations?.();
          break;

        case "project_invitation_declined":
        case "team_invitation_declined":
        case "organization_invitation_declined":
          warning(data.message);
          break;

        // Organizaciones - miembros
        case "organization_member_removed":
          // Verificar si el usuario actual es el que fue removido
          // La notificación para el usuario removido tiene action: 'removed_from_organization'
          if (data.data?.action === "removed_from_organization") {
            // El usuario actual fue removido - mostrar modal especial
            setRemovedFromOrgModal({
              isOpen: true,
              organizationName:
                data.data?.organization_name || "la organización",
              removerName: data.data?.remover_name || "Un administrador",
            });
          } else {
            // Otro miembro fue removido - solo notificar
            warning(data.message);
            refreshCallbacks.organizations?.();
          }
          break;

        case "organization_member_left":
          info(data.message);
          refreshCallbacks.organizations?.();
          break;

        case "organization_role_updated":
          info(data.message);
          refreshCallbacks.organizations?.();
          break;

        default:
          info(data.message);
      }
    },
    [addRealtimeNotification, info, success, warning, refreshCallbacks]
  );

  // Mantener la ref actualizada con la última versión de handleNotification
  useEffect(() => {
    handleNotificationRef.current = handleNotification;
  }, [handleNotification]);

  // Conectar y suscribirse al canal del usuario
  // IMPORTANTE: Solo depende de user?.id para evitar re-suscripciones innecesarias
  useEffect(() => {
    if (!user?.id) {
      disconnectEcho();
      setIsConnected(false);
      return;
    }

    // Actualizar token de autenticación
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No hay token disponible para WebSocket");
      setIsConnected(false);
      return;
    }

    // Obtener instancia de Echo (se crea si no existe)
    const echo = getEcho();
    updateEchoAuth(token);

    // Suscribirse al canal privado del usuario
    try {
      console.log(`Intentando conectar al canal user.${user.id}...`);
      const channel = echo.private(`user.${user.id}`);

      channel
        .listen(".notification", (data) => {
          console.log("Notificación recibida:", data);
          // Usar la ref para siempre tener la versión más actualizada
          handleNotificationRef.current?.(data);
        })
        .subscribed(() => {
          console.log(`✅ Conectado al canal user.${user.id}`);
          setIsConnected(true);
        })
        .error((error) => {
          console.error("❌ Error en canal WebSocket:", error);
          setIsConnected(false);
        });

      // Escuchar evento de conexión general
      echo.connector.pusher.connection.bind("connected", () => {
        console.log("✅ WebSocket conectado");
        setIsConnected(true);
      });

      echo.connector.pusher.connection.bind("disconnected", () => {
        console.log("❌ WebSocket desconectado");
        setIsConnected(false);
      });

      echo.connector.pusher.connection.bind("error", (err) => {
        console.error("❌ Error de conexión WebSocket:", err);
        setIsConnected(false);
      });

      return () => {
        echo.leave(`user.${user.id}`);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Error al conectar WebSocket:", error);
      setIsConnected(false);
    }
  }, [user?.id]); // Solo re-suscribirse cuando cambie el usuario

  // Función para cerrar el modal de removido de organización
  const closeRemovedFromOrgModal = useCallback(() => {
    setRemovedFromOrgModal({
      isOpen: false,
      organizationName: "",
      removerName: "",
    });
  }, []);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    registerRefresh,
    unregisterRefresh,
    triggerRefresh,
    // Modal de removido de organización
    removedFromOrgModal,
    closeRemovedFromOrgModal,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

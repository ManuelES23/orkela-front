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
import { notificationsAPI } from "../utils/api";
import {
  normalizeNotification,
  refreshKeysFor,
  toastKindFor,
  organizationSyncKeysFor,
  organizationSyncAffectsUser,
} from "../utils/notifications";

const RealtimeContext = createContext();

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return context;
};

// Cuántas notificaciones muestra el desplegable de la campana (el resto,
// en /notificaciones).
export const DROPDOWN_LIMIT = 10;

// Clave de registerRefresh de las pantallas de lista (Proyectos, Tareas)
// para la señal gruesa projects.sync.
export const PROJECT_LIST_KEY = "projectList";

// Espera máxima a que el canal confirme la suscripción antes de cargar el
// historial igualmente.
const HISTORY_FALLBACK_MS = 4000;

// Tras una operación del historial, una notificación en vivo que llega en
// este margen puede venir ya contada en la respuesta.
const RECONCILE_WINDOW_MS = 3000;

const CLOSED_REMOVED_MODAL = {
  isOpen: false,
  organizationName: "",
  removerName: "",
  reason: "removed",
};

// Avisos que para el usuario actual significan "ya no estás en la
// organización": expulsión o desactivación muestran el mismo modal.
const REMOVED_TYPES = {
  organization_member_removed: "removed",
  organization_member_deactivated: "deactivated",
};

// Avisos que cambian mis permisos, rol o plan: hay que volver a pedir /user
const USER_REFRESH_TYPES = new Set(["organization_role_updated", "organization_plan_downgraded"]);

export const RealtimeProvider = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const { success, info, warning } = useNotification();

  // Últimas notificaciones persistidas (desplegable) y contador del servidor
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [retentionDays, setRetentionDays] = useState(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Cambia en cada (re)conexión: los suscriptores de canales de recurso
  // (useResourceSync) vuelven a suscribirse con la nueva instancia de Echo.
  const [channelEpoch, setChannelEpoch] = useState(0);

  // Espejo síncrono de la lista, para decidir sin esperar al re-render
  // (ej. no volver a marcar como leída una que ya lo está).
  const notificationsRef = useRef([]);
  const setList = useCallback((updater) => {
    setNotifications((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      notificationsRef.current = next;
      return next;
    });
  }, []);

  // Estado para el modal de "removido de organización"
  const [removedFromOrgModal, setRemovedFromOrgModal] = useState(CLOSED_REMOVED_MODAL);

  // Callbacks para refrescar datos en componentes: varias pantallas pueden
  // registrar la misma clave (ej. "projects" en Projects y TeamDetail) y
  // cada una se da de baja sola, sin borrar las de las demás.
  const refreshCallbacksRef = useRef(new Map());

  // Espejos para callbacks estables. Se actualizan antes del efecto de
  // conexión, que al terminar hace que los suscriptores vuelvan a pedir sus
  // canales (channelEpoch) ya con el usuario nuevo.
  const userRef = useRef(user);
  const refreshUserRef = useRef(refreshUser);
  useEffect(() => {
    userRef.current = user;
    refreshUserRef.current = refreshUser;
  });

  // Suscriptores a cambios del historial (la página /notificaciones):
  // { kind: "created" | "read" | "read-all" | "removed", notification?, id? }
  const historyListenersRef = useRef(new Set());
  const publish = useCallback((change) => {
    historyListenersRef.current.forEach((listener) => listener(change));
  }, []);

  const subscribeToNotifications = useCallback((listener) => {
    historyListenersRef.current.add(listener);
    return () => historyListenersRef.current.delete(listener);
  }, []);

  // Ref para mantener la función de notificación actualizada sin causar re-suscripciones
  const handleNotificationRef = useRef(null);

  // Ids llegados en vivo mientras se cargaba el historial inicial
  const liveDuringLoadRef = useRef(null);

  // Ids locales para broadcasts sin id persistido (no debería pasar salvo
  // en señales silenciosas, que no se agregan)
  const localIdRef = useRef(0);

  // Registrar callback de refresco. Devuelve la función para darlo de baja.
  const unregisterRefresh = useCallback((type, callback) => {
    const callbacks = refreshCallbacksRef.current.get(type);
    if (!callbacks) return;
    if (callback) callbacks.delete(callback);
    else callbacks.clear();
    if (callbacks.size === 0) refreshCallbacksRef.current.delete(type);
  }, []);

  const registerRefresh = useCallback(
    (type, callback) => {
      const map = refreshCallbacksRef.current;
      if (!map.has(type)) map.set(type, new Set());
      map.get(type).add(callback);
      return () => unregisterRefresh(type, callback);
    },
    [unregisterRefresh]
  );

  // Disparar el refresh de una clave (desde cualquier componente o evento)
  const triggerRefresh = useCallback((type) => {
    const callbacks = refreshCallbacksRef.current.get(type);
    if (!callbacks) return;
    [...callbacks].forEach((callback) => callback());
  }, []);

  // Canales privados de recurso (project.{id}, team.{id}, organization.{id})
  // compartidos entre pantallas: una sola suscripción por canal y evento,
  // y se abandona cuando se va el último suscriptor.
  const channelsRef = useRef(new Map());

  const subscribeChannel = useCallback((name, event, listener) => {
    const current = userRef.current;
    if (!current?.id || current.isSystemAdmin || !localStorage.getItem("token")) {
      return () => {};
    }

    let entry = channelsRef.current.get(name);
    if (!entry) {
      try {
        entry = { channel: getEcho().private(name), events: new Map() };
      } catch (error) {
        console.error(`No se pudo suscribir a ${name}:`, error);
        return () => {};
      }
      channelsRef.current.set(name, entry);
    }

    let listeners = entry.events.get(event);
    if (!listeners) {
      listeners = new Set();
      entry.events.set(event, listeners);
      const target = listeners;
      entry.channel.listen(`.${event}`, (payload) => {
        [...target].forEach((fn) => fn(payload));
      });
    }
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
      if (channelsRef.current.get(name) !== entry) return;
      const unused = [...entry.events.values()].every((set) => set.size === 0);
      if (unused) {
        channelsRef.current.delete(name);
        try {
          getEcho().leave(name);
        } catch {
          // Echo ya desconectado (cierre de sesión)
        }
      }
    };
  }, []);

  // Operaciones sobre el historial en curso y fin de la última: una
  // notificación en vivo que llega durante o justo después puede estar ya
  // contada en el unread_count de la respuesta (se persiste antes de
  // emitirse), así que el contador se reconcilia con el servidor.
  const pendingOpsRef = useRef(0);
  const lastOpEndRef = useRef(0);
  const needsReconcileRef = useRef(false);

  const reconcileUnreadCount = useCallback(async () => {
    needsReconcileRef.current = false;
    const requestUserId = userRef.current?.id;
    try {
      const response = await notificationsAPI.unreadCount();
      if (userRef.current?.id !== requestUserId || pendingOpsRef.current > 0) return;
      if (typeof response?.unread_count === "number") setUnreadCount(response.unread_count);
    } catch {
      // Se corrige en la próxima carga
    }
  }, []);

  const trackOp = useCallback(
    async (operation) => {
      pendingOpsRef.current += 1;
      try {
        return await operation();
      } finally {
        pendingOpsRef.current -= 1;
        lastOpEndRef.current = Date.now();
        if (pendingOpsRef.current === 0 && needsReconcileRef.current) reconcileUnreadCount();
      }
    },
    [reconcileUnreadCount]
  );

  // Carga en curso: una respuesta de un usuario anterior (o de una carga
  // reemplazada por otra) se descarta.
  const loadSeqRef = useRef(0);

  // Cargar (o recargar) las últimas notificaciones desde la API
  const reloadNotifications = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    const requestUserId = userRef.current?.id;
    const isCurrent = () => seq === loadSeqRef.current && userRef.current?.id === requestUserId;

    liveDuringLoadRef.current = new Set();
    setLoadingNotifications(true);
    try {
      const response = await trackOp(() => notificationsAPI.list({ limit: DROPDOWN_LIMIT }));
      if (!isCurrent()) return;
      const fetched = (response?.data || []).map(normalizeNotification);
      const fetchedIds = new Set(fetched.map((n) => n.id));
      // Las que llegaron en vivo durante la carga y la respuesta no trae
      const lateLive = [...(liveDuringLoadRef.current || [])].filter((id) => !fetchedIds.has(id));

      setList((prev) => {
        const live = prev.filter((n) => lateLive.includes(n.id));
        return [...live, ...fetched].slice(0, DROPDOWN_LIMIT);
      });
      setUnreadCount((response?.unread_count ?? 0) + lateLive.length);
      setRetentionDays(response?.retention_days ?? null);
    } catch (err) {
      // Sin historial no se rompe nada: siguen llegando en vivo
      if (isCurrent()) console.error("No se pudo cargar el historial de notificaciones:", err);
    } finally {
      if (isCurrent()) {
        liveDuringLoadRef.current = null;
        setLoadingNotifications(false);
      }
    }
  }, [setList, trackOp]);

  // Marcar notificación como leída
  const markAsRead = useCallback(
    async (id) => {
      const known = notificationsRef.current.find((n) => n.id === id);
      if (known?.read) return;

      if (known) {
        setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      publish({ kind: "read", id });

      try {
        const response = await trackOp(() => notificationsAPI.markAsRead(id));
        if (typeof response?.unread_count === "number") setUnreadCount(response.unread_count);
      } catch (err) {
        console.error("No se pudo marcar la notificación como leída:", err);
      }
    },
    [publish, setList, trackOp]
  );

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    publish({ kind: "read-all" });

    try {
      await trackOp(() => notificationsAPI.markAllAsRead());
    } catch (err) {
      console.error("No se pudieron marcar las notificaciones como leídas:", err);
      reloadNotifications();
    }
  }, [publish, reloadNotifications, setList, trackOp]);

  // Eliminar una notificación del historial. Si falla, la campana vuelve
  // al estado del servidor (la página restaura su propia copia).
  const removeNotification = useCallback(
    async (id) => {
      const known = notificationsRef.current.find((n) => n.id === id);
      setList((prev) => prev.filter((n) => n.id !== id));
      if (known && !known.read) setUnreadCount((count) => Math.max(0, count - 1));
      publish({ kind: "removed", id });

      try {
        const response = await trackOp(() => notificationsAPI.remove(id));
        if (typeof response?.unread_count === "number") setUnreadCount(response.unread_count);
      } catch (err) {
        reloadNotifications();
        throw err;
      }
    },
    [publish, reloadNotifications, setList, trackOp]
  );

  // Procesar notificación recibida por WebSocket
  const handleNotification = useCallback(
    (data) => {
      // Señal silenciosa: solo refrescar las vistas (sin toast ni historial)
      if (!data.silent) {
        const notification = normalizeNotification({
          ...data,
          id: data.id ?? `local-${++localIdRef.current}`,
        });

        // El broadcast trae el id persistido: si ya está (p.ej. llegó
        // también en la carga inicial) no se duplica ni se vuelve a avisar.
        if (notificationsRef.current.some((n) => n.id === notification.id)) return;

        liveDuringLoadRef.current?.add(notification.id);
        setList((prev) => [notification, ...prev].slice(0, DROPDOWN_LIMIT));
        setUnreadCount((count) => count + 1);

        // Llegó durante (o justo después de) una carga o un marcado: el
        // servidor pudo haberla contado ya; se reconcilia el contador.
        if (pendingOpsRef.current > 0) needsReconcileRef.current = true;
        else if (Date.now() - lastOpEndRef.current < RECONCILE_WINDOW_MS) reconcileUnreadCount();
        publish({ kind: "created", notification });

        const removedReason = REMOVED_TYPES[data.type];
        if (removedReason && data.data?.action === "removed_from_organization") {
          // El usuario actual fue removido o desactivado - modal especial
          setRemovedFromOrgModal({
            isOpen: true,
            organizationName: data.data?.organization_name || "la organización",
            removerName: data.data?.remover_name || "Un administrador",
            reason: removedReason,
          });
        } else {
          const toast = { success, warning, info }[toastKindFor(data.type)];
          toast(data.message);
        }

        // Mi rol o mi plan cambiaron: menús y permisos al día sin recargar
        if (USER_REFRESH_TYPES.has(data.type)) {
          refreshUserRef.current?.()?.catch?.(() => {});
        }
      }

      refreshKeysFor(data).forEach(triggerRefresh);
    },
    [info, success, warning, publish, setList, triggerRefresh, reconcileUnreadCount]
  );

  // Todas las pantallas registradas, una vez cada callback (una misma
  // pantalla puede estar bajo varias claves)
  const refreshAll = useCallback(() => {
    const callbacks = new Set();
    refreshCallbacksRef.current.forEach((set) => set.forEach((cb) => callbacks.add(cb)));
    callbacks.forEach((cb) => cb());
  }, []);

  const reloadNotificationsRef = useRef(reloadNotifications);
  const refreshAllRef = useRef(refreshAll);
  useEffect(() => {
    reloadNotificationsRef.current = reloadNotifications;
    refreshAllRef.current = refreshAll;
  });

  // Mantener la ref actualizada con la última versión de handleNotification
  useEffect(() => {
    handleNotificationRef.current = handleNotification;
  }, [handleNotification]);

  // Conectar, cargar el historial y suscribirse al canal del usuario
  // IMPORTANTE: Solo depende del usuario para evitar re-suscripciones innecesarias
  useEffect(() => {
    // Al cerrar sesión o cambiar de usuario, el historial del anterior no
    // debe quedar visible (el provider sigue montado tras un navigate()).
    setList([]);
    setUnreadCount(0);
    setRetentionDays(null);
    setRemovedFromOrgModal(CLOSED_REMOVED_MODAL);

    // El superadmin (SystemAdmin) tiene su propia secuencia de ids: nunca
    // debe suscribirse a user.{id}, que es el canal de un usuario de la app.
    if (!user?.id || user?.isSystemAdmin) {
      channelsRef.current.clear();
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

    // Cualquier carga de historial pendiente pertenece al usuario anterior
    loadSeqRef.current += 1;
    pendingOpsRef.current = 0;
    needsReconcileRef.current = false;

    // Obtener instancia de Echo (se crea si no existe)
    const echo = getEcho();
    updateEchoAuth(token);
    setChannelEpoch((epoch) => epoch + 1);

    // El historial se carga cuando el canal ya está suscrito: lo que se
    // guarde antes llega en la carga y lo posterior, en vivo (sin hueco).
    // Si el WebSocket no responde, se carga igual tras una espera.
    let subscribedOnce = false;
    const fallbackTimer = setTimeout(() => {
      if (!subscribedOnce) reloadNotificationsRef.current();
    }, HISTORY_FALLBACK_MS);

    // Suscribirse al canal privado del usuario
    try {
      const channel = echo.private(`user.${user.id}`);

      channel
        .listen(".notification", (data) => {
          // Usar la ref para siempre tener la versión más actualizada
          handleNotificationRef.current?.(data);
        })
        // Señal gruesa de las listas para proyectos personales (M4)
        .listen(".projects.sync", () => triggerRefresh(PROJECT_LIST_KEY))
        .subscribed(() => {
          setIsConnected(true);
          const first = !subscribedOnce;
          subscribedOnce = true;
          clearTimeout(fallbackTimer);
          reloadNotificationsRef.current();
          // Re-suscripción tras una reconexión: lo emitido mientras no había
          // conexión se perdió, así que cada pantalla vuelve a pedir sus datos.
          // En la primera conexión las pantallas acaban de cargar.
          if (!first) refreshAllRef.current();
        })
        .error((error) => {
          console.error("❌ Error en canal WebSocket:", error);
          setIsConnected(false);
        });

      // Estado de la conexión. Se desenlazan al salir (B9): si no, cada
      // cambio de usuario sumaba otro juego de handlers.
      const connection = echo.connector.pusher.connection;
      const onConnected = () => setIsConnected(true);
      const onDisconnected = () => setIsConnected(false);
      const onError = (err) => {
        console.error("❌ Error de conexión WebSocket:", err);
        setIsConnected(false);
      };
      connection.bind("connected", onConnected);
      connection.bind("disconnected", onDisconnected);
      connection.bind("error", onError);

      return () => {
        clearTimeout(fallbackTimer);
        connection.unbind?.("connected", onConnected);
        connection.unbind?.("disconnected", onDisconnected);
        connection.unbind?.("error", onError);
        echo.leave(`user.${user.id}`);
        channelsRef.current.forEach((_entry, name) => echo.leave(name));
        channelsRef.current.clear();
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Error al conectar WebSocket:", error);
      setIsConnected(false);
      clearTimeout(fallbackTimer);
      reloadNotificationsRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.isSystemAdmin]); // Solo re-suscribirse cuando cambie el usuario

  // Canal de la organización activa: bandeja de clientes, miembros, roles,
  // equipos, invitaciones y datos de la organización (sin toast).
  const activeOrganizationId =
    user?.organization_id && user?.active_context && user.active_context !== "personal"
      ? user.organization_id
      : null;

  useEffect(() => {
    if (!activeOrganizationId) return undefined;

    const channel = `organization.${activeOrganizationId}`;
    const offs = [
      subscribeChannel(channel, "organization.sync", (payload) => {
        organizationSyncKeysFor(payload).forEach(triggerRefresh);
        if (organizationSyncAffectsUser(payload, userRef.current)) {
          refreshUserRef.current?.()?.catch?.(() => {});
        }
      }),
      // Cambio en cualquier proyecto de la organización: solo las listas
      // (Proyectos, Tareas) con una sola suscripción (M4)
      subscribeChannel(channel, "projects.sync", () => triggerRefresh(PROJECT_LIST_KEY)),
    ];
    return () => offs.forEach((off) => off());
  }, [activeOrganizationId, subscribeChannel, triggerRefresh, channelEpoch]);

  // Función para cerrar el modal de removido de organización
  const closeRemovedFromOrgModal = useCallback(() => {
    setRemovedFromOrgModal(CLOSED_REMOVED_MODAL);
  }, []);

  const value = {
    // Historial (desplegable de la campana)
    notifications,
    unreadCount,
    retentionDays,
    loadingNotifications,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    reloadNotifications,
    subscribeToNotifications,
    // Refresco de vistas en tiempo real
    registerRefresh,
    unregisterRefresh,
    triggerRefresh,
    // Canales de recurso (project/team/organization .sync)
    subscribeChannel,
    channelEpoch,
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

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRealtime } from "../context/RealtimeContext";
import { useNotification } from "../context/NotificationContext";
import { notificationNotice, notificationTarget } from "../utils/notifications";

// Ids locales (broadcast sin persistir): no existen en el servidor
const isStoredId = (id) => typeof id === "number" || /^\d+$/.test(String(id ?? ""));

/**
 * Abrir una notificación (campana, /notificaciones o el toast en vivo):
 * la marca leída y lleva al recurso exacto (notificationTarget). Si el
 * recurso ya no existe o se perdió el acceso, lleva al listado con un aviso.
 * Devuelve la ruta (o null si la notificación no lleva a ningún sitio).
 */
const useOpenNotification = () => {
  const navigate = useNavigate();
  const { markAsRead } = useRealtime();
  const { warning } = useNotification();

  return useCallback(
    (notification) => {
      if (!notification) return null;
      if (!notification.read && isStoredId(notification.id)) markAsRead?.(notification.id);

      const target = notificationTarget(notification);
      if (!target) return null;

      const notice = notificationNotice(notification);
      if (notice) warning?.(notice);
      navigate(target);
      return target;
    },
    [markAsRead, navigate, warning]
  );
};

export default useOpenNotification;

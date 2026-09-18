import { useEffect } from "react";
import { useRealtime } from "../../context/RealtimeContext";
import useOpenNotification from "../../hooks/useOpenNotification";

/**
 * Puente para el toast en vivo: RealtimeProvider está fuera del Router y no
 * puede navegar. Este componente (dentro del Router) le registra la función
 * que abre una notificación, la misma que usan la campana y /notificaciones.
 */
const NotificationOpener = () => {
  const open = useOpenNotification();
  const { registerNotificationOpener } = useRealtime();

  useEffect(() => registerNotificationOpener?.(open), [open, registerNotificationOpener]);

  return null;
};

export default NotificationOpener;

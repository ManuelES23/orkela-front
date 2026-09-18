import { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Bell,
  Sparkles,
} from "lucide-react";
import InvitationLinkModal from "../components/ui/InvitationLinkNotice";

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  // Contador para ids únicos: dos toasts en el mismo ms compartían id con Date.now()
  const nextIdRef = useRef(0);
  // Enlaces de invitaciones cuyo correo no salió (ver showInvitationLinks)
  const [invitationLinks, setInvitationLinks] = useState([]);

  const addNotification = useCallback(
    ({ type = "info", message, title, duration = 5000, onClick }) => {
      const id = ++nextIdRef.current;
      // onClick: el toast es clicable (p.ej. lleva al recurso de una notificación)
      const notification = { id, type, message, title, onClick };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    []
  );

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback(
    (message, duration, options = {}) => {
      return addNotification({
        type: "success",
        title: "¡Éxito!",
        message,
        duration,
        onClick: options.onClick,
      });
    },
    [addNotification]
  );

  const error = useCallback(
    (message, duration, options = {}) => {
      return addNotification({
        type: "error",
        title: "Error",
        message,
        duration: duration || 7000,
        onClick: options.onClick,
      });
    },
    [addNotification]
  );

  const warning = useCallback(
    (message, duration, options = {}) => {
      return addNotification({
        type: "warning",
        title: "Atención",
        message,
        duration: duration || 6000,
        onClick: options.onClick,
      });
    },
    [addNotification]
  );

  const info = useCallback(
    (message, duration, options = {}) => {
      return addNotification({
        type: "info",
        title: "Información",
        message,
        duration,
        onClick: options.onClick,
      });
    },
    [addNotification]
  );

  // Mostrar el aviso con los enlaces para compartir a mano. Se acumulan por si
  // varias invitaciones fallan a la vez (p.ej. al crear un equipo).
  const showInvitationLinks = useCallback((items) => {
    const valid = (items || []).filter((item) => item?.link);
    if (valid.length === 0) return;
    setInvitationLinks((prev) => [
      ...prev,
      ...valid.filter((item) => !prev.some((p) => p.link === item.link)),
    ]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        success,
        error,
        warning,
        info,
        removeNotification,
        showInvitationLinks,
      }}
    >
      {children}
      <InvitationLinkModal
        items={invitationLinks}
        onClose={() => setInvitationLinks([])}
      />
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

const NotificationContainer = ({ notifications, onRemove }) => {
  return (
    <div className='fixed top-4 right-2 left-2 sm:left-auto sm:right-4 z-[100] space-y-2 sm:space-y-3 sm:max-w-sm md:max-w-md sm:w-full pointer-events-none'>
      <AnimatePresence mode='popLayout'>
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            notification={notification}
            onClose={() => onRemove(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const Notification = ({ notification, onClose }) => {
  const { type, message, title, onClick } = notification;
  const handleActivate = () => {
    onClick();
    onClose();
  };

  const config = {
    success: {
      icon: CheckCircle,
      gradient: "from-emerald-500 to-green-600",
      bgColor: "bg-white dark:bg-night-900",
      borderColor: "border-emerald-200 dark:border-emerald-900/60",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      textColor: "text-gray-800 dark:text-night-100",
      titleColor: "text-emerald-700 dark:text-emerald-400",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      ringColor: "ring-emerald-500/20",
      glowColor: "shadow-emerald-500/25",
    },
    error: {
      icon: XCircle,
      gradient: "from-red-500 to-rose-600",
      bgColor: "bg-white dark:bg-night-900",
      borderColor: "border-red-200 dark:border-red-900/60",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      textColor: "text-gray-800 dark:text-night-100",
      titleColor: "text-red-700 dark:text-red-400",
      iconColor: "text-red-600 dark:text-red-400",
      ringColor: "ring-red-500/20",
      glowColor: "shadow-red-500/25",
    },
    warning: {
      icon: AlertTriangle,
      gradient: "from-amber-500 to-orange-500",
      bgColor: "bg-white dark:bg-night-900",
      borderColor: "border-amber-200 dark:border-amber-900/60",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      textColor: "text-gray-800 dark:text-night-100",
      titleColor: "text-amber-700 dark:text-amber-400",
      iconColor: "text-amber-600 dark:text-amber-400",
      ringColor: "ring-amber-500/20",
      glowColor: "shadow-amber-500/25",
    },
    info: {
      icon: Info,
      gradient: "from-blue-500 to-brand-600",
      bgColor: "bg-white dark:bg-night-900",
      borderColor: "border-blue-200 dark:border-blue-900/60",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      textColor: "text-gray-800 dark:text-night-100",
      titleColor: "text-blue-700 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-400",
      ringColor: "ring-blue-500/20",
      glowColor: "shadow-blue-500/25",
    },
  };

  const {
    icon: Icon,
    gradient,
    bgColor,
    borderColor,
    iconBg,
    textColor,
    titleColor,
    iconColor,
    ringColor,
    glowColor,
  } = config[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className={`${bgColor} ${borderColor} border rounded-lg sm:rounded-xl shadow-xl ${glowColor} shadow-lg ring-1 ${ringColor} overflow-hidden pointer-events-auto`}
    >
      {/* Barra de color superior */}
      <div className={`h-0.5 sm:h-1 bg-gradient-to-r ${gradient}`} />

      <div className='p-2.5 sm:p-4 flex items-start gap-2 sm:gap-3'>
        {/* Ícono con fondo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
          className={`${iconBg} p-1.5 sm:p-2 rounded-full shrink-0`}
        >
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
        </motion.div>

        {/* Contenido (clicable si el toast lleva a algún sitio) */}
        <div
          className={`flex-1 min-w-0${onClick ? " cursor-pointer" : ""}`}
          {...(onClick && {
            role: "button",
            tabIndex: 0,
            "aria-label": `${title}: ${message}. Abrir`,
            onClick: handleActivate,
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleActivate();
              }
            },
          })}
        >
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className={`${titleColor} font-semibold text-xs sm:text-sm`}
          >
            {title}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`${textColor} text-xs sm:text-sm mt-0.5 leading-relaxed line-clamp-2`}
          >
            {message}
          </motion.p>
        </div>

        {/* Botón cerrar */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-night-500 dark:hover:text-night-200 dark:hover:bg-night-800 p-1 sm:p-1.5 rounded-full transition-colors shrink-0'
        >
          <X className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </motion.button>
      </div>

      {/* Barra de progreso animada */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{
          duration: type === "error" ? 7 : type === "warning" ? 6 : 5,
          ease: "linear",
        }}
        style={{ transformOrigin: "left" }}
        className={`h-0.5 bg-gradient-to-r ${gradient} opacity-30`}
      />
    </motion.div>
  );
};

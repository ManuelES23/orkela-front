import { createContext, useContext, useState, useCallback } from "react";
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

  const addNotification = useCallback(
    ({ type = "info", message, title, duration = 5000 }) => {
      const id = Date.now();
      const notification = { id, type, message, title };

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
    (message, duration) => {
      return addNotification({
        type: "success",
        title: "¡Éxito!",
        message,
        duration,
      });
    },
    [addNotification]
  );

  const error = useCallback(
    (message, duration) => {
      return addNotification({
        type: "error",
        title: "Error",
        message,
        duration: duration || 7000,
      });
    },
    [addNotification]
  );

  const warning = useCallback(
    (message, duration) => {
      return addNotification({
        type: "warning",
        title: "Atención",
        message,
        duration: duration || 6000,
      });
    },
    [addNotification]
  );

  const info = useCallback(
    (message, duration) => {
      return addNotification({
        type: "info",
        title: "Información",
        message,
        duration,
      });
    },
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{ success, error, warning, info, removeNotification }}
    >
      {children}
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
  const { type, message, title } = notification;

  const config = {
    success: {
      icon: CheckCircle,
      gradient: "from-emerald-500 to-green-600",
      bgColor: "bg-white",
      borderColor: "border-emerald-200",
      iconBg: "bg-emerald-100",
      textColor: "text-gray-800",
      titleColor: "text-emerald-700",
      iconColor: "text-emerald-600",
      ringColor: "ring-emerald-500/20",
      glowColor: "shadow-emerald-500/25",
    },
    error: {
      icon: XCircle,
      gradient: "from-red-500 to-rose-600",
      bgColor: "bg-white",
      borderColor: "border-red-200",
      iconBg: "bg-red-100",
      textColor: "text-gray-800",
      titleColor: "text-red-700",
      iconColor: "text-red-600",
      ringColor: "ring-red-500/20",
      glowColor: "shadow-red-500/25",
    },
    warning: {
      icon: AlertTriangle,
      gradient: "from-amber-500 to-orange-500",
      bgColor: "bg-white",
      borderColor: "border-amber-200",
      iconBg: "bg-amber-100",
      textColor: "text-gray-800",
      titleColor: "text-amber-700",
      iconColor: "text-amber-600",
      ringColor: "ring-amber-500/20",
      glowColor: "shadow-amber-500/25",
    },
    info: {
      icon: Info,
      gradient: "from-blue-500 to-brand-600",
      bgColor: "bg-white",
      borderColor: "border-blue-200",
      iconBg: "bg-blue-100",
      textColor: "text-gray-800",
      titleColor: "text-blue-700",
      iconColor: "text-blue-600",
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

        {/* Contenido */}
        <div className='flex-1 min-w-0'>
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
          className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 sm:p-1.5 rounded-full transition-colors shrink-0'
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

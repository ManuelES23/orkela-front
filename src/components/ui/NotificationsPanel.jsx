import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bell, CheckCheck, X, ArrowRight } from "lucide-react";
import { useRealtime } from "../../context/RealtimeContext";
import { formatDistanceToNow } from "../../utils/dateUtils";
import useOpenNotification from "../../hooks/useOpenNotification";
import NotificationIcon from "../notifications/NotificationIcon";
import { Skeleton } from "./Skeleton";
import { motionTokens } from "../animations/variants";

// Fila de carga con la misma silueta que una notificación
const LoadingRows = () => (
  <div className='p-2 space-y-1' aria-label='Cargando notificaciones'>
    {[0, 1, 2].map((i) => (
      <div key={i} className='flex items-start gap-3 px-3 py-3'>
        <Skeleton className='w-9 h-9 rounded-lg shrink-0' />
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-3.5 w-2/5' />
          <Skeleton className='h-3 w-4/5' />
          <Skeleton className='h-2.5 w-16' />
        </div>
      </div>
    ))}
  </div>
);

const NotificationsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const {
    notifications,
    unreadCount,
    isConnected,
    loadingNotifications,
    markAllAsRead,
  } = useRealtime();

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const openNotification = useOpenNotification();
  const handleOpenNotification = (notification) => {
    if (openNotification(notification)) setIsOpen(false);
  };

  const badge = unreadCount > 9 ? "9+" : unreadCount;
  const bellLabel =
    unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones";

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 8, scale: 0.98 },
      };

  return (
    <div className='relative' ref={panelRef}>
      {/* Botón de campana */}
      <button
        type='button'
        onClick={() => setIsOpen((open) => !open)}
        aria-label={bellLabel}
        aria-expanded={isOpen}
        aria-haspopup='dialog'
        className='relative w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-night-300 dark:hover:text-night-50 dark:hover:bg-night-800 rounded-lg transition-colors cursor-pointer'
      >
        <Bell className='w-5 h-5' />

        {/* Badge de no leídas (contador del servidor) */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key='badge'
              initial={reduceMotion ? { opacity: 0 } : { scale: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { scale: 0 }}
              transition={motionTokens.springSnappy}
              className='absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-night-900'
            >
              {badge}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Indicador de conexión */}
        <span
          className={`absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-night-900 ${
            isConnected ? "bg-emerald-500" : "bg-gray-300 dark:bg-night-600"
          }`}
          title={isConnected ? "Conectado en tiempo real" : "Sin conexión en tiempo real"}
        />
      </button>

      {/* Panel desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role='dialog'
            aria-label='Notificaciones'
            {...panelMotion}
            transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
            className='fixed right-2 left-2 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 bg-white dark:bg-night-900 rounded-xl shadow-xl shadow-gray-900/10 dark:shadow-black/40 border border-gray-200 dark:border-night-700 overflow-hidden z-50'
          >
            {/* Cabecera */}
            <div className='flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-night-700'>
              <div className='min-w-0'>
                <h3 className='font-semibold text-gray-900 dark:text-night-50'>Notificaciones</h3>
                <p className='text-xs text-gray-500 dark:text-night-400'>
                  {unreadCount > 0
                    ? `${unreadCount} sin leer`
                    : "Estás al día"}
                </p>
              </div>
              <div className='flex items-center gap-1'>
                {unreadCount > 0 && (
                  <button
                    type='button'
                    onClick={markAllAsRead}
                    className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10 rounded-lg transition-colors cursor-pointer'
                  >
                    <CheckCheck className='w-4 h-4' />
                    Marcar todas como leídas
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => setIsOpen(false)}
                  aria-label='Cerrar'
                  className='p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-night-400 dark:hover:text-night-100 dark:hover:bg-night-800 rounded-lg transition-colors cursor-pointer'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className='max-h-[min(28rem,65vh)] overflow-y-auto'>
              {loadingNotifications && notifications.length === 0 ? (
                <LoadingRows />
              ) : notifications.length === 0 ? (
                <div className='py-12 px-6 text-center'>
                  <span className='w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-night-800 flex items-center justify-center'>
                    <Bell className='w-6 h-6 text-gray-400 dark:text-night-500' />
                  </span>
                  <p className='text-sm font-medium text-gray-700 dark:text-night-200'>
                    No tienes notificaciones
                  </p>
                  <p className='text-xs text-gray-500 dark:text-night-400 mt-1'>
                    Te avisaremos aquí cuando haya novedades
                  </p>
                </div>
              ) : (
                <ul className='p-2 space-y-0.5'>
                  <AnimatePresence initial={false}>
                    {notifications.map((notification) => (
                      <motion.li
                        key={notification.id}
                        layout={!reduceMotion}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
                      >
                        <button
                          type='button'
                          onClick={() => handleOpenNotification(notification)}
                          className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                            notification.read
                              ? "hover:bg-gray-50 dark:hover:bg-night-800"
                              : "bg-brand-50/60 hover:bg-brand-50 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
                          }`}
                        >
                          <NotificationIcon type={notification.type} />
                          <span className='flex-1 min-w-0'>
                            <span
                              className={`block text-sm ${
                                notification.read
                                  ? "font-medium text-gray-700 dark:text-night-200"
                                  : "font-semibold text-gray-900 dark:text-night-50"
                              }`}
                            >
                              {notification.title}
                            </span>
                            <span className='block text-sm text-gray-600 dark:text-night-300 leading-snug line-clamp-2'>
                              {notification.message}
                            </span>
                            <span className='block text-xs text-gray-400 dark:text-night-500 mt-1'>
                              {formatDistanceToNow(notification.createdAt)}
                            </span>
                          </span>
                          {!notification.read && (
                            <span
                              aria-label='Sin leer'
                              className='w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-2'
                            />
                          )}
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Pie: historial completo */}
            <div className='border-t border-gray-100 dark:border-night-700 bg-gray-50/80 dark:bg-night-950/40'>
              <Link
                to='/notificaciones'
                onClick={() => setIsOpen(false)}
                className='group flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200 transition-colors'
              >
                Ver todo el historial
                <ArrowRight className='w-4 h-4 transition-transform group-hover:translate-x-0.5' />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsPanel;

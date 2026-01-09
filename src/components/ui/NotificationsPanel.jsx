import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  FolderKanban,
  CheckSquare,
  Users,
  Mail,
  X,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Building2,
  MailPlus,
  MailCheck,
  MailX,
} from "lucide-react";
import { useRealtime } from "../../context/RealtimeContext";
import { formatDistanceToNow } from "../../utils/dateUtils";

const NotificationsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useRealtime();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Obtener ícono según tipo de notificación
  const getIcon = (type) => {
    switch (type) {
      case "project_created":
      case "project_updated":
      case "project_deleted":
      case "project_collaborator_joined":
      case "project_invitation_sent":
        return <FolderKanban className='w-4 h-4 text-blue-500' />;

      case "task_created":
      case "task_assigned":
        return <CheckSquare className='w-4 h-4 text-green-500' />;

      case "task_updated":
      case "task_status_changed":
        return <RefreshCw className='w-4 h-4 text-indigo-500' />;

      case "task_completed":
        return <CheckCircle className='w-4 h-4 text-green-600' />;

      case "task_due_soon":
        return <Clock className='w-4 h-4 text-yellow-500' />;

      case "task_overdue":
        return <AlertTriangle className='w-4 h-4 text-red-500' />;

      case "team_member_joined":
      case "team_invitation_sent":
        return <Users className='w-4 h-4 text-purple-500' />;

      // Invitaciones recibidas
      case "project_invitation_received":
        return <MailPlus className='w-4 h-4 text-blue-500' />;
      case "team_invitation_received":
        return <MailPlus className='w-4 h-4 text-purple-500' />;
      case "organization_invitation_received":
        return <Building2 className='w-4 h-4 text-indigo-500' />;

      // Invitaciones aceptadas
      case "project_invitation_accepted":
      case "team_invitation_accepted":
      case "organization_invitation_accepted":
        return <MailCheck className='w-4 h-4 text-green-500' />;

      // Invitaciones rechazadas
      case "project_invitation_declined":
      case "team_invitation_declined":
      case "organization_invitation_declined":
        return <MailX className='w-4 h-4 text-red-500' />;

      // Organizaciones
      case "organization_member_removed":
        return <Building2 className='w-4 h-4 text-red-500' />;
      case "organization_member_left":
        return <Building2 className='w-4 h-4 text-orange-500' />;
      case "organization_role_updated":
        return <Building2 className='w-4 h-4 text-indigo-500' />;

      default:
        return <Mail className='w-4 h-4 text-gray-500' />;
    }
  };

  // Obtener color de fondo según tipo
  const getBgColor = (type, read) => {
    if (read) return "bg-gray-50";

    switch (type) {
      case "project_created":
      case "project_updated":
      case "project_collaborator_joined":
      case "project_invitation_sent":
        return "bg-blue-50";

      case "project_deleted":
      case "task_overdue":
        return "bg-red-50";

      case "task_created":
      case "task_assigned":
      case "task_completed":
        return "bg-green-50";

      case "task_updated":
      case "task_status_changed":
        return "bg-indigo-50";

      case "task_due_soon":
        return "bg-yellow-50";

      case "team_member_joined":
      case "team_invitation_sent":
        return "bg-purple-50";

      // Organizaciones
      case "organization_member_removed":
        return "bg-red-50";
      case "organization_member_left":
        return "bg-orange-50";
      case "organization_role_updated":
        return "bg-indigo-50";

      default:
        return "bg-gray-100";
    }
  };

  return (
    <div className='relative' ref={panelRef}>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
      >
        <Bell className='w-5 h-5' />

        {/* Badge de no leídas */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className='absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center'
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}

        {/* Indicador de conexión */}
        <span
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
          title={isConnected ? "Conectado" : "Desconectado"}
        />
      </button>

      {/* Panel desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className='absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50'
          >
            {/* Header */}
            <div className='px-4 py-3 bg-linear-to-r from-indigo-50 to-white border-b border-gray-100'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <h3 className='font-semibold text-gray-900'>
                    Notificaciones
                  </h3>
                  {isConnected ? (
                    <Wifi className='w-4 h-4 text-green-500' />
                  ) : (
                    <WifiOff className='w-4 h-4 text-red-500' />
                  )}
                </div>
                <div className='flex items-center gap-1'>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className='p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors'
                      title='Marcar todas como leídas'
                    >
                      <CheckCheck className='w-4 h-4' />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className='p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                      title='Limpiar todo'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className='p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
                  >
                    <X className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className='max-h-96 overflow-y-auto'>
              {notifications.length === 0 ? (
                <div className='py-12 text-center'>
                  <Bell className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                  <p className='text-gray-500 text-sm'>
                    No tienes notificaciones
                  </p>
                  <p className='text-gray-400 text-xs mt-1'>
                    Las notificaciones en tiempo real aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className='divide-y divide-gray-100'>
                  <AnimatePresence>
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`px-4 py-3 cursor-pointer transition-colors ${getBgColor(
                          notification.type,
                          notification.read
                        )} hover:bg-gray-100`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className='flex items-start gap-3'>
                          <div className='p-2 bg-white rounded-full shadow-sm'>
                            {getIcon(notification.type)}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium text-gray-900'>
                              {notification.title}
                            </p>
                            <p className='text-sm text-gray-600 truncate'>
                              {notification.message}
                            </p>
                            <p className='text-xs text-gray-400 mt-1'>
                              {formatDistanceToNow(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className='w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-2' />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className='px-4 py-2 bg-gray-50 border-t border-gray-100'>
                <p className='text-xs text-gray-500 text-center'>
                  {unreadCount} sin leer de {notifications.length} totales
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsPanel;

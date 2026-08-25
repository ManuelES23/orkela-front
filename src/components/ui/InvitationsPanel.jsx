import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Check,
  X,
  FolderKanban,
  Users,
  Building2,
  Clock,
  Loader2,
  MailOpen,
} from "lucide-react";
import { myInvitationsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";
import { useRealtime } from "../../context/RealtimeContext";
import { useAuth } from "../../context/AuthContext";
import { formatDistanceToNow } from "../../utils/dateUtils";

const InvitationsPanel = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [showOrgContextModal, setShowOrgContextModal] = useState(null); // Datos de la org aceptada
  const panelRef = useRef(null);
  const { success, error: showError } = useNotification();
  const { refreshUser, switchContext } = useAuth();
  const { registerRefresh, unregisterRefresh, triggerRefresh } = useRealtime();

  // Cargar invitaciones
  const loadInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await myInvitationsAPI.getAll();
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error("Error loading invitations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al montar
  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // Registrar para actualizaciones en tiempo real
  useEffect(() => {
    registerRefresh("invitations", loadInvitations);
    return () => unregisterRefresh("invitations");
  }, [registerRefresh, unregisterRefresh, loadInvitations]);

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

  // Aceptar invitación
  const handleAccept = async (invitation) => {
    setProcessingId(invitation.id);
    try {
      const response = await myInvitationsAPI.accept(
        invitation.type,
        invitation.token
      );

      // Remover de la lista
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));

      // Refrescar la lista correspondiente según el tipo de invitación
      if (invitation.type === "team") {
        success(`Te has unido a "${invitation.resource_name}" exitosamente`);
        triggerRefresh("teams");
      } else if (invitation.type === "project") {
        success(`Te has unido a "${invitation.resource_name}" exitosamente`);
        triggerRefresh("projects");
      } else if (invitation.type === "organization") {
        // Para organización: refrescar usuario y mostrar modal de selección de contexto
        await refreshUser();
        setShowOrgContextModal({
          name: invitation.resource_name,
          id: response.organization?.id || invitation.resource_id,
        });
        setIsOpen(false); // Cerrar el panel
      }
    } catch (err) {
      showError(err.message || "Error al aceptar la invitación");
    } finally {
      setProcessingId(null);
    }
  };

  // Manejar selección de contexto para organización
  const handleOrgContextSelection = async (contextType) => {
    try {
      await switchContext(contextType);
      // Siempre ir al dashboard, el contexto determina qué recursos ve
      navigate("/dashboard");
    } catch (err) {
      console.error("Error switching context:", err);
      navigate("/dashboard");
    } finally {
      setShowOrgContextModal(null);
    }
  };

  // Rechazar invitación
  const handleDecline = async (invitation) => {
    setProcessingId(invitation.id);
    try {
      await myInvitationsAPI.decline(invitation.type, invitation.token);
      success("Invitación rechazada");
      // Remover de la lista
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    } catch (err) {
      showError(err.message || "Error al rechazar la invitación");
    } finally {
      setProcessingId(null);
    }
  };

  // Obtener ícono según tipo
  const getIcon = (type) => {
    switch (type) {
      case "project":
        return <FolderKanban className='w-5 h-5 text-blue-500' />;
      case "team":
        return <Users className='w-5 h-5 text-purple-500' />;
      case "organization":
        return <Building2 className='w-5 h-5 text-brand-500' />;
      default:
        return <Mail className='w-5 h-5 text-gray-500' />;
    }
  };

  // Obtener label según tipo
  const getTypeLabel = (type) => {
    switch (type) {
      case "project":
        return "Proyecto";
      case "team":
        return "Equipo";
      case "organization":
        return "Organización";
      default:
        return "Invitación";
    }
  };

  const count = invitations.length;

  return (
    <div className='relative' ref={panelRef}>
      {/* Botón de invitaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
        title='Invitaciones pendientes'
      >
        <Mail className='w-5 h-5' />

        {/* Badge de invitaciones pendientes */}
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className='absolute -top-1 -right-1 w-5 h-5 bg-brand-500 text-white text-xs font-bold rounded-full flex items-center justify-center'
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </button>

      {/* Panel desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className='fixed right-2 left-2 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50'
          >
            {/* Header */}
            <div className='px-4 py-3 bg-linear-to-r from-brand-50 to-white border-b border-gray-100'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <MailOpen className='w-5 h-5 text-brand-500' />
                  <h3 className='font-semibold text-gray-900'>
                    Invitaciones Pendientes
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className='p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>

            {/* Lista de invitaciones */}
            <div className='max-h-96 overflow-y-auto'>
              {loading ? (
                <div className='py-12 flex justify-center'>
                  <Loader2 className='w-6 h-6 animate-spin text-brand-500' />
                </div>
              ) : invitations.length === 0 ? (
                <div className='py-12 text-center'>
                  <Mail className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                  <p className='text-gray-500 text-sm'>
                    No tienes invitaciones pendientes
                  </p>
                  <p className='text-gray-400 text-xs mt-1'>
                    Las invitaciones a proyectos, equipos y organizaciones
                    aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className='divide-y divide-gray-100'>
                  <AnimatePresence>
                    {invitations.map((invitation) => (
                      <motion.div
                        key={`${invitation.type}-${invitation.id}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className='px-4 py-3 hover:bg-gray-50 transition-colors'
                      >
                        <div className='flex items-start gap-3'>
                          {/* Ícono */}
                          <div
                            className={`p-2 rounded-lg ${
                              invitation.resource_color?.replace(
                                "bg-",
                                "bg-"
                              ) || "bg-gray-100"
                            } bg-opacity-20`}
                          >
                            {getIcon(invitation.type)}
                          </div>

                          {/* Contenido */}
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 mb-1'>
                              <span className='text-xs font-medium text-gray-500 uppercase'>
                                {getTypeLabel(invitation.type)}
                              </span>
                              {invitation.role && (
                                <span className='text-xs px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded'>
                                  {invitation.role}
                                </span>
                              )}
                            </div>
                            <p className='font-medium text-gray-900 truncate'>
                              {invitation.resource_name}
                            </p>
                            <p className='text-sm text-gray-600'>
                              Invitado por{" "}
                              <span className='font-medium'>
                                {invitation.invited_by}
                              </span>
                            </p>
                            <div className='flex items-center gap-1 text-xs text-gray-400 mt-1'>
                              <Clock className='w-3 h-3' />
                              {formatDistanceToNow(invitation.created_at)}
                            </div>

                            {/* Botones de acción */}
                            <div className='flex items-center gap-2 mt-3'>
                              <button
                                onClick={() => handleAccept(invitation)}
                                disabled={processingId === invitation.id}
                                className='flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                              >
                                {processingId === invitation.id ? (
                                  <Loader2 className='w-4 h-4 animate-spin' />
                                ) : (
                                  <Check className='w-4 h-4' />
                                )}
                                Aceptar
                              </button>
                              <button
                                onClick={() => handleDecline(invitation)}
                                disabled={processingId === invitation.id}
                                className='flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                              >
                                <X className='w-4 h-4' />
                                Rechazar
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {invitations.length > 0 && (
              <div className='px-4 py-2 bg-gray-50 border-t border-gray-100'>
                <p className='text-xs text-gray-500 text-center'>
                  {invitations.length} invitación
                  {invitations.length !== 1 ? "es" : ""} pendiente
                  {invitations.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de selección de contexto para organización */}
      <AnimatePresence>
        {showOrgContextModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 bg-black/50 backdrop-blur-sm z-100'
              onClick={() => setShowOrgContextModal(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='fixed inset-0 z-101 flex items-center justify-center p-4'
            >
              <div className='bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden'>
                {/* Header */}
                <div className='p-6 text-center bg-linear-to-br from-brand-50 to-accent-50'>
                  <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Check className='w-8 h-8 text-green-600' />
                  </div>
                  <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                    ¡Bienvenido a {showOrgContextModal.name}!
                  </h2>
                  <p className='text-gray-600'>
                    Te has unido exitosamente a la organización. ¿Cómo deseas
                    continuar?
                  </p>
                </div>

                {/* Opciones de contexto */}
                <div className='p-6 space-y-3'>
                  {/* Opción: Modo Organización */}
                  <button
                    onClick={() => handleOrgContextSelection("organization")}
                    className='w-full p-4 border-2 border-brand-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-all group text-left'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-brand-100 rounded-lg group-hover:bg-brand-200 transition-colors'>
                        <Building2 className='w-6 h-6 text-brand-600' />
                      </div>
                      <div>
                        <p className='font-semibold text-gray-900'>
                          Entrar como {showOrgContextModal.name}
                        </p>
                        <p className='text-sm text-gray-500'>
                          Ver proyectos y equipos de la organización
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Opción: Modo Personal */}
                  <button
                    onClick={() => handleOrgContextSelection("personal")}
                    className='w-full p-4 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all group text-left'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors'>
                        <Users className='w-6 h-6 text-gray-600' />
                      </div>
                      <div>
                        <p className='font-semibold text-gray-900'>
                          Continuar en modo personal
                        </p>
                        <p className='text-sm text-gray-500'>
                          Ver tus proyectos y equipos personales
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InvitationsPanel;

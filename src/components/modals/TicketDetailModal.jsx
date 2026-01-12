import { useState, useEffect, useCallback } from "react";
import Modal from "../ui/Modal";
import Select from "react-select";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { useRealtime } from "../../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  MessageSquare,
  Clock,
  User,
  Users,
  Flag,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MoreHorizontal,
  Lock,
  Eye,
  Hand,
  UserPlus,
  ArrowLeft,
  Inbox,
  Crown,
} from "lucide-react";
import { ticketsAPI, teamsAPI } from "../../utils/api";

const TicketDetailModal = ({
  isOpen,
  onClose,
  ticket: initialTicket,
  onUpdate,
}) => {
  const { success, error: showError } = useNotification();
  const { user } = useAuth();
  const { registerRefresh, unregisterRefresh } = useRealtime();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAssignSelect, setShowAssignSelect] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const loadTicketDetails = useCallback(async () => {
    if (!initialTicket?.id) return;

    try {
      setInitializing(true);
      const [ticketData, commentsData] = await Promise.all([
        ticketsAPI.getById(initialTicket.id),
        ticketsAPI.getComments(initialTicket.id),
      ]);
      setTicket(ticketData);
      setComments(commentsData);

      // Cargar miembros del equipo si es líder
      if (ticketData.is_team_leader && ticketData.team_id) {
        const members = await teamsAPI.getMembers(ticketData.team_id);
        setTeamMembers(members);
      }
    } catch (err) {
      console.error("Error loading ticket:", err);
      showError("No se pudo cargar el ticket");
    } finally {
      setInitializing(false);
    }
  }, [initialTicket?.id, showError]);

  useEffect(() => {
    if (isOpen && initialTicket?.id) {
      loadTicketDetails();
      setShowAssignSelect(false);
      setSelectedMember(null);
    }
  }, [isOpen, initialTicket?.id, loadTicketDetails]);

  // Registrar callback para actualizaciones en tiempo real
  useEffect(() => {
    if (isOpen && initialTicket?.id) {
      const refreshKey = `ticketDetail-${initialTicket.id}`;
      registerRefresh(refreshKey, loadTicketDetails);
      return () => unregisterRefresh(refreshKey);
    }
  }, [
    isOpen,
    initialTicket?.id,
    registerRefresh,
    unregisterRefresh,
    loadTicketDetails,
  ]);

  // Handlers para tomar/asignar/devolver ticket
  const handleTakeTicket = async () => {
    setProcessingAction(true);
    try {
      const updatedTicket = await ticketsAPI.takeTicket(ticket.id);
      setTicket(updatedTicket);
      success("Has tomado este ticket");
      onUpdate?.();
    } catch (err) {
      console.error("Error taking ticket:", err);
      showError(err.message || "No se pudo tomar el ticket");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAssignTicket = async () => {
    if (!selectedMember) return;

    setProcessingAction(true);
    try {
      const updatedTicket = await ticketsAPI.assignTicket(
        ticket.id,
        selectedMember.value
      );
      setTicket(updatedTicket);
      success(`Ticket asignado a ${selectedMember.label}`);
      setShowAssignSelect(false);
      setSelectedMember(null);
      onUpdate?.();
    } catch (err) {
      console.error("Error assigning ticket:", err);
      showError(err.message || "No se pudo asignar el ticket");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReturnToInbox = async () => {
    setProcessingAction(true);
    try {
      const updatedTicket = await ticketsAPI.returnToInbox(ticket.id);
      setTicket(updatedTicket);
      success("Ticket devuelto al buzón del equipo");
      onUpdate?.();
    } catch (err) {
      console.error("Error returning ticket:", err);
      showError(err.message || "No se pudo devolver el ticket");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSendingComment(true);
    try {
      const comment = await ticketsAPI.addComment(
        ticket.id,
        newComment,
        isInternal
      );
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      setIsInternal(false);
    } catch (err) {
      console.error("Error sending comment:", err);
      showError(err.message || "No se pudo enviar el comentario");
    } finally {
      setSendingComment(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const updatedTicket = await ticketsAPI.update(ticket.id, {
        status: newStatus,
      });
      setTicket(updatedTicket);
      success(`Estado actualizado a "${statusConfig[newStatus]?.label}"`);
      onUpdate?.();
    } catch (err) {
      console.error("Error updating status:", err);
      showError(err.message || "No se pudo actualizar el estado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusConfig = {
    open: {
      color: "text-blue-600 bg-blue-50 border-blue-200",
      icon: AlertCircle,
      label: "Abierto",
    },
    in_progress: {
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      icon: PlayCircle,
      label: "En progreso",
    },
    pending: {
      color: "text-yellow-600 bg-yellow-50 border-yellow-200",
      icon: PauseCircle,
      label: "Pendiente",
    },
    resolved: {
      color: "text-green-600 bg-green-50 border-green-200",
      icon: CheckCircle2,
      label: "Resuelto",
    },
    closed: {
      color: "text-gray-600 bg-gray-50 border-gray-200",
      icon: XCircle,
      label: "Cerrado",
    },
  };

  const priorityConfig = {
    urgent: {
      color: "text-red-600 bg-red-50 border-red-200",
      label: "Urgente",
    },
    high: {
      color: "text-orange-600 bg-orange-50 border-orange-200",
      label: "Alta",
    },
    medium: {
      color: "text-yellow-600 bg-yellow-50 border-yellow-200",
      label: "Media",
    },
    low: { color: "text-gray-600 bg-gray-50 border-gray-200", label: "Baja" },
  };

  const typeConfig = {
    request: {
      icon: MessageSquare,
      label: "Solicitud",
      color: "text-blue-500",
    },
    bug: { icon: Bug, label: "Bug", color: "text-red-500" },
    question: { icon: HelpCircle, label: "Pregunta", color: "text-purple-500" },
    feature: {
      icon: Lightbulb,
      label: "Funcionalidad",
      color: "text-yellow-500",
    },
    support: { icon: Headphones, label: "Soporte", color: "text-green-500" },
    other: { icon: MoreHorizontal, label: "Otro", color: "text-gray-500" },
  };

  const StatusIcon = ticket ? statusConfig[ticket.status]?.icon : AlertCircle;
  const TypeIcon = ticket ? typeConfig[ticket.type]?.icon : MessageSquare;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ticket #${initialTicket?.id || ""}`}
      size='lg'
    >
      {initializing ? (
        <div className='flex flex-col items-center justify-center py-12'>
          <Loader2 className='w-10 h-10 text-indigo-600 animate-spin mb-4' />
          <p className='text-gray-600 font-medium'>Cargando ticket...</p>
          <p className='text-gray-400 text-sm mt-1'>
            Preparando detalles del ticket
          </p>
        </div>
      ) : ticket ? (
        <div className='space-y-6'>
          {/* Header del ticket */}
          <div className='flex flex-col md:flex-row md:items-start gap-4'>
            <div
              className={`p-3 rounded-lg bg-gray-50 ${
                typeConfig[ticket.type]?.color
              }`}
            >
              <TypeIcon className='w-6 h-6' />
            </div>
            <div className='flex-1'>
              <h2 className='text-xl font-bold text-gray-900 mb-2'>
                {ticket.title}
              </h2>
              <div className='flex flex-wrap gap-2 items-center'>
                {/* Estado */}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 border ${
                    statusConfig[ticket.status]?.color
                  }`}
                >
                  <StatusIcon className='w-4 h-4' />
                  {statusConfig[ticket.status]?.label}
                </span>
                {/* Prioridad */}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    priorityConfig[ticket.priority]?.color
                  }`}
                >
                  <Flag className='w-3 h-3 inline mr-1' />
                  {priorityConfig[ticket.priority]?.label}
                </span>
                {/* Tipo */}
                <span className='px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600'>
                  {typeConfig[ticket.type]?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Información */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg'>
            <div className='flex items-center gap-3'>
              <User className='w-5 h-5 text-gray-400' />
              <div>
                <p className='text-xs text-gray-500'>Creado por</p>
                <p className='font-medium text-gray-900'>{ticket.user?.name}</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Users className='w-5 h-5 text-gray-400' />
              <div>
                <p className='text-xs text-gray-500'>Equipo asignado</p>
                <p className='font-medium text-gray-900 flex items-center gap-1'>
                  {ticket.team?.name || "Sin equipo"}
                  {ticket.is_team_leader && (
                    <Crown
                      className='w-4 h-4 text-yellow-500'
                      title='Eres líder de este equipo'
                    />
                  )}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <User className='w-5 h-5 text-gray-400' />
              <div>
                <p className='text-xs text-gray-500'>Responsable</p>
                {ticket.assigned_user ? (
                  <p className='font-medium text-indigo-600'>
                    {ticket.assigned_user?.name}
                    {ticket.assigned_user?.id === user?.id && (
                      <span className='ml-1 text-xs text-gray-400'>(Tú)</span>
                    )}
                  </p>
                ) : (
                  <p className='text-purple-600 flex items-center gap-1'>
                    <Inbox className='w-4 h-4' />
                    En buzón del equipo
                  </p>
                )}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Clock className='w-5 h-5 text-gray-400' />
              <div>
                <p className='text-xs text-gray-500'>Fecha de creación</p>
                <p className='font-medium text-gray-900'>
                  {new Date(ticket.created_at).toLocaleString("es-ES")}
                </p>
              </div>
            </div>
            {ticket.project && (
              <div className='flex items-center gap-3'>
                <Ticket className='w-5 h-5 text-gray-400' />
                <div>
                  <p className='text-xs text-gray-500'>Proyecto</p>
                  <span
                    className={`px-2 py-0.5 rounded text-sm font-medium ${ticket.project.color} text-white`}
                  >
                    {ticket.project.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Acciones de Tomar/Asignar/Devolver */}
          {ticket.team && !["closed", "resolved"].includes(ticket.status) && (
            <div className='p-4 bg-purple-50 border border-purple-200 rounded-lg'>
              <h3 className='font-semibold text-purple-900 mb-3 flex items-center gap-2'>
                <Inbox className='w-5 h-5' />
                Gestión del ticket
              </h3>

              {/* Si está en el buzón */}
              {ticket.is_in_inbox ? (
                <div className='space-y-3'>
                  <p className='text-sm text-purple-700'>
                    Este ticket está en el buzón del equipo esperando ser
                    tomado.
                  </p>

                  <div className='flex flex-wrap gap-2'>
                    {/* Botón Tomar (cualquier miembro del equipo) */}
                    {ticket.can_take && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleTakeTicket}
                        disabled={processingAction}
                        className='px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50'
                      >
                        {processingAction ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : (
                          <Hand className='w-4 h-4' />
                        )}
                        Tomar este ticket
                      </motion.button>
                    )}

                    {/* Botón/Selector Asignar (solo líder) */}
                    {ticket.is_team_leader && (
                      <>
                        {!showAssignSelect ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowAssignSelect(true)}
                            className='px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2'
                          >
                            <UserPlus className='w-4 h-4' />
                            Asignar a un miembro
                          </motion.button>
                        ) : (
                          <div className='flex-1 flex items-center gap-2'>
                            <Select
                              options={teamMembers.map((m) => ({
                                value: m.id,
                                label: m.name,
                                email: m.email,
                              }))}
                              value={selectedMember}
                              onChange={setSelectedMember}
                              placeholder='Seleccionar miembro...'
                              className='flex-1 min-w-[200px]'
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  borderColor: "#c4b5fd",
                                  "&:hover": { borderColor: "#a78bfa" },
                                }),
                              }}
                              formatOptionLabel={(option) => (
                                <div className='flex items-center gap-2'>
                                  <div className='w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs'>
                                    {option.label.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{option.label}</span>
                                </div>
                              )}
                            />
                            <button
                              onClick={handleAssignTicket}
                              disabled={!selectedMember || processingAction}
                              className='px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50'
                            >
                              {processingAction ? (
                                <Loader2 className='w-4 h-4 animate-spin' />
                              ) : (
                                <CheckCircle2 className='w-4 h-4' />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setShowAssignSelect(false);
                                setSelectedMember(null);
                              }}
                              className='px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300'
                            >
                              <XCircle className='w-4 h-4' />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Si ya está asignado */
                <div className='space-y-3'>
                  <p className='text-sm text-purple-700'>
                    <strong>{ticket.assigned_user?.name}</strong> está
                    trabajando en este ticket.
                    {ticket.taken_at && (
                      <span className='block text-xs text-purple-600 mt-1'>
                        Tomado el{" "}
                        {new Date(ticket.taken_at).toLocaleString("es-ES")}
                      </span>
                    )}
                  </p>

                  {/* Botón Devolver al buzón */}
                  {(ticket.can_resolve || ticket.is_team_leader) && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReturnToInbox}
                      disabled={processingAction}
                      className='px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition flex items-center gap-2 disabled:opacity-50'
                    >
                      {processingAction ? (
                        <Loader2 className='w-4 h-4 animate-spin' />
                      ) : (
                        <ArrowLeft className='w-4 h-4' />
                      )}
                      Devolver al buzón del equipo
                    </motion.button>
                  )}

                  {/* Reasignar (solo líder) */}
                  {ticket.is_team_leader && (
                    <>
                      {!showAssignSelect ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowAssignSelect(true)}
                          className='px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2'
                        >
                          <UserPlus className='w-4 h-4' />
                          Reasignar a otro miembro
                        </motion.button>
                      ) : (
                        <div className='flex items-center gap-2'>
                          <Select
                            options={teamMembers
                              .filter((m) => m.id !== ticket.assigned_to)
                              .map((m) => ({ value: m.id, label: m.name }))}
                            value={selectedMember}
                            onChange={setSelectedMember}
                            placeholder='Seleccionar miembro...'
                            className='flex-1 min-w-[200px]'
                          />
                          <button
                            onClick={handleAssignTicket}
                            disabled={!selectedMember || processingAction}
                            className='px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50'
                          >
                            {processingAction ? (
                              <Loader2 className='w-4 h-4 animate-spin' />
                            ) : (
                              <CheckCircle2 className='w-4 h-4' />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowAssignSelect(false);
                              setSelectedMember(null);
                            }}
                            className='px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300'
                          >
                            <XCircle className='w-4 h-4' />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          <div>
            <h3 className='font-semibold text-gray-900 mb-2'>Descripción</h3>
            <div className='p-4 bg-white border border-gray-200 rounded-lg'>
              <p className='text-gray-700 whitespace-pre-wrap'>
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Cambiar estado (solo si puede resolver) */}
          {ticket.can_resolve && !["closed"].includes(ticket.status) && (
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>
                Cambiar Estado
              </h3>
              <div className='flex flex-wrap gap-2'>
                {Object.entries(statusConfig).map(([status, config]) => {
                  if (status === ticket.status) return null;
                  const Icon = config.icon;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={updatingStatus}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 border transition-all hover:scale-105 disabled:opacity-50 ${config.color}`}
                    >
                      <Icon className='w-4 h-4' />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comentarios */}
          <div>
            <h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
              <MessageSquare className='w-5 h-5' />
              Comentarios ({comments.length})
            </h3>

            {/* Lista de comentarios */}
            <div className='space-y-3 max-h-64 overflow-y-auto mb-4'>
              {comments.length === 0 ? (
                <p className='text-center text-gray-400 py-4'>
                  No hay comentarios aún
                </p>
              ) : (
                <AnimatePresence>
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${
                        comment.is_internal
                          ? "bg-amber-50 border border-amber-200"
                          : comment.user_id === user?.id
                          ? "bg-indigo-50 border border-indigo-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className='flex items-start justify-between mb-1'>
                        <div className='flex items-center gap-2'>
                          <div className='w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium'>
                            {comment.user?.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <span className='font-medium text-gray-900 text-sm'>
                              {comment.user?.name}
                            </span>
                            {comment.is_internal && (
                              <span className='ml-2 px-2 py-0.5 bg-amber-200 text-amber-700 rounded text-xs inline-flex items-center gap-1'>
                                <Lock className='w-3 h-3' />
                                Interno
                              </span>
                            )}
                          </div>
                        </div>
                        <span className='text-xs text-gray-400'>
                          {new Date(comment.created_at).toLocaleString("es-ES")}
                        </span>
                      </div>
                      <p className='text-gray-700 text-sm ml-10 whitespace-pre-wrap'>
                        {comment.content}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Nuevo comentario */}
            {!["closed"].includes(ticket.status) && (
              <form onSubmit={handleSendComment} className='space-y-2'>
                <div className='relative'>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder='Escribe un comentario...'
                    rows='2'
                    className='w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none'
                  />
                  <button
                    type='submit'
                    disabled={!newComment.trim() || sendingComment}
                    className='absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    {sendingComment ? (
                      <Loader2 className='w-5 h-5 animate-spin' />
                    ) : (
                      <Send className='w-5 h-5' />
                    )}
                  </button>
                </div>

                {/* Opción de comentario interno (solo para asignados) */}
                {ticket.can_resolve && (
                  <label className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className='w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500'
                    />
                    <Lock className='w-4 h-4 text-amber-500' />
                    Comentario interno (solo visible para el equipo)
                  </label>
                )}
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className='text-center py-12 text-gray-500'>
          No se pudo cargar el ticket
        </div>
      )}
    </Modal>
  );
};

export default TicketDetailModal;

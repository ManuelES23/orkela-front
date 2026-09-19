import { useState, useEffect, useCallback, useRef } from "react";
import Modal from "../ui/Modal";
import UserAvatar from "../ui/UserAvatar";
import Select from "react-select";
import { selectStyles } from "../../utils/reactSelectStyles";
import LoadingSwap from "../ui/LoadingSwap";
import DetailPanel from "../ui/DetailPanel";
import { TicketDetailSkeleton } from "./TicketSkeletons";
import { useNotification } from "../../context/NotificationContext";
import { useMailResult } from "../../hooks/useMailResult";
import { useAuth } from "../../context/AuthContext";
import { useRealtime } from "../../context/RealtimeContext";
import useResourceSync from "../../hooks/useResourceSync";
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
  XCircle,
  Lock,
  Hand,
  UserPlus,
  ArrowLeft,
  Inbox,
  Crown,
  Building2,
} from "lucide-react";
import { ticketsAPI, teamsAPI } from "../../utils/api";
import { TICKET_STATUS, TICKET_PRIORITY, TICKET_TYPE } from "../../constants/tickets";

// Select nativo con etiqueta: accesible por teclado y lector de pantalla
const FieldSelect = ({ id, label, value, options, onChange, disabled = false }) => (
  <div className='flex-1 min-w-0'>
    <label htmlFor={id} className='block text-xs text-gray-500 dark:text-night-400 mb-1'>
      {label}
    </label>
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-night-600 bg-white dark:bg-night-900 text-gray-900 dark:text-night-50 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:opacity-50'
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const TicketDetailModal = ({
  isOpen,
  onClose,
  ticket: initialTicket,
  onUpdate,
}) => {
  const { success, error: showError, info } = useNotification();
  const { notifyClientMail } = useMailResult();
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
  const [teams, setTeams] = useState([]);
  const [routing, setRouting] = useState(false);

  // Id de la última carga: al cambiar de ticket se descartan las respuestas
  // de la carga anterior que lleguen tarde.
  const requestIdRef = useRef(0);

  // silent: recarga sin mostrar el skeleton (tras una acción o en tiempo real)
  const loadTicketDetails = useCallback(async ({ silent = false } = {}) => {
    if (!initialTicket?.id) return;

    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    try {
      if (!silent) setInitializing(true);
      const [ticketData, commentsData] = await Promise.all([
        ticketsAPI.getById(initialTicket.id),
        ticketsAPI.getComments(initialTicket.id),
      ]);
      if (isStale()) return;
      setTicket(ticketData);
      setComments(commentsData);

      // Cargar miembros del equipo si es líder
      if (ticketData.is_team_leader && ticketData.team_id) {
        const members = await teamsAPI.getMembers(ticketData.team_id);
        if (isStale()) return;
        setTeamMembers(members);
      }
    } catch (err) {
      if (isStale()) return;
      console.error("Error loading ticket:", err);
      // Se borró o salió del alcance del usuario (en tiempo real o al abrirlo
      // desde una notificación): se cierra con un aviso
      if ([403, 404].includes(err?.status)) {
        closeGoneRef.current?.();
        return;
      }
      showError("No se pudo cargar el ticket");
    } finally {
      if (!isStale()) setInitializing(false);
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
      return registerRefresh(refreshKey, () => loadTicketDetails({ silent: true }));
    }
  }, [
    isOpen,
    initialTicket?.id,
    registerRefresh,
    unregisterRefresh,
    loadTicketDetails,
  ]);

  // Cerrar con un aviso cuando el ticket deja de existir para este usuario
  const closeGoneRef = useRef(null);
  useEffect(() => {
    closeGoneRef.current = () => {
      info("Este ticket ya no existe o no tienes acceso a él");
      onClose?.();
    };
  }, [info, onClose]);

  // team.sync del equipo del ticket: tomar/asignar/estado/comentarios
  // (también internos) de otros usuarios aparecen en vivo. Los tickets de
  // cliente sin equipo llegan por organization.sync (ticketDetail-{id}).
  const openTicketId = initialTicket?.id;
  const ticketTeamId = ticket?.team_id ?? initialTicket?.team_id;
  useResourceSync(isOpen ? "team" : null, isOpen ? [ticketTeamId] : [], (payload) => {
    if (Number(payload.ticket_id) !== Number(openTicketId)) return;
    if (payload.action === "deleted") {
      closeGoneRef.current?.();
      return;
    }
    loadTicketDetails({ silent: true });
  });

  // Todos los equipos activos de la organización (GET client-tickets/teams),
  // solo para quien puede enrutar: teamsAPI.getAll solo trae los del usuario.
  const canRoute = Boolean(ticket?.can_route);
  useEffect(() => {
    if (!isOpen || !canRoute) return undefined;
    let cancelled = false;
    ticketsAPI
      .getClientInboxTeams()
      .then((data) => {
        if (!cancelled) setTeams(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, canRoute]);

  const handleRouteToTeam = async (teamId) => {
    if (!teamId || Number(teamId) === ticket.team_id) return;
    const hadTeam = Boolean(ticket.team_id);
    setRouting(true);
    try {
      await ticketsAPI.assignToTeam(ticket.id, Number(teamId));
      await loadTicketDetails({ silent: true });
      success(hadTeam ? "Ticket movido de equipo" : "Ticket asignado al equipo");
      onUpdate?.();
    } catch (err) {
      console.error("Error routing ticket:", err);
      showError(err.message || "No se pudo asignar el equipo");
    } finally {
      setRouting(false);
    }
  };

  // Handlers para tomar/asignar/devolver ticket
  const handleTakeTicket = async () => {
    setProcessingAction(true);
    try {
      await ticketsAPI.takeTicket(ticket.id);
      // take/assign/return/update devuelven el modelo sin los permisos
      // calculados (can_resolve, is_in_inbox...): recargar el detalle.
      await loadTicketDetails({ silent: true });
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
      await ticketsAPI.assignTicket(ticket.id, selectedMember.value);
      await loadTicketDetails({ silent: true });
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
      await ticketsAPI.returnToInbox(ticket.id);
      await loadTicketDetails({ silent: true });
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
      // Comentario público en ticket del portal: avisar si el correo al cliente no salió
      notifyClientMail(comment);
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
      const result = await ticketsAPI.update(ticket.id, {
        status: newStatus,
      });
      await loadTicketDetails({ silent: true });
      notifyClientMail(result, `Estado actualizado a "${TICKET_STATUS[newStatus]?.label}"`);
      onUpdate?.();
    } catch (err) {
      console.error("Error updating status:", err);
      showError(err.message || "No se pudo actualizar el estado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const StatusIcon = TICKET_STATUS[ticket?.status]?.icon ?? TICKET_STATUS.open.icon;
  const TypeIcon = TICKET_TYPE[ticket?.type]?.icon ?? MessageSquare;
  const isClientTicket = ticket?.source === "client_portal";
  const teamOptions = [
    ...(ticket?.team_id ? [] : [{ value: "", label: "Selecciona un equipo…" }]),
    ...(ticket?.team && !teams.some((t) => t.id === ticket.team.id)
      ? [{ value: ticket.team.id, label: ticket.team.name }]
      : []),
    ...teams.map((t) => ({ value: t.id, label: t.name })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ticket #${initialTicket?.id || ""}`}
      size='lg'
    >
      <LoadingSwap loading={initializing} skeleton={<TicketDetailSkeleton />}>
      {ticket ? (
        <DetailPanel panelKey={ticket.id}>
        <div className='space-y-6'>
          {/* Header del ticket */}
          <div className='flex flex-col md:flex-row md:items-start gap-4'>
            <div
              className={`p-3 rounded-lg bg-gray-50 dark:bg-night-800 ${
                TICKET_TYPE[ticket.type]?.iconClass
              }`}
            >
              <TypeIcon className='w-6 h-6' />
            </div>
            <div className='flex-1'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-night-50 mb-2'>
                {ticket.title}
              </h2>
              <div className='flex flex-wrap gap-2 items-center'>
                {/* Estado */}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 border ${
                    TICKET_STATUS[ticket.status]?.badgeClass
                  }`}
                >
                  <StatusIcon className='w-4 h-4' />
                  {TICKET_STATUS[ticket.status]?.label}
                </span>
                {/* Prioridad */}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    TICKET_PRIORITY[ticket.priority]?.badgeClass
                  }`}
                >
                  <Flag className='w-3 h-3 inline mr-1' />
                  {TICKET_PRIORITY[ticket.priority]?.label}
                </span>
                {/* Tipo */}
                <span className='px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-night-800 text-gray-600 dark:text-night-300'>
                  {TICKET_TYPE[ticket.type]?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Información */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-night-800 rounded-lg'>
            {isClientTicket ? (
              <div className='flex items-center gap-3'>
                <Building2 className='w-5 h-5 text-gray-400 dark:text-night-500' aria-hidden='true' />
                <div className='min-w-0'>
                  <p className='text-xs text-gray-500 dark:text-night-400'>Cliente / Contacto</p>
                  <p className='font-medium text-gray-900 dark:text-night-50 truncate'>{ticket.client?.name || "Cliente"}</p>
                  {ticket.contact && (
                    <p className='text-sm text-gray-600 dark:text-night-300 truncate'>
                      {ticket.contact.name}
                      {ticket.contact.email && (
                        <span className='text-gray-400 dark:text-night-500'> · {ticket.contact.email}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className='flex items-center gap-3'>
                <User className='w-5 h-5 text-gray-400 dark:text-night-500' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-night-400'>Creado por</p>
                  <p className='font-medium text-gray-900 dark:text-night-50'>{ticket.user?.name}</p>
                </div>
              </div>
            )}
            <div className='flex items-center gap-3'>
              <Users className='w-5 h-5 text-gray-400 dark:text-night-500' aria-hidden='true' />
              {ticket.can_route ? (
                <FieldSelect
                  id={`ticket-${ticket.id}-team`}
                  label={ticket.team_id ? "Cambiar equipo" : "Asignar a equipo"}
                  value={ticket.team_id ?? ""}
                  options={teamOptions}
                  onChange={handleRouteToTeam}
                  disabled={routing}
                />
              ) : (
                <div>
                  <p className='text-xs text-gray-500 dark:text-night-400'>Equipo asignado</p>
                  <p className='font-medium text-gray-900 dark:text-night-50 flex items-center gap-1'>
                    {ticket.team?.name || "Sin equipo"}
                    {ticket.is_team_leader && (
                      <Crown
                        className='w-4 h-4 text-yellow-500 dark:text-yellow-400'
                        title='Eres líder de este equipo'
                      />
                    )}
                  </p>
                </div>
              )}
            </div>
            <div className='flex items-center gap-3'>
              <User className='w-5 h-5 text-gray-400 dark:text-night-500' />
              <div>
                <p className='text-xs text-gray-500 dark:text-night-400'>Responsable</p>
                {ticket.assigned_user ? (
                  <p className='font-medium text-brand-600 dark:text-brand-400'>
                    {ticket.assigned_user?.name}
                    {ticket.assigned_user?.id === user?.id && (
                      <span className='ml-1 text-xs text-gray-400 dark:text-night-500'>(Tú)</span>
                    )}
                  </p>
                ) : !ticket.team_id ? (
                  <p className='text-amber-600 dark:text-amber-400 flex items-center gap-1'>
                    <Inbox className='w-4 h-4' aria-hidden='true' />
                    Sin equipo — pendiente de enrutar
                  </p>
                ) : (
                  <p className='text-accent-600 dark:text-accent-400 flex items-center gap-1'>
                    <Inbox className='w-4 h-4' />
                    En buzón del equipo
                  </p>
                )}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Clock className='w-5 h-5 text-gray-400 dark:text-night-500' />
              <div>
                <p className='text-xs text-gray-500 dark:text-night-400'>Fecha de creación</p>
                <p className='font-medium text-gray-900 dark:text-night-50'>
                  {new Date(ticket.created_at).toLocaleString("es-ES")}
                </p>
              </div>
            </div>
            {ticket.project && (
              <div className='flex items-center gap-3'>
                <Ticket className='w-5 h-5 text-gray-400 dark:text-night-500' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-night-400'>Proyecto</p>
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
            <div className='p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg'>
              <h3 className='font-semibold text-accent-900 dark:text-accent-100 mb-3 flex items-center gap-2'>
                <Inbox className='w-5 h-5' />
                Gestión del ticket
              </h3>

              {/* Si está en el buzón */}
              {ticket.is_in_inbox ? (
                <div className='space-y-3'>
                  <p className='text-sm text-accent-700 dark:text-accent-300'>
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
                        className='px-4 py-2 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 transition flex items-center gap-2 disabled:opacity-50'
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
                            className='px-4 py-2 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 transition flex items-center gap-2'
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
                                avatar: m.avatar,
                              }))}
                              value={selectedMember}
                              onChange={setSelectedMember}
                              placeholder='Seleccionar miembro...'
                              className='flex-1 min-w-[200px]'
                              styles={selectStyles}
                              formatOptionLabel={(option) => (
                                <div className='flex items-center gap-2'>
                                  <UserAvatar
                                    user={{
                                      name: option.label,
                                      avatar: option.avatar,
                                    }}
                                    size='xs'
                                  />
                                  <span>{option.label}</span>
                                </div>
                              )}
                            />
                            <button
                              onClick={handleAssignTicket}
                              disabled={!selectedMember || processingAction}
                              className='px-3 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50'
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
                              className='px-3 py-2 bg-gray-200 dark:bg-night-700 text-gray-700 dark:text-night-300 rounded-lg hover:bg-gray-300 dark:hover:bg-night-600'
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
                  <p className='text-sm text-accent-700 dark:text-accent-300'>
                    <strong>{ticket.assigned_user?.name}</strong> está
                    trabajando en este ticket.
                    {ticket.taken_at && (
                      <span className='block text-xs text-accent-600 dark:text-accent-400 mt-1'>
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
                      className='px-4 py-2 bg-gray-600 dark:bg-night-700 text-white rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-night-600 transition flex items-center gap-2 disabled:opacity-50'
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
                          className='px-4 py-2 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 transition flex items-center gap-2'
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
                            styles={selectStyles}
                          />
                          <button
                            onClick={handleAssignTicket}
                            disabled={!selectedMember || processingAction}
                            className='px-3 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50'
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
                            className='px-3 py-2 bg-gray-200 dark:bg-night-700 text-gray-700 dark:text-night-300 rounded-lg hover:bg-gray-300 dark:hover:bg-night-600'
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
            <h3 className='font-semibold text-gray-900 dark:text-night-50 mb-2'>Descripción</h3>
            <div className='p-4 bg-white dark:bg-night-900 border border-gray-200 dark:border-night-700 rounded-lg'>
              <p className='text-gray-700 dark:text-night-300 whitespace-pre-wrap'>
                {ticket.description || "Sin descripción"}
              </p>
            </div>
          </div>

          {/* Cambiar estado (solo si puede resolver) */}
          {ticket.can_resolve && !["closed"].includes(ticket.status) && (
            <div>
              <h3 className='font-semibold text-gray-900 dark:text-night-50 mb-2'>
                Cambiar Estado
              </h3>
              <div className='flex flex-wrap gap-2'>
                {Object.entries(TICKET_STATUS).map(([status, config]) => {
                  if (status === ticket.status) return null;
                  const Icon = config.icon;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={updatingStatus}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 border transition-all hover:scale-105 disabled:opacity-50 ${config.badgeClass}`}
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
            <h3 className='font-semibold text-gray-900 dark:text-night-50 mb-3 flex items-center gap-2'>
              <MessageSquare className='w-5 h-5' />
              Comentarios ({comments.length})
            </h3>

            {/* Lista de comentarios */}
            <div className='space-y-3 max-h-64 overflow-y-auto mb-4'>
              {comments.length === 0 ? (
                <p className='text-center text-gray-400 dark:text-night-500 py-4'>
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
                          ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800"
                          : comment.user_id === user?.id
                          ? "bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800"
                          : "bg-gray-50 dark:bg-night-800 border border-gray-200 dark:border-night-700"
                      }`}
                    >
                      <div className='flex items-start justify-between mb-1'>
                        <div className='flex items-center gap-2'>
                          <UserAvatar
                            user={comment.user}
                            name={!comment.user ? comment.contact?.name : undefined}
                            size='sm'
                          />
                          <div>
                            <span className='font-medium text-gray-900 dark:text-night-50 text-sm'>
                              {comment.user?.name || comment.contact?.name}
                            </span>
                            {comment.is_internal && (
                              <span className='ml-2 px-2 py-0.5 bg-amber-200 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded text-xs inline-flex items-center gap-1'>
                                <Lock className='w-3 h-3' />
                                Interno
                              </span>
                            )}
                          </div>
                        </div>
                        <span className='text-xs text-gray-400 dark:text-night-500'>
                          {new Date(comment.created_at).toLocaleString("es-ES")}
                        </span>
                      </div>
                      <p className='text-gray-700 dark:text-night-300 text-sm ml-10 whitespace-pre-wrap'>
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
                    className='w-full px-4 py-3 pr-12 border border-gray-300 dark:border-night-600 bg-white dark:bg-night-900 text-gray-900 dark:text-night-50 placeholder:text-gray-400 dark:placeholder:text-night-500 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none'
                  />
                  <button
                    type='submit'
                    disabled={!newComment.trim() || sendingComment}
                    className='absolute right-2 bottom-2 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
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
                  <label className='flex items-center gap-2 text-sm text-gray-600 dark:text-night-300 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className='w-4 h-4 text-amber-600 dark:text-amber-400 border-gray-300 dark:border-night-600 rounded focus:ring-amber-500'
                    />
                    <Lock className='w-4 h-4 text-amber-500 dark:text-amber-400' />
                    Comentario interno (solo visible para el equipo)
                  </label>
                )}
              </form>
            )}
          </div>
        </div>
        </DetailPanel>
      ) : (
        <div className='text-center py-12 text-gray-500 dark:text-night-400'>
          No se pudo cargar el ticket
        </div>
      )}
      </LoadingSwap>
    </Modal>
  );
};

export default TicketDetailModal;

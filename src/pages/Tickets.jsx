import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/layout/Layout";
import TicketModal from "../components/modals/TicketModal";
import TicketDetailModal from "../components/modals/TicketDetailModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import { motionTokens } from "../components/animations/variants";
import {
  Plus,
  Search,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Edit,
  Trash2,
  Loader2,
  User,
  Users,
  Flag,
  Eye,
  XCircle,
  PauseCircle,
  PlayCircle,
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MoreHorizontal,
  Inbox,
  Hand,
  ArrowLeft,
  Crown,
  PenLine,
  ListFilter,
} from "lucide-react";
import { ticketsAPI, teamsAPI } from "../utils/api";

const Tickets = () => {
  const { success, error: showError, info } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();
  const [activeTab, setActiveTab] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all"); // all, created, assigned, inbox, team
  const [selectedTeamId, setSelectedTeamId] = useState(""); // Filtro por equipo específico
  const [userTeams, setUserTeams] = useState([]); // Equipos del usuario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    ticketId: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [processingTicketId, setProcessingTicketId] = useState(null);

  // Cargar equipos del usuario al montar
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await teamsAPI.getAll();
        console.log("Equipos cargados:", teamsData);
        setUserTeams(teamsData);
      } catch (err) {
        console.error("Error al cargar equipos:", err);
      }
    };
    fetchTeams();
  }, []);

  // Función para cargar tickets con indicador de carga (carga inicial)
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {};
      if (activeTab !== "all") {
        filters.status = activeTab;
      }
      if (activeFilter !== "all") {
        filters.filter = activeFilter;
      }
      // Filtro por equipo específico
      if (selectedTeamId) {
        filters.team_id = selectedTeamId;
      }

      const [ticketsData, statsData] = await Promise.all([
        ticketsAPI.getAll(filters),
        ticketsAPI.getStats(),
      ]);

      setTickets(ticketsData);
      setStats(statsData);
    } catch (err) {
      console.error("Error al cargar tickets:", err);
      setError("No se pudieron cargar los tickets");
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeFilter, selectedTeamId]);

  // Función para refrescar tickets silenciosamente (sin spinner, para tiempo real)
  const refreshTicketsSilently = useCallback(async () => {
    try {
      const filters = {};
      if (activeTab !== "all") {
        filters.status = activeTab;
      }
      if (activeFilter !== "all") {
        filters.filter = activeFilter;
      }
      if (selectedTeamId) {
        filters.team_id = selectedTeamId;
      }

      const [ticketsData, statsData] = await Promise.all([
        ticketsAPI.getAll(filters),
        ticketsAPI.getStats(),
      ]);

      setTickets(ticketsData);
      setStats(statsData);
    } catch (err) {
      console.error("Error refreshing tickets:", err);
      // No mostrar error en actualización silenciosa
    }
  }, [activeTab, activeFilter, selectedTeamId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Registrar callback para tiempo real (silencioso)
  useEffect(() => {
    registerRefresh("tickets", refreshTicketsSilently);
    return () => unregisterRefresh("tickets");
  }, [registerRefresh, unregisterRefresh, refreshTicketsSilently]);

  // Tomar un ticket del buzón
  const handleTakeTicket = async (e, ticketId) => {
    e.stopPropagation();
    setProcessingTicketId(ticketId);
    try {
      await ticketsAPI.takeTicket(ticketId);
      success("Ticket asignado a ti correctamente");
      loadTickets();
    } catch (err) {
      console.error("Error al tomar ticket:", err);
      showError(err.message || "No se pudo tomar el ticket");
    } finally {
      setProcessingTicketId(null);
    }
  };

  // Devolver ticket al buzón
  const handleReturnToInbox = async (e, ticketId) => {
    e.stopPropagation();
    setProcessingTicketId(ticketId);
    try {
      await ticketsAPI.returnToInbox(ticketId);
      info("Ticket devuelto al buzón del equipo");
      loadTickets();
    } catch (err) {
      console.error("Error al devolver ticket:", err);
      showError(err.message || "No se pudo devolver el ticket");
    } finally {
      setProcessingTicketId(null);
    }
  };

  const handleDelete = async () => {
    const ticketId = confirmModal.ticketId;
    const originalTickets = [...tickets];

    setTickets((prev) => prev.filter((t) => t.id !== ticketId));

    setDeleting(true);
    try {
      await ticketsAPI.delete(ticketId);
      success("Ticket eliminado exitosamente");
      loadTickets(); // Recargar stats
    } catch (err) {
      setTickets(originalTickets);
      console.error("Error al eliminar ticket:", err);
      showError(err.message || "No se pudo eliminar el ticket");
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, ticketId: null });
    }
  };

  const handleEdit = (ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleView = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const handleNewTicket = () => {
    setSelectedTicket(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTicket(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    loadTickets();
  };

  const handleTicketUpdated = () => {
    loadTickets();
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        searchTerm === "" ||
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [tickets, searchTerm]);

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

  const statusConfig = {
    open: {
      color: "text-blue-600 bg-blue-50",
      icon: AlertCircle,
      label: "Abierto",
    },
    in_progress: {
      color: "text-brand-600 bg-brand-50",
      icon: PlayCircle,
      label: "En progreso",
    },
    pending: {
      color: "text-yellow-600 bg-yellow-50",
      icon: PauseCircle,
      label: "Pendiente",
    },
    resolved: {
      color: "text-green-600 bg-green-50",
      icon: CheckCircle2,
      label: "Resuelto",
    },
    closed: {
      color: "text-gray-600 bg-gray-50",
      icon: XCircle,
      label: "Cerrado",
    },
  };

  const typeConfig = {
    request: {
      icon: MessageSquare,
      label: "Solicitud",
      color: "text-blue-500",
    },
    bug: { icon: Bug, label: "Bug", color: "text-red-500" },
    question: { icon: HelpCircle, label: "Pregunta", color: "text-accent-500" },
    feature: {
      icon: Lightbulb,
      label: "Funcionalidad",
      color: "text-yellow-500",
    },
    support: { icon: Headphones, label: "Soporte", color: "text-green-500" },
    other: { icon: MoreHorizontal, label: "Otro", color: "text-gray-500" },
  };

  const statusDotColor = {
    open: "bg-blue-500",
    in_progress: "bg-brand-600",
    pending: "bg-yellow-500",
    resolved: "bg-green-500",
    closed: "bg-gray-400",
  };

  const priorityFlagColor = {
    urgent: "text-red-500",
    high: "text-orange-500",
    medium: "text-yellow-500",
    low: "text-gray-300",
  };

  const viewFilters = [
    { key: "all", label: "Todos mis tickets", icon: ListFilter, count: stats?.total },
    { key: "inbox", label: "Buzón de equipo", icon: Inbox, count: stats?.inbox },
    { key: "assigned", label: "Asignados a mí", icon: User, count: stats?.assigned_to_me },
    { key: "created", label: "Creados por mí", icon: PenLine, count: stats?.created_by_me },
  ];

  const statusTabsCfg = [
    { key: "all", label: "Todos", count: stats?.total },
    { key: "open", label: "Abiertos", count: stats?.open },
    { key: "in_progress", label: "En progreso", count: stats?.in_progress },
    { key: "pending", label: "Pendientes", count: stats?.pending },
    { key: "resolved", label: "Resueltos", count: stats?.resolved },
    { key: "closed", label: "Cerrados", count: stats?.closed },
  ];

  return (
    <Layout
      title='Tickets'
      subtitle='Gestiona solicitudes y peticiones de equipos'
    >
      {/* Encabezado: métricas editoriales + acción principal */}
      <FadeIn delay={0.1}>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
          {stats && (
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm'>
              <span className='text-gray-500'>
                <span className='font-semibold text-gray-900 font-mono'>
                  {stats.total || 0}
                </span>{" "}
                tickets
              </span>
              <span className='text-gray-300'>·</span>
              <span className='text-green-600'>
                <span className='font-semibold font-mono'>
                  {stats.resolved || 0}
                </span>{" "}
                resueltos
              </span>
              {stats.high_priority > 0 && (
                <>
                  <span className='text-gray-300'>·</span>
                  <span className='flex items-center gap-1 text-red-600'>
                    <Flag className='w-3.5 h-3.5' />
                    <span className='font-semibold font-mono'>
                      {stats.high_priority}
                    </span>{" "}
                    alta prioridad
                  </span>
                </>
              )}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewTicket}
            className='flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition w-full sm:w-auto justify-center'
          >
            <Plus className='w-5 h-5' />
            Nuevo Ticket
          </motion.button>
        </div>
      </FadeIn>

      {/* Bandeja: rail de vistas/equipos + lista */}
      <FadeIn delay={0.15}>
        <div className='flex flex-col md:flex-row gap-6'>
          {/* Rail */}
          <div className='md:w-56 shrink-0'>
            <div className='relative mb-3'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar tickets...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-9 pr-3 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
              />
            </div>

            <div className='flex flex-row flex-wrap md:flex-col gap-1'>
              {viewFilters.map((f) => {
                const active = activeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type='button'
                    onClick={() => setActiveFilter(f.key)}
                    className={`relative flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      active
                        ? "text-brand-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId='tickets-rail-active'
                        transition={motionTokens.springSnappy}
                        className='absolute inset-0 rounded-lg bg-brand-50'
                      />
                    )}
                    <span className='relative flex items-center gap-2 font-medium'>
                      <f.icon className='w-4 h-4' />
                      {f.label}
                    </span>
                    <span className='relative font-mono text-xs text-gray-400'>
                      {f.count ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {userTeams.length > 0 && (
              <>
                <div className='h-px bg-gray-200 my-3' />
                <p className='px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1'>
                  Equipos
                </p>
                <div className='flex flex-row flex-wrap md:flex-col gap-1'>
                  <button
                    type='button'
                    onClick={() => setSelectedTeamId("")}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      !selectedTeamId
                        ? "text-brand-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {!selectedTeamId && (
                      <motion.span
                        layoutId='tickets-team-active'
                        transition={motionTokens.springSnappy}
                        className='absolute inset-0 rounded-lg bg-brand-50'
                      />
                    )}
                    <span className='relative flex items-center gap-2 font-medium'>
                      <Users className='w-4 h-4' />
                      Todos los equipos
                    </span>
                  </button>
                  {userTeams.map((team) => {
                    const active = selectedTeamId === team.id.toString();
                    return (
                      <button
                        key={team.id}
                        type='button'
                        onClick={() => setSelectedTeamId(team.id.toString())}
                        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                          active
                            ? "text-brand-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId='tickets-team-active'
                            transition={motionTokens.springSnappy}
                            className='absolute inset-0 rounded-lg bg-brand-50'
                          />
                        )}
                        <span className='relative flex items-center gap-2 font-medium truncate'>
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              team.color || "bg-indigo-500"
                            }`}
                          />
                          <span className='truncate'>{team.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Contenido principal */}
          <div className='flex-1 min-w-0'>
            {/* Tabs de estado - subrayado deslizante */}
            <div className='relative flex flex-wrap gap-x-5 gap-y-1 mb-4 border-b border-gray-200 text-sm'>
              {statusTabsCfg.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative pb-3 font-medium transition-colors ${
                      active
                        ? "text-gray-900"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {tab.label} ({tab.count ?? 0})
                    {active && (
                      <motion.span
                        layoutId='tickets-status-underline'
                        transition={motionTokens.springSnappy}
                        className='absolute left-0 right-0 -bottom-px h-0.5 bg-brand-600'
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading y Error States */}
            {loading && <SkeletonRows count={6} />}

            {error && (
              <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg'>
                {error}
              </div>
            )}

            {/* Lista de tickets */}
            {!loading && !error && (
              <>
                {filteredTickets.length === 0 ? (
                  <div className='text-center py-12'>
                    <Ticket className='w-16 h-16 text-gray-300 mx-auto mb-4' />
                    <p className='text-gray-500 text-lg'>
                      {searchTerm
                        ? "No se encontraron tickets con ese criterio"
                        : "No hay tickets en esta categoría"}
                    </p>
                    <p className='text-gray-400 text-sm mt-2'>
                      Crea un ticket para hacer una solicitud a un equipo o
                      usuario
                    </p>
                  </div>
                ) : (
                  <div>
                    <AnimatePresence mode='popLayout'>
                      {filteredTickets.map((ticket) => {
                        const TypeIcon =
                          typeConfig[ticket.type]?.icon || MessageSquare;
                        const isProcessing =
                          processingTicketId === ticket.id;

                        return (
                          <motion.div
                            key={ticket.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => handleView(ticket)}
                            className='group flex items-start gap-3 py-4 px-2 -mx-2 border-b border-gray-100 last:border-b-0 rounded-lg cursor-pointer hover:bg-gray-50/70 transition-colors'
                          >
                            {/* Punto de estado */}
                            <span
                              title={statusConfig[ticket.status]?.label}
                              className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                statusDotColor[ticket.status] ||
                                "bg-gray-400"
                              }`}
                            />

                            <div className='flex-1 min-w-0'>
                              <div className='flex items-start justify-between gap-3'>
                                <div className='min-w-0 flex-1'>
                                  <p className='flex items-center flex-wrap gap-1.5'>
                                    <span className='font-mono text-xs text-gray-400'>
                                      #{ticket.id}
                                    </span>
                                    <span className='font-semibold text-gray-900 text-sm'>
                                      {ticket.title}
                                    </span>
                                    <Flag
                                      className={`w-3.5 h-3.5 ${
                                        priorityFlagColor[ticket.priority]
                                      }`}
                                      title={
                                        priorityConfig[ticket.priority]
                                          ?.label
                                      }
                                    />
                                    {ticket.is_in_inbox && (
                                      <span className='px-1.5 py-0.5 bg-accent-50 text-accent-700 rounded text-[10px] font-semibold'>
                                        Buzón
                                      </span>
                                    )}
                                  </p>
                                  <p className='text-sm text-gray-500 line-clamp-1 mt-0.5'>
                                    {ticket.description}
                                  </p>

                                  {/* Metadatos */}
                                  <div className='flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1.5'>
                                    <span className='flex items-center gap-1'>
                                      <TypeIcon
                                        className={`w-3 h-3 ${
                                          typeConfig[ticket.type]?.color
                                        }`}
                                      />
                                      {typeConfig[ticket.type]?.label}
                                    </span>

                                    {ticket.assigned_user && (
                                      <span className='flex items-center gap-1 text-brand-700 font-medium'>
                                        <User className='w-3.5 h-3.5' />
                                        {ticket.assigned_user.name}
                                        {ticket.can_resolve &&
                                          !ticket.is_in_inbox && (
                                            <button
                                              onClick={(e) =>
                                                handleReturnToInbox(
                                                  e,
                                                  ticket.id,
                                                )
                                              }
                                              disabled={isProcessing}
                                              className='ml-0.5 p-0.5 hover:bg-gray-200 rounded'
                                              title='Devolver al buzón'
                                            >
                                              <ArrowLeft className='w-3 h-3 text-gray-500' />
                                            </button>
                                          )}
                                      </span>
                                    )}

                                    {ticket.team && (
                                      <span className='flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg font-medium'>
                                        <Users className='w-3.5 h-3.5' />
                                        {ticket.team.name}
                                        {ticket.is_team_leader && (
                                          <Crown
                                            className='w-3 h-3 text-yellow-500'
                                            title='Eres líder de este equipo'
                                          />
                                        )}
                                      </span>
                                    )}

                                    {ticket.project && (
                                      <span
                                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${ticket.project.color} text-white`}
                                      >
                                        {ticket.project.name}
                                      </span>
                                    )}

                                    {ticket.comments_count > 0 && (
                                      <span className='flex items-center gap-1'>
                                        <MessageSquare className='w-3.5 h-3.5' />
                                        {ticket.comments_count}
                                      </span>
                                    )}

                                    <span className='flex items-center gap-1'>
                                      <Clock className='w-3.5 h-3.5' />
                                      {new Date(
                                        ticket.created_at,
                                      ).toLocaleDateString("es-ES")}
                                    </span>

                                    {ticket.is_creator && (
                                      <span className='px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-[11px] font-medium'>
                                        Creado por mí
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Acciones */}
                                <div className='flex items-center gap-1 shrink-0'>
                                  {ticket.can_take && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) =>
                                        handleTakeTicket(e, ticket.id)
                                      }
                                      disabled={isProcessing}
                                      className='px-3 py-1 bg-accent-600 text-white rounded-lg text-xs font-medium hover:bg-accent-700 transition flex items-center gap-1 disabled:opacity-50'
                                    >
                                      {isProcessing ? (
                                        <Loader2 className='w-3 h-3 animate-spin' />
                                      ) : (
                                        <Hand className='w-3 h-3' />
                                      )}
                                      Tomar
                                    </motion.button>
                                  )}

                                  <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleView(ticket);
                                      }}
                                      className='p-1 hover:bg-gray-100 rounded transition-all duration-200'
                                      title='Ver detalles'
                                    >
                                      <Eye className='w-4 h-4 text-gray-600' />
                                    </button>
                                    {ticket.can_edit && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(ticket);
                                        }}
                                        className='p-1 hover:bg-blue-50 rounded transition-all duration-200'
                                        title='Editar'
                                      >
                                        <Edit className='w-4 h-4 text-blue-600' />
                                      </button>
                                    )}
                                    {ticket.can_edit && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmModal({
                                            isOpen: true,
                                            ticketId: ticket.id,
                                          });
                                        }}
                                        className='p-1 hover:bg-red-50 rounded transition-all duration-200'
                                        title='Eliminar'
                                      >
                                        <Trash2 className='w-4 h-4 text-red-600' />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Modal de Ticket */}
      <TicketModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        ticket={selectedTicket}
        onSuccess={handleSuccess}
      />

      {/* Modal de Detalle */}
      <TicketDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        ticket={selectedTicket}
        onUpdate={handleTicketUpdated}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, ticketId: null })}
        onConfirm={handleDelete}
        title='Eliminar ticket'
        message='¿Estás seguro de que deseas eliminar este ticket? Esta acción no se puede deshacer.'
        confirmText='Eliminar'
        type='danger'
        loading={deleting}
      />
    </Layout>
  );
};

export default Tickets;

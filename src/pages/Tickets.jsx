import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/layout/Layout";
import TicketModal from "../components/modals/TicketModal";
import TicketDetailModal from "../components/modals/TicketDetailModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
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
  UserPlus,
  ArrowLeft,
  Crown,
} from "lucide-react";
import { ticketsAPI } from "../utils/api";

const Tickets = () => {
  const { success, error: showError, info } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();
  const [activeTab, setActiveTab] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all"); // all, created, assigned, inbox, team
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
  }, [activeTab, activeFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Registrar callback para tiempo real
  useEffect(() => {
    registerRefresh("tickets", loadTickets);
    return () => unregisterRefresh("tickets");
  }, [registerRefresh, unregisterRefresh, loadTickets]);

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
      color: "text-indigo-600 bg-indigo-50",
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
    question: { icon: HelpCircle, label: "Pregunta", color: "text-purple-500" },
    feature: {
      icon: Lightbulb,
      label: "Funcionalidad",
      color: "text-yellow-500",
    },
    support: { icon: Headphones, label: "Soporte", color: "text-green-500" },
    other: { icon: MoreHorizontal, label: "Otro", color: "text-gray-500" },
  };

  return (
    <Layout
      title='Tickets'
      subtitle='Gestiona solicitudes y peticiones de equipos'
    >
      {/* Stats Cards */}
      {stats && (
        <FadeIn delay={0.1}>
          <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-6'>
            {/* Buzón del equipo - destacado */}
            <div
              className={`bg-white rounded-xl p-4 shadow-sm border-2 cursor-pointer transition-all ${
                activeFilter === "inbox"
                  ? "border-purple-500 ring-2 ring-purple-200"
                  : "border-purple-200 hover:border-purple-400"
              }`}
              onClick={() => setActiveFilter("inbox")}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500'>Buzón Equipo</p>
                  <p className='text-2xl font-bold text-purple-600'>
                    {stats.inbox || 0}
                  </p>
                </div>
                <div className='p-3 bg-purple-50 rounded-lg'>
                  <Inbox className='w-6 h-6 text-purple-600' />
                </div>
              </div>
            </div>
            <div className='bg-white rounded-xl p-4 shadow-sm border border-gray-100'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500'>Mis Asignados</p>
                  <p className='text-2xl font-bold text-indigo-600'>
                    {stats.assigned_to_me || 0}
                  </p>
                </div>
                <div className='p-3 bg-indigo-50 rounded-lg'>
                  <User className='w-6 h-6 text-indigo-600' />
                </div>
              </div>
            </div>
            <div className='bg-white rounded-xl p-4 shadow-sm border border-gray-100'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500'>Creados por mí</p>
                  <p className='text-2xl font-bold text-blue-600'>
                    {stats.created_by_me || 0}
                  </p>
                </div>
                <div className='p-3 bg-blue-50 rounded-lg'>
                  <Ticket className='w-6 h-6 text-blue-600' />
                </div>
              </div>
            </div>
            <div className='bg-white rounded-xl p-4 shadow-sm border border-gray-100'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500'>Resueltos</p>
                  <p className='text-2xl font-bold text-green-600'>
                    {stats.resolved}
                  </p>
                </div>
                <div className='p-3 bg-green-50 rounded-lg'>
                  <CheckCircle2 className='w-6 h-6 text-green-600' />
                </div>
              </div>
            </div>
            <div className='bg-white rounded-xl p-4 shadow-sm border border-gray-100'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-500'>Alta Prioridad</p>
                  <p className='text-2xl font-bold text-red-600'>
                    {stats.high_priority}
                  </p>
                </div>
                <div className='p-3 bg-red-50 rounded-lg'>
                  <Flag className='w-6 h-6 text-red-600' />
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Barra de acciones */}
      <FadeIn delay={0.2}>
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6'>
          <div className='flex gap-3 flex-1 w-full md:w-auto'>
            <div className='relative flex-1 md:flex-initial'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar tickets...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
              />
            </div>

            {/* Filtro de tickets */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white'
            >
              <option value='all'>Todos mis tickets</option>
              <option value='inbox'>📥 Buzón de equipo</option>
              <option value='assigned'>👤 Asignados a mí</option>
              <option value='created'>✍️ Creados por mí</option>
              <option value='team'>👥 Todos del equipo</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewTicket}
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition w-full md:w-auto justify-center'
          >
            <Plus className='w-5 h-5' />
            Nuevo Ticket
          </motion.button>
        </div>
      </FadeIn>

      {/* Indicador de vista actual */}
      {activeFilter === "inbox" && (
        <FadeIn delay={0.25}>
          <div className='mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2'>
            <Inbox className='w-5 h-5 text-purple-600' />
            <span className='text-purple-700 font-medium'>
              Buzón del equipo
            </span>
            <span className='text-purple-600 text-sm'>
              — Tickets sin asignar que puedes tomar
            </span>
          </div>
        </FadeIn>
      )}

      {/* Tabs de estado */}
      <FadeIn delay={0.3}>
        <div className='flex flex-wrap gap-2 mb-6 border-b border-gray-200'>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "all"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Todos ({stats?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab("open")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "open"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Abiertos ({stats?.open || 0})
          </button>
          <button
            onClick={() => setActiveTab("in_progress")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "in_progress"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            En Progreso ({stats?.in_progress || 0})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "pending"
                ? "border-yellow-600 text-yellow-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Pendientes ({stats?.pending || 0})
          </button>
          <button
            onClick={() => setActiveTab("resolved")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "resolved"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Resueltos ({stats?.resolved || 0})
          </button>
          <button
            onClick={() => setActiveTab("closed")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "closed"
                ? "border-gray-600 text-gray-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Cerrados ({stats?.closed || 0})
          </button>
        </div>
      </FadeIn>

      {/* Loading y Error States */}
      {loading && (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        </div>
      )}

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
                Crea un ticket para hacer una solicitud a un equipo o usuario
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              <AnimatePresence mode='popLayout'>
                {filteredTickets.map((ticket) => {
                  const StatusIcon =
                    statusConfig[ticket.status]?.icon || AlertCircle;
                  const TypeIcon =
                    typeConfig[ticket.type]?.icon || MessageSquare;
                  const isProcessing = processingTicketId === ticket.id;

                  return (
                    <motion.div
                      key={ticket.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      onClick={() => handleView(ticket)}
                      className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer group hover:shadow-md transition-shadow ${
                        ticket.is_in_inbox
                          ? "border-purple-200 bg-purple-50/30"
                          : "border-gray-200"
                      }`}
                    >
                      <div className='flex items-start gap-4'>
                        {/* Icono de tipo */}
                        <div
                          className={`p-2 rounded-lg ${
                            ticket.is_in_inbox ? "bg-purple-100" : "bg-gray-50"
                          } ${typeConfig[ticket.type]?.color}`}
                        >
                          <TypeIcon className='w-5 h-5' />
                        </div>

                        {/* Contenido */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-start justify-between gap-4 mb-2'>
                            <div className='flex-1'>
                              <div className='flex items-center gap-2 mb-1'>
                                <span className='text-xs text-gray-400'>
                                  #{ticket.id}
                                </span>
                                {ticket.is_in_inbox && (
                                  <span className='px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1'>
                                    <Inbox className='w-3 h-3' />
                                    En buzón
                                  </span>
                                )}
                                <h3 className='font-semibold text-gray-900'>
                                  {ticket.title}
                                </h3>
                              </div>
                              <p className='text-sm text-gray-600 line-clamp-2'>
                                {ticket.description}
                              </p>
                            </div>

                            <div className='flex items-center gap-2'>
                              {/* Estado */}
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                  statusConfig[ticket.status]?.color
                                }`}
                              >
                                <StatusIcon className='w-3 h-3' />
                                {statusConfig[ticket.status]?.label}
                              </span>

                              {/* Prioridad */}
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                  priorityConfig[ticket.priority]?.color
                                }`}
                              >
                                {priorityConfig[ticket.priority]?.label}
                              </span>

                              {/* Botón Tomar Ticket (si está en buzón) */}
                              {ticket.can_take && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) =>
                                    handleTakeTicket(e, ticket.id)
                                  }
                                  disabled={isProcessing}
                                  className='px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition flex items-center gap-1 disabled:opacity-50'
                                >
                                  {isProcessing ? (
                                    <Loader2 className='w-3 h-3 animate-spin' />
                                  ) : (
                                    <Hand className='w-3 h-3' />
                                  )}
                                  Tomar
                                </motion.button>
                              )}

                              {/* Acciones */}
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

                          {/* Metadatos */}
                          <div className='flex flex-wrap items-center gap-4 text-sm'>
                            {/* Tipo */}
                            <span className='text-gray-500 flex items-center gap-1'>
                              <TypeIcon
                                className={`w-3 h-3 ${
                                  typeConfig[ticket.type]?.color
                                }`}
                              />
                              {typeConfig[ticket.type]?.label}
                            </span>

                            {/* Asignado a */}
                            {ticket.assigned_user && (
                              <span className='flex items-center gap-1 text-indigo-600 font-medium'>
                                <User className='w-4 h-4' />
                                {ticket.assigned_user.name}
                                {/* Botón para devolver al buzón */}
                                {ticket.can_resolve && !ticket.is_in_inbox && (
                                  <button
                                    onClick={(e) =>
                                      handleReturnToInbox(e, ticket.id)
                                    }
                                    disabled={isProcessing}
                                    className='ml-1 p-0.5 hover:bg-gray-200 rounded'
                                    title='Devolver al buzón'
                                  >
                                    <ArrowLeft className='w-3 h-3 text-gray-500' />
                                  </button>
                                )}
                              </span>
                            )}

                            {/* Equipo */}
                            {ticket.team && (
                              <span className='flex items-center gap-1 text-gray-600'>
                                <Users className='w-4 h-4' />
                                {ticket.team.name}
                                {ticket.is_team_leader && (
                                  <Crown
                                    className='w-3 h-3 text-yellow-500'
                                    title='Eres líder de este equipo'
                                  />
                                )}
                              </span>
                            )}

                            {/* Proyecto relacionado */}
                            {ticket.project && (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${ticket.project.color} text-white`}
                              >
                                {ticket.project.name}
                              </span>
                            )}

                            {/* Comentarios */}
                            {ticket.comments_count > 0 && (
                              <span className='flex items-center gap-1 text-gray-500'>
                                <MessageSquare className='w-4 h-4' />
                                {ticket.comments_count}
                              </span>
                            )}

                            {/* Fecha */}
                            <span className='flex items-center gap-1 text-gray-400'>
                              <Clock className='w-4 h-4' />
                              {new Date(ticket.created_at).toLocaleDateString(
                                "es-ES"
                              )}
                            </span>

                            {/* Indicador de creador */}
                            {ticket.is_creator && (
                              <span className='px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium'>
                                Creado por mí
                              </span>
                            )}
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

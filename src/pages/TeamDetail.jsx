import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import TicketModal from "../components/modals/TicketModal";
import TicketDetailModal from "../components/modals/TicketDetailModal";
import ProjectModal from "../components/modals/ProjectModal";
import TeamModal from "../components/modals/TeamModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import {
  ArrowLeft,
  Users,
  FolderKanban,
  Ticket,
  Inbox,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Crown,
  Mail,
  Calendar,
  Flag,
  Eye,
  Hand,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings,
  BarChart3,
  MessageSquare,
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  XCircle,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import {
  teamsAPI,
  teamInvitationsAPI,
  ticketsAPI,
  projectsAPI,
} from "../utils/api";

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError, info } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();

  // Estado general
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inbox"); // inbox, projects, members, stats

  // Estado para tickets
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all"); // all, inbox, mine
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [ticketSearchTerm, setTicketSearchTerm] = useState("");
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isTicketDetailModalOpen, setIsTicketDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [processingTicketId, setProcessingTicketId] = useState(null);

  // Estado para proyectos
  const [projects, setProjects] = useState([]);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Estado para miembros
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  // Estado para stats
  const [stats, setStats] = useState(null);

  // Modales de confirmación y edición
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'ticket', 'project'
    itemId: null,
  });
  const [deleting, setDeleting] = useState(false);

  // Cargar datos del equipo (sin cambiar loading, eso lo maneja loadAllData)
  const loadTeam = useCallback(async () => {
    try {
      const teamData = await teamsAPI.getById(id);
      setTeam(teamData);
      return teamData;
    } catch (err) {
      console.error("Error al cargar equipo:", err);
      showError("No se pudo cargar el equipo");
      navigate("/teams");
      return null;
    }
  }, [id, navigate, showError]);

  // Cargar tickets del equipo
  const loadTickets = useCallback(async () => {
    try {
      const data = await teamsAPI.getTickets(id, {
        filter: ticketFilter,
        status: ticketStatusFilter !== "all" ? ticketStatusFilter : undefined,
      });
      setTickets(data);
    } catch (err) {
      console.error("Error al cargar tickets:", err);
    }
  }, [id, ticketFilter, ticketStatusFilter]);

  // Cargar proyectos del equipo
  const loadProjects = useCallback(async () => {
    try {
      const data = await teamsAPI.getProjects(id);
      setProjects(data);
    } catch (err) {
      console.error("Error al cargar proyectos:", err);
    }
  }, [id]);

  // Cargar miembros del equipo
  const loadMembers = useCallback(async () => {
    try {
      const data = await teamsAPI.getMembers(id);
      setMembers(data);
    } catch (err) {
      console.error("Error al cargar miembros:", err);
    }
  }, [id]);

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      const data = await teamsAPI.getStats(id);
      setStats(data);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
    }
  }, [id]);

  // Cargar TODOS los datos de una vez (equipo + tickets + proyectos + miembros + stats)
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Primero cargar el equipo
      const teamData = await teamsAPI.getById(id);
      if (!teamData) {
        showError("No se pudo cargar el equipo");
        navigate("/teams");
        return;
      }

      // Luego cargar todos los datos relacionados en paralelo
      const [ticketsData, projectsData, membersData, statsData] =
        await Promise.all([
          teamsAPI.getTickets(id, {
            filter: ticketFilter,
            status:
              ticketStatusFilter !== "all" ? ticketStatusFilter : undefined,
          }),
          teamsAPI.getProjects(id),
          teamsAPI.getMembers(id),
          teamsAPI.getStats(id),
        ]);

      // Actualizar todo el estado de una vez
      setTeam(teamData);
      setTickets(ticketsData || []);
      setProjects(projectsData || []);
      setMembers(membersData || []);
      setStats(statsData || null);
    } catch (err) {
      console.error("Error al cargar datos del equipo:", err);
      showError("No se pudo cargar el equipo");
      navigate("/teams");
    } finally {
      setLoading(false);
    }
  }, [id, ticketFilter, ticketStatusFilter, navigate, showError]);

  // Carga inicial - cargar TODO antes de mostrar la página
  useEffect(() => {
    loadAllData();
  }, [id]); // Solo recargar cuando cambie el ID del equipo

  // Registrar callbacks para tiempo real - recargar TODOS los datos
  useEffect(() => {
    // Función que refresca todos los datos del equipo (silenciosamente, sin loading)
    const refreshAllDataSilently = async () => {
      if (!team) return;
      try {
        const [ticketsData, projectsData, membersData, statsData] =
          await Promise.all([
            teamsAPI.getTickets(id, {
              filter: ticketFilter,
              status:
                ticketStatusFilter !== "all" ? ticketStatusFilter : undefined,
            }),
            teamsAPI.getProjects(id),
            teamsAPI.getMembers(id),
            teamsAPI.getStats(id),
          ]);

        setTickets(ticketsData || []);
        setProjects(projectsData || []);
        setMembers(membersData || []);
        setStats(statsData || null);
      } catch (err) {
        console.error("Error refreshing team data:", err);
      }
    };

    // Función para recargar solo el equipo (para cuando cambia info del equipo)
    const refreshTeamSilently = async () => {
      try {
        const teamData = await teamsAPI.getById(id);
        if (teamData) {
          setTeam(teamData);
        }
      } catch (err) {
        console.error("Error refreshing team:", err);
      }
    };

    registerRefresh("tickets", refreshAllDataSilently);
    registerRefresh("projects", refreshAllDataSilently);
    registerRefresh("teams", refreshTeamSilently);

    return () => {
      unregisterRefresh("tickets");
      unregisterRefresh("projects");
      unregisterRefresh("teams");
    };
  }, [
    registerRefresh,
    unregisterRefresh,
    team,
    id,
    ticketFilter,
    ticketStatusFilter,
  ]);

  // Recargar tickets cuando cambien los filtros (solo si ya hay equipo cargado)
  useEffect(() => {
    if (!team || loading) return;

    const reloadTicketsWithFilters = async () => {
      try {
        const ticketsData = await teamsAPI.getTickets(id, {
          filter: ticketFilter,
          status: ticketStatusFilter !== "all" ? ticketStatusFilter : undefined,
        });
        setTickets(ticketsData || []);
      } catch (err) {
        console.error("Error al recargar tickets:", err);
      }
    };

    reloadTicketsWithFilters();
  }, [ticketFilter, ticketStatusFilter, team, loading, id]);

  // Tomar ticket del buzón
  const handleTakeTicket = async (e, ticketId) => {
    e.stopPropagation();
    setProcessingTicketId(ticketId);
    try {
      await ticketsAPI.takeTicket(ticketId);
      success("Ticket asignado a ti correctamente");
      loadTickets();
    } catch (err) {
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
      showError(err.message || "No se pudo devolver el ticket");
    } finally {
      setProcessingTicketId(null);
    }
  };

  // Eliminar ticket
  const handleDeleteTicket = async () => {
    const ticketId = confirmModal.itemId;
    setDeleting(true);
    try {
      await ticketsAPI.delete(ticketId);
      success("Ticket eliminado exitosamente");
      loadTickets();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el ticket");
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, type: null, itemId: null });
    }
  };

  // Eliminar proyecto
  const handleDeleteProject = async () => {
    const projectId = confirmModal.itemId;
    setDeleting(true);
    try {
      await projectsAPI.delete(projectId);
      success("Proyecto eliminado exitosamente");
      loadProjects();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el proyecto");
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, type: null, itemId: null });
    }
  };

  // Enviar invitación
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setSendingInvite(true);
    try {
      await teamInvitationsAPI.sendInvitation(id, inviteEmail);
      success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail("");
      loadMembers();
    } catch (err) {
      showError(err.message || "No se pudo enviar la invitación");
    } finally {
      setSendingInvite(false);
    }
  };

  // Helpers para iconos y colores
  const priorityColors = {
    low: "text-gray-600 bg-gray-50 border-gray-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
    high: "text-orange-600 bg-orange-50 border-orange-200",
    urgent: "text-red-600 bg-red-50 border-red-200",
  };

  const statusColors = {
    open: "text-blue-600 bg-blue-50 border-blue-200",
    in_progress: "text-yellow-600 bg-yellow-50 border-yellow-200",
    pending: "text-orange-600 bg-orange-50 border-orange-200",
    resolved: "text-green-600 bg-green-50 border-green-200",
    closed: "text-gray-600 bg-gray-50 border-gray-200",
  };

  const statusLabels = {
    open: "Abierto",
    in_progress: "En progreso",
    pending: "Pendiente",
    resolved: "Resuelto",
    closed: "Cerrado",
  };

  const statusIcons = {
    open: AlertCircle,
    in_progress: PlayCircle,
    pending: PauseCircle,
    resolved: CheckCircle2,
    closed: XCircle,
  };

  const typeIcons = {
    bug: Bug,
    support: Headphones,
    feature: Lightbulb,
    question: HelpCircle,
  };

  // Filtrar tickets por búsqueda
  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.title.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(ticketSearchTerm.toLowerCase())
  );

  // Filtrar proyectos por búsqueda
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
      project.description
        ?.toLowerCase()
        .includes(projectSearchTerm.toLowerCase())
  );

  // Contar tickets en el buzón
  const inboxCount = tickets.filter((t) => !t.assigned_to).length;

  // Mostrar loader de pantalla completa mientras carga
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='w-10 h-10 animate-spin text-indigo-600' />
          <p className='text-gray-600 font-medium'>Cargando equipo...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <p className='text-gray-500 mb-4'>No se pudo cargar el equipo</p>
          <button
            onClick={() => navigate("/teams")}
            className='text-indigo-600 hover:text-indigo-800 font-medium'
          >
            Volver a equipos
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout
      title={team.name}
      subtitle={team.description || "Gestiona tu equipo, tickets y proyectos"}
    >
      {/* Header del equipo */}
      <FadeIn>
        <div className='mb-6'>
          {/* Botón volver y acciones */}
          <div className='flex items-center justify-between mb-4'>
            <button
              onClick={() => navigate("/teams")}
              className='flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'
            >
              <ArrowLeft className='w-5 h-5' />
              Volver a equipos
            </button>

            {team.is_owner && (
              <div className='flex gap-2'>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsTeamModalOpen(true)}
                  className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition'
                >
                  <Settings className='w-4 h-4' />
                  Configurar
                </motion.button>
              </div>
            )}
          </div>

          {/* Info del equipo */}
          <div
            className={`p-6 rounded-xl ${
              team.color || "bg-indigo-500"
            } text-white shadow-lg`}
          >
            <div className='flex items-center gap-4'>
              <div className='w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center'>
                <Users className='w-8 h-8' />
              </div>
              <div className='flex-1'>
                <h1 className='text-2xl font-bold'>{team.name}</h1>
                <p className='text-white/80 mt-1'>
                  {team.description || "Sin descripción"}
                </p>
              </div>
              <div className='flex gap-6 text-center'>
                <div>
                  <p className='text-3xl font-bold'>
                    {team.member_count || members.length}
                  </p>
                  <p className='text-sm text-white/80'>Miembros</p>
                </div>
                <div>
                  <p className='text-3xl font-bold'>{projects.length}</p>
                  <p className='text-sm text-white/80'>Proyectos</p>
                </div>
                <div>
                  <p className='text-3xl font-bold'>{inboxCount}</p>
                  <p className='text-sm text-white/80'>En buzón</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Tabs de navegación */}
      <FadeIn delay={0.1}>
        <div className='flex gap-2 mb-6 border-b border-gray-200'>
          <button
            onClick={() => setActiveTab("inbox")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
              activeTab === "inbox"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Inbox className='w-4 h-4' />
            Buzón de Tickets
            {inboxCount > 0 && (
              <span className='px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full'>
                {inboxCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
              activeTab === "projects"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <FolderKanban className='w-4 h-4' />
            Proyectos ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
              activeTab === "members"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className='w-4 h-4' />
            Miembros ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
              activeTab === "stats"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <BarChart3 className='w-4 h-4' />
            Estadísticas
          </button>
        </div>
      </FadeIn>

      {/* Contenido según pestaña */}
      <AnimatePresence mode='wait'>
        {/* ========== TAB: BUZÓN DE TICKETS ========== */}
        {activeTab === "inbox" && (
          <motion.div
            key='inbox'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Barra de acciones */}
            <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6'>
              <div className='flex gap-3 flex-1 w-full md:w-auto'>
                <div className='relative flex-1 md:flex-initial'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='text'
                    placeholder='Buscar tickets...'
                    value={ticketSearchTerm}
                    onChange={(e) => setTicketSearchTerm(e.target.value)}
                    className='pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
                  />
                </div>
                <select
                  value={ticketFilter}
                  onChange={(e) => setTicketFilter(e.target.value)}
                  className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none'
                >
                  <option value='all'>Todos</option>
                  <option value='inbox'>Sin asignar</option>
                  <option value='mine'>Mis tickets</option>
                </select>
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none'
                >
                  <option value='all'>Todo estado</option>
                  <option value='open'>Abierto</option>
                  <option value='in_progress'>En progreso</option>
                  <option value='pending'>Pendiente</option>
                  <option value='resolved'>Resuelto</option>
                  <option value='closed'>Cerrado</option>
                </select>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedTicket(null);
                  setIsTicketModalOpen(true);
                }}
                className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition'
              >
                <Plus className='w-5 h-5' />
                Nuevo Ticket
              </motion.button>
            </div>

            {/* Lista de tickets */}
            {filteredTickets.length === 0 ? (
              <div className='text-center py-12 bg-white rounded-xl border border-gray-200'>
                <Inbox className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                <p className='text-gray-500'>
                  No hay tickets en esta categoría
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {filteredTickets.map((ticket) => {
                  const TypeIcon = typeIcons[ticket.type] || Ticket;
                  const StatusIcon = statusIcons[ticket.status] || AlertCircle;
                  const isInInbox = !ticket.assigned_to;
                  const isAssignedToMe = ticket.assigned_to === user?.id;

                  return (
                    <motion.div
                      key={ticket.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition group ${
                        isInInbox
                          ? "border-l-4 border-l-yellow-400"
                          : "border-gray-200"
                      }`}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsTicketDetailModalOpen(true);
                      }}
                    >
                      <div className='flex items-start gap-4'>
                        <div
                          className={`p-2 rounded-lg ${
                            statusColors[ticket.status]?.split(" ")[1] ||
                            "bg-gray-50"
                          }`}
                        >
                          <TypeIcon className='w-5 h-5' />
                        </div>

                        <div className='flex-1 min-w-0'>
                          <div className='flex items-start justify-between gap-4 mb-2'>
                            <div>
                              <h3 className='font-semibold text-gray-900'>
                                #{ticket.id} - {ticket.title}
                              </h3>
                              <p className='text-sm text-gray-600 line-clamp-1 mt-1'>
                                {ticket.description || "Sin descripción"}
                              </p>
                            </div>

                            {/* Acciones */}
                            <div className='flex items-center gap-2'>
                              {isInInbox && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) =>
                                    handleTakeTicket(e, ticket.id)
                                  }
                                  disabled={processingTicketId === ticket.id}
                                  className='p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition'
                                  title='Tomar ticket'
                                >
                                  {processingTicketId === ticket.id ? (
                                    <Loader2 className='w-4 h-4 animate-spin' />
                                  ) : (
                                    <Hand className='w-4 h-4' />
                                  )}
                                </motion.button>
                              )}
                              {isAssignedToMe && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) =>
                                    handleReturnToInbox(e, ticket.id)
                                  }
                                  disabled={processingTicketId === ticket.id}
                                  className='p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition'
                                  title='Devolver al buzón'
                                >
                                  {processingTicketId === ticket.id ? (
                                    <Loader2 className='w-4 h-4 animate-spin' />
                                  ) : (
                                    <Inbox className='w-4 h-4' />
                                  )}
                                </motion.button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTicket(ticket);
                                  setIsTicketDetailModalOpen(true);
                                }}
                                className='p-2 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition'
                              >
                                <Eye className='w-4 h-4 text-gray-600' />
                              </button>
                            </div>
                          </div>

                          {/* Metadatos */}
                          <div className='flex flex-wrap items-center gap-3 text-sm'>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                statusColors[ticket.status]
                              }`}
                            >
                              <StatusIcon className='w-3 h-3 inline mr-1' />
                              {statusLabels[ticket.status]}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                priorityColors[ticket.priority]
                              }`}
                            >
                              <Flag className='w-3 h-3 inline mr-1' />
                              {ticket.priority}
                            </span>
                            {ticket.assigned_user && (
                              <span className='flex items-center gap-1 text-gray-600'>
                                <div className='w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600'>
                                  {ticket.assigned_user.name.charAt(0)}
                                </div>
                                {ticket.assigned_user.name}
                              </span>
                            )}
                            {isInInbox && (
                              <span className='flex items-center gap-1 text-yellow-600 font-medium'>
                                <Inbox className='w-4 h-4' />
                                En buzón
                              </span>
                            )}
                            <span className='text-gray-400'>
                              <Clock className='w-3 h-3 inline mr-1' />
                              {new Date(ticket.created_at).toLocaleDateString(
                                "es-ES"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ========== TAB: PROYECTOS ========== */}
        {activeTab === "projects" && (
          <motion.div
            key='projects'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Barra de acciones */}
            <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6'>
              <div className='relative flex-1 md:flex-initial'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='text'
                  placeholder='Buscar proyectos...'
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  className='pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
                />
              </div>

              {team.is_owner && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedProject(null);
                    setIsProjectModalOpen(true);
                  }}
                  className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition'
                >
                  <Plus className='w-5 h-5' />
                  Nuevo Proyecto
                </motion.button>
              )}
            </div>

            {/* Lista de proyectos */}
            {filteredProjects.length === 0 ? (
              <div className='text-center py-12 bg-white rounded-xl border border-gray-200'>
                <FolderKanban className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                <p className='text-gray-500'>No hay proyectos en este equipo</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                <AnimatePresence mode='popLayout'>
                  {filteredProjects.map((project) => {
                    const completedTasks =
                      project.tasks?.filter((t) => t.status === "done")
                        .length || 0;
                    const totalTasks = project.tasks?.length || 0;
                    const progress =
                      totalTasks > 0
                        ? Math.round((completedTasks / totalTasks) * 100)
                        : 0;

                    return (
                      <motion.div
                        key={project.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ y: -4 }}
                        className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition cursor-pointer group'
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div
                          className={`h-2 ${project.color || "bg-indigo-500"}`}
                        />
                        <div className='p-5'>
                          <div className='flex items-start justify-between mb-3'>
                            <h3 className='font-semibold text-gray-900'>
                              {project.name}
                            </h3>
                            {project.can_edit && (
                              <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProject(project);
                                    setIsProjectModalOpen(true);
                                  }}
                                  className='p-1 hover:bg-gray-100 rounded'
                                >
                                  <Edit className='w-4 h-4 text-gray-500' />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmModal({
                                      isOpen: true,
                                      type: "project",
                                      itemId: project.id,
                                    });
                                  }}
                                  className='p-1 hover:bg-red-50 rounded'
                                >
                                  <Trash2 className='w-4 h-4 text-red-500' />
                                </button>
                              </div>
                            )}
                          </div>

                          <p className='text-sm text-gray-600 line-clamp-2 mb-4'>
                            {project.description || "Sin descripción"}
                          </p>

                          {/* Barra de progreso */}
                          <div className='mb-3'>
                            <div className='flex justify-between text-xs text-gray-500 mb-1'>
                              <span>Progreso</span>
                              <span>{progress}%</span>
                            </div>
                            <div className='w-full bg-gray-200 rounded-full h-2'>
                              <div
                                className={`h-2 rounded-full ${
                                  project.color || "bg-indigo-500"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className='flex items-center justify-between text-sm text-gray-500'>
                            <span>{totalTasks} tareas</span>
                            {project.due_date && (
                              <span className='flex items-center gap-1'>
                                <Calendar className='w-3 h-3' />
                                {new Date(project.due_date).toLocaleDateString(
                                  "es-ES"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* ========== TAB: MIEMBROS ========== */}
        {activeTab === "members" && (
          <motion.div
            key='members'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Invitar miembro (solo dueño) */}
            {team.is_owner && (
              <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
                <h3 className='font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                  <UserPlus className='w-5 h-5 text-indigo-600' />
                  Invitar nuevo miembro
                </h3>
                <form onSubmit={handleSendInvite} className='flex gap-3'>
                  <div className='relative flex-1'>
                    <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                    <input
                      type='email'
                      placeholder='Email del nuevo miembro...'
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
                      required
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type='submit'
                    disabled={sendingInvite}
                    className='px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2'
                  >
                    {sendingInvite ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Mail className='w-4 h-4' />
                    )}
                    Enviar invitación
                  </motion.button>
                </form>
              </div>
            )}

            {/* Lista de miembros */}
            <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
              <div className='px-6 py-4 border-b border-gray-200'>
                <h3 className='font-semibold text-gray-900'>
                  Miembros del equipo ({members.length})
                </h3>
              </div>
              <div className='divide-y divide-gray-100'>
                {members.map((member) => (
                  <div
                    key={member.id}
                    className='px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition'
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold'>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-gray-900'>
                            {member.name}
                          </span>
                          {member.is_owner && (
                            <span className='px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1'>
                              <Crown className='w-3 h-3' />
                              Dueño
                            </span>
                          )}
                        </div>
                        <span className='text-sm text-gray-500'>
                          {member.email}
                        </span>
                      </div>
                    </div>
                    <span className='text-sm text-gray-500 capitalize'>
                      {member.role || "Miembro"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========== TAB: ESTADÍSTICAS ========== */}
        {activeTab === "stats" && (
          <motion.div
            key='stats'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {stats ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                {/* Miembros */}
                <div className='bg-white rounded-xl border border-gray-200 p-6'>
                  <div className='flex items-center gap-4'>
                    <div className='p-3 bg-indigo-100 rounded-xl'>
                      <Users className='w-6 h-6 text-indigo-600' />
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-gray-900'>
                        {stats.members}
                      </p>
                      <p className='text-sm text-gray-500'>Miembros</p>
                    </div>
                  </div>
                </div>

                {/* Proyectos */}
                <div className='bg-white rounded-xl border border-gray-200 p-6'>
                  <div className='flex items-center gap-4'>
                    <div className='p-3 bg-green-100 rounded-xl'>
                      <FolderKanban className='w-6 h-6 text-green-600' />
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-gray-900'>
                        {stats.projects?.total || 0}
                      </p>
                      <p className='text-sm text-gray-500'>
                        Proyectos ({stats.projects?.active || 0} activos)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tickets en buzón */}
                <div className='bg-white rounded-xl border border-gray-200 p-6'>
                  <div className='flex items-center gap-4'>
                    <div className='p-3 bg-yellow-100 rounded-xl'>
                      <Inbox className='w-6 h-6 text-yellow-600' />
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-gray-900'>
                        {stats.tickets?.inbox || 0}
                      </p>
                      <p className='text-sm text-gray-500'>En buzón</p>
                    </div>
                  </div>
                </div>

                {/* Tickets totales */}
                <div className='bg-white rounded-xl border border-gray-200 p-6'>
                  <div className='flex items-center gap-4'>
                    <div className='p-3 bg-blue-100 rounded-xl'>
                      <Ticket className='w-6 h-6 text-blue-600' />
                    </div>
                    <div>
                      <p className='text-2xl font-bold text-gray-900'>
                        {stats.tickets?.total || 0}
                      </p>
                      <p className='text-sm text-gray-500'>Tickets totales</p>
                    </div>
                  </div>
                </div>

                {/* Desglose de tickets */}
                <div className='bg-white rounded-xl border border-gray-200 p-6 md:col-span-2'>
                  <h3 className='font-semibold text-gray-900 mb-4'>
                    Estado de tickets
                  </h3>
                  <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
                    <div className='text-center p-3 bg-blue-50 rounded-lg'>
                      <p className='text-xl font-bold text-blue-600'>
                        {stats.tickets?.open || 0}
                      </p>
                      <p className='text-xs text-gray-600'>Abiertos</p>
                    </div>
                    <div className='text-center p-3 bg-yellow-50 rounded-lg'>
                      <p className='text-xl font-bold text-yellow-600'>
                        {stats.tickets?.in_progress || 0}
                      </p>
                      <p className='text-xs text-gray-600'>En progreso</p>
                    </div>
                    <div className='text-center p-3 bg-orange-50 rounded-lg'>
                      <p className='text-xl font-bold text-orange-600'>
                        {stats.tickets?.pending || 0}
                      </p>
                      <p className='text-xs text-gray-600'>Pendientes</p>
                    </div>
                    <div className='text-center p-3 bg-green-50 rounded-lg'>
                      <p className='text-xl font-bold text-green-600'>
                        {stats.tickets?.resolved || 0}
                      </p>
                      <p className='text-xs text-gray-600'>Resueltos</p>
                    </div>
                    <div className='text-center p-3 bg-gray-50 rounded-lg'>
                      <p className='text-xl font-bold text-gray-600'>
                        {stats.tickets?.closed || 0}
                      </p>
                      <p className='text-xs text-gray-600'>Cerrados</p>
                    </div>
                  </div>
                </div>

                {/* Tareas */}
                <div className='bg-white rounded-xl border border-gray-200 p-6 md:col-span-2'>
                  <h3 className='font-semibold text-gray-900 mb-4'>
                    Tareas del equipo
                  </h3>
                  <div className='grid grid-cols-3 gap-4'>
                    <div className='text-center p-3 bg-gray-50 rounded-lg'>
                      <p className='text-xl font-bold text-gray-900'>
                        {stats.tasks?.total || 0}
                      </p>
                      <p className='text-xs text-gray-600'>Total</p>
                    </div>
                    <div className='text-center p-3 bg-green-50 rounded-lg'>
                      <p className='text-xl font-bold text-green-600'>
                        {stats.tasks?.completed || 0}
                      </p>
                      <p className='text-xs text-gray-600'>Completadas</p>
                    </div>
                    <div className='text-center p-3 bg-yellow-50 rounded-lg'>
                      <p className='text-xl font-bold text-yellow-600'>
                        {stats.tasks?.pending || 0}
                      </p>
                      <p className='text-xs text-gray-600'>Pendientes</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className='flex justify-center py-12'>
                <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modales */}
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        teamId={id}
        onSuccess={() => {
          setIsTicketModalOpen(false);
          setSelectedTicket(null);
          loadTickets();
        }}
      />

      <TicketDetailModal
        isOpen={isTicketDetailModalOpen}
        onClose={() => {
          setIsTicketDetailModalOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        onUpdate={loadTickets}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        teamId={id}
        onSuccess={() => {
          setIsProjectModalOpen(false);
          setSelectedProject(null);
          loadProjects();
        }}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        team={team}
        onSuccess={() => {
          setIsTeamModalOpen(false);
          loadTeam();
        }}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, type: null, itemId: null })
        }
        onConfirm={
          confirmModal.type === "ticket"
            ? handleDeleteTicket
            : handleDeleteProject
        }
        title={
          confirmModal.type === "ticket"
            ? "Eliminar ticket"
            : "Eliminar proyecto"
        }
        message={`¿Estás seguro de que deseas eliminar este ${
          confirmModal.type === "ticket" ? "ticket" : "proyecto"
        }? Esta acción no se puede deshacer.`}
        type='danger'
        loading={deleting}
      />
    </Layout>
  );
};

export default TeamDetail;

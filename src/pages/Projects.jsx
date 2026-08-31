import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ProjectModal from "../components/modals/ProjectModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import GanttChart from "../components/GanttChart";
import UserAvatar from "../components/ui/UserAvatar";
import ProgressRing from "../components/ui/ProgressRing";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import { SkeletonCardGrid } from "../components/ui/Skeleton";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import { motionTokens } from "../components/animations/variants";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Users,
  Calendar,
  TrendingUp,
  LayoutGrid,
  GanttChartIcon,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  ListTodo,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { projectsAPI } from "../utils/api";
import { parseLocalDate } from "../utils/dateUtils";
import {
  exportProjectsToPdf,
  exportProjectsToExcel,
  exportProjectsToCsv,
  exportAllProjectsGanttToPdf,
} from "../utils/exportService.jsx";
import {
  ProjectsListPdf,
  AllProjectsGanttPdf,
} from "../components/exports/PdfDocuments";

const Projects = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();
  const [view, setView] = useState("grid"); // 'grid' o 'gantt'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    projectId: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportMenuRef = useRef(null);

  // Cerrar menú de exportación al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target)
      ) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Funciones de exportación
  const handleExport = async (type) => {
    setExporting(true);
    try {
      switch (type) {
        case "pdf":
          await exportProjectsToPdf(projects, ProjectsListPdf);
          success("PDF de proyectos descargado");
          break;
        case "excel":
          exportProjectsToExcel(projects);
          success("Excel de proyectos descargado");
          break;
        case "csv":
          exportProjectsToCsv(projects);
          success("CSV de proyectos descargado");
          break;
        case "gantt":
          await exportAllProjectsGanttToPdf(projects, AllProjectsGanttPdf);
          success("Diagrama Gantt descargado");
          break;
      }
    } catch (err) {
      console.error("Error exporting:", err);
      showError(err.message || "Error al exportar");
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };

  // Función para cargar proyectos con indicador de carga (carga inicial)
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsAPI.getAll();
      setProjects(data);
    } catch (err) {
      setError(err.message || "Error al cargar proyectos");
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para actualizar proyectos silenciosamente (sin spinner, para tiempo real)
  const refreshProjectsSilently = useCallback(async () => {
    try {
      const data = await projectsAPI.getAll();
      setProjects(data);
    } catch (err) {
      console.error("Error refreshing projects:", err);
      // No mostrar error en actualización silenciosa
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Registrar callback para refrescar datos en tiempo real (silencioso)
  useEffect(() => {
    registerRefresh("projects", refreshProjectsSilently);
    return () => unregisterRefresh("projects");
  }, [registerRefresh, unregisterRefresh, refreshProjectsSilently]);

  const openDeleteConfirm = (projectId) => {
    setConfirmModal({ isOpen: true, projectId });
  };

  const handleDelete = async () => {
    const id = confirmModal.projectId;

    // Guardar proyectos originales para posible rollback
    const originalProjects = [...projects];

    // Actualización optimista - remover de UI inmediatamente
    setProjects((prev) => prev.filter((p) => p.id !== id));

    setDeleting(true);
    try {
      await projectsAPI.delete(id);
      success("Proyecto eliminado exitosamente");
      // No necesitamos recargar, ya actualizamos optimísticamente
    } catch (err) {
      // Revertir en caso de error
      setProjects(originalProjects);
      showError(err.message || "Error al eliminar el proyecto");
      console.error("Error deleting project:", err);
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, projectId: null });
    }
  };

  const handleEdit = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleNewProject = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const handleViewDetails = (project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleSuccess = () => {
    handleCloseModal();
    refreshProjectsSilently();
  };

  // Filtrar proyectos
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    active: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    on_hold: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300",
    completed: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
    cancelled: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  };

  const priorityColors = {
    high: "text-red-600 dark:text-red-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    low: "text-gray-500 dark:text-night-400",
  };

  const priorityLabels = {
    high: "Alta",
    medium: "Media",
    low: "Baja",
  };

  // Calcular estadísticas de tareas por proyecto
  const getTaskStats = (project) => {
    const tasks = project.tasks || [];
    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t.status === "done" || t.status === "completed",
    ).length;
    const inProgress = tasks.filter(
      (t) => t.status === "in-progress" || t.status === "in_progress",
    ).length;
    const pending = tasks.filter(
      (t) => t.status === "todo" || t.status === "pending",
    ).length;
    const overdue = tasks.filter((t) => {
      if (!t.due_date) return false;
      return (
        parseLocalDate(t.due_date) < new Date() &&
        t.status !== "done" &&
        t.status !== "completed"
      );
    }).length;

    return { total, completed, inProgress, pending, overdue };
  };

  // Calcular días restantes
  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseLocalDate(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Proyecto más urgente de la lista filtrada: tiene tareas vencidas, o
  // vence en los próximos 7 días. Se destaca en grande en el bento grid.
  const featuredProject = useMemo(() => {
    if (filteredProjects.length < 2) return null;

    const candidates = filteredProjects.filter(
      (p) => p.status !== "completed" && p.progress !== 100,
    );
    if (candidates.length === 0) return null;

    const scored = candidates
      .map((p) => {
        const stats = getTaskStats(p);
        const days = getDaysRemaining(p.due_date);
        const isUrgent = stats.overdue > 0 || (days !== null && days <= 7);
        const score = stats.overdue > 0 ? -1000 - stats.overdue : (days ?? Infinity);
        return { project: p, score, isUrgent };
      })
      .sort((a, b) => a.score - b.score);

    return scored[0].isUrgent ? scored[0].project : null;
  }, [filteredProjects]);

  const restProjects = featuredProject
    ? filteredProjects.filter((p) => p.id !== featuredProject.id)
    : filteredProjects;

  // Render de una card de proyecto. `featured` produce la card grande del
  // bento (anillo más grande + 4 mini-stats); las demás son cards
  // compactas con un anillo pequeño.
  const renderProjectCard = (project, featured = false) => {
    const taskStats = getTaskStats(project);
    const daysRemaining = getDaysRemaining(project.due_date);
    const isCompleted = project.status === "completed" || project.progress === 100;
    const isOverdue = daysRemaining !== null && daysRemaining < 0 && !isCompleted;
    const isDueSoon =
      daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 && !isCompleted;
    const ringColor = isCompleted
      ? "#16a34a"
      : taskStats.overdue > 0
        ? "#dc2626"
        : "#7c3aed";

    return (
      <motion.div
        key={project.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        whileHover={{ y: -6, scale: 1.01 }}
        onClick={() => handleViewDetails(project)}
        className={`bg-white dark:bg-night-900 rounded-xl shadow-sm border border-gray-100 dark:border-night-700 group cursor-pointer overflow-hidden ${
          featured ? "md:col-span-2 lg:col-span-2" : ""
        }`}
      >
        {/* Barra de color superior */}
        <div className={`h-1.5 ${project.color}`}></div>

        <div className='p-5'>
          <div className='flex items-start justify-between mb-3'>
            <div className='flex items-center gap-3 min-w-0'>
              <div
                className={`${project.color} ${
                  featured ? "w-12 h-12" : "w-10 h-10"
                } rounded-lg flex items-center justify-center shadow-sm shrink-0`}
              >
                <span className='text-white font-bold text-lg'>
                  {project.name.charAt(0)}
                </span>
              </div>
              <div className='min-w-0'>
                {featured && (
                  <span className='inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full mb-1'>
                    <Flag className='w-2.5 h-2.5' />
                    Más urgente
                  </span>
                )}
                <h3
                  className={`font-semibold text-gray-900 dark:text-night-50 line-clamp-1 ${featured ? "text-lg" : ""}`}
                >
                  {project.name}
                </h3>
                <div className='flex items-center gap-2 mt-0.5'>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[project.status] || "bg-gray-100 dark:bg-night-800 text-gray-800 dark:text-night-100"
                    }`}
                  >
                    {project.status === "active"
                      ? "Activo"
                      : project.status === "on_hold"
                        ? "En pausa"
                        : project.status === "completed"
                          ? "Completado"
                          : project.status === "cancelled"
                            ? "Cancelado"
                            : project.status}
                  </span>
                  {project.priority && (
                    <span
                      className={`flex items-center gap-0.5 text-xs ${priorityColors[project.priority]}`}
                    >
                      <Flag className='w-3 h-3' />
                      {priorityLabels[project.priority]}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className='flex gap-1 shrink-0'>
              {project.can_edit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(project);
                  }}
                  className='p-1.5 opacity-0 group-hover:opacity-100 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all duration-200 cursor-pointer'
                >
                  <Edit className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                </button>
              )}
              {project.can_delete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteConfirm(project.id);
                  }}
                  className='p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all duration-200 cursor-pointer'
                >
                  <Trash2 className='w-4 h-4 text-red-600 dark:text-red-400' />
                </button>
              )}
            </div>
          </div>

          {featured && (
            <p className='text-sm text-gray-500 dark:text-night-400 line-clamp-2 mb-1'>
              {project.description || "Sin descripción"}
            </p>
          )}
        </div>

        <div className={`px-5 pb-5 ${featured ? "space-y-4" : "space-y-3"}`}>
          {/* Anillo de progreso + porcentaje */}
          <div className='flex items-center gap-4'>
            <ProgressRing
              percentage={project.progress || 0}
              color={ringColor}
              size={featured ? 68 : 44}
              strokeWidth={featured ? 6 : 4}
            />
            <div>
              <div
                className={`font-bold text-gray-900 dark:text-night-50 tabular-nums ${featured ? "text-3xl" : "text-xl"}`}
              >
                <AnimatedNumber value={project.progress || 0} suffix='%' />
              </div>
              <div className='text-xs text-gray-500 dark:text-night-400'>Progreso</div>
            </div>
          </div>

          {/* Estadísticas de tareas (solo en la card destacada) */}
          {featured && (
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
              <div className='text-center p-2 bg-gray-50 dark:bg-night-800 rounded-lg'>
                <div className='flex items-center justify-center gap-1'>
                  <ListTodo className='w-3.5 h-3.5 text-gray-400 dark:text-night-500' />
                  <span className='text-sm font-bold text-gray-700 dark:text-night-300 tabular-nums'>
                    {taskStats.total}
                  </span>
                </div>
                <div className='text-[10px] text-gray-500 dark:text-night-400'>Total</div>
              </div>
              <div className='text-center p-2 bg-green-50 dark:bg-green-950/40 rounded-lg'>
                <div className='flex items-center justify-center gap-1'>
                  <CheckCircle2 className='w-3.5 h-3.5 text-green-500 dark:text-green-400' />
                  <span className='text-sm font-bold text-green-700 dark:text-green-300 tabular-nums'>
                    {taskStats.completed}
                  </span>
                </div>
                <div className='text-[10px] text-green-600 dark:text-green-400'>Listas</div>
              </div>
              <div className='text-center p-2 bg-brand-50 rounded-lg'>
                <div className='flex items-center justify-center gap-1'>
                  <Clock className='w-3.5 h-3.5 text-brand-500' />
                  <span className='text-sm font-bold text-brand-700 tabular-nums'>
                    {taskStats.inProgress}
                  </span>
                </div>
                <div className='text-[10px] text-brand-600'>En curso</div>
              </div>
              <div
                className={`text-center p-2 rounded-lg ${
                  taskStats.overdue > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-yellow-50 dark:bg-yellow-950/40"
                }`}
              >
                <div className='flex items-center justify-center gap-1'>
                  <AlertCircle
                    className={`w-3.5 h-3.5 ${
                      taskStats.overdue > 0 ? "text-red-500 dark:text-red-400" : "text-yellow-500 dark:text-yellow-400"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      taskStats.overdue > 0 ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"
                    }`}
                  >
                    {taskStats.overdue > 0 ? taskStats.overdue : taskStats.pending}
                  </span>
                </div>
                <div
                  className={`text-[10px] ${
                    taskStats.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
                  }`}
                >
                  {taskStats.overdue > 0 ? "Vencidas" : "Pendientes"}
                </div>
              </div>
            </div>
          )}

          {/* Miembros del equipo o colaboradores */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 min-w-0'>
              {project.team ? (
                (() => {
                  const teamOwner = project.team.user;
                  const teamMembers = project.team.members || [];
                  const allMembers = teamOwner
                    ? [teamOwner, ...teamMembers.filter((m) => m.id !== teamOwner.id)]
                    : teamMembers;
                  const totalMembers = allMembers.length;

                  return (
                    <>
                      {featured && (
                        <div
                          className={`w-7 h-7 rounded-lg ${
                            project.team.color || "bg-brand-500"
                          } flex items-center justify-center shrink-0`}
                          title={project.team.name}
                        >
                          <Users className='w-4 h-4 text-white' />
                        </div>
                      )}
                      {featured && (
                        <div className='flex flex-col min-w-0'>
                          <span className='text-xs font-medium text-gray-700 dark:text-night-300 truncate'>
                            {project.team.name}
                          </span>
                          <span className='text-[10px] text-gray-400 dark:text-night-500'>
                            {totalMembers} {totalMembers === 1 ? "miembro" : "miembros"}
                          </span>
                        </div>
                      )}
                      {allMembers.length > 0 && (
                        <div className='flex -space-x-2 ml-1'>
                          {allMembers.slice(0, featured ? 3 : 2).map((member, idx) => (
                            <div
                              key={member.id}
                              className={`w-6 h-6 rounded-full border-2 border-white dark:border-night-900 flex items-center justify-center shrink-0 ${
                                idx === 0 && teamOwner && member.id === teamOwner.id
                                  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                                  : "bg-gradient-to-br from-brand-500 to-accent-600"
                              }`}
                              title={`${member.name}${
                                teamOwner && member.id === teamOwner.id ? " (Líder)" : ""
                              }`}
                            >
                              <span className='text-[9px] font-medium text-white'>
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ))}
                          {allMembers.length > (featured ? 3 : 2) && (
                            <div className='w-6 h-6 rounded-full bg-gray-200 dark:bg-night-700 border-2 border-white dark:border-night-900 flex items-center justify-center shrink-0'>
                              <span className='text-[9px] font-medium text-gray-600 dark:text-night-300'>
                                +{allMembers.length - (featured ? 3 : 2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()
              ) : project.users && project.users.length > 0 ? (
                <>
                  <div className='flex -space-x-2'>
                    {project.users.slice(0, featured ? 4 : 2).map((user) => (
                      <UserAvatar key={user.id} user={user} size='sm' showBorder />
                    ))}
                    {project.users.length > (featured ? 4 : 2) && (
                      <div className='w-7 h-7 rounded-full bg-gray-200 dark:bg-night-700 border-2 border-white dark:border-night-900 flex items-center justify-center'>
                        <span className='text-[10px] font-medium text-gray-600 dark:text-night-300'>
                          +{project.users.length - (featured ? 4 : 2)}
                        </span>
                      </div>
                    )}
                  </div>
                  {featured && (
                    <span className='text-xs text-gray-500 dark:text-night-400'>
                      {project.users.length}{" "}
                      {project.users.length === 1 ? "colaborador" : "colaboradores"}
                    </span>
                  )}
                </>
              ) : (
                <span className='text-xs text-gray-400 dark:text-night-500 flex items-center gap-1'>
                  <Users className='w-3.5 h-3.5' />
                  {featured ? "Sin equipo asignado" : "Sin equipo"}
                </span>
              )}
            </div>
          </div>

          {/* Footer con fecha */}
          <div className='flex items-center justify-between pt-3 border-t border-gray-100 dark:border-night-700'>
            {featured && (
              <div className='flex items-center gap-1.5 text-sm'>
                <Calendar className='w-4 h-4 text-gray-400 dark:text-night-500' />
                <span className='text-gray-600 dark:text-night-300'>
                  {project.due_date
                    ? parseLocalDate(project.due_date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Sin fecha límite"}
                </span>
              </div>
            )}
            {daysRemaining !== null && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  isCompleted
                    ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                    : isOverdue
                      ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                      : daysRemaining <= 3
                        ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300"
                        : isDueSoon
                          ? "bg-brand-100 text-brand-700"
                          : "bg-gray-100 dark:bg-night-800 text-gray-600 dark:text-night-300"
                }`}
              >
                {isCompleted
                  ? "Completado"
                  : isOverdue
                    ? `Vencido hace ${Math.abs(daysRemaining)} días`
                    : daysRemaining === 0
                      ? "Vence hoy"
                      : daysRemaining === 1
                        ? "Vence mañana"
                        : `${daysRemaining} días`}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Layout
      title='Proyectos'
      subtitle='Gestiona todos tus proyectos en un solo lugar'
    >
      {/* Barra de acciones */}
      <FadeIn delay={0.1}>
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6'>
          {/* Toggle de vista */}
          <div className='flex gap-2 bg-gray-100 dark:bg-night-800 p-1 rounded-lg'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                view === "grid"
                  ? "bg-white dark:bg-night-900 text-brand-600 shadow-sm"
                  : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-50"
              }`}
            >
              <LayoutGrid className='w-4 h-4' />
              <span className='hidden sm:inline'>Grid</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView("gantt")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                view === "gantt"
                  ? "bg-white dark:bg-night-900 text-brand-600 shadow-sm"
                  : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-50"
              }`}
            >
              <GanttChartIcon className='w-4 h-4' />
              <span className='hidden sm:inline'>Gantt</span>
            </motion.button>
          </div>

          <div className='flex gap-3 flex-1 w-full md:w-auto'>
            <div className='relative flex-1 md:flex-initial'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500' />
              <input
                type='text'
                placeholder='Buscar proyectos...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-night-600 rounded-lg hover:bg-gray-50 dark:hover:bg-night-800 transition'
            >
              <Filter className='w-4 h-4' />
              <span className='hidden sm:inline'>Filtros</span>
            </motion.button>
          </div>

          <div className='flex gap-2'>
            {/* Botón de Exportar con menú dropdown */}
            <div className='relative' ref={exportMenuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                disabled={exporting || projects.length === 0}
                className='flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-night-600 rounded-lg hover:bg-gray-50 dark:hover:bg-night-800 transition disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {exporting ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Download className='w-4 h-4' />
                )}
                <span className='hidden sm:inline'>Exportar</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    exportMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {exportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className='absolute right-0 mt-2 w-56 bg-white dark:bg-night-900 rounded-lg shadow-lg border border-gray-200 dark:border-night-700 py-2 z-50'
                  >
                    <div className='px-3 py-2 text-xs font-semibold text-gray-500 dark:text-night-400 uppercase tracking-wider'>
                      Lista de Proyectos
                    </div>
                    <button
                      onClick={() => handleExport("pdf")}
                      className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-night-300 hover:bg-gray-50 dark:hover:bg-night-800 flex items-center gap-3'
                    >
                      <FileText className='w-4 h-4 text-red-500 dark:text-red-400' />
                      Exportar a PDF
                    </button>
                    <button
                      onClick={() => handleExport("excel")}
                      className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-night-300 hover:bg-gray-50 dark:hover:bg-night-800 flex items-center gap-3'
                    >
                      <FileSpreadsheet className='w-4 h-4 text-green-600 dark:text-green-400' />
                      Exportar a Excel
                    </button>
                    <button
                      onClick={() => handleExport("csv")}
                      className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-night-300 hover:bg-gray-50 dark:hover:bg-night-800 flex items-center gap-3'
                    >
                      <FileDown className='w-4 h-4 text-blue-500 dark:text-blue-400' />
                      Exportar a CSV
                    </button>

                    <div className='border-t border-gray-100 dark:border-night-700 my-2' />

                    <div className='px-3 py-2 text-xs font-semibold text-gray-500 dark:text-night-400 uppercase tracking-wider'>
                      Diagrama Gantt
                    </div>
                    <button
                      onClick={() => handleExport("gantt")}
                      className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-night-300 hover:bg-gray-50 dark:hover:bg-night-800 flex items-center gap-3'
                    >
                      <GanttChartIcon className='w-4 h-4 text-accent-500' />
                      Gantt de todos los proyectos
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewProject}
              className='flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg hover:brightness-105 transition-all shadow-md shadow-brand-600/25 hover:shadow-lg'
            >
              <Plus className='w-5 h-5' />
              <span>Nuevo Proyecto</span>
            </motion.button>
          </div>
        </div>
      </FadeIn>

      {/* Error message */}
      {error && (
        <div className='mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400'>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && <SkeletonCardGrid count={6} />}

      {/* Vista de tabs */}
      {view === "grid" && !loading && (
        <FadeIn delay={0.2}>
          <div className='flex gap-2 mb-6 border-b border-gray-200 dark:border-night-700 overflow-x-auto'>
            {[
              { key: "all", label: "Todos", count: projects.length },
              {
                key: "active",
                label: "Activos",
                count: projects.filter((p) => p.status === "active").length,
              },
              {
                key: "on_hold",
                label: "En pausa",
                count: projects.filter((p) => p.status === "on_hold").length,
              },
              {
                key: "completed",
                label: "Completados",
                count: projects.filter((p) => p.status === "completed").length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`relative px-4 py-2 font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? "text-brand-600"
                    : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-50"
                }`}
              >
                {tab.label} ({tab.count})
                {statusFilter === tab.key && (
                  <motion.span
                    layoutId='projects-tab-indicator'
                    transition={motionTokens.springSnappy}
                    className='absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-linear-to-r from-brand-600 to-accent-600'
                  />
                )}
              </button>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Grid de proyectos */}
      {view === "grid" && !loading && (
        <>
          {filteredProjects.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-gray-500 dark:text-night-400 text-lg'>
                {searchTerm
                  ? "No se encontraron proyectos con ese criterio"
                  : "No hay proyectos aún"}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              <AnimatePresence mode='popLayout'>
                {featuredProject && renderProjectCard(featuredProject, true)}
                {restProjects.map((project) => renderProjectCard(project))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Vista de Gantt */}
      {view === "gantt" && !loading && (
        <FadeIn delay={0.2}>
          <GanttChart projects={filteredProjects} />
        </FadeIn>
      )}

      {/* Modal de Proyecto */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        project={selectedProject}
        onSuccess={handleSuccess}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, projectId: null })}
        onConfirm={handleDelete}
        title='Eliminar proyecto'
        message='¿Estás seguro de que deseas eliminar este proyecto? Se eliminarán también todas las tareas asociadas. Esta acción no se puede deshacer.'
        confirmText='Eliminar'
        type='danger'
        loading={deleting}
      />
    </Layout>
  );
};

export default Projects;

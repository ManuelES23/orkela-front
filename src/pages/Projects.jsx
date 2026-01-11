import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ProjectModal from "../components/modals/ProjectModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import GanttChart from "../components/GanttChart";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
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
} from "lucide-react";
import { projectsAPI } from "../utils/api";

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
    active: "bg-blue-100 text-blue-700",
    on_hold: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const priorityColors = {
    high: "text-red-600",
    medium: "text-yellow-600",
    low: "text-gray-500",
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
      (t) => t.status === "done" || t.status === "completed"
    ).length;
    const inProgress = tasks.filter(
      (t) => t.status === "in-progress" || t.status === "in_progress"
    ).length;
    const pending = tasks.filter(
      (t) => t.status === "todo" || t.status === "pending"
    ).length;
    const overdue = tasks.filter((t) => {
      if (!t.due_date) return false;
      return (
        new Date(t.due_date) < new Date() &&
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
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
          <div className='flex gap-2 bg-gray-100 p-1 rounded-lg'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                view === "grid"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
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
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <GanttChartIcon className='w-4 h-4' />
              <span className='hidden sm:inline'>Gantt</span>
            </motion.button>
          </div>

          <div className='flex gap-3 flex-1 w-full md:w-auto'>
            <div className='relative flex-1 md:flex-initial'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar proyectos...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition'
            >
              <Filter className='w-4 h-4' />
              <span className='hidden sm:inline'>Filtros</span>
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewProject}
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg'
          >
            <Plus className='w-5 h-5' />
            <span>Nuevo Proyecto</span>
          </motion.button>
        </div>
      </FadeIn>

      {/* Error message */}
      {error && (
        <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600'>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className='flex items-center justify-center py-20'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600'></div>
        </div>
      )}

      {/* Vista de tabs */}
      {view === "grid" && !loading && (
        <FadeIn delay={0.2}>
          <div className='flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto'>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                statusFilter === "all"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Todos ({projects.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                statusFilter === "active"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Activos ({projects.filter((p) => p.status === "active").length})
            </button>
            <button
              onClick={() => setStatusFilter("on_hold")}
              className={`px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                statusFilter === "on_hold"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              En pausa ({projects.filter((p) => p.status === "on_hold").length})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                statusFilter === "completed"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Completados (
              {projects.filter((p) => p.status === "completed").length})
            </button>
          </div>
        </FadeIn>
      )}

      {/* Grid de proyectos */}
      {view === "grid" && !loading && (
        <>
          {filteredProjects.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-gray-500 text-lg'>
                {searchTerm
                  ? "No se encontraron proyectos con ese criterio"
                  : "No hay proyectos aún"}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              <AnimatePresence mode='popLayout'>
                {filteredProjects.map((project, index) => {
                  const taskStats = getTaskStats(project);
                  const daysRemaining = getDaysRemaining(project.due_date);

                  return (
                    <motion.div
                      key={project.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      onClick={() => handleViewDetails(project)}
                      className='bg-white rounded-xl shadow-sm border border-gray-100 group cursor-pointer overflow-hidden'
                    >
                      {/* Barra de color superior */}
                      <div className={`h-1.5 ${project.color}`}></div>

                      {/* Header del card */}
                      <div className='p-5'>
                        <div className='flex items-start justify-between mb-3'>
                          <div className='flex items-center gap-3'>
                            <div
                              className={`${project.color} w-11 h-11 rounded-lg flex items-center justify-center shadow-sm`}
                            >
                              <span className='text-white font-bold text-lg'>
                                {project.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h3 className='font-semibold text-gray-900 line-clamp-1'>
                                {project.name}
                              </h3>
                              <div className='flex items-center gap-2 mt-0.5'>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    statusColors[project.status] ||
                                    "bg-gray-100 text-gray-800"
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
                                    className={`flex items-center gap-0.5 text-xs ${
                                      priorityColors[project.priority]
                                    }`}
                                  >
                                    <Flag className='w-3 h-3' />
                                    {priorityLabels[project.priority]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className='flex gap-1'>
                            {project.can_edit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(project);
                                }}
                                className='p-1.5 opacity-0 group-hover:opacity-100 hover:bg-blue-50 rounded-lg transition-all duration-200'
                              >
                                <Edit className='w-4 h-4 text-blue-600' />
                              </button>
                            )}
                            {project.can_delete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteConfirm(project.id);
                                }}
                                className='p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all duration-200'
                              >
                                <Trash2 className='w-4 h-4 text-red-600' />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className='text-sm text-gray-500 line-clamp-2 min-h-[40px]'>
                          {project.description || "Sin descripción"}
                        </p>
                      </div>

                      {/* Body del card */}
                      <div className='px-5 pb-5 space-y-4'>
                        {/* Progreso */}
                        <div>
                          <div className='flex items-center justify-between text-sm mb-1.5'>
                            <span className='text-gray-500'>Progreso</span>
                            <span className='font-semibold text-gray-900'>
                              {project.progress}%
                            </span>
                          </div>
                          <div className='w-full bg-gray-100 rounded-full h-2'>
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                project.progress === 100
                                  ? "bg-green-500"
                                  : project.color
                              }`}
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Estadísticas de tareas */}
                        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                          <div className='text-center p-2 bg-gray-50 rounded-lg'>
                            <div className='flex items-center justify-center gap-1'>
                              <ListTodo className='w-3.5 h-3.5 text-gray-400' />
                              <span className='text-sm font-bold text-gray-700'>
                                {taskStats.total}
                              </span>
                            </div>
                            <div className='text-[10px] text-gray-500'>
                              Total
                            </div>
                          </div>
                          <div className='text-center p-2 bg-green-50 rounded-lg'>
                            <div className='flex items-center justify-center gap-1'>
                              <CheckCircle2 className='w-3.5 h-3.5 text-green-500' />
                              <span className='text-sm font-bold text-green-700'>
                                {taskStats.completed}
                              </span>
                            </div>
                            <div className='text-[10px] text-green-600'>
                              Listas
                            </div>
                          </div>
                          <div className='text-center p-2 bg-blue-50 rounded-lg'>
                            <div className='flex items-center justify-center gap-1'>
                              <Clock className='w-3.5 h-3.5 text-blue-500' />
                              <span className='text-sm font-bold text-blue-700'>
                                {taskStats.inProgress}
                              </span>
                            </div>
                            <div className='text-[10px] text-blue-600'>
                              En curso
                            </div>
                          </div>
                          <div
                            className={`text-center p-2 rounded-lg ${
                              taskStats.overdue > 0
                                ? "bg-red-50"
                                : "bg-yellow-50"
                            }`}
                          >
                            <div className='flex items-center justify-center gap-1'>
                              <AlertCircle
                                className={`w-3.5 h-3.5 ${
                                  taskStats.overdue > 0
                                    ? "text-red-500"
                                    : "text-yellow-500"
                                }`}
                              />
                              <span
                                className={`text-sm font-bold ${
                                  taskStats.overdue > 0
                                    ? "text-red-700"
                                    : "text-yellow-700"
                                }`}
                              >
                                {taskStats.overdue > 0
                                  ? taskStats.overdue
                                  : taskStats.pending}
                              </span>
                            </div>
                            <div
                              className={`text-[10px] ${
                                taskStats.overdue > 0
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              {taskStats.overdue > 0
                                ? "Vencidas"
                                : "Pendientes"}
                            </div>
                          </div>
                        </div>

                        {/* Miembros del equipo o colaboradores */}
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            {project.team ? (
                              // Mostrar equipo si existe
                              (() => {
                                // Combinar dueño + miembros del equipo (sin duplicados)
                                const teamOwner = project.team.user;
                                const teamMembers = project.team.members || [];
                                const allMembers = teamOwner
                                  ? [
                                      teamOwner,
                                      ...teamMembers.filter(
                                        (m) => m.id !== teamOwner.id
                                      ),
                                    ]
                                  : teamMembers;
                                const totalMembers = allMembers.length;

                                return (
                                  <>
                                    <div
                                      className={`w-7 h-7 rounded-lg ${
                                        project.team.color || "bg-indigo-500"
                                      } flex items-center justify-center`}
                                      title={project.team.name}
                                    >
                                      <Users className='w-4 h-4 text-white' />
                                    </div>
                                    <div className='flex flex-col'>
                                      <span className='text-xs font-medium text-gray-700'>
                                        {project.team.name}
                                      </span>
                                      <span className='text-[10px] text-gray-400'>
                                        {totalMembers}{" "}
                                        {totalMembers === 1
                                          ? "miembro"
                                          : "miembros"}
                                      </span>
                                    </div>
                                    {/* Avatares de miembros del equipo (incluyendo dueño) */}
                                    {allMembers.length > 0 && (
                                      <div className='flex -space-x-2 ml-2'>
                                        {allMembers
                                          .slice(0, 3)
                                          .map((member, idx) => (
                                            <div
                                              key={member.id}
                                              className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                                                idx === 0 &&
                                                teamOwner &&
                                                member.id === teamOwner.id
                                                  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                                                  : "bg-gradient-to-br from-indigo-500 to-purple-600"
                                              }`}
                                              title={`${member.name}${
                                                teamOwner &&
                                                member.id === teamOwner.id
                                                  ? " (Líder)"
                                                  : ""
                                              }`}
                                            >
                                              <span className='text-[9px] font-medium text-white'>
                                                {member.name
                                                  .charAt(0)
                                                  .toUpperCase()}
                                              </span>
                                            </div>
                                          ))}
                                        {allMembers.length > 3 && (
                                          <div className='w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center'>
                                            <span className='text-[9px] font-medium text-gray-600'>
                                              +{allMembers.length - 3}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </>
                                );
                              })()
                            ) : project.users && project.users.length > 0 ? (
                              // Mostrar colaboradores individuales si no hay equipo
                              <>
                                <div className='flex -space-x-2'>
                                  {project.users.slice(0, 4).map((user) => (
                                    <div
                                      key={user.id}
                                      className='w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white flex items-center justify-center'
                                      title={user.name}
                                    >
                                      <span className='text-[10px] font-medium text-white'>
                                        {user.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  ))}
                                  {project.users.length > 4 && (
                                    <div className='w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center'>
                                      <span className='text-[10px] font-medium text-gray-600'>
                                        +{project.users.length - 4}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <span className='text-xs text-gray-500'>
                                  {project.users.length}{" "}
                                  {project.users.length === 1
                                    ? "colaborador"
                                    : "colaboradores"}
                                </span>
                              </>
                            ) : (
                              <span className='text-xs text-gray-400 flex items-center gap-1'>
                                <Users className='w-3.5 h-3.5' />
                                Sin equipo asignado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Footer con fecha */}
                        <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
                          <div className='flex items-center gap-1.5 text-sm'>
                            <Calendar className='w-4 h-4 text-gray-400' />
                            <span className='text-gray-600'>
                              {project.due_date
                                ? new Date(project.due_date).toLocaleDateString(
                                    "es-ES",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )
                                : "Sin fecha límite"}
                            </span>
                          </div>
                          {daysRemaining !== null && (
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                daysRemaining < 0
                                  ? "bg-red-100 text-red-700"
                                  : daysRemaining <= 3
                                  ? "bg-yellow-100 text-yellow-700"
                                  : daysRemaining <= 7
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {daysRemaining < 0
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
                })}
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

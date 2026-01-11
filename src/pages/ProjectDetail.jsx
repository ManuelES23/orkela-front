import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ProjectModal from "../components/modals/ProjectModal";
import TaskModal from "../components/modals/TaskModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import ProjectGantt from "../components/tasks/ProjectGantt";
import ProjectCalendar from "../components/tasks/ProjectCalendar";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  ListChecks,
  Plus,
  MoreVertical,
  Target,
  Zap,
  LayoutList,
  GanttChart,
  CalendarDays,
  Crown,
  UserMinus,
  UserPlus,
  Mail,
  Send,
  Loader2,
  X,
} from "lucide-react";
import { projectsAPI, tasksAPI, invitationsAPI } from "../utils/api";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    id: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list', 'gantt', 'calendar'

  // Estados para gestión de miembros
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);

  // Función para cargar datos con indicador de carga (carga inicial)
  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar proyecto y sus tareas
      const [projectData, tasksData] = await Promise.all([
        projectsAPI.getById(id),
        tasksAPI.getAll(),
      ]);

      setProject(projectData);
      // Filtrar tareas del proyecto
      setTasks(tasksData.filter((task) => task.project_id === parseInt(id)));
    } catch (err) {
      setError(err.message || "Error al cargar el proyecto");
      console.error("Error loading project:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Función para actualizar datos silenciosamente (sin spinner, para tiempo real)
  const refreshDataSilently = useCallback(async () => {
    try {
      const [projectData, tasksData] = await Promise.all([
        projectsAPI.getById(id),
        tasksAPI.getAll(),
      ]);

      setProject(projectData);
      setTasks(tasksData.filter((task) => task.project_id === parseInt(id)));
    } catch (err) {
      console.error("Error refreshing data:", err);
      // No mostrar error en actualización silenciosa
    }
  }, [id]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Registrar callbacks para actualizaciones en tiempo real (silenciosas)
  useEffect(() => {
    registerRefresh("projects", refreshDataSilently);
    registerRefresh("tasks", refreshDataSilently);
    return () => {
      unregisterRefresh("projects");
      unregisterRefresh("tasks");
    };
  }, [registerRefresh, unregisterRefresh, refreshDataSilently]);

  const openDeleteConfirm = (type, itemId = null) => {
    setConfirmModal({ isOpen: true, type, id: itemId });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);

    if (confirmModal.type === "task") {
      // Actualización optimista - remover de AMBOS estados inmediatamente
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== confirmModal.id),
      }));
      setTasks((prev) => prev.filter((t) => t.id !== confirmModal.id));
    }

    try {
      if (confirmModal.type === "project") {
        await projectsAPI.delete(id);
        success("Proyecto eliminado exitosamente");
        navigate("/projects");
      } else if (confirmModal.type === "task") {
        await tasksAPI.delete(confirmModal.id);
        success("Tarea eliminada exitosamente");
        // No necesitamos recargar, ya actualizamos optimísticamente
      }
    } catch (err) {
      // Revertir en caso de error (solo para tareas)
      if (confirmModal.type === "task") {
        refreshDataSilently(); // Recargar datos para restaurar estado
      }
      showError(
        err.message ||
          (confirmModal.type === "project"
            ? "Error al eliminar el proyecto"
            : "Error al eliminar la tarea")
      );
      console.error("Error deleting:", err);
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, type: null, id: null });
    }
  };

  const handleDeleteProject = () => {
    openDeleteConfirm("project");
  };

  const handleDeleteTask = (taskId) => {
    openDeleteConfirm("task", taskId);
  };

  const handleToggleComplete = async (task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    const originalStatus = task.status;

    // Actualización optimista - actualizar AMBOS estados inmediatamente
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ),
    }));
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await tasksAPI.update(task.id, { status: newStatus });
      success(
        newStatus === "done"
          ? "Tarea completada"
          : "Tarea marcada como pendiente"
      );
    } catch (err) {
      // Revertir en caso de error - ambos estados
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === task.id ? { ...t, status: originalStatus } : t
        ),
      }));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: originalStatus } : t
        )
      );
      showError(err.message || "Error al actualizar la tarea");
      console.error("Error updating task:", err);
    }
  };

  const handleChangeStatus = async (task, newStatus) => {
    const originalStatus = task.status;
    const statusLabels = {
      todo: "Por hacer",
      "in-progress": "En Progreso",
      done: "Completada",
    };

    // Actualización optimista - actualizar AMBOS estados inmediatamente
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ),
    }));
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await tasksAPI.update(task.id, { status: newStatus });
      success(`Estado cambiado a: ${statusLabels[newStatus]}`);
    } catch (err) {
      // Revertir en caso de error - ambos estados
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === task.id ? { ...t, status: originalStatus } : t
        ),
      }));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: originalStatus } : t
        )
      );
      showError(err.message || "Error al cambiar el estado");
      console.error("Error changing status:", err);
    }
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const handleTaskSuccess = () => {
    handleCloseTaskModal();
    refreshDataSilently();
  };

  const handleProjectSuccess = () => {
    setIsEditModalOpen(false);
    refreshDataSilently();
  };

  // Gestión de miembros
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setSendingInvite(true);
    try {
      await invitationsAPI.sendInvitation(id, inviteEmail.trim());
      success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail("");
      setShowInviteForm(false);
    } catch (err) {
      showError(err.message || "Error al enviar la invitación");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    setRemovingMember(userId);
    try {
      await projectsAPI.removeCollaborator(id, userId);
      success(`${userName} ha sido removido del proyecto`);
      refreshDataSilently();
    } catch (err) {
      showError(err.message || "Error al remover al colaborador");
    } finally {
      setRemovingMember(null);
    }
  };

  // Obtener lista de todos los miembros del proyecto
  const getAllProjectMembers = () => {
    if (!project) return [];

    const members = [];
    const addedIds = new Set();

    // Si tiene equipo asignado, mostrar miembros del equipo
    if (project.team) {
      // Agregar dueño del equipo
      if (project.team.user) {
        members.push({
          ...project.team.user,
          role: "team_owner",
          roleLabel: "Líder del equipo",
        });
        addedIds.add(project.team.user.id);
      }

      // Agregar miembros del equipo
      if (project.team.members && project.team.members.length > 0) {
        project.team.members.forEach((member) => {
          if (!addedIds.has(member.id)) {
            members.push({
              ...member,
              role: "team_member",
              roleLabel: "Miembro del equipo",
            });
            addedIds.add(member.id);
          }
        });
      }
    } else {
      // Sin equipo: mostrar dueño y colaboradores individuales
      // Agregar al dueño del proyecto
      if (project.user) {
        members.push({
          ...project.user,
          role: "owner",
          roleLabel: "Propietario",
        });
        addedIds.add(project.user.id);
      }

      // Agregar colaboradores (excluyendo al dueño)
      if (project.users && project.users.length > 0) {
        project.users.forEach((user) => {
          if (!addedIds.has(user.id)) {
            members.push({
              ...user,
              role: "collaborator",
              roleLabel: "Colaborador",
            });
            addedIds.add(user.id);
          }
        });
      }
    }

    return members;
  };

  // Verificar si el proyecto usa equipo (no permite gestionar miembros individualmente)
  const hasTeamAssigned = project?.team != null;

  const getStatusInfo = () => {
    if (!project) return { label: "", color: "", bgColor: "", icon: Clock };

    if (project.status === "completed") {
      return {
        label: "Completado",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: CheckCircle,
      };
    }
    if (project.status === "on_hold") {
      return {
        label: "En Pausa",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        icon: AlertCircle,
      };
    }
    return {
      label: "Activo",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      icon: Clock,
    };
  };

  const getPriorityInfo = () => {
    if (!project) return { label: "", color: "", bgColor: "" };

    if (project.priority === "high") {
      return { label: "Alta", color: "text-red-600", bgColor: "bg-red-100" };
    }
    if (project.priority === "medium") {
      return {
        label: "Media",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      };
    }
    return { label: "Baja", color: "text-green-600", bgColor: "bg-green-100" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No definida";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDaysRemaining = () => {
    if (!project?.due_date) return null;
    const today = new Date();
    const dueDate = new Date(project.due_date);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        label: `${Math.abs(diffDays)} días de retraso`,
        color: "text-red-600",
        bgColor: "bg-red-50",
      };
    if (diffDays === 0)
      return {
        label: "Vence hoy",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      };
    if (diffDays <= 7)
      return {
        label: `${diffDays} días restantes`,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
      };
    return {
      label: `${diffDays} días restantes`,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  };

  const statusInfo = getStatusInfo();
  const priorityInfo = getPriorityInfo();
  const daysRemaining = getDaysRemaining();
  const StatusIcon = statusInfo.icon;

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in-progress"
  ).length;
  const pendingTasks = tasks.filter((t) => t.status === "todo").length;

  if (loading) {
    return (
      <Layout title='Cargando...'>
        <div className='flex items-center justify-center py-20'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600'></div>
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout title='Error'>
        <div className='text-center py-20'>
          <p className='text-red-600 text-lg mb-4'>
            {error || "Proyecto no encontrado"}
          </p>
          <button
            onClick={() => navigate("/projects")}
            className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700'
          >
            Volver a Proyectos
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={project.name} subtitle='Gestión del proyecto'>
      {/* Header con acciones */}
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <button
            onClick={() => navigate("/projects")}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-900 transition'
          >
            <ArrowLeft className='w-5 h-5' />
            <span>Volver a Proyectos</span>
          </button>

          <div className='flex items-center gap-2'>
            {project.can_edit && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditModalOpen(true)}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md'
              >
                <Edit className='w-4 h-4' />
                <span>Editar Proyecto</span>
              </motion.button>
            )}

            {project.can_delete && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDeleteProject}
                className='flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md'
              >
                <Trash2 className='w-4 h-4' />
                <span>Eliminar</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Project Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white rounded-2xl p-6 border border-gray-200 shadow-sm'
        >
          <div className='flex items-start gap-6'>
            <div
              className={`${project.color} w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg shrink-0`}
            >
              <span className='text-white font-bold text-3xl'>
                {project.name.charAt(0)}
              </span>
            </div>

            <div className='flex-1'>
              <h1 className='text-3xl font-bold text-gray-900 mb-3'>
                {project.name}
              </h1>

              <div className='flex items-center gap-2 mb-4 flex-wrap'>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color} flex items-center gap-1`}
                >
                  <StatusIcon className='w-4 h-4' />
                  {statusInfo.label}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${priorityInfo.bgColor} ${priorityInfo.color}`}
                >
                  Prioridad {priorityInfo.label}
                </span>
                {daysRemaining && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${daysRemaining.bgColor} ${daysRemaining.color}`}
                  >
                    {daysRemaining.label}
                  </span>
                )}
              </div>

              <p className='text-gray-600 leading-relaxed'>
                {project.description || "Sin descripción disponible"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
        >
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <div className='p-2 bg-indigo-100 rounded-lg'>
                <TrendingUp className='w-5 h-5 text-indigo-600' />
              </div>
              <span className='text-sm font-medium text-gray-700'>
                Progreso
              </span>
            </div>
            <span className='text-2xl font-bold text-indigo-600'>
              {project.progress}%
            </span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-3'>
            <div
              className='bg-indigo-600 h-3 rounded-full transition-all duration-500'
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </motion.div>

        {/* Team Size - Clickeable para abrir modal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setIsMembersModalOpen(true)}
          className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group'
        >
          <div className='flex items-center gap-3 mb-2'>
            <div className='p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors'>
              <Users className='w-5 h-5 text-blue-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>Miembros</span>
          </div>
          <div className='text-3xl font-bold text-blue-600'>
            {getAllProjectMembers().length}
          </div>
          <div className='text-xs text-gray-500 mt-1'>
            {project.team ? `Equipo: ${project.team.name}` : "Ver y gestionar"}
          </div>
        </motion.div>

        {/* Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
        >
          <div className='flex items-center gap-3 mb-2'>
            <div className='p-2 bg-green-100 rounded-lg'>
              <ListChecks className='w-5 h-5 text-green-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>Tareas</span>
          </div>
          <div className='text-3xl font-bold text-green-600'>
            {tasks.length}
          </div>
          <div className='text-xs text-gray-500 mt-1'>
            {completedTasks} completadas
          </div>
        </motion.div>

        {/* Due Date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
        >
          <div className='flex items-center gap-3 mb-2'>
            <div className='p-2 bg-purple-100 rounded-lg'>
              <Calendar className='w-5 h-5 text-purple-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>
              Vencimiento
            </span>
          </div>
          <div className='text-lg font-semibold text-purple-600'>
            {formatDate(project.due_date)}
          </div>
          {daysRemaining && (
            <div className={`text-xs mt-1 font-medium ${daysRemaining.color}`}>
              {daysRemaining.label}
            </div>
          )}
        </motion.div>
      </div>

      {/* Tasks Section */}
      <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h2 className='text-xl font-bold text-gray-900 flex items-center gap-2'>
              <ListChecks className='w-6 h-6 text-indigo-600' />
              Tareas del Proyecto
            </h2>
            <p className='text-sm text-gray-600 mt-1'>
              {completedTasks} de {tasks.length} completadas
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {/* Vista Tabs */}
            <div className='flex items-center bg-gray-100 rounded-lg p-1'>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <LayoutList className='w-4 h-4' />
                <span className='hidden sm:inline'>Lista</span>
              </button>
              <button
                onClick={() => setViewMode("gantt")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "gantt"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <GanttChart className='w-4 h-4' />
                <span className='hidden sm:inline'>Gantt</span>
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === "calendar"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <CalendarDays className='w-4 h-4' />
                <span className='hidden sm:inline'>Calendario</span>
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewTask}
              className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md'
            >
              <Plus className='w-5 h-5' />
              <span>Nueva Tarea</span>
            </motion.button>
          </div>
        </div>

        {/* Tasks Stats */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
          <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
            <div className='text-2xl font-bold text-gray-600'>
              {pendingTasks}
            </div>
            <div className='text-sm text-gray-600'>Pendientes</div>
          </div>
          <div className='bg-blue-50 rounded-lg p-4 border border-blue-200'>
            <div className='text-2xl font-bold text-blue-600'>
              {inProgressTasks}
            </div>
            <div className='text-sm text-blue-600'>En Progreso</div>
          </div>
          <div className='bg-green-50 rounded-lg p-4 border border-green-200'>
            <div className='text-2xl font-bold text-green-600'>
              {completedTasks}
            </div>
            <div className='text-sm text-green-600'>Completadas</div>
          </div>
        </div>

        {/* Vista según el modo seleccionado */}
        {viewMode === "gantt" && (
          <ProjectGantt
            tasks={tasks}
            projectDueDate={project.due_date}
            projectColor={project.color}
          />
        )}

        {viewMode === "calendar" && (
          <ProjectCalendar
            tasks={tasks}
            onTaskClick={(task) => handleEditTask(task)}
          />
        )}

        {/* Tasks List (vista por defecto) */}
        {viewMode === "list" && (
          <>
            {tasks.length === 0 ? (
              <div className='text-center py-12 border-2 border-dashed border-gray-300 rounded-lg'>
                <ListChecks className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                <p className='text-gray-500 mb-4'>
                  No hay tareas en este proyecto
                </p>
                <button
                  onClick={handleNewTask}
                  className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition'
                >
                  Crear primera tarea
                </button>
              </div>
            ) : (
              <div className='space-y-3'>
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className='flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all group'
                  >
                    {/* Checkbox para completar */}
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        task.status === "done"
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 hover:border-green-500"
                      }`}
                    >
                      {task.status === "done" && (
                        <CheckCircle className='w-4 h-4 text-white' />
                      )}
                    </button>

                    <div className='flex items-center gap-4 flex-1'>
                      <div className='flex-1'>
                        <h3
                          className={`font-medium ${
                            task.status === "done"
                              ? "text-gray-500 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className='text-sm text-gray-600 line-clamp-1 mt-1'>
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className='flex items-center gap-2'>
                        {task.is_urgent && (
                          <span className='px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1'>
                            <Zap className='w-3 h-3' />
                            Urgente
                          </span>
                        )}

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            task.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : task.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {task.priority === "high"
                            ? "Alta"
                            : task.priority === "medium"
                            ? "Media"
                            : "Baja"}
                        </span>

                        {/* Dropdown de estado */}
                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleChangeStatus(task, e.target.value)
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer transition-colors ${
                            task.status === "done"
                              ? "bg-green-100 text-green-700"
                              : task.status === "in-progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <option value='todo'>Por hacer</option>
                          <option value='in-progress'>En Progreso</option>
                          <option value='done'>Completada</option>
                        </select>

                        {task.due_date && (
                          <span className='text-xs text-gray-600 flex items-center gap-1'>
                            <Calendar className='w-3 h-3' />
                            {formatDate(task.due_date)}
                          </span>
                        )}

                        {/* Usuarios asignados */}
                        {task.assigned_users &&
                          task.assigned_users.length > 0 && (
                            <div className='flex -space-x-1'>
                              {task.assigned_users.slice(0, 3).map((user) => (
                                <div
                                  key={user.id}
                                  className='w-6 h-6 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-medium text-white border-2 border-white'
                                  title={user.name}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              ))}
                              {task.assigned_users.length > 3 && (
                                <div className='w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-700 border-2 border-white'>
                                  +{task.assigned_users.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button
                        onClick={() => handleEditTask(task)}
                        className='p-2 hover:bg-blue-50 rounded-lg transition-colors'
                      >
                        <Edit className='w-4 h-4 text-blue-600' />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className='p-2 hover:bg-red-50 rounded-lg transition-colors'
                      >
                        <Trash2 className='w-4 h-4 text-red-600' />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {project.can_edit && (
        <ProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          project={project}
          onSuccess={handleProjectSuccess}
        />
      )}

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        task={selectedTask}
        projectId={parseInt(id)}
        onSuccess={handleTaskSuccess}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, id: null })}
        onConfirm={handleConfirmDelete}
        title={
          confirmModal.type === "project"
            ? "Eliminar proyecto"
            : "Eliminar tarea"
        }
        message={
          confirmModal.type === "project"
            ? "¿Estás seguro de que deseas eliminar este proyecto? Se eliminarán también todas las tareas asociadas. Esta acción no se puede deshacer."
            : "¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer."
        }
        confirmText='Eliminar'
        type='danger'
        loading={deleting}
      />

      {/* Modal de Miembros del Proyecto */}
      <AnimatePresence>
        {isMembersModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsMembersModalOpen(false);
                setShowInviteForm(false);
                setInviteEmail("");
              }}
              className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50'
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className='fixed inset-0 z-50 flex items-center justify-center p-4'
            >
              <div className='bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col'>
                {/* Header */}
                <div className='flex items-center justify-between p-5 border-b border-gray-200'>
                  <div>
                    <h2 className='text-lg font-bold text-gray-900 flex items-center gap-2'>
                      <Users className='w-5 h-5 text-indigo-600' />
                      Miembros del Proyecto
                    </h2>
                    <p className='text-sm text-gray-500 mt-0.5'>
                      {hasTeamAssigned
                        ? `Equipo: ${project?.team?.name}`
                        : `${getAllProjectMembers().length} miembros`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsMembersModalOpen(false);
                      setShowInviteForm(false);
                      setInviteEmail("");
                    }}
                    className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
                  >
                    <X className='w-5 h-5 text-gray-500' />
                  </button>
                </div>

                {/* Body */}
                <div className='flex-1 overflow-y-auto p-5'>
                  {/* Aviso si tiene equipo */}
                  {hasTeamAssigned && (
                    <div className='mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg'>
                      <p className='text-sm text-purple-700'>
                        <strong>
                          Este proyecto está asignado a un equipo.
                        </strong>
                        <br />
                        Los miembros se gestionan desde la configuración del
                        equipo "{project?.team?.name}".
                      </p>
                    </div>
                  )}

                  {/* Botón invitar (solo si no tiene equipo y es owner) */}
                  {!hasTeamAssigned && project?.is_owner && (
                    <div className='mb-4'>
                      {!showInviteForm ? (
                        <button
                          onClick={() => setShowInviteForm(true)}
                          className='w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors'
                        >
                          <UserPlus className='w-4 h-4' />
                          Invitar colaborador
                        </button>
                      ) : (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          onSubmit={handleInviteMember}
                          className='space-y-2'
                        >
                          <div className='flex gap-2'>
                            <div className='relative flex-1'>
                              <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                              <input
                                type='email'
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder='Correo electrónico'
                                className='w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                                required
                                autoFocus
                              />
                            </div>
                            <button
                              type='submit'
                              disabled={sendingInvite || !inviteEmail.trim()}
                              className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                            >
                              {sendingInvite ? (
                                <Loader2 className='w-4 h-4 animate-spin' />
                              ) : (
                                <Send className='w-4 h-4' />
                              )}
                            </button>
                            <button
                              type='button'
                              onClick={() => {
                                setShowInviteForm(false);
                                setInviteEmail("");
                              }}
                              className='p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors'
                            >
                              <X className='w-4 h-4' />
                            </button>
                          </div>
                          <p className='text-xs text-gray-500'>
                            Se enviará un email de invitación
                          </p>
                        </motion.form>
                      )}
                    </div>
                  )}

                  {/* Lista de miembros */}
                  <div className='space-y-2'>
                    {getAllProjectMembers().map((member) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className='flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                              member.role === "team_owner" ||
                              member.role === "team_member"
                                ? "bg-linear-to-br from-purple-500 to-pink-600"
                                : "bg-linear-to-br from-indigo-500 to-purple-600"
                            }`}
                          >
                            {member.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className='flex items-center gap-2'>
                              <span className='font-medium text-gray-900'>
                                {member.name}
                              </span>
                              {member.role === "owner" && (
                                <span className='flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full'>
                                  <Crown className='w-3 h-3' />
                                  Propietario
                                </span>
                              )}
                              {member.role === "collaborator" && (
                                <span className='px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full'>
                                  Colaborador
                                </span>
                              )}
                              {member.role === "team_owner" && (
                                <span className='flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-full'>
                                  <Crown className='w-3 h-3' />
                                  Líder
                                </span>
                              )}
                              {member.role === "team_member" && (
                                <span className='px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-full'>
                                  Equipo
                                </span>
                              )}
                            </div>
                            <span className='text-sm text-gray-500'>
                              {member.email}
                            </span>
                          </div>
                        </div>

                        {/* Remove button (solo si no tiene equipo, es owner, y es colaborador) */}
                        {!hasTeamAssigned &&
                          project?.is_owner &&
                          member.role === "collaborator" && (
                            <button
                              onClick={() =>
                                handleRemoveMember(member.id, member.name)
                              }
                              disabled={removingMember === member.id}
                              className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50'
                              title='Remover del proyecto'
                            >
                              {removingMember === member.id ? (
                                <Loader2 className='w-4 h-4 animate-spin' />
                              ) : (
                                <UserMinus className='w-4 h-4' />
                              )}
                            </button>
                          )}
                      </motion.div>
                    ))}

                    {getAllProjectMembers().length === 0 && (
                      <div className='text-center py-8 text-gray-500'>
                        <Users className='w-12 h-12 mx-auto mb-2 text-gray-300' />
                        <p>No hay miembros en este proyecto</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className='px-5 py-3 bg-gray-50 border-t border-gray-200'>
                  <button
                    onClick={() => {
                      setIsMembersModalOpen(false);
                      setShowInviteForm(false);
                      setInviteEmail("");
                    }}
                    className='w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default ProjectDetail;

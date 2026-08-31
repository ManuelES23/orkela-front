import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/layout/Layout";
import TaskModal from "../components/modals/TaskModal";
import TaskDetailModal from "../components/modals/TaskDetailModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import UserAvatar from "../components/ui/UserAvatar";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import ProgressRing from "../components/ui/ProgressRing";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import { SkeletonRows } from "../components/ui/Skeleton";
import { motionTokens } from "../components/animations/variants";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Flag,
  CheckCircle2,
  Circle,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { tasksAPI, checklistAPI } from "../utils/api";
import { parseLocalDate } from "../utils/dateUtils";

const Tasks = () => {
  const { user } = useAuth();
  const { success, error: showError } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    taskId: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [expandedChecklists, setExpandedChecklists] = useState({});

  // Función para cargar tareas con indicador de carga (carga inicial)
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksAPI.getAll();
      setTasks(data);
    } catch (err) {
      console.error("Error al cargar tareas:", err);
      setError("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para actualizar tareas silenciosamente (sin spinner, para tiempo real)
  const refreshTasksSilently = useCallback(async () => {
    try {
      const data = await tasksAPI.getAll();
      setTasks(data);
    } catch (err) {
      console.error("Error refreshing tasks:", err);
      // No mostrar error en actualización silenciosa
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Registrar callback para refrescar datos en tiempo real (silencioso)
  useEffect(() => {
    registerRefresh("tasks", refreshTasksSilently);
    return () => unregisterRefresh("tasks");
  }, [registerRefresh, unregisterRefresh, refreshTasksSilently]);

  const openDeleteConfirm = (taskId) => {
    setConfirmModal({ isOpen: true, taskId });
  };

  const handleDelete = async () => {
    const taskId = confirmModal.taskId;

    // Guardar tareas originales para posible rollback
    const originalTasks = [...tasks];

    // Actualización optimista - remover de UI inmediatamente
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    setDeleting(true);
    try {
      await tasksAPI.delete(taskId);
      success("Tarea eliminada exitosamente");
      // No necesitamos recargar, ya actualizamos optimísticamente
    } catch (err) {
      // Revertir en caso de error
      setTasks(originalTasks);
      console.error("Error al eliminar tarea:", err);
      showError(err.message || "No se pudo eliminar la tarea");
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, taskId: null });
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    refreshTasksSilently();
  };

  const handleToggleStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    await handleChangeStatus(taskId, currentStatus, newStatus);
  };

  // Función para cambiar el estado de una tarea a cualquier estado
  const handleChangeStatus = async (taskId, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return;

    // Guardar estado original para posible rollback
    const originalTask = tasks.find((task) => task.id === taskId);

    // Actualización optimista - actualizar UI inmediatamente
    // Si se marca como completada, también auto-completar las subtareas
    setTasks((prevTasks) => {
      const updated = prevTasks.map((task) => {
        if (task.id !== taskId) return task;

        const updatedTask = { ...task, status: newStatus };

        // Auto-completar subtareas si se marca como done
        if (newStatus === "done" && task.checklist_items?.length > 0) {
          updatedTask.checklist_items = task.checklist_items.map((item) => ({
            ...item,
            is_completed: true,
          }));
        }

        return updatedTask;
      });
      return updated;
    });

    try {
      // El backend devuelve la tarea actualizada con checklist_items
      const updatedTask = await tasksAPI.update(taskId, { status: newStatus });

      // Actualizar con los datos reales del backend
      setTasks((prevTasks) => {
        return prevTasks.map((task) => {
          if (task.id !== taskId) return task;
          return { ...task, ...updatedTask };
        });
      });

      const statusMessages = {
        done: "Tarea completada",
        "in-progress": "Tarea en progreso",
        todo: "Tarea marcada como pendiente",
      };
      success(statusMessages[newStatus] || "Estado actualizado");
    } catch (err) {
      // Revertir en caso de error - restaurar tarea original completa
      console.error("Error, reverting...", err);
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? originalTask : task)),
      );
      showError(err.message || "No se pudo actualizar el estado de la tarea");
    }
  };

  const toggleChecklist = (taskId) => {
    setExpandedChecklists((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleViewDetail = (task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
  };

  const handleToggleChecklistItem = async (taskId, itemId, event) => {
    event.stopPropagation();

    // Optimistic update
    const originalTasks = [...tasks];
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              checklist_items: task.checklist_items.map((item) =>
                item.id === itemId
                  ? { ...item, is_completed: !item.is_completed }
                  : item,
              ),
            }
          : task,
      ),
    );

    try {
      await checklistAPI.toggle(taskId, itemId);
    } catch (err) {
      console.error("Error toggling checklist item:", err);
      showError(err.message || "No se pudo actualizar la subtarea");
      // Revert on error
      setTasks(originalTasks);
    }
  };

  // Verificar si el usuario puede editar/eliminar una tarea
  const canEditOrDeleteTask = (task) => {
    if (!user || !task) return false;

    // El creador de la tarea puede editar/eliminar
    if (task.user_id === user.id) return true;

    // Los usuarios asignados pueden editar/eliminar
    if (task.assigned_users && task.assigned_users.length > 0) {
      return task.assigned_users.some(
        (assignedUser) => assignedUser.id === user.id,
      );
    }

    // Fallback para assigned_user (retrocompatibilidad)
    if (task.assigned_user && task.assigned_user.id === user.id) {
      return true;
    }

    return false;
  };

  const priorityColors = {
    high: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800",
    medium: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800",
    low: "text-gray-600 dark:text-night-300 bg-gray-50 dark:bg-night-800 border-gray-200 dark:border-night-700",
  };

  const priorityLabels = {
    high: "Alta",
    medium: "Media",
    low: "Baja",
  };

  const statusLabels = {
    todo: "Por hacer",
    "in-progress": "En progreso",
    done: "Completada",
  };

  const statusTabs = [
    { key: "all", label: "Todas" },
    { key: "todo", label: "Por hacer" },
    { key: "in-progress", label: "En progreso" },
    { key: "done", label: "Completadas" },
  ];

  // Función para calcular días hasta vencimiento
  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseLocalDate(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calcular contadores para los filtros especiales
  const taskCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dueToday = 0;
    let dueSoon = 0; // Próximos 3 días
    let overdue = 0;

    tasks.forEach((task) => {
      if (task.status === "done") return; // Ignorar completadas

      const days = getDaysUntilDue(task.due_date);
      if (days === null) return;

      if (days < 0) {
        overdue++;
      } else if (days === 0) {
        dueToday++;
      } else if (days <= 3) {
        dueSoon++;
      }
    });

    return { dueToday, dueSoon, overdue };
  }, [tasks]);

  // Usar useMemo para evitar re-cálculos innecesarios
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filtro de búsqueda
      const matchesSearch =
        searchTerm === "" ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.project?.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Filtros especiales de fecha
      if (activeTab === "today") {
        const days = getDaysUntilDue(task.due_date);
        return days === 0 && task.status !== "done";
      }

      if (activeTab === "upcoming") {
        const days = getDaysUntilDue(task.due_date);
        return days !== null && days > 0 && days <= 3 && task.status !== "done";
      }

      if (activeTab === "overdue") {
        const days = getDaysUntilDue(task.due_date);
        return days !== null && days < 0 && task.status !== "done";
      }

      // Filtros de estado
      const matchesTab = activeTab === "all" || task.status === activeTab;
      return matchesTab;
    });
  }, [tasks, activeTab, searchTerm]);

  return (
    <Layout title='Tareas' subtitle='Organiza y gestiona todas tus tareas'>
      {/* Barra de acciones */}
      <FadeIn delay={0.1}>
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6'>
          <div className='flex gap-3 flex-1 w-full md:w-auto'>
            <div className='relative flex-1 md:flex-initial'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500' />
              <input
                type='text'
                placeholder='Buscar tareas...'
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

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewTask}
            className='flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition w-full md:w-auto justify-center'
          >
            <Plus className='w-5 h-5' />
            Nueva Tarea
          </motion.button>
        </div>
      </FadeIn>

      {/* Franja resumen - contadores animados por urgencia */}
      <FadeIn delay={0.15}>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6'>
          {/* Vencen hoy */}
          <motion.button
            type='button'
            onClick={() =>
              setActiveTab(activeTab === "today" ? "all" : "today")
            }
            whileHover={{ y: -2 }}
            transition={motionTokens.springSnappy}
            className={`text-left rounded-xl border p-4 flex items-center gap-3 transition-colors ${
              activeTab === "today"
                ? "bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-700 ring-1 ring-orange-300"
                : "bg-white dark:bg-night-900 border-gray-200 dark:border-night-700 hover:border-orange-200 dark:hover:border-orange-800"
            }`}
          >
            <div className='w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0'>
              <Clock className='w-5 h-5' />
            </div>
            <div>
              <p className='text-2xl font-bold text-gray-900 dark:text-night-50 leading-none font-mono'>
                <AnimatedNumber value={taskCounts.dueToday} />
              </p>
              <p className='text-xs font-medium text-gray-500 dark:text-night-400 mt-1'>
                Vencen hoy
              </p>
            </div>
          </motion.button>

          {/* Próximas */}
          <motion.button
            type='button'
            onClick={() =>
              setActiveTab(activeTab === "upcoming" ? "all" : "upcoming")
            }
            whileHover={{ y: -2 }}
            transition={motionTokens.springSnappy}
            className={`text-left rounded-xl border p-4 flex items-center gap-3 transition-colors ${
              activeTab === "upcoming"
                ? "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-700 ring-1 ring-yellow-300"
                : "bg-white dark:bg-night-900 border-gray-200 dark:border-night-700 hover:border-yellow-200 dark:hover:border-yellow-800"
            }`}
          >
            <div className='w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0'>
              <CalendarClock className='w-5 h-5' />
            </div>
            <div>
              <p className='text-2xl font-bold text-gray-900 dark:text-night-50 leading-none font-mono'>
                <AnimatedNumber value={taskCounts.dueSoon} />
              </p>
              <p className='text-xs font-medium text-gray-500 dark:text-night-400 mt-1'>
                Próximas (3 días)
              </p>
            </div>
          </motion.button>

          {/* Vencidas */}
          <motion.button
            type='button'
            onClick={() =>
              taskCounts.overdue > 0 &&
              setActiveTab(activeTab === "overdue" ? "all" : "overdue")
            }
            whileHover={taskCounts.overdue > 0 ? { y: -2 } : undefined}
            transition={motionTokens.springSnappy}
            className={`text-left rounded-xl border p-4 flex items-center gap-3 transition-colors ${
              taskCounts.overdue === 0
                ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 cursor-default"
                : activeTab === "overdue"
                  ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 ring-1 ring-red-300"
                  : "bg-white dark:bg-night-900 border-gray-200 dark:border-night-700 hover:border-red-200 dark:hover:border-red-800 animate-pulse"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                taskCounts.overdue === 0
                  ? "bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
              }`}
            >
              <AlertTriangle className='w-5 h-5' />
            </div>
            <div>
              <p className='text-2xl font-bold text-gray-900 dark:text-night-50 leading-none font-mono'>
                <AnimatedNumber value={taskCounts.overdue} />
              </p>
              <p className='text-xs font-medium text-gray-500 dark:text-night-400 mt-1'>
                {taskCounts.overdue === 0 ? "¡Todo al día!" : "Vencidas"}
              </p>
            </div>
          </motion.button>
        </div>
      </FadeIn>

      {/* Tabs de estado - píldoras con indicador deslizante */}
      <FadeIn delay={0.2}>
        <div className='flex flex-wrap gap-1 mb-6 p-1 bg-gray-100 dark:bg-night-800 rounded-xl w-fit'>
          {statusTabs.map((tab) => {
            const count =
              tab.key === "all"
                ? tasks.length
                : tasks.filter((t) => t.status === tab.key).length;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "text-brand-700"
                    : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-50"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId='tasks-status-tab'
                    transition={motionTokens.springSnappy}
                    className='absolute inset-0 rounded-lg bg-white dark:bg-night-900 shadow-sm'
                  />
                )}
                <span className='relative'>
                  {tab.label} ({count})
                </span>
              </button>
            );
          })}
        </div>
      </FadeIn>

      {/* Loading y Error States */}
      {loading && <SkeletonRows count={6} />}

      {error && (
        <div className='bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg'>
          {error}
        </div>
      )}

      {/* Lista de tareas */}
      {!loading && !error && (
        <>
          {filteredTasks.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-gray-500 dark:text-night-400 text-lg'>
                {searchTerm
                  ? "No se encontraron tareas con ese criterio"
                  : "No hay tareas en esta categoría"}
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              <AnimatePresence mode='popLayout'>
                {filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    onClick={() => handleViewDetail(task)}
                    className='bg-white dark:bg-night-900 rounded-lg shadow-sm border border-gray-200 dark:border-night-700 p-4 cursor-pointer group'
                  >
                    <div className='flex items-start gap-4'>
                      {/* Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(task.id, task.status);
                        }}
                        className='mt-1 hover:scale-110 transition-transform'
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 className='w-5 h-5 text-green-500 dark:text-green-400' />
                        ) : (
                          <Circle className='w-5 h-5 text-gray-300 dark:text-night-600 hover:text-gray-400 dark:hover:text-night-500' />
                        )}
                      </button>

                      {/* Contenido */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-4 mb-2'>
                          <div className='flex-1'>
                            <h3
                              className={`font-semibold text-gray-900 dark:text-night-50 mb-1 ${
                                task.status === "done"
                                  ? "line-through text-gray-500 dark:text-night-400"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </h3>
                            <p className='text-sm text-gray-600 dark:text-night-300'>
                              {task.description || "Sin descripción"}
                            </p>
                          </div>

                          <div className='flex items-center gap-2'>
                            {/* Prioridad */}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${
                                priorityColors[task.priority]
                              }`}
                            >
                              <Flag className='w-3 h-3' />
                              {priorityLabels[task.priority]}
                            </span>

                            {/* Acciones - Solo si tiene permisos */}
                            {canEditOrDeleteTask(task) && (
                              <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(task);
                                  }}
                                  className='p-1 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-all duration-200'
                                >
                                  <Edit className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteConfirm(task.id);
                                  }}
                                  className='p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-all duration-200'
                                >
                                  <Trash2 className='w-4 h-4 text-red-600 dark:text-red-400' />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metadatos */}
                        <div className='flex flex-wrap items-center gap-4 text-sm'>
                          {task.project && (
                            <span className='px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-xs font-medium'>
                              {task.project.name}
                            </span>
                          )}

                          {/* Etiquetas */}
                          {task.tags && task.tags.length > 0 && (
                            <div className='flex flex-wrap items-center gap-1'>
                              {task.tags.slice(0, 4).map((tag) => {
                                const colorClasses = {
                                  red: {
                                    bg: "bg-red-100 dark:bg-red-950/40",
                                    text: "text-red-700 dark:text-red-300",
                                  },
                                  orange: {
                                    bg: "bg-orange-100 dark:bg-orange-950/40",
                                    text: "text-orange-700 dark:text-orange-300",
                                  },
                                  yellow: {
                                    bg: "bg-yellow-100 dark:bg-yellow-950/40",
                                    text: "text-yellow-700 dark:text-yellow-300",
                                  },
                                  green: {
                                    bg: "bg-green-100 dark:bg-green-950/40",
                                    text: "text-green-700 dark:text-green-300",
                                  },
                                  teal: {
                                    bg: "bg-teal-100 dark:bg-teal-950/40",
                                    text: "text-teal-700 dark:text-teal-300",
                                  },
                                  blue: {
                                    bg: "bg-blue-100 dark:bg-blue-950/40",
                                    text: "text-blue-700 dark:text-blue-300",
                                  },
                                  indigo: {
                                    bg: "bg-indigo-100 dark:bg-indigo-950/40",
                                    text: "text-indigo-700 dark:text-indigo-300",
                                  },
                                  purple: {
                                    bg: "bg-purple-100 dark:bg-purple-950/40",
                                    text: "text-purple-700 dark:text-purple-300",
                                  },
                                  pink: {
                                    bg: "bg-pink-100 dark:bg-pink-950/40",
                                    text: "text-pink-700 dark:text-pink-300",
                                  },
                                  gray: {
                                    bg: "bg-gray-100 dark:bg-night-800",
                                    text: "text-gray-700 dark:text-night-300",
                                  },
                                };
                                const colors =
                                  colorClasses[tag.color] || colorClasses.gray;
                                return (
                                  <span
                                    key={tag.id}
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                                    title={tag.name}
                                  >
                                    {tag.name}
                                  </span>
                                );
                              })}
                              {task.tags.length > 4 && (
                                <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-night-800 text-gray-600 dark:text-night-300'>
                                  +{task.tags.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Fecha con indicador de vencimiento */}
                          {(() => {
                            const days = getDaysUntilDue(task.due_date);
                            const isCompleted = task.status === "done";

                            if (!task.due_date) {
                              return (
                                <div className='flex items-center gap-1 text-gray-400 dark:text-night-500'>
                                  <Calendar className='w-4 h-4' />
                                  Sin fecha
                                </div>
                              );
                            }

                            // Determinar estilo según días restantes
                            let dateStyle = "text-gray-600 dark:text-night-300";
                            let bgStyle = "";
                            let icon = <Calendar className='w-4 h-4' />;
                            let badge = null;

                            if (!isCompleted) {
                              if (days < 0) {
                                // Vencida
                                dateStyle = "text-red-700 dark:text-red-300 font-medium";
                                bgStyle = "bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded-lg";
                                icon = (
                                  <AlertTriangle className='w-4 h-4 text-red-500 dark:text-red-400' />
                                );
                                badge = (
                                  <span className='ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded'>
                                    VENCIDA
                                  </span>
                                );
                              } else if (days === 0) {
                                // Vence hoy
                                dateStyle = "text-orange-700 dark:text-orange-300 font-medium";
                                bgStyle = "bg-orange-50 dark:bg-orange-950/40 px-2 py-1 rounded-lg";
                                icon = (
                                  <Clock className='w-4 h-4 text-orange-500 dark:text-orange-400' />
                                );
                                badge = (
                                  <span className='ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded'>
                                    HOY
                                  </span>
                                );
                              } else if (days <= 3) {
                                // Próxima a vencer
                                dateStyle = "text-yellow-700 dark:text-yellow-300 font-medium";
                                bgStyle = "bg-yellow-50 dark:bg-yellow-950/40 px-2 py-1 rounded-lg";
                                icon = (
                                  <CalendarClock className='w-4 h-4 text-yellow-500 dark:text-yellow-400' />
                                );
                                badge = (
                                  <span className='ml-1 text-[10px] font-medium text-yellow-600 dark:text-yellow-400'>
                                    {days === 1 ? "mañana" : `en ${days} días`}
                                  </span>
                                );
                              }
                            }

                            return (
                              <div
                                className={`flex items-center gap-1 ${dateStyle} ${bgStyle}`}
                              >
                                {icon}
                                {parseLocalDate(
                                  task.due_date,
                                ).toLocaleDateString("es-ES")}
                                {badge}
                              </div>
                            );
                          })()}

                          {/* Mostrar usuarios asignados (múltiples) */}
                          {task.assigned_users &&
                            task.assigned_users.length > 0 && (
                              <div className='flex items-center gap-1'>
                                <div className='flex -space-x-2'>
                                  {task.assigned_users
                                    .slice(0, 3)
                                    .map((user) => (
                                      <UserAvatar
                                        key={user.id}
                                        user={user}
                                        size='sm'
                                        showBorder
                                      />
                                    ))}
                                  {task.assigned_users.length > 3 && (
                                    <div className='w-6 h-6 rounded-full bg-gray-200 dark:bg-night-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-night-300 border-2 border-white dark:border-night-900'>
                                      +{task.assigned_users.length - 3}
                                    </div>
                                  )}
                                </div>
                                <span className='text-gray-500 dark:text-night-400 text-xs ml-1'>
                                  {task.assigned_users.length === 1
                                    ? task.assigned_users[0].name
                                    : `${task.assigned_users.length} asignados`}
                                </span>
                              </div>
                            )}

                          {/* Fallback para assigned_user simple (retrocompatibilidad) */}
                          {(!task.assigned_users ||
                            task.assigned_users.length === 0) &&
                            task.assigned_user && (
                              <div className='flex items-center gap-2'>
                                <UserAvatar
                                  user={task.assigned_user}
                                  size='sm'
                                />
                                <span className='text-gray-700 dark:text-night-300'>
                                  {task.assigned_user.name}
                                </span>
                              </div>
                            )}

                          {/* Indicador de Checklist - Clickeable para expandir */}
                          {task.checklist_items &&
                            task.checklist_items.length > 0 &&
                            (() => {
                              const completedCount =
                                task.checklist_items.filter(
                                  (item) => item.is_completed,
                                ).length;
                              const totalCount = task.checklist_items.length;
                              const pct = Math.round(
                                (completedCount / totalCount) * 100,
                              );
                              return (
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleChecklist(task.id);
                                  }}
                                  className='flex items-center gap-1.5 text-gray-600 dark:text-night-300 hover:text-brand-600 transition-colors'
                                >
                                  <ProgressRing
                                    percentage={pct}
                                    size={22}
                                    strokeWidth={2.5}
                                    color={
                                      pct === 100 ? "#22c55e" : "#7c3aed"
                                    }
                                  />
                                  <span className='text-xs'>
                                    {completedCount}/{totalCount}
                                  </span>
                                  {expandedChecklists[task.id] ? (
                                    <ChevronUp className='w-3 h-3' />
                                  ) : (
                                    <ChevronDown className='w-3 h-3' />
                                  )}
                                </button>
                              );
                            })()}

                          {/* Selector de Estado */}
                          {canEditOrDeleteTask(task) ? (
                            <select
                              value={task.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleChangeStatus(
                                  task.id,
                                  task.status,
                                  e.target.value,
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-xs font-medium px-2 py-1 rounded-lg border cursor-pointer transition-colors ${
                                task.status === "done"
                                  ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/40"
                                  : task.status === "in-progress"
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/40"
                                    : "bg-gray-50 dark:bg-night-800 text-gray-700 dark:text-night-300 border-gray-200 dark:border-night-700 hover:bg-gray-100 dark:hover:bg-night-800"
                              }`}
                            >
                              <option value='todo'>Por hacer</option>
                              <option value='in-progress'>En progreso</option>
                              <option value='done'>Completada</option>
                            </select>
                          ) : (
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-lg ${
                                task.status === "done"
                                  ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                                  : task.status === "in-progress"
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                    : "bg-gray-50 dark:bg-night-800 text-gray-700 dark:text-night-300"
                              }`}
                            >
                              {statusLabels[task.status]}
                            </span>
                          )}
                        </div>

                        {/* Lista expandible de Checklist */}
                        {expandedChecklists[task.id] &&
                          task.checklist_items &&
                          task.checklist_items.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className='mt-3 pt-3 border-t border-gray-100 dark:border-night-700'
                            >
                              <div className='space-y-1.5'>
                                {task.checklist_items.map((item) => (
                                  <button
                                    key={item.id}
                                    type='button'
                                    onClick={(e) =>
                                      handleToggleChecklistItem(
                                        task.id,
                                        item.id,
                                        e,
                                      )
                                    }
                                    className='flex items-center gap-2 text-sm w-full text-left py-1 px-2 -mx-2 rounded hover:bg-gray-100 dark:hover:bg-night-800 transition-colors'
                                  >
                                    {item.is_completed ? (
                                      <CheckSquare className='w-4 h-4 text-green-500 dark:text-green-400 shrink-0' />
                                    ) : (
                                      <Square className='w-4 h-4 text-gray-400 dark:text-night-500 shrink-0' />
                                    )}
                                    <span
                                      className={
                                        item.is_completed
                                          ? "text-gray-400 dark:text-night-500 line-through"
                                          : "text-gray-600 dark:text-night-300"
                                      }
                                    >
                                      {item.text}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Modal de Tarea */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        onSuccess={handleSuccess}
      />

      {/* Modal de Detalle de Tarea */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        task={selectedTask}
        onEdit={(task) => {
          setSelectedTask(task);
          setIsDetailModalOpen(false);
          setIsModalOpen(true);
        }}
        onDelete={(taskId) => {
          setIsDetailModalOpen(false);
          openDeleteConfirm(taskId);
        }}
        onUpdate={refreshTasksSilently}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, taskId: null })}
        onConfirm={handleDelete}
        title='Eliminar tarea'
        message='¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.'
        confirmText='Eliminar'
        type='danger'
        loading={deleting}
      />
    </Layout>
  );
};

export default Tasks;

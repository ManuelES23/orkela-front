import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/layout/Layout";
import TaskModal from "../components/modals/TaskModal";
import TaskDetailModal from "../components/modals/TaskDetailModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
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
  Loader2,
  ListTodo,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { tasksAPI, checklistAPI } from "../utils/api";

const Tasks = () => {
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

    console.log(`Toggle task ${taskId}: ${currentStatus} -> ${newStatus}`);

    // Actualización optimista - actualizar UI inmediatamente
    setTasks((prevTasks) => {
      const updated = prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      console.log(
        "Tasks updated optimistically:",
        updated.find((t) => t.id === taskId)?.status
      );
      return updated;
    });

    try {
      const response = await tasksAPI.update(taskId, { status: newStatus });
      console.log("API response:", response.status);
      success(
        newStatus === "done"
          ? "Tarea completada"
          : "Tarea marcada como pendiente"
      );
    } catch (err) {
      // Revertir en caso de error
      console.error("Error, reverting...", err);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, status: currentStatus } : task
        )
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
                  : item
              ),
            }
          : task
      )
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

  const priorityColors = {
    high: "text-red-600 bg-red-50 border-red-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
    low: "text-gray-600 bg-gray-50 border-gray-200",
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

  // Función para calcular días hasta vencimiento
  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
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
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar tareas...'
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
            onClick={handleNewTask}
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition w-full md:w-auto justify-center'
          >
            <Plus className='w-5 h-5' />
            Nueva Tarea
          </motion.button>
        </div>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.2}>
        <div className='flex flex-wrap gap-2 mb-6 border-b border-gray-200'>
          {/* Tabs de estado */}
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "all"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Todas ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab("todo")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "todo"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Por hacer ({tasks.filter((t) => t.status === "todo").length})
          </button>
          <button
            onClick={() => setActiveTab("in-progress")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "in-progress"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            En progreso (
            {tasks.filter((t) => t.status === "in-progress").length})
          </button>
          <button
            onClick={() => setActiveTab("done")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "done"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Completadas ({tasks.filter((t) => t.status === "done").length})
          </button>

          {/* Separador */}
          <div className='border-l border-gray-300 mx-2 h-8 self-center' />

          {/* Tabs de fecha */}
          <button
            onClick={() => setActiveTab("today")}
            className={`px-4 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === "today"
                ? "border-orange-500 text-orange-600"
                : taskCounts.dueToday > 0
                ? "border-transparent text-orange-600 hover:text-orange-700 bg-orange-50 rounded-t-lg"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Clock className='w-4 h-4' />
            Hoy
            {taskCounts.dueToday > 0 && (
              <span className='ml-1 px-1.5 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full'>
                {taskCounts.dueToday}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === "upcoming"
                ? "border-yellow-500 text-yellow-600"
                : taskCounts.dueSoon > 0
                ? "border-transparent text-yellow-600 hover:text-yellow-700 bg-yellow-50 rounded-t-lg"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <CalendarClock className='w-4 h-4' />
            Próximas
            {taskCounts.dueSoon > 0 && (
              <span className='ml-1 px-1.5 py-0.5 text-xs font-bold bg-yellow-500 text-white rounded-full'>
                {taskCounts.dueSoon}
              </span>
            )}
          </button>
          {taskCounts.overdue > 0 && (
            <button
              onClick={() => setActiveTab("overdue")}
              className={`px-4 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === "overdue"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-red-600 hover:text-red-700 bg-red-50 rounded-t-lg animate-pulse"
              }`}
            >
              <AlertTriangle className='w-4 h-4' />
              Vencidas
              <span className='ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full'>
                {taskCounts.overdue}
              </span>
            </button>
          )}
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

      {/* Lista de tareas */}
      {!loading && !error && (
        <>
          {filteredTasks.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-gray-500 text-lg'>
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
                    className='bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer group'
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
                          <CheckCircle2 className='w-5 h-5 text-green-500' />
                        ) : (
                          <Circle className='w-5 h-5 text-gray-300 hover:text-gray-400' />
                        )}
                      </button>

                      {/* Contenido */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-4 mb-2'>
                          <div className='flex-1'>
                            <h3
                              className={`font-semibold text-gray-900 mb-1 ${
                                task.status === "done"
                                  ? "line-through text-gray-500"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </h3>
                            <p className='text-sm text-gray-600'>
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

                            {/* Acciones */}
                            <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(task);
                                }}
                                className='p-1 hover:bg-blue-50 rounded transition-all duration-200'
                              >
                                <Edit className='w-4 h-4 text-blue-600' />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteConfirm(task.id);
                                }}
                                className='p-1 hover:bg-red-50 rounded transition-all duration-200'
                              >
                                <Trash2 className='w-4 h-4 text-red-600' />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Metadatos */}
                        <div className='flex flex-wrap items-center gap-4 text-sm'>
                          {task.project && (
                            <span className='px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium'>
                              {task.project.name}
                            </span>
                          )}

                          {/* Fecha con indicador de vencimiento */}
                          {(() => {
                            const days = getDaysUntilDue(task.due_date);
                            const isCompleted = task.status === "done";

                            if (!task.due_date) {
                              return (
                                <div className='flex items-center gap-1 text-gray-400'>
                                  <Calendar className='w-4 h-4' />
                                  Sin fecha
                                </div>
                              );
                            }

                            // Determinar estilo según días restantes
                            let dateStyle = "text-gray-600";
                            let bgStyle = "";
                            let icon = <Calendar className='w-4 h-4' />;
                            let badge = null;

                            if (!isCompleted) {
                              if (days < 0) {
                                // Vencida
                                dateStyle = "text-red-700 font-medium";
                                bgStyle = "bg-red-50 px-2 py-1 rounded-lg";
                                icon = (
                                  <AlertTriangle className='w-4 h-4 text-red-500' />
                                );
                                badge = (
                                  <span className='ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded'>
                                    VENCIDA
                                  </span>
                                );
                              } else if (days === 0) {
                                // Vence hoy
                                dateStyle = "text-orange-700 font-medium";
                                bgStyle = "bg-orange-50 px-2 py-1 rounded-lg";
                                icon = (
                                  <Clock className='w-4 h-4 text-orange-500' />
                                );
                                badge = (
                                  <span className='ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded'>
                                    HOY
                                  </span>
                                );
                              } else if (days <= 3) {
                                // Próxima a vencer
                                dateStyle = "text-yellow-700 font-medium";
                                bgStyle = "bg-yellow-50 px-2 py-1 rounded-lg";
                                icon = (
                                  <CalendarClock className='w-4 h-4 text-yellow-500' />
                                );
                                badge = (
                                  <span className='ml-1 text-[10px] font-medium text-yellow-600'>
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
                                {new Date(task.due_date).toLocaleDateString(
                                  "es-ES"
                                )}
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
                                      <div
                                        key={user.id}
                                        className='w-6 h-6 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-medium text-white border-2 border-white'
                                        title={user.name}
                                      >
                                        {user.name.charAt(0).toUpperCase()}
                                      </div>
                                    ))}
                                  {task.assigned_users.length > 3 && (
                                    <div className='w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white'>
                                      +{task.assigned_users.length - 3}
                                    </div>
                                  )}
                                </div>
                                <span className='text-gray-500 text-xs ml-1'>
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
                                <div className='w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600'>
                                  {task.assigned_user.name.charAt(0)}
                                </div>
                                <span className='text-gray-700'>
                                  {task.assigned_user.name}
                                </span>
                              </div>
                            )}

                          {/* Indicador de Checklist - Clickeable para expandir */}
                          {task.checklist_items &&
                            task.checklist_items.length > 0 && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleChecklist(task.id);
                                }}
                                className='flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition-colors'
                              >
                                <ListTodo className='w-4 h-4' />
                                <span className='text-xs'>
                                  {
                                    task.checklist_items.filter(
                                      (item) => item.is_completed
                                    ).length
                                  }
                                  /{task.checklist_items.length}
                                </span>
                                {/* Mini barra de progreso */}
                                <div className='w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden'>
                                  <div
                                    className='h-full bg-green-500 rounded-full transition-all duration-300'
                                    style={{
                                      width: `${
                                        (task.checklist_items.filter(
                                          (item) => item.is_completed
                                        ).length /
                                          task.checklist_items.length) *
                                        100
                                      }%`,
                                    }}
                                  />
                                </div>
                                {expandedChecklists[task.id] ? (
                                  <ChevronUp className='w-3 h-3' />
                                ) : (
                                  <ChevronDown className='w-3 h-3' />
                                )}
                              </button>
                            )}

                          <span className='text-gray-500 text-xs'>
                            {statusLabels[task.status]}
                          </span>
                        </div>

                        {/* Lista expandible de Checklist */}
                        {expandedChecklists[task.id] &&
                          task.checklist_items &&
                          task.checklist_items.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className='mt-3 pt-3 border-t border-gray-100'
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
                                        e
                                      )
                                    }
                                    className='flex items-center gap-2 text-sm w-full text-left py-1 px-2 -mx-2 rounded hover:bg-gray-100 transition-colors'
                                  >
                                    {item.is_completed ? (
                                      <CheckSquare className='w-4 h-4 text-green-500 shrink-0' />
                                    ) : (
                                      <Square className='w-4 h-4 text-gray-400 shrink-0' />
                                    )}
                                    <span
                                      className={
                                        item.is_completed
                                          ? "text-gray-400 line-through"
                                          : "text-gray-600"
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

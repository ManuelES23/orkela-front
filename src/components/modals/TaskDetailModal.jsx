import { useState, useEffect, useCallback } from "react";
import Modal from "../ui/Modal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Flag,
  FolderKanban,
  Users,
  Clock,
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  Square,
  Edit,
  Trash2,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { checklistAPI, tasksAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";
import { useRealtime } from "../../context/RealtimeContext";
import { useAuth } from "../../context/AuthContext";

const TaskDetailModal = ({
  isOpen,
  onClose,
  task,
  onEdit,
  onDelete,
  onUpdate,
}) => {
  const { user } = useAuth();
  const { success, error: showError } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();
  const [checklistItems, setChecklistItems] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [newItemText, setNewItemText] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar tarea completa cuando se abre el modal
  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen || !task?.id) {
        setInitializing(true);
        return;
      }

      try {
        setInitializing(true);
        const updatedTask = await tasksAPI.getById(task.id);
        setCurrentTask(updatedTask);
        setChecklistItems(updatedTask.checklist_items || []);
      } catch (err) {
        console.error("Error loading task:", err);
        setCurrentTask(task);
        setChecklistItems(task.checklist_items || []);
      } finally {
        setInitializing(false);
      }
    };

    initializeModal();
  }, [isOpen, task]);

  // Función para recargar la tarea desde el servidor
  const reloadTask = useCallback(async () => {
    if (!task?.id) return;

    try {
      const updatedTask = await tasksAPI.getById(task.id);
      setCurrentTask(updatedTask);
      setChecklistItems(updatedTask.checklist_items || []);
    } catch (err) {
      console.error("Error reloading task:", err);
    }
  }, [task?.id]);

  // Registrar callback para actualizaciones en tiempo real
  useEffect(() => {
    if (isOpen && task?.id) {
      registerRefresh(`task-detail-${task.id}`, reloadTask);
      return () => unregisterRefresh(`task-detail-${task.id}`);
    }
  }, [isOpen, task?.id, registerRefresh, unregisterRefresh, reloadTask]);

  if (!currentTask) return null;

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
    pending: "Pendiente",
    in_progress: "En progreso",
    completed: "Completada",
    cancelled: "Cancelada",
  };

  const statusColors = {
    todo: "bg-gray-100 text-gray-700",
    "in-progress": "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
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

  // Toggle checklist item
  const handleToggleChecklistItem = async (itemId) => {
    if (!task?.id) return;

    // Optimistic update
    const originalItems = [...checklistItems];
    const updatedItems = checklistItems.map((item) =>
      item.id === itemId ? { ...item, is_completed: !item.is_completed } : item
    );
    setChecklistItems(updatedItems);

    try {
      setLoading(true);
      await checklistAPI.toggle(task.id, itemId);
      success(
        checklistItems.find((i) => i.id === itemId)?.is_completed
          ? "Subtarea desmarcada"
          : "Subtarea completada"
      );

      // Notificar al componente padre para actualizar el estado global
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error toggling checklist item:", err);
      showError(err.message || "No se pudo actualizar la subtarea");
      // Revert on error
      setChecklistItems(originalItems);
    } finally {
      setLoading(false);
    }
  };

  // Agregar nueva subtarea
  const handleAddItem = async () => {
    if (!newItemText.trim() || !task?.id) return;

    const textToAdd = newItemText.trim();
    setNewItemText(""); // Limpiar input inmediatamente

    const tempId = `temp-${Date.now()}`;
    const tempItem = {
      id: tempId,
      text: textToAdd,
      is_completed: false,
      order: checklistItems.length,
    };

    // Agregar optimísticamente
    setChecklistItems((prev) => [...prev, tempItem]);

    try {
      setAddingItem(true);
      const newItem = await checklistAPI.create(task.id, textToAdd);
      // Reemplazar el item temporal con el real
      setChecklistItems((prev) =>
        prev.map((item) => (item.id === tempId ? newItem : item))
      );
      success("Subtarea agregada");

      // Notificar al componente padre para actualizar el estado global
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error adding checklist item:", err);
      // Remover el item temporal si falló
      setChecklistItems((prev) => prev.filter((item) => item.id !== tempId));
      showError(err.message || "No se pudo agregar la subtarea");
    } finally {
      setAddingItem(false);
    }
  };

  // Verificar si el usuario tiene permisos para editar/eliminar
  const canEditOrDelete = () => {
    if (!user || !currentTask) return false;

    // El creador de la tarea puede editar/eliminar
    if (currentTask.user_id === user.id) return true;

    // Los usuarios asignados pueden editar/eliminar
    if (currentTask.assigned_users && currentTask.assigned_users.length > 0) {
      return currentTask.assigned_users.some(
        (assignedUser) => assignedUser.id === user.id
      );
    }

    // Fallback para assigned_user (retrocompatibilidad)
    if (currentTask.assigned_user && currentTask.assigned_user.id === user.id) {
      return true;
    }

    return false;
  };

  const days = getDaysUntilDue(currentTask.due_date);
  const isCompleted =
    currentTask.status === "done" || currentTask.status === "completed";
  const completedCount = checklistItems.filter(
    (item) => item.is_completed
  ).length;
  const totalCount = checklistItems.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const hasEditPermission = canEditOrDelete();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Detalle de Tarea' size='lg'>
      {initializing ? (
        <div className='flex flex-col items-center justify-center py-12'>
          <Loader2 className='w-10 h-10 text-indigo-600 animate-spin mb-4' />
          <p className='text-gray-600 font-medium'>Cargando tarea...</p>
          <p className='text-gray-400 text-sm mt-1'>
            Preparando detalles de la tarea
          </p>
        </div>
      ) : (
        <div className='space-y-6'>
          {/* Header con título y acciones */}
          <div className='flex items-start justify-between gap-4'>
            <div className='flex-1'>
              <h2
                className={`text-2xl font-bold text-gray-900 mb-2 ${
                  isCompleted ? "line-through text-gray-500" : ""
                }`}
              >
                {currentTask.title}
              </h2>
              <div className='flex flex-wrap items-center gap-2'>
                {/* Estado */}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusColors[currentTask.status] ||
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusLabels[currentTask.status] || currentTask.status}
                </span>

                {/* Prioridad */}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${
                    priorityColors[currentTask.priority]
                  }`}
                >
                  <Flag className='w-4 h-4' />
                  {priorityLabels[currentTask.priority]}
                </span>
              </div>
            </div>

            {/* Botones de acción - Solo si tiene permisos */}
            {hasEditPermission && (
              <div className='flex gap-2'>
                <button
                  onClick={() => {
                    onEdit(currentTask);
                    onClose();
                  }}
                  className='p-2 hover:bg-blue-50 rounded-lg transition-colors'
                  title='Editar tarea'
                >
                  <Edit className='w-5 h-5 text-blue-600' />
                </button>
                <button
                  onClick={() => {
                    onDelete(currentTask.id);
                    onClose();
                  }}
                  className='p-2 hover:bg-red-50 rounded-lg transition-colors'
                  title='Eliminar tarea'
                >
                  <Trash2 className='w-5 h-5 text-red-600' />
                </button>
              </div>
            )}
          </div>

          {/* Descripción */}
          {currentTask.description && (
            <div>
              <h3 className='text-sm font-semibold text-gray-700 mb-2'>
                Descripción
              </h3>
              <p className='text-gray-600 whitespace-pre-wrap'>
                {currentTask.description}
              </p>
            </div>
          )}

          {/* Información de la tarea */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {/* Proyecto */}
            {currentTask.project && (
              <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
                <FolderKanban className='w-5 h-5 text-gray-500' />
                <div>
                  <p className='text-xs text-gray-500'>Proyecto</p>
                  <p className='font-medium text-gray-900'>
                    {currentTask.project.name}
                  </p>
                </div>
              </div>
            )}

            {/* Fecha de vencimiento */}
            {currentTask.due_date && (
              <div
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  days !== null && days < 0 && !isCompleted
                    ? "bg-red-50"
                    : days === 0 && !isCompleted
                    ? "bg-orange-50"
                    : days !== null && days <= 3 && !isCompleted
                    ? "bg-yellow-50"
                    : "bg-gray-50"
                }`}
              >
                {days !== null && days < 0 && !isCompleted ? (
                  <AlertTriangle className='w-5 h-5 text-red-500' />
                ) : days === 0 && !isCompleted ? (
                  <Clock className='w-5 h-5 text-orange-500' />
                ) : days !== null && days <= 3 && !isCompleted ? (
                  <CalendarClock className='w-5 h-5 text-yellow-500' />
                ) : (
                  <Calendar className='w-5 h-5 text-gray-500' />
                )}
                <div>
                  <p className='text-xs text-gray-500'>Vencimiento</p>
                  <p
                    className={`font-medium ${
                      days !== null && days < 0 && !isCompleted
                        ? "text-red-700"
                        : days === 0 && !isCompleted
                        ? "text-orange-700"
                        : days !== null && days <= 3 && !isCompleted
                        ? "text-yellow-700"
                        : "text-gray-900"
                    }`}
                  >
                    {new Date(currentTask.due_date).toLocaleDateString(
                      "es-ES",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                    {days !== null && !isCompleted && (
                      <span className='ml-2 text-xs'>
                        {days < 0
                          ? `(Vencida hace ${Math.abs(days)} días)`
                          : days === 0
                          ? "(Vence hoy)"
                          : days === 1
                          ? "(Vence mañana)"
                          : `(Vence en ${days} días)`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Etiquetas */}
            {currentTask.tags && currentTask.tags.length > 0 && (
              <div className='flex items-start gap-3 p-3 bg-gray-50 rounded-lg sm:col-span-2'>
                <div className='w-5 h-5 flex items-center justify-center text-gray-500'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='20'
                    height='20'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z' />
                    <circle cx='7.5' cy='7.5' r='.5' fill='currentColor' />
                  </svg>
                </div>
                <div className='flex-1'>
                  <p className='text-xs text-gray-500 mb-2'>Etiquetas</p>
                  <div className='flex flex-wrap gap-2'>
                    {currentTask.tags.map((tag) => {
                      const colorClasses = {
                        red: { bg: "bg-red-100", text: "text-red-700" },
                        orange: {
                          bg: "bg-orange-100",
                          text: "text-orange-700",
                        },
                        yellow: {
                          bg: "bg-yellow-100",
                          text: "text-yellow-700",
                        },
                        green: { bg: "bg-green-100", text: "text-green-700" },
                        teal: { bg: "bg-teal-100", text: "text-teal-700" },
                        blue: { bg: "bg-blue-100", text: "text-blue-700" },
                        indigo: {
                          bg: "bg-indigo-100",
                          text: "text-indigo-700",
                        },
                        purple: {
                          bg: "bg-purple-100",
                          text: "text-purple-700",
                        },
                        pink: { bg: "bg-pink-100", text: "text-pink-700" },
                        gray: { bg: "bg-gray-100", text: "text-gray-700" },
                      };
                      const colors =
                        colorClasses[tag.color] || colorClasses.gray;
                      return (
                        <span
                          key={tag.id}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
                        >
                          {tag.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Usuarios asignados */}
            {((currentTask.assigned_users &&
              currentTask.assigned_users.length > 0) ||
              currentTask.assigned_user) && (
              <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg sm:col-span-2'>
                <Users className='w-5 h-5 text-gray-500' />
                <div className='flex-1'>
                  <p className='text-xs text-gray-500 mb-2'>Asignado a</p>
                  <div className='flex flex-wrap gap-2'>
                    {currentTask.assigned_users &&
                    currentTask.assigned_users.length > 0 ? (
                      currentTask.assigned_users.map((user) => (
                        <div
                          key={user.id}
                          className='flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200'
                        >
                          <div className='w-6 h-6 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-medium text-white'>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className='text-sm text-gray-700'>
                            {user.name}
                          </span>
                        </div>
                      ))
                    ) : currentTask.assigned_user ? (
                      <div className='flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200'>
                        <div className='w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600'>
                          {currentTask.assigned_user.name.charAt(0)}
                        </div>
                        <span className='text-sm text-gray-700'>
                          {currentTask.assigned_user.name}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checklist de subtareas */}
          <div className='border border-gray-200 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                <CheckSquare className='w-4 h-4' />
                Lista de subtareas
                {checklistItems.length > 0 && (
                  <span className='text-xs text-gray-500'>
                    ({completedCount}/{totalCount})
                  </span>
                )}
              </h3>
            </div>

            {/* Barra de progreso */}
            {checklistItems.length > 0 && (
              <div className='w-full bg-gray-200 rounded-full h-2 mb-4'>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className='bg-green-500 h-2 rounded-full transition-all duration-300'
                />
              </div>
            )}

            {/* Lista de items */}
            {checklistItems.length > 0 && (
              <div className='space-y-2 mb-4'>
                <AnimatePresence mode='popLayout'>
                  {checklistItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className='flex items-center gap-3 group py-2 px-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors'
                    >
                      <button
                        type='button'
                        onClick={() => handleToggleChecklistItem(item.id)}
                        disabled={loading}
                        className='shrink-0 focus:outline-none disabled:opacity-50'
                      >
                        {item.is_completed ? (
                          <CheckSquare className='w-5 h-5 text-green-500' />
                        ) : (
                          <Square className='w-5 h-5 text-gray-400 hover:text-gray-600' />
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          item.is_completed
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                        }`}
                      >
                        {item.text}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Agregar nueva subtarea */}
            <div className='flex items-center gap-2'>
              <div className='relative flex-1'>
                <Plus className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  placeholder='Agregar subtarea...'
                  disabled={addingItem}
                  className='w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed'
                />
              </div>
              <button
                type='button'
                onClick={handleAddItem}
                disabled={!newItemText.trim() || addingItem}
                className='px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1'
              >
                {addingItem ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <>
                    <Plus className='w-4 h-4' />
                    <span className='hidden sm:inline'>Agregar</span>
                  </>
                )}
              </button>
            </div>

            {/* Mensaje si no hay items */}
            {checklistItems.length === 0 && (
              <p className='text-xs text-gray-400 text-center py-2 mb-4'>
                No hay subtareas. Agrega una nueva arriba.
              </p>
            )}
          </div>

          {/* Fechas de creación/actualización */}
          <div className='flex flex-wrap gap-4 text-xs text-gray-500 pt-4 border-t border-gray-200'>
            <div>
              <span className='font-medium'>Creada:</span>{" "}
              {new Date(currentTask.created_at).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>
              <span className='font-medium'>Actualizada:</span>{" "}
              {new Date(currentTask.updated_at).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TaskDetailModal;

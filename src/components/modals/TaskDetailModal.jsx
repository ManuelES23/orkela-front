import { useState, useEffect } from "react";
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
} from "lucide-react";
import { checklistAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";

const TaskDetailModal = ({ isOpen, onClose, task, onEdit, onDelete }) => {
  const { success, error: showError } = useNotification();
  const [checklistItems, setChecklistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar items del checklist cuando se abre el modal
  useEffect(() => {
    if (isOpen && task?.id) {
      setChecklistItems(task.checklist_items || []);
    }
  }, [isOpen, task]);

  if (!task) return null;

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
    setChecklistItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? { ...item, is_completed: !item.is_completed }
          : item
      )
    );

    try {
      setLoading(true);
      await checklistAPI.toggle(task.id, itemId);
      success(
        checklistItems.find((i) => i.id === itemId)?.is_completed
          ? "Subtarea desmarcada"
          : "Subtarea completada"
      );
    } catch (err) {
      console.error("Error toggling checklist item:", err);
      showError(err.message || "No se pudo actualizar la subtarea");
      // Revert on error
      setChecklistItems(originalItems);
    } finally {
      setLoading(false);
    }
  };

  const days = getDaysUntilDue(task.due_date);
  const isCompleted = task.status === "done" || task.status === "completed";
  const completedCount = checklistItems.filter(
    (item) => item.is_completed
  ).length;
  const totalCount = checklistItems.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Detalle de Tarea' size='lg'>
      <div className='space-y-6'>
        {/* Header con título y acciones */}
        <div className='flex items-start justify-between gap-4'>
          <div className='flex-1'>
            <h2
              className={`text-2xl font-bold text-gray-900 mb-2 ${
                isCompleted ? "line-through text-gray-500" : ""
              }`}
            >
              {task.title}
            </h2>
            <div className='flex flex-wrap items-center gap-2'>
              {/* Estado */}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[task.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {statusLabels[task.status] || task.status}
              </span>

              {/* Prioridad */}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${
                  priorityColors[task.priority]
                }`}
              >
                <Flag className='w-4 h-4' />
                {priorityLabels[task.priority]}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className='flex gap-2'>
            <button
              onClick={() => {
                onEdit(task);
                onClose();
              }}
              className='p-2 hover:bg-blue-50 rounded-lg transition-colors'
              title='Editar tarea'
            >
              <Edit className='w-5 h-5 text-blue-600' />
            </button>
            <button
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className='p-2 hover:bg-red-50 rounded-lg transition-colors'
              title='Eliminar tarea'
            >
              <Trash2 className='w-5 h-5 text-red-600' />
            </button>
          </div>
        </div>

        {/* Descripción */}
        {task.description && (
          <div>
            <h3 className='text-sm font-semibold text-gray-700 mb-2'>
              Descripción
            </h3>
            <p className='text-gray-600 whitespace-pre-wrap'>
              {task.description}
            </p>
          </div>
        )}

        {/* Información de la tarea */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {/* Proyecto */}
          {task.project && (
            <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
              <FolderKanban className='w-5 h-5 text-gray-500' />
              <div>
                <p className='text-xs text-gray-500'>Proyecto</p>
                <p className='font-medium text-gray-900'>{task.project.name}</p>
              </div>
            </div>
          )}

          {/* Fecha de vencimiento */}
          {task.due_date && (
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
                  {new Date(task.due_date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
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

          {/* Usuarios asignados */}
          {((task.assigned_users && task.assigned_users.length > 0) ||
            task.assigned_user) && (
            <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg sm:col-span-2'>
              <Users className='w-5 h-5 text-gray-500' />
              <div className='flex-1'>
                <p className='text-xs text-gray-500 mb-2'>Asignado a</p>
                <div className='flex flex-wrap gap-2'>
                  {task.assigned_users && task.assigned_users.length > 0 ? (
                    task.assigned_users.map((user) => (
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
                  ) : task.assigned_user ? (
                    <div className='flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200'>
                      <div className='w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600'>
                        {task.assigned_user.name.charAt(0)}
                      </div>
                      <span className='text-sm text-gray-700'>
                        {task.assigned_user.name}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checklist de subtareas */}
        {checklistItems.length > 0 && (
          <div className='border border-gray-200 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
                <CheckSquare className='w-4 h-4' />
                Lista de subtareas
                <span className='text-xs text-gray-500'>
                  ({completedCount}/{totalCount})
                </span>
              </h3>
            </div>

            {/* Barra de progreso */}
            <div className='w-full bg-gray-200 rounded-full h-2 mb-4'>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className='bg-green-500 h-2 rounded-full transition-all duration-300'
              />
            </div>

            {/* Lista de items */}
            <div className='space-y-2'>
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
          </div>
        )}

        {/* Fechas de creación/actualización */}
        <div className='flex flex-wrap gap-4 text-xs text-gray-500 pt-4 border-t border-gray-200'>
          <div>
            <span className='font-medium'>Creada:</span>{" "}
            {new Date(task.created_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div>
            <span className='font-medium'>Actualizada:</span>{" "}
            {new Date(task.updated_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TaskDetailModal;

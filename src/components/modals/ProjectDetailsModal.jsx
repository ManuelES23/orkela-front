import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  FolderOpen,
  ListChecks,
} from "lucide-react";
import { parseLocalDate } from "../../utils/dateUtils";

const ProjectDetailsModal = ({
  isOpen,
  onClose,
  project,
  onEdit,
  onDelete,
}) => {
  if (!project) return null;

  const getStatusInfo = () => {
    if (project.status === "completed") {
      return {
        label: "Completado",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-950/40",
        icon: CheckCircle,
      };
    }
    if (project.status === "on_hold") {
      return {
        label: "En Pausa",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-950/40",
        icon: AlertCircle,
      };
    }
    return {
      label: "Activo",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950/40",
      icon: Clock,
    };
  };

  const getPriorityInfo = () => {
    if (project.priority === "high") {
      return { label: "Alta", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-950/40" };
    }
    if (project.priority === "medium") {
      return {
        label: "Media",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-950/40",
      };
    }
    return { label: "Baja", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-950/40" };
  };

  const statusInfo = getStatusInfo();
  const priorityInfo = getPriorityInfo();
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString) => {
    if (!dateString) return "No definida";
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDaysRemaining = () => {
    if (!project.due_date) return null;

    // Si el proyecto está completado o tiene 100% de progreso, mostrar como completado
    if (project.status === "completed" || project.progress === 100) {
      return {
        label: "Completado",
        color: "text-green-600 dark:text-green-400",
      };
    }

    const today = new Date();
    const dueDate = parseLocalDate(project.due_date);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        label: `${Math.abs(diffDays)} días de retraso`,
        color: "text-red-600 dark:text-red-400",
      };
    if (diffDays === 0) return { label: "Vence hoy", color: "text-orange-600 dark:text-orange-400" };
    return { label: `${diffDays} días restantes`, color: "text-blue-600 dark:text-blue-400" };
  };

  const daysRemaining = getDaysRemaining();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50'
          />

          {/* Modal */}
          <div className='fixed inset-0 flex items-center justify-center z-50 p-4 pb-20 md:pb-4'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='bg-white dark:bg-night-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden'
            >
              {/* Header */}
              <div
                className={`${project.color} bg-opacity-10 border-b border-gray-200 dark:border-night-700 p-6`}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-center gap-4 flex-1'>
                    <div
                      className={`${project.color} w-16 h-16 rounded-xl flex items-center justify-center shadow-lg`}
                    >
                      <span className='text-white font-bold text-2xl'>
                        {project.name.charAt(0)}
                      </span>
                    </div>
                    <div className='flex-1'>
                      <h2 className='text-2xl font-bold text-gray-900 dark:text-night-50 mb-1'>
                        {project.name}
                      </h2>
                      <div className='flex items-center gap-2'>
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
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => {
                        onEdit(project);
                        onClose();
                      }}
                      className='p-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors text-blue-600 dark:text-blue-400'
                      title='Editar proyecto'
                    >
                      <Edit className='w-5 h-5' />
                    </button>
                    <button
                      onClick={() => {
                        onDelete(project.id);
                        onClose();
                      }}
                      className='p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors text-red-600 dark:text-red-400'
                      title='Eliminar proyecto'
                    >
                      <Trash2 className='w-5 h-5' />
                    </button>
                    <button
                      onClick={onClose}
                      className='p-2 hover:bg-gray-100 dark:hover:bg-night-800 rounded-lg transition-colors'
                    >
                      <X className='w-6 h-6' />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className='overflow-y-auto max-h-[calc(90vh-200px)] p-6'>
                <div className='space-y-6'>
                  {/* Description */}
                  <div>
                    <h3 className='text-sm font-semibold text-gray-700 dark:text-night-300 uppercase tracking-wide mb-2'>
                      Descripción
                    </h3>
                    <p className='text-gray-600 dark:text-night-300 leading-relaxed'>
                      {project.description || "Sin descripción disponible"}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    {/* Progress */}
                    <div className='bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl p-4 border border-brand-200 dark:border-brand-800'>
                      <div className='flex items-center gap-2 mb-2'>
                        <TrendingUp className='w-5 h-5 text-brand-600' />
                        <span className='text-sm font-medium text-brand-900'>
                          Progreso
                        </span>
                      </div>
                      <div className='text-3xl font-bold text-brand-600'>
                        {project.progress}%
                      </div>
                      <div className='w-full bg-brand-200 rounded-full h-2 mt-2'>
                        <div
                          className='bg-brand-600 h-2 rounded-full transition-all'
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Team Size */}
                    <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 dark:border-blue-800'>
                      <div className='flex items-center gap-2 mb-2'>
                        <Users className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                        <span className='text-sm font-medium text-blue-900'>
                          Equipo
                        </span>
                      </div>
                      <div className='text-3xl font-bold text-blue-600 dark:text-blue-400'>
                        {project.team_size || 0}
                      </div>
                      <div className='text-xs text-blue-700 dark:text-blue-300 mt-1'>miembros</div>
                    </div>

                    {/* Tasks */}
                    <div className='bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 dark:border-green-800'>
                      <div className='flex items-center gap-2 mb-2'>
                        <ListChecks className='w-5 h-5 text-green-600 dark:text-green-400' />
                        <span className='text-sm font-medium text-green-900'>
                          Tareas
                        </span>
                      </div>
                      <div className='text-3xl font-bold text-green-600 dark:text-green-400'>
                        {project.tasks?.length || 0}
                      </div>
                      <div className='text-xs text-green-700 dark:text-green-300 mt-1'>total</div>
                    </div>

                    {/* Due Date */}
                    <div
                      className={`bg-gradient-to-br ${
                        daysRemaining && daysRemaining.color.includes("red")
                          ? "from-red-50 to-red-100 border-red-200 dark:border-red-800"
                          : "from-accent-50 to-accent-100 border-accent-200 dark:border-accent-800"
                      } rounded-xl p-4 border`}
                    >
                      <div className='flex items-center gap-2 mb-2'>
                        <Calendar
                          className={`w-5 h-5 ${
                            daysRemaining && daysRemaining.color.includes("red")
                              ? "text-red-600 dark:text-red-400"
                              : "text-accent-600"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            daysRemaining && daysRemaining.color.includes("red")
                              ? "text-red-900"
                              : "text-accent-900"
                          }`}
                        >
                          Vencimiento
                        </span>
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          daysRemaining
                            ? daysRemaining.color
                            : "text-accent-600"
                        }`}
                      >
                        {formatDate(project.due_date)}
                      </div>
                      {daysRemaining && (
                        <div
                          className={`text-xs mt-1 font-medium ${daysRemaining.color}`}
                        >
                          {daysRemaining.label}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='bg-gray-50 dark:bg-night-800 rounded-xl p-4 border border-gray-200 dark:border-night-700'>
                      <h4 className='text-sm font-semibold text-gray-700 dark:text-night-300 mb-3 flex items-center gap-2'>
                        <FolderOpen className='w-4 h-4' />
                        Información del Proyecto
                      </h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex justify-between'>
                          <span className='text-gray-600 dark:text-night-300'>Estado:</span>
                          <span className='font-medium text-gray-900 dark:text-night-50'>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600 dark:text-night-300'>Prioridad:</span>
                          <span className='font-medium text-gray-900 dark:text-night-50'>
                            {priorityInfo.label}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600 dark:text-night-300'>Creado:</span>
                          <span className='font-medium text-gray-900 dark:text-night-50'>
                            {formatDate(project.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className='bg-gray-50 dark:bg-night-800 rounded-xl p-4 border border-gray-200 dark:border-night-700'>
                      <h4 className='text-sm font-semibold text-gray-700 dark:text-night-300 mb-3 flex items-center gap-2'>
                        <Clock className='w-4 h-4' />
                        Fechas Importantes
                      </h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex justify-between'>
                          <span className='text-gray-600 dark:text-night-300'>Inicio:</span>
                          <span className='font-medium text-gray-900 dark:text-night-50'>
                            {formatDate(project.created_at)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600 dark:text-night-300'>Vencimiento:</span>
                          <span className='font-medium text-gray-900 dark:text-night-50'>
                            {formatDate(project.due_date)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600 dark:text-night-300'>
                            Última actualización:
                          </span>
                          <span className='font-medium text-gray-900 dark:text-night-50'>
                            {formatDate(project.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List (if available) */}
                  {project.tasks && project.tasks.length > 0 && (
                    <div>
                      <h3 className='text-sm font-semibold text-gray-700 dark:text-night-300 uppercase tracking-wide mb-3'>
                        Tareas Asociadas ({project.tasks.length})
                      </h3>
                      <div className='space-y-2'>
                        {project.tasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            className='flex items-center justify-between p-3 bg-white dark:bg-night-900 border border-gray-200 dark:border-night-700 rounded-lg hover:border-brand-300 dark:hover:border-brand-700 transition-colors'
                          >
                            <div className='flex items-center gap-3'>
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  task.status === "completed"
                                    ? "bg-green-500"
                                    : task.status === "in_progress"
                                      ? "bg-blue-500"
                                      : "bg-gray-400 dark:bg-night-500"
                                }`}
                              />
                              <span className='text-sm text-gray-900 dark:text-night-50'>
                                {task.title}
                              </span>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                task.priority === "high"
                                  ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                                  : task.priority === "medium"
                                    ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300"
                                    : "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                              }`}
                            >
                              {task.priority === "high"
                                ? "Alta"
                                : task.priority === "medium"
                                  ? "Media"
                                  : "Baja"}
                            </span>
                          </div>
                        ))}
                        {project.tasks.length > 5 && (
                          <p className='text-sm text-gray-500 dark:text-night-400 text-center pt-2'>
                            y {project.tasks.length - 5} tareas más...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className='border-t border-gray-200 dark:border-night-700 p-4 bg-gray-50 dark:bg-night-800 flex justify-end gap-2'>
                <button
                  onClick={onClose}
                  className='px-4 py-2 text-gray-700 dark:text-night-300 hover:bg-gray-200 dark:hover:bg-night-700 rounded-lg transition-colors'
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    onEdit(project);
                    onClose();
                  }}
                  className='px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2'
                >
                  <Edit className='w-4 h-4' />
                  Editar Proyecto
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProjectDetailsModal;

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
        color: "text-green-600",
      };
    }

    const today = new Date();
    const dueDate = parseLocalDate(project.due_date);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        label: `${Math.abs(diffDays)} días de retraso`,
        color: "text-red-600",
      };
    if (diffDays === 0) return { label: "Vence hoy", color: "text-orange-600" };
    return { label: `${diffDays} días restantes`, color: "text-blue-600" };
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
              className='bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden'
            >
              {/* Header */}
              <div
                className={`${project.color} bg-opacity-10 border-b border-gray-200 p-6`}
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
                      <h2 className='text-2xl font-bold text-gray-900 mb-1'>
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
                      className='p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600'
                      title='Editar proyecto'
                    >
                      <Edit className='w-5 h-5' />
                    </button>
                    <button
                      onClick={() => {
                        onDelete(project.id);
                        onClose();
                      }}
                      className='p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600'
                      title='Eliminar proyecto'
                    >
                      <Trash2 className='w-5 h-5' />
                    </button>
                    <button
                      onClick={onClose}
                      className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
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
                    <h3 className='text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2'>
                      Descripción
                    </h3>
                    <p className='text-gray-600 leading-relaxed'>
                      {project.description || "Sin descripción disponible"}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    {/* Progress */}
                    <div className='bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl p-4 border border-brand-200'>
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
                    <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200'>
                      <div className='flex items-center gap-2 mb-2'>
                        <Users className='w-5 h-5 text-blue-600' />
                        <span className='text-sm font-medium text-blue-900'>
                          Equipo
                        </span>
                      </div>
                      <div className='text-3xl font-bold text-blue-600'>
                        {project.team_size || 0}
                      </div>
                      <div className='text-xs text-blue-700 mt-1'>miembros</div>
                    </div>

                    {/* Tasks */}
                    <div className='bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200'>
                      <div className='flex items-center gap-2 mb-2'>
                        <ListChecks className='w-5 h-5 text-green-600' />
                        <span className='text-sm font-medium text-green-900'>
                          Tareas
                        </span>
                      </div>
                      <div className='text-3xl font-bold text-green-600'>
                        {project.tasks?.length || 0}
                      </div>
                      <div className='text-xs text-green-700 mt-1'>total</div>
                    </div>

                    {/* Due Date */}
                    <div
                      className={`bg-gradient-to-br ${
                        daysRemaining && daysRemaining.color.includes("red")
                          ? "from-red-50 to-red-100 border-red-200"
                          : "from-accent-50 to-accent-100 border-accent-200"
                      } rounded-xl p-4 border`}
                    >
                      <div className='flex items-center gap-2 mb-2'>
                        <Calendar
                          className={`w-5 h-5 ${
                            daysRemaining && daysRemaining.color.includes("red")
                              ? "text-red-600"
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
                    <div className='bg-gray-50 rounded-xl p-4 border border-gray-200'>
                      <h4 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
                        <FolderOpen className='w-4 h-4' />
                        Información del Proyecto
                      </h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Estado:</span>
                          <span className='font-medium text-gray-900'>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Prioridad:</span>
                          <span className='font-medium text-gray-900'>
                            {priorityInfo.label}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Creado:</span>
                          <span className='font-medium text-gray-900'>
                            {formatDate(project.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className='bg-gray-50 rounded-xl p-4 border border-gray-200'>
                      <h4 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
                        <Clock className='w-4 h-4' />
                        Fechas Importantes
                      </h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Inicio:</span>
                          <span className='font-medium text-gray-900'>
                            {formatDate(project.created_at)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Vencimiento:</span>
                          <span className='font-medium text-gray-900'>
                            {formatDate(project.due_date)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>
                            Última actualización:
                          </span>
                          <span className='font-medium text-gray-900'>
                            {formatDate(project.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List (if available) */}
                  {project.tasks && project.tasks.length > 0 && (
                    <div>
                      <h3 className='text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3'>
                        Tareas Asociadas ({project.tasks.length})
                      </h3>
                      <div className='space-y-2'>
                        {project.tasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            className='flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-brand-300 transition-colors'
                          >
                            <div className='flex items-center gap-3'>
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  task.status === "completed"
                                    ? "bg-green-500"
                                    : task.status === "in_progress"
                                      ? "bg-blue-500"
                                      : "bg-gray-400"
                                }`}
                              />
                              <span className='text-sm text-gray-900'>
                                {task.title}
                              </span>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
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
                          </div>
                        ))}
                        {project.tasks.length > 5 && (
                          <p className='text-sm text-gray-500 text-center pt-2'>
                            y {project.tasks.length - 5} tareas más...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className='border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-2'>
                <button
                  onClick={onClose}
                  className='px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors'
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

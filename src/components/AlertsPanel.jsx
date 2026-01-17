import { motion } from "framer-motion";
import { AlertCircle, Clock, Zap, Calendar, TrendingDown, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parseLocalDate } from "../utils/dateUtils";

const AlertsPanel = ({ projects, tasks }) => {
  const navigate = useNavigate();

  // Obtener fecha actual
  const today = new Date();
  const todayTime = today.getTime();

  // Calcular días hasta vencimiento
  const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const date = parseLocalDate(dateString);
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Proyectos vencidos o por vencer (7 días)
  const urgentProjects = projects.filter(p => {
    if (p.status === 'completed' || p.status === 'cancelled') return false;
    const days = getDaysUntil(p.due_date);
    return days !== null && days <= 7;
  }).sort((a, b) => getDaysUntil(a.due_date) - getDaysUntil(b.due_date));

  // Tareas urgentes o por vencer
  const urgentTasks = tasks.filter(t => {
    if (t.status === 'completed') return false;
    const days = getDaysUntil(t.due_date);
    return t.is_urgent || (days !== null && days <= 3);
  }).sort((a, b) => {
    // Primero urgentes, luego por fecha
    if (a.is_urgent && !b.is_urgent) return -1;
    if (!a.is_urgent && b.is_urgent) return 1;
    return getDaysUntil(a.due_date) - getDaysUntil(b.due_date);
  });

  // Proyectos con bajo progreso
  const lowProgressProjects = projects.filter(p => {
    if (p.status === 'completed' || p.status === 'cancelled') return false;
    const days = getDaysUntil(p.due_date);
    // Proyectos con menos del 30% de progreso y que vencen en menos de 30 días
    return p.progress < 30 && days !== null && days > 0 && days <= 30;
  }).slice(0, 3);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const getAlertColor = (days) => {
    if (days < 0) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' };
    if (days === 0) return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-500' };
    if (days <= 3) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' };
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' };
  };

  const totalAlerts = urgentProjects.length + urgentTasks.length + lowProgressProjects.length;

  if (totalAlerts === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
      >
        <div className='flex items-center gap-3 mb-4'>
          <div className='p-2 bg-green-100 rounded-lg'>
            <Target className='w-5 h-5 text-green-600' />
          </div>
          <h2 className='text-lg font-semibold text-gray-900'>Alertas y Notificaciones</h2>
        </div>
        <div className='text-center py-8'>
          <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3'>
            <Target className='w-8 h-8 text-green-600' />
          </div>
          <p className='text-gray-600 font-medium'>¡Todo al día!</p>
          <p className='text-sm text-gray-500 mt-1'>No hay alertas pendientes</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
    >
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-red-100 rounded-lg'>
            <AlertCircle className='w-5 h-5 text-red-600' />
          </div>
          <h2 className='text-lg font-semibold text-gray-900'>Alertas y Notificaciones</h2>
        </div>
        <span className='px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium'>
          {totalAlerts} {totalAlerts === 1 ? 'alerta' : 'alertas'}
        </span>
      </div>

      <div className='space-y-3 max-h-96 overflow-y-auto'>
        {/* Proyectos Urgentes */}
        {urgentProjects.length > 0 && (
          <div>
            <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2'>
              <Clock className='w-3 h-3' />
              Proyectos por Vencer
            </h3>
            <div className='space-y-2'>
              {urgentProjects.slice(0, 5).map((project) => {
                const days = getDaysUntil(project.due_date);
                const colors = getAlertColor(days);
                
                return (
                  <motion.div
                    key={project.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className={`${colors.bg} ${colors.border} border-l-4 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md`}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <div className={`${project.color} w-2 h-2 rounded-full`} />
                          <p className={`font-medium ${colors.text} text-sm`}>{project.name}</p>
                        </div>
                        <p className='text-xs text-gray-600'>
                          {days < 0 
                            ? `Vencido hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`
                            : days === 0 
                            ? 'Vence hoy'
                            : `Vence en ${days} ${days === 1 ? 'día' : 'días'}`
                          }
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs text-gray-500'>{formatDate(project.due_date)}</span>
                        <div className='text-xs text-gray-500'>{project.progress}%</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tareas Urgentes */}
        {urgentTasks.length > 0 && (
          <div>
            <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2'>
              <Zap className='w-3 h-3' />
              Tareas Urgentes
            </h3>
            <div className='space-y-2'>
              {urgentTasks.slice(0, 5).map((task) => {
                const days = getDaysUntil(task.due_date);
                const colors = task.is_urgent 
                  ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' }
                  : getAlertColor(days);
                
                return (
                  <motion.div
                    key={task.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate('/tasks')}
                    className={`${colors.bg} ${colors.border} border-l-4 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md`}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1'>
                        <p className={`font-medium ${colors.text} text-sm flex items-center gap-2`}>
                          {task.is_urgent && <Zap className='w-3 h-3' />}
                          {task.title}
                        </p>
                        <p className='text-xs text-gray-600 mt-1'>
                          {task.is_urgent && 'Marcada como urgente'}
                          {!task.is_urgent && days !== null && (
                            days < 0 
                              ? `Vencida hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`
                              : days === 0 
                              ? 'Vence hoy'
                              : `Vence en ${days} ${days === 1 ? 'día' : 'días'}`
                          )}
                        </p>
                      </div>
                      <div className='flex flex-col items-end gap-1'>
                        {task.due_date && (
                          <span className='text-xs text-gray-500'>{formatDate(task.due_date)}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Proyectos con Bajo Progreso */}
        {lowProgressProjects.length > 0 && (
          <div>
            <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2'>
              <TrendingDown className='w-3 h-3' />
              Proyectos Atrasados
            </h3>
            <div className='space-y-2'>
              {lowProgressProjects.map((project) => {
                const days = getDaysUntil(project.due_date);
                
                return (
                  <motion.div
                    key={project.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className='bg-orange-50 border-l-4 border-orange-200 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <div className={`${project.color} w-2 h-2 rounded-full`} />
                          <p className='font-medium text-orange-700 text-sm'>{project.name}</p>
                        </div>
                        <p className='text-xs text-gray-600'>
                          Solo {project.progress}% completado - Vence en {days} {days === 1 ? 'día' : 'días'}
                        </p>
                      </div>
                      <div className='text-xs text-gray-500'>{formatDate(project.due_date)}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AlertsPanel;

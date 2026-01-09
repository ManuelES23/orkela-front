import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
} from "lucide-react";

const ProjectGantt = ({ tasks, projectDueDate, projectColor }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generar días del mes actual
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  }, [currentMonth]);

  // Calcular posición y ancho de cada tarea en el calendario
  const getTaskPosition = (task) => {
    if (!task.due_date) return null;

    // Parsear fechas correctamente (formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
    const parseDateString = (dateStr) => {
      const parts = dateStr.split("T")[0].split("-");
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );
    };

    const dueDate = parseDateString(task.due_date);
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    // Usar start_date si existe, sino estimar 3 días antes
    let startDate;
    if (task.start_date) {
      startDate = parseDateString(task.start_date);
    } else {
      startDate = new Date(dueDate);
      startDate.setDate(startDate.getDate() - 3); // Default: 3 días de duración
    }

    // Verificar si la tarea está visible en este mes
    if (dueDate < monthStart || startDate > monthEnd) return null;

    // Calcular posición de inicio (ajustada al mes)
    const effectiveStart = startDate < monthStart ? monthStart : startDate;
    const effectiveEnd = dueDate > monthEnd ? monthEnd : dueDate;

    const totalDays = daysInMonth.length;
    const startDay = Math.max(
      0,
      (effectiveStart - monthStart) / (1000 * 60 * 60 * 24)
    );
    const endDay = Math.min(
      totalDays,
      (effectiveEnd - monthStart) / (1000 * 60 * 60 * 24) + 1
    );

    const left = (startDay / totalDays) * 100;
    const width = ((endDay - startDay) / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 3)}%` };
  };

  // Obtener color de la barra según estado
  const getBarColor = (task) => {
    if (task.status === "done") return "bg-green-500";
    if (task.status === "in-progress") return "bg-blue-500";

    // Verificar si está vencida
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      if (dueDate < today) return "bg-red-500";
    }

    // Por prioridad
    if (task.priority === "high") return "bg-orange-500";
    if (task.priority === "medium") return "bg-yellow-500";
    return "bg-gray-400";
  };

  // Obtener icono de estado
  const getStatusIcon = (task) => {
    if (task.status === "done") return <CheckCircle className='w-3 h-3' />;
    if (task.status === "in-progress") return <Clock className='w-3 h-3' />;
    if (task.is_urgent) return <Zap className='w-3 h-3' />;
    return null;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Obtener tareas visibles en el mes actual
  const visibleTasks = tasks.filter((task) => getTaskPosition(task) !== null);

  // Marcar el día de hoy
  const today = new Date();
  const isToday = (date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

  return (
    <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
      {/* Header con navegación */}
      <div className='flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200'>
        <div className='flex items-center gap-2'>
          <Calendar className='w-5 h-5 text-indigo-600' />
          <h3 className='font-semibold text-gray-900'>Diagrama de Gantt</h3>
          <span className='text-sm text-gray-500'>
            ({visibleTasks.length} tareas visibles)
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={goToToday}
            className='px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition'
          >
            Hoy
          </button>
          <button
            onClick={() => navigateMonth(-1)}
            className='p-1.5 hover:bg-gray-200 rounded-lg transition'
          >
            <ChevronLeft className='w-5 h-5 text-gray-600' />
          </button>
          <span className='font-medium text-gray-900 min-w-[140px] text-center'>
            {currentMonth.toLocaleDateString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className='p-1.5 hover:bg-gray-200 rounded-lg transition'
          >
            <ChevronRight className='w-5 h-5 text-gray-600' />
          </button>
        </div>
      </div>

      {/* Grid del calendario */}
      <div className='overflow-x-auto'>
        <div className='min-w-[800px]'>
          {/* Encabezado de días */}
          <div className='flex border-b border-gray-200'>
            <div className='w-48 shrink-0 px-3 py-2 bg-gray-50 border-r border-gray-200'>
              <span className='text-xs font-medium text-gray-500 uppercase'>
                Tarea
              </span>
            </div>
            <div className='flex-1 flex'>
              {daysInMonth.map((day, index) => (
                <div
                  key={index}
                  className={`flex-1 min-w-[30px] px-1 py-2 text-center border-r border-gray-100 ${
                    isWeekend(day) ? "bg-gray-50" : ""
                  } ${isToday(day) ? "bg-indigo-50" : ""}`}
                >
                  <div className='text-[10px] text-gray-400 uppercase'>
                    {day.toLocaleDateString("es-ES", { weekday: "narrow" })}
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      isToday(day) ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filas de tareas */}
          {tasks.length === 0 ? (
            <div className='flex items-center justify-center py-12 text-gray-500'>
              <p>No hay tareas en este proyecto</p>
            </div>
          ) : (
            <div>
              {tasks.map((task, index) => {
                const position = getTaskPosition(task);

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className='flex border-b border-gray-100 hover:bg-gray-50 transition'
                  >
                    {/* Nombre de la tarea */}
                    <div className='w-48 shrink-0 px-3 py-3 border-r border-gray-200'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${getBarColor(
                            task
                          )}`}
                        />
                        <span
                          className={`text-sm truncate ${
                            task.status === "done"
                              ? "text-gray-400 line-through"
                              : "text-gray-700 font-medium"
                          }`}
                          title={task.title}
                        >
                          {task.title}
                        </span>
                      </div>
                    </div>

                    {/* Área del Gantt */}
                    <div className='flex-1 relative py-2'>
                      {/* Líneas de fondo para días */}
                      <div className='absolute inset-0 flex'>
                        {daysInMonth.map((day, i) => (
                          <div
                            key={i}
                            className={`flex-1 border-r border-gray-100 ${
                              isWeekend(day) ? "bg-gray-50/50" : ""
                            } ${isToday(day) ? "bg-indigo-50/50" : ""}`}
                          />
                        ))}
                      </div>

                      {/* Barra de la tarea */}
                      {position && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: position.width }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full ${getBarColor(
                            task
                          )} shadow-sm flex items-center justify-center gap-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}
                          style={{ left: position.left }}
                          title={`${task.title}${
                            task.due_date
                              ? ` - Vence: ${new Date(
                                  task.due_date
                                ).toLocaleDateString("es-ES")}`
                              : ""
                          }`}
                        >
                          <span className='text-white text-[10px] font-medium px-2 truncate flex items-center gap-1'>
                            {getStatusIcon(task)}
                            {task.title.length > 15
                              ? `${task.title.substring(0, 15)}...`
                              : task.title}
                          </span>
                        </motion.div>
                      )}

                      {/* Indicador de tarea sin fecha visible */}
                      {!position && !task.due_date && (
                        <div className='absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 italic'>
                          Sin fecha
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className='px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-4 text-xs'>
        <span className='text-gray-500 font-medium'>Leyenda:</span>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-green-500' />
          <span className='text-gray-600'>Completada</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-blue-500' />
          <span className='text-gray-600'>En progreso</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-orange-500' />
          <span className='text-gray-600'>Alta prioridad</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-yellow-500' />
          <span className='text-gray-600'>Media prioridad</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-red-500' />
          <span className='text-gray-600'>Vencida</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectGantt;

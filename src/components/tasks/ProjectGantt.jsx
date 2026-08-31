import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
} from "lucide-react";
import AnimatedNumber from "../ui/AnimatedNumber";

const GROUP_META = {
  late: { label: "Atrasadas", stripe: "bg-red-500", text: "text-red-700 dark:text-red-300" },
  progress: {
    label: "En progreso",
    stripe: "bg-brand-600",
    text: "text-brand-700 dark:text-brand-300",
  },
  upcoming: { label: "Próximas", stripe: "bg-gray-400 dark:bg-night-500", text: "text-gray-600 dark:text-night-300" },
  done: { label: "Completadas", stripe: "bg-green-500", text: "text-green-700 dark:text-green-300" },
};

const getBarFill = (groupKey) => {
  switch (groupKey) {
    case "late":
      return "bg-linear-to-r from-red-400 to-red-600";
    case "progress":
      return "bg-linear-to-r from-brand-500 to-accent-500";
    case "done":
      return "bg-linear-to-r from-green-400 to-green-600";
    default:
      return "bg-gray-400 dark:bg-night-500";
  }
};

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
        parseInt(parts[2]),
      );
    };

    const dueDate = parseDateString(task.due_date);
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
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
      (effectiveStart - monthStart) / (1000 * 60 * 60 * 24),
    );
    const endDay = Math.min(
      totalDays,
      (effectiveEnd - monthStart) / (1000 * 60 * 60 * 24) + 1,
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
      // Parsear fecha como local para evitar desfase de timezone
      const parts = task.due_date.split("T")[0].split("-");
      const dueDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) return "bg-red-500";
    }

    // Por prioridad
    if (task.priority === "high") return "bg-orange-500";
    if (task.priority === "medium") return "bg-yellow-500";
    return "bg-gray-400 dark:bg-night-500";
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

  // Función auxiliar para parsear fechas como local
  const parseDateLocal = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("T")[0].split("-");
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
  };

  // Clasificar una tarea en uno de los 4 grupos de estado
  const classifyGroup = (task) => {
    if (task.status === "done") return "done";
    if (task.due_date) {
      const dueDate = parseDateLocal(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) return "late";
    }
    if (task.status === "in-progress") return "progress";
    return "upcoming";
  };

  // Ordenar tareas por fecha de inicio/vencimiento y luego filtrar las visibles
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.start_date
      ? parseDateLocal(a.start_date)
      : a.due_date
        ? parseDateLocal(a.due_date)
        : new Date();
    const dateB = b.start_date
      ? parseDateLocal(b.start_date)
      : b.due_date
        ? parseDateLocal(b.due_date)
        : new Date();
    return dateA - dateB;
  });

  // Obtener tareas visibles en el mes actual (ya ordenadas)
  const visibleTasks = sortedTasks.filter(
    (task) => getTaskPosition(task) !== null,
  );

  // Agrupar tareas por estado para la vista en secciones
  const statusBuckets = { late: [], progress: [], upcoming: [], done: [] };
  sortedTasks.forEach((task) => {
    statusBuckets[classifyGroup(task)].push(task);
  });
  const groupedSections = ["late", "progress", "upcoming", "done"]
    .map((key) => ({ key, ...GROUP_META[key], tasks: statusBuckets[key] }))
    .filter((group) => group.tasks.length > 0);

  // Marcar el día de hoy
  const today = new Date();
  const isToday = (date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

  return (
    <div className='bg-white dark:bg-night-900 rounded-xl border border-gray-200 dark:border-night-700 overflow-hidden'>
      {/* Header con navegación */}
      <div className='flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-night-800 border-b border-gray-200 dark:border-night-700'>
        <div className='flex items-center gap-2'>
          <Calendar className='w-5 h-5 text-brand-600' />
          <h3 className='font-semibold text-gray-900 dark:text-night-50'>Diagrama de Gantt</h3>
          <span className='text-sm text-gray-500 dark:text-night-400'>
            ({visibleTasks.length} tareas visibles)
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={goToToday}
            className='px-3 py-1 text-sm bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-lg hover:bg-brand-200 dark:hover:bg-brand-900/50 transition'
          >
            Hoy
          </button>
          <button
            onClick={() => navigateMonth(-1)}
            className='p-1.5 hover:bg-gray-200 dark:hover:bg-night-700 rounded-lg transition'
          >
            <ChevronLeft className='w-5 h-5 text-gray-600 dark:text-night-300' />
          </button>
          <span className='font-medium text-gray-900 dark:text-night-50 min-w-[140px] text-center'>
            {currentMonth.toLocaleDateString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className='p-1.5 hover:bg-gray-200 dark:hover:bg-night-700 rounded-lg transition'
          >
            <ChevronRight className='w-5 h-5 text-gray-600 dark:text-night-300' />
          </button>
        </div>
      </div>

      {/* Franja de métricas por estado */}
      {sortedTasks.length > 0 && (
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 border-b border-gray-200 dark:border-night-700 bg-gray-50/60'>
          {["late", "progress", "upcoming", "done"].map((key) => {
            const meta = GROUP_META[key];
            const group = groupedSections.find((g) => g.key === key);
            return (
              <div
                key={key}
                className={`bg-white dark:bg-night-900 border border-gray-200 dark:border-night-700 border-l-4 rounded-lg px-3 py-2 ${
                  key === "late"
                    ? "border-l-red-500"
                    : key === "progress"
                      ? "border-l-brand-600"
                      : key === "done"
                        ? "border-l-green-500"
                        : "border-l-gray-400"
                }`}
              >
                <AnimatedNumber
                  value={group?.tasks.length || 0}
                  className='block font-mono text-lg font-bold text-gray-900 dark:text-night-50'
                />
                <span className='text-[11px] font-medium text-gray-500 dark:text-night-400'>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid del calendario */}
      <div className='overflow-x-auto'>
        <div className='min-w-[800px]'>
          {/* Encabezado de días */}
          <div className='flex border-b border-gray-200 dark:border-night-700'>
            <div className='w-48 shrink-0 px-3 py-2 bg-gray-50 dark:bg-night-800 border-r border-gray-200 dark:border-night-700'>
              <span className='text-xs font-medium text-gray-500 dark:text-night-400 uppercase'>
                Tarea
              </span>
            </div>
            <div className='flex-1 flex'>
              {daysInMonth.map((day, index) => (
                <div
                  key={index}
                  className={`flex-1 min-w-[30px] px-1 py-2 text-center border-r border-gray-100 dark:border-night-700 ${
                    isWeekend(day) ? "bg-gray-50 dark:bg-night-800" : ""
                  } ${isToday(day) ? "bg-brand-50 dark:bg-brand-900/20" : ""}`}
                >
                  <div className='text-[10px] text-gray-400 dark:text-night-500 uppercase'>
                    {day.toLocaleDateString("es-ES", { weekday: "narrow" })}
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      isToday(day) ? "text-brand-600" : "text-gray-600 dark:text-night-300"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filas de tareas */}
          {sortedTasks.length === 0 ? (
            <div className='flex items-center justify-center py-12 text-gray-500 dark:text-night-400'>
              <p>No hay tareas en este proyecto</p>
            </div>
          ) : (
            <div>
              {groupedSections.map((group) => (
                <div key={group.key}>
                  {/* Cabecera de sección */}
                  <div className='flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-night-800'>
                    <span className={`w-1 h-4 rounded-full ${group.stripe}`} />
                    <span className={`text-xs font-semibold ${group.text}`}>
                      {group.label}
                    </span>
                    <span className='text-[11px] font-mono text-gray-400 dark:text-night-500'>
                      {group.tasks.length}
                    </span>
                  </div>

                  <AnimatePresence>
                    {group.tasks.map((task, index) => {
                      const position = getTaskPosition(task);

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`flex border-b border-gray-100 dark:border-night-700 hover:bg-gray-50 dark:hover:bg-night-800 transition border-l-4 ${group.stripe.replace(
                            "bg-",
                            "border-l-",
                          )}`}
                        >
                    {/* Nombre de la tarea */}
                    <div className='w-48 shrink-0 px-3 py-3 border-r border-gray-200 dark:border-night-700'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${getBarColor(
                            task,
                          )}`}
                        />
                        <span
                          className={`text-sm truncate ${
                            task.status === "done"
                              ? "text-gray-400 dark:text-night-500 line-through"
                              : "text-gray-700 dark:text-night-300 font-medium"
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
                            className={`flex-1 border-r border-gray-100 dark:border-night-700 ${
                              isWeekend(day) ? "bg-gray-50/50" : ""
                            } ${isToday(day) ? "bg-brand-50/50" : ""}`}
                          />
                        ))}
                      </div>

                      {/* Barra de la tarea */}
                      {position && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: position.width }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full ${getBarFill(
                            group.key,
                          )} shadow-sm flex items-center justify-center gap-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}
                          style={{ left: position.left }}
                          title={`${task.title}${
                            task.due_date
                              ? ` - Vence: ${new Date(
                                  task.due_date,
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
                        <div className='absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-night-500 italic'>
                          Sin fecha
                        </div>
                      )}
                    </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className='px-4 py-3 bg-gray-50 dark:bg-night-800 border-t border-gray-200 dark:border-night-700 flex items-center gap-4 text-xs'>
        <span className='text-gray-500 dark:text-night-400 font-medium'>Leyenda:</span>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-green-500' />
          <span className='text-gray-600 dark:text-night-300'>Completada</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-linear-to-r from-brand-500 to-accent-500' />
          <span className='text-gray-600 dark:text-night-300'>En progreso</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-orange-500' />
          <span className='text-gray-600 dark:text-night-300'>Alta prioridad</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-yellow-500' />
          <span className='text-gray-600 dark:text-night-300'>Media prioridad</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-3 h-3 rounded-full bg-red-500' />
          <span className='text-gray-600 dark:text-night-300'>Vencida</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectGantt;

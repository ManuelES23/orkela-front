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
  X,
  CalendarDays,
  LayoutList,
} from "lucide-react";

const ProjectCalendar = ({ tasks, onTaskClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [viewMode, setViewMode] = useState("timeline"); // "timeline" o "classic"

  // Parsear fecha string a Date (formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("T")[0].split("-");
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2])
    );
  };

  // Generar estructura del calendario
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const weeks = [];
    let days = [];

    // Padding inicial
    for (let i = 0; i < startPadding; i++) {
      const prevMonthDay = new Date(year, month, -startPadding + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }

    // Días del mes
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });

      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
    }

    // Padding final
    if (days.length > 0) {
      let nextDay = 1;
      while (days.length < 7) {
        days.push({
          date: new Date(year, month + 1, nextDay++),
          isCurrentMonth: false,
        });
      }
      weeks.push(days);
    }

    return weeks;
  }, [currentMonth]);

  // Procesar tareas con información de posición para timeline
  const processedTasks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    return tasks
      .map((task) => {
        if (!task.due_date) return null;

        const dueDate = parseDateString(task.due_date);
        const startDate = task.start_date
          ? parseDateString(task.start_date)
          : dueDate;

        // Verificar si la tarea es visible en este mes
        if (dueDate < monthStart || startDate > monthEnd) return null;

        // Calcular fechas efectivas dentro del mes
        const effectiveStart = startDate < monthStart ? monthStart : startDate;
        const effectiveEnd = dueDate > monthEnd ? monthEnd : dueDate;

        // Encontrar la semana y día donde empieza y termina
        let startWeekIndex = -1;
        let startDayIndex = -1;
        let endWeekIndex = -1;
        let endDayIndex = -1;

        calendarData.forEach((week, wIndex) => {
          week.forEach((day, dIndex) => {
            if (day.date.toDateString() === effectiveStart.toDateString()) {
              startWeekIndex = wIndex;
              startDayIndex = dIndex;
            }
            if (day.date.toDateString() === effectiveEnd.toDateString()) {
              endWeekIndex = wIndex;
              endDayIndex = dIndex;
            }
          });
        });

        if (startWeekIndex === -1 || endWeekIndex === -1) return null;

        return {
          ...task,
          startWeekIndex,
          startDayIndex,
          endWeekIndex,
          endDayIndex,
          effectiveStart,
          effectiveEnd,
          originalStart: startDate,
          originalEnd: dueDate,
          spansDays: effectiveEnd.getTime() !== effectiveStart.getTime(),
        };
      })
      .filter(Boolean);
  }, [tasks, currentMonth, calendarData]);

  // Agrupar tareas por semana para el timeline
  const tasksByWeek = useMemo(() => {
    const map = {};
    processedTasks.forEach((task) => {
      for (let w = task.startWeekIndex; w <= task.endWeekIndex; w++) {
        if (!map[w]) map[w] = [];
        map[w].push(task);
      }
    });
    return map;
  }, [processedTasks]);

  // Agrupar tareas por fecha para vista clásica y panel lateral
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      if (task.due_date) {
        const dueDate = parseDateString(task.due_date);
        const startDate = task.start_date
          ? parseDateString(task.start_date)
          : dueDate;

        const currentDate = new Date(startDate);
        while (currentDate <= dueDate) {
          const dateKey = currentDate.toDateString();
          if (!map[dateKey]) map[dateKey] = [];
          if (!map[dateKey].find((t) => t.id === task.id)) {
            map[dateKey].push({
              ...task,
              isStart: currentDate.getTime() === startDate.getTime(),
              isEnd: currentDate.getTime() === dueDate.getTime(),
            });
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });
    return map;
  }, [tasks]);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const today = new Date();
  const isToday = (date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  // Obtener color de la barra de tarea
  const getTaskBarColor = (task) => {
    if (task.status === "done") return "bg-green-400 border-green-500";
    if (task.status === "in-progress") return "bg-blue-400 border-blue-500";
    if (task.is_urgent) return "bg-red-400 border-red-500";
    if (task.priority === "high") return "bg-orange-400 border-orange-500";
    if (task.priority === "medium") return "bg-yellow-400 border-yellow-500";
    return "bg-gray-300 dark:bg-night-600 border-gray-400";
  };

  // Obtener color de texto para las barras
  const getTaskTextColor = (task) => {
    if (task.status === "done") return "text-green-900";
    if (task.status === "in-progress") return "text-blue-900";
    if (task.is_urgent) return "text-red-900";
    if (task.priority === "high") return "text-orange-900";
    if (task.priority === "medium") return "text-yellow-900";
    return "text-gray-700 dark:text-night-300";
  };

  // Obtener icono de estado
  const getStatusIcon = (task) => {
    if (task.status === "done")
      return <CheckCircle className='w-4 h-4 text-green-500 dark:text-green-400' />;
    if (task.status === "in-progress")
      return <Clock className='w-4 h-4 text-blue-500 dark:text-blue-400' />;
    if (task.is_urgent) return <Zap className='w-4 h-4 text-red-500 dark:text-red-400' />;
    return <AlertCircle className='w-4 h-4 text-gray-400 dark:text-night-500' />;
  };

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Tareas del día seleccionado
  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];
    const dayTasks = tasksByDate[selectedDay.toDateString()] || [];
    const uniqueTasks = [];
    const seenIds = new Set();
    dayTasks.forEach((task) => {
      if (!seenIds.has(task.id)) {
        seenIds.add(task.id);
        uniqueTasks.push(task);
      }
    });
    return uniqueTasks;
  }, [selectedDay, tasksByDate]);

  // Renderizar barra de tarea en la semana
  const renderTaskBar = (task, weekIndex) => {
    const isStartWeek = task.startWeekIndex === weekIndex;
    const isEndWeek = task.endWeekIndex === weekIndex;

    const startCol = isStartWeek ? task.startDayIndex : 0;
    const endCol = isEndWeek ? task.endDayIndex : 6;
    const span = endCol - startCol + 1;

    // Calcular posición como porcentaje
    const leftPercent = (startCol / 7) * 100;
    const widthPercent = (span / 7) * 100;

    return (
      <motion.div
        key={`${task.id}-${weekIndex}`}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.3, delay: (task.id % 10) * 0.02 }}
        className={`
          absolute h-5 cursor-pointer transition-all hover:brightness-110 hover:shadow-md
          ${getTaskBarColor(task)}
          ${isStartWeek ? "rounded-l-full" : ""}
          ${isEndWeek ? "rounded-r-full" : ""}
          border-t border-b
          ${isStartWeek ? "border-l" : "border-l-0"}
          ${isEndWeek ? "border-r" : "border-r-0"}
        `}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          transformOrigin: "left",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onTaskClick?.(task);
        }}
        title={`${task.title}${
          task.start_date && task.due_date
            ? ` (${parseDateString(task.start_date).toLocaleDateString(
                "es-ES",
                { day: "numeric", month: "short" }
              )} - ${parseDateString(task.due_date).toLocaleDateString(
                "es-ES",
                { day: "numeric", month: "short" }
              )})`
            : ""
        }`}
      >
        {/* Solo mostrar texto si es la semana de inicio y hay espacio */}
        {isStartWeek && span >= 2 && (
          <span
            className={`text-[10px] font-medium truncate px-2 leading-5 block ${getTaskTextColor(
              task
            )}`}
          >
            {task.title}
          </span>
        )}
        {/* Mostrar icono de urgente si no hay espacio */}
        {task.is_urgent && isStartWeek && span < 2 && (
          <Zap className='w-3 h-3 mx-auto mt-1 text-red-700 dark:text-red-300' />
        )}
      </motion.div>
    );
  };

  return (
    <div className='bg-white dark:bg-night-900 rounded-xl border border-gray-200 dark:border-night-700 overflow-hidden'>
      {/* Header con navegación */}
      <div className='flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-night-800 border-b border-gray-200 dark:border-night-700'>
        <div className='flex items-center gap-2'>
          <Calendar className='w-5 h-5 text-brand-600' />
          <h3 className='font-semibold text-gray-900 dark:text-night-50'>Vista de Calendario</h3>
        </div>

        <div className='flex items-center gap-4'>
          {/* Toggle de vista */}
          <div className='flex items-center bg-gray-200 dark:bg-night-700 rounded-lg p-0.5'>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition flex items-center gap-1 ${
                viewMode === "timeline"
                  ? "bg-white dark:bg-night-900 text-brand-600 shadow-sm"
                  : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-50"
              }`}
            >
              <CalendarDays className='w-3.5 h-3.5' />
              Timeline
            </button>
            <button
              onClick={() => setViewMode("classic")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition flex items-center gap-1 ${
                viewMode === "classic"
                  ? "bg-white dark:bg-night-900 text-brand-600 shadow-sm"
                  : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-50"
              }`}
            >
              <LayoutList className='w-3.5 h-3.5' />
              Clásica
            </button>
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
            <span className='font-medium text-gray-900 dark:text-night-50 min-w-[140px] text-center capitalize'>
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
      </div>

      <div className='flex'>
        {/* Calendario */}
        <div className='flex-1 p-4'>
          {/* Días de la semana */}
          <div className='grid grid-cols-7 gap-1 mb-2'>
            {weekDays.map((day) => (
              <div
                key={day}
                className='text-center text-xs font-medium text-gray-500 dark:text-night-400 py-2'
              >
                {day}
              </div>
            ))}
          </div>

          {/* Vista Timeline */}
          {viewMode === "timeline" && (
            <div className='space-y-1'>
              {calendarData.map((week, weekIndex) => {
                const weekTasks = tasksByWeek[weekIndex] || [];
                // Ordenar tareas por duración (las más largas primero)
                const sortedTasks = [...weekTasks].sort((a, b) => {
                  const daysA =
                    (a.endWeekIndex - a.startWeekIndex) * 7 +
                    (a.endDayIndex - a.startDayIndex);
                  const daysB =
                    (b.endWeekIndex - b.startWeekIndex) * 7 +
                    (b.endDayIndex - b.startDayIndex);
                  return daysB - daysA;
                });

                // Asignar "carriles" a las tareas para evitar solapamiento
                const lanes = [];
                sortedTasks.forEach((task) => {
                  const startCol =
                    task.startWeekIndex === weekIndex ? task.startDayIndex : 0;
                  const endCol =
                    task.endWeekIndex === weekIndex ? task.endDayIndex : 6;

                  let assignedLane = 0;
                  while (true) {
                    const laneOccupied = lanes[assignedLane]?.some(
                      (t) =>
                        !(
                          endCol <
                            (t.startWeekIndex === weekIndex
                              ? t.startDayIndex
                              : 0) ||
                          startCol >
                            (t.endWeekIndex === weekIndex ? t.endDayIndex : 6)
                        )
                    );
                    if (!laneOccupied) {
                      if (!lanes[assignedLane]) lanes[assignedLane] = [];
                      lanes[assignedLane].push(task);
                      task._lane = assignedLane;
                      break;
                    }
                    assignedLane++;
                  }
                });

                const numLanes = Math.max(lanes.length, 1);
                const rowHeight = 28 + numLanes * 24;

                return (
                  <div key={weekIndex}>
                    {/* Fila de días */}
                    <div className='grid grid-cols-7 gap-0'>
                      {week.map((day, dayIndex) => {
                        const isSelected =
                          selectedDay?.toDateString() ===
                          day.date.toDateString();

                        return (
                          <button
                            key={dayIndex}
                            onClick={() => setSelectedDay(day.date)}
                            className={`
                              p-1.5 border-t border-l transition-all text-left
                              ${dayIndex === 6 ? "border-r" : ""}
                              ${
                                !day.isCurrentMonth
                                  ? "text-gray-300 dark:text-night-600 bg-gray-50/50"
                                  : "text-gray-700 dark:text-night-300 bg-white dark:bg-night-900"
                              }
                              ${
                                isToday(day.date)
                                  ? "bg-brand-50 dark:bg-brand-900/20"
                                  : "hover:bg-gray-50 dark:hover:bg-night-800"
                              }
                              ${
                                isSelected
                                  ? "ring-2 ring-brand-500 ring-inset z-10 relative"
                                  : ""
                              }
                            `}
                            style={{ borderColor: "#e5e7eb" }}
                          >
                            <span
                              className={`text-xs font-medium ${
                                isToday(day.date)
                                  ? "text-white bg-brand-600 rounded-full w-5 h-5 flex items-center justify-center"
                                  : ""
                              }`}
                            >
                              {day.date.getDate()}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Área de barras de tareas */}
                    <div
                      className='relative border-b border-l border-r bg-gray-50/30'
                      style={{
                        height: `${Math.max(rowHeight - 28, 28)}px`,
                        borderColor: "#e5e7eb",
                      }}
                    >
                      {/* Líneas de división de días */}
                      <div className='absolute inset-0 grid grid-cols-7 pointer-events-none'>
                        {[...Array(7)].map((_, i) => (
                          <div
                            key={i}
                            className={`border-r border-gray-100 dark:border-night-700 ${
                              i === 6 ? "border-r-0" : ""
                            }`}
                          />
                        ))}
                      </div>

                      {/* Barras de tareas */}
                      {sortedTasks.map((task) => (
                        <div
                          key={task.id}
                          className='absolute w-full px-0.5'
                          style={{ top: `${4 + task._lane * 24}px` }}
                        >
                          {renderTaskBar(task, weekIndex)}
                        </div>
                      ))}

                      {/* Mensaje si no hay tareas */}
                      {weekTasks.length === 0 && (
                        <div className='absolute inset-0 flex items-center justify-center text-gray-300 dark:text-night-600 text-xs'>
                          Sin tareas esta semana
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Vista Clásica */}
          {viewMode === "classic" && (
            <div className='grid gap-1'>
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className='grid grid-cols-7 gap-1'>
                  {week.map((day, dayIndex) => {
                    const dayDateString = day.date.toDateString();
                    const dayTasks = tasksByDate[dayDateString] || [];
                    const isSelected =
                      selectedDay?.toDateString() === dayDateString;
                    const hasTasks = dayTasks.length > 0;
                    const uniqueTaskCount = [
                      ...new Set(dayTasks.map((t) => t.id)),
                    ].length;

                    return (
                      <motion.button
                        key={dayIndex}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedDay(day.date)}
                        className={`
                          min-h-[80px] p-1 rounded-lg border transition-all relative flex flex-col
                          ${
                            !day.isCurrentMonth
                              ? "text-gray-300 dark:text-night-600 bg-gray-50 dark:bg-night-800"
                              : "text-gray-700 dark:text-night-300 bg-white dark:bg-night-900"
                          }
                          ${
                            isToday(day.date)
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                              : "border-gray-200 dark:border-night-700 hover:border-gray-300 dark:hover:border-night-600 hover:bg-gray-50 dark:hover:bg-night-800"
                          }
                          ${isSelected ? "ring-2 ring-brand-500" : ""}
                        `}
                      >
                        <span
                          className={`text-xs font-medium self-end ${
                            isToday(day.date)
                              ? "text-white bg-brand-600 rounded-full w-5 h-5 flex items-center justify-center"
                              : ""
                          }`}
                        >
                          {day.date.getDate()}
                        </span>

                        {/* Mini barras de tareas */}
                        {hasTasks && (
                          <div className='flex-1 mt-1 space-y-0.5 overflow-hidden'>
                            {dayTasks.slice(0, 3).map((task, idx) => (
                              <div
                                key={`${task.id}-${idx}`}
                                className={`
                                  h-1.5 ${getTaskBarColor(task).split(" ")[0]}
                                  ${
                                    task.isStart && task.isEnd
                                      ? "rounded-full mx-1"
                                      : task.isStart
                                      ? "rounded-l-full ml-0"
                                      : task.isEnd
                                      ? "rounded-r-full mr-0"
                                      : ""
                                  }
                                `}
                              />
                            ))}
                            {uniqueTaskCount > 3 && (
                              <span className='text-[8px] text-gray-400 dark:text-night-500 text-center block'>
                                +{uniqueTaskCount - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel lateral de tareas del día */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='border-l border-gray-200 dark:border-night-700 bg-gray-50 dark:bg-night-800 overflow-hidden'
            >
              <div className='w-[280px]'>
                <div className='px-4 py-3 bg-white dark:bg-night-900 border-b border-gray-200 dark:border-night-700 flex items-center justify-between'>
                  <div>
                    <h4 className='font-semibold text-gray-900 dark:text-night-50 capitalize'>
                      {selectedDay.toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </h4>
                    <p className='text-xs text-gray-500 dark:text-night-400'>
                      {selectedDayTasks.length} tarea
                      {selectedDayTasks.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className='p-1 hover:bg-gray-100 dark:hover:bg-night-800 rounded-lg transition'
                  >
                    <X className='w-4 h-4 text-gray-500 dark:text-night-400' />
                  </button>
                </div>

                <div className='p-3 space-y-2 max-h-[400px] overflow-y-auto'>
                  {selectedDayTasks.length === 0 ? (
                    <div className='text-center py-8 text-gray-500 dark:text-night-400'>
                      <Calendar className='w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-night-600' />
                      <p className='text-sm'>No hay tareas para este día</p>
                    </div>
                  ) : (
                    selectedDayTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 bg-white dark:bg-night-900 rounded-lg border border-gray-200 dark:border-night-700 cursor-pointer hover:shadow-md transition ${
                          task.status === "done" ? "opacity-60" : ""
                        }`}
                        onClick={() => onTaskClick?.(task)}
                      >
                        <div className='flex items-start gap-2'>
                          {getStatusIcon(task)}
                          <div className='flex-1 min-w-0'>
                            <h5
                              className={`text-sm font-medium ${
                                task.status === "done"
                                  ? "text-gray-400 dark:text-night-500 line-through"
                                  : "text-gray-900 dark:text-night-50"
                              }`}
                            >
                              {task.title}
                            </h5>
                            {task.description && (
                              <p className='text-xs text-gray-500 dark:text-night-400 line-clamp-2 mt-1'>
                                {task.description}
                              </p>
                            )}
                            {/* Mostrar rango de fechas */}
                            {task.start_date && task.due_date && (
                              <p className='text-[10px] text-brand-600 mt-1 flex items-center gap-1'>
                                <Calendar className='w-3 h-3' />
                                {parseDateString(
                                  task.start_date
                                ).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                })}
                                {" → "}
                                {parseDateString(
                                  task.due_date
                                ).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            )}
                            <div className='flex items-center gap-2 mt-2'>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  task.priority === "high"
                                    ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                                    : task.priority === "medium"
                                    ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300"
                                    : "bg-gray-100 dark:bg-night-800 text-gray-700 dark:text-night-300"
                                }`}
                              >
                                {task.priority === "high"
                                  ? "Alta"
                                  : task.priority === "medium"
                                  ? "Media"
                                  : "Baja"}
                              </span>
                              {task.is_urgent && (
                                <span className='text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-medium flex items-center gap-0.5'>
                                  <Zap className='w-2 h-2' />
                                  Urgente
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leyenda */}
      <div className='px-4 py-3 bg-gray-50 dark:bg-night-800 border-t border-gray-200 dark:border-night-700 flex flex-wrap items-center gap-4 text-xs'>
        <span className='text-gray-500 dark:text-night-400 font-medium'>Estados:</span>
        <div className='flex items-center gap-1'>
          <span className='w-4 h-2 rounded-full bg-green-400' />
          <span className='text-gray-600 dark:text-night-300'>Completada</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-4 h-2 rounded-full bg-blue-400' />
          <span className='text-gray-600 dark:text-night-300'>En progreso</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-4 h-2 rounded-full bg-orange-400' />
          <span className='text-gray-600 dark:text-night-300'>Alta prioridad</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-4 h-2 rounded-full bg-red-400' />
          <span className='text-gray-600 dark:text-night-300'>Urgente</span>
        </div>
        <div className='flex items-center gap-1'>
          <span className='w-4 h-2 rounded-full bg-yellow-400' />
          <span className='text-gray-600 dark:text-night-300'>Media prioridad</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCalendar;

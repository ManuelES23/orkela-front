import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  FolderKanban,
  ListChecks,
  UserCircle,
  FolderOpen,
  Flag,
  Search,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { tasksAPI } from "../utils/api";
import AnimatedNumber from "./ui/AnimatedNumber";
import ProgressRing from "./ui/ProgressRing";

const GanttChart = ({ projects }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("projects"); // 'projects', 'tasks'
  const [timeScale, setTimeScale] = useState("month"); // 'month', 'week'
  const [tasksData, setTasksData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedProjects, setExpandedProjects] = useState({});

  // Cargar tareas
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const data = await tasksAPI.getAll();
        setTasksData(data);
      } catch (err) {
        console.error("Error loading tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  // Parsear fecha de string "YYYY-MM-DD" o objeto Date
  const parseDateString = (dateStr) => {
    if (!dateStr) return null;

    // Si ya es un objeto Date, devolverlo
    if (dateStr instanceof Date) return dateStr;

    // Asegurar que es un string
    if (typeof dateStr !== "string") {
      // Intentar convertir a string si es posible
      try {
        dateStr = String(dateStr);
      } catch {
        return null;
      }
    }

    const cleanDate = dateStr.split("T")[0];
    const [year, month, day] = cleanDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Calcular rango de fechas visible
  const dateRange = useMemo(() => {
    if (timeScale === "month") {
      const start = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const end = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      );
      return { start, end, days: end.getDate() };
    } else {
      // Vista semanal - mostrar 4 semanas
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay()); // Inicio de semana
      const end = new Date(start);
      end.setDate(end.getDate() + 27); // 4 semanas
      return { start, end, days: 28 };
    }
  }, [currentDate, timeScale]);

  // Generar array de días para el header
  const daysArray = useMemo(() => {
    const days = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [dateRange]);

  // Colores por ESTADO (no por prioridad)
  const getStatusColor = (status, daysRemaining, isUrgent = false) => {
    // Si está atrasado (fecha pasada y no completado)
    if (
      daysRemaining !== null &&
      daysRemaining < 0 &&
      status !== "done" &&
      status !== "completed"
    ) {
      return {
        bg: "bg-red-500",
        border: "border-red-500",
        text: "text-red-700",
        light: "bg-red-100",
      };
    }
    // Si es urgente y no está completado
    if (isUrgent && status !== "done" && status !== "completed") {
      return {
        bg: "bg-orange-500",
        border: "border-orange-500",
        text: "text-orange-700",
        light: "bg-orange-100",
      };
    }
    // Por estado
    const colors = {
      done: {
        bg: "bg-green-500",
        border: "border-green-500",
        text: "text-green-700",
        light: "bg-green-100",
      },
      completed: {
        bg: "bg-green-500",
        border: "border-green-500",
        text: "text-green-700",
        light: "bg-green-100",
      },
      "in-progress": {
        bg: "bg-blue-500",
        border: "border-blue-500",
        text: "text-blue-700",
        light: "bg-blue-100",
      },
      in_progress: {
        bg: "bg-blue-500",
        border: "border-blue-500",
        text: "text-blue-700",
        light: "bg-blue-100",
      },
      active: {
        bg: "bg-blue-500",
        border: "border-blue-500",
        text: "text-blue-700",
        light: "bg-blue-100",
      },
      todo: {
        bg: "bg-gray-400",
        border: "border-gray-400",
        text: "text-gray-600",
        light: "bg-gray-100",
      },
      pending: {
        bg: "bg-gray-400",
        border: "border-gray-400",
        text: "text-gray-600",
        light: "bg-gray-100",
      },
      cancelled: {
        bg: "bg-gray-300",
        border: "border-gray-300",
        text: "text-gray-500",
        light: "bg-gray-50",
      },
      on_hold: {
        bg: "bg-yellow-500",
        border: "border-yellow-500",
        text: "text-yellow-700",
        light: "bg-yellow-100",
      },
    };
    return colors[status] || colors.pending;
  };

  // Colores por prioridad (solo para badges)
  const getPriorityBadgeColor = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-700",
      urgent: "bg-red-100 text-red-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-green-100 text-green-700",
    };
    return colors[priority] || colors.medium;
  };

  // Calcular días restantes
  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseDateString(endDate);
    if (!end) return null;
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  };

  // Generar items para el Gantt
  const items = useMemo(() => {
    let itemList = [];

    if (viewMode === "projects") {
      // Ordenar proyectos por fecha de inicio/vencimiento antes de procesarlos
      const sortedProjects = [...projects].sort((a, b) => {
        // Calcular fecha de inicio para cada proyecto
        const getProjectStartDate = (project) => {
          // Obtener tareas del proyecto
          const projectTasks = tasksData.filter(
            (t) => t.project_id === project.id,
          );

          // Si hay tareas con fechas, usar la fecha más temprana
          if (projectTasks.length > 0) {
            const taskDates = projectTasks
              .filter((t) => t.start_date || t.due_date)
              .map((t) => {
                const start = t.start_date
                  ? parseDateString(t.start_date)
                  : parseDateString(t.due_date);
                return start;
              })
              .filter((d) => d);

            if (taskDates.length > 0) {
              return new Date(Math.min(...taskDates.map((d) => d.getTime())));
            }
          }

          // Si no hay tareas, usar la fecha del proyecto o fecha actual
          return project.due_date
            ? parseDateString(project.due_date)
            : new Date();
        };

        const dateA = getProjectStartDate(a);
        const dateB = getProjectStartDate(b);
        return dateA - dateB;
      });

      sortedProjects.forEach((project) => {
        // Obtener tareas del proyecto
        const projectTasks = tasksData.filter(
          (t) => t.project_id === project.id,
        );

        // Calcular fechas del proyecto basándose en las tareas
        let projectStart = project.due_date
          ? parseDateString(project.due_date)
          : null;
        let projectEnd = project.due_date
          ? parseDateString(project.due_date)
          : null;

        // Si hay tareas, usar el rango de fechas de las tareas
        if (projectTasks.length > 0) {
          const taskDates = projectTasks
            .filter((t) => t.start_date || t.due_date)
            .map((t) => ({
              start: t.start_date
                ? parseDateString(t.start_date)
                : parseDateString(t.due_date),
              end: parseDateString(t.due_date),
            }))
            .filter((d) => d.start && d.end);

          if (taskDates.length > 0) {
            projectStart = new Date(Math.min(...taskDates.map((d) => d.start)));
            projectEnd = new Date(Math.max(...taskDates.map((d) => d.end)));
          }
        }

        // Si no hay fechas, estimar 30 días desde hoy
        if (!projectStart || !projectEnd) {
          projectStart = new Date();
          projectEnd = new Date();
          projectEnd.setDate(projectEnd.getDate() + 30);
        }

        // Calcular días restantes para el proyecto
        const projectDaysRemaining = getDaysRemaining(projectEnd);

        // Color basado en estado del proyecto
        const projectColors = getStatusColor(
          project.status,
          projectDaysRemaining,
        );

        itemList.push({
          id: `project-${project.id}`,
          projectId: project.id,
          name: project.name,
          description: project.description,
          startDate: projectStart,
          endDate: projectEnd,
          progress: project.progress || 0,
          colors: projectColors,
          color: project.color || projectColors.bg,
          status: project.status,
          priority: project.priority,
          tasksCount: projectTasks.length,
          completedTasks: projectTasks.filter(
            (t) => t.status === "done" || t.status === "completed",
          ).length,
          team: project.users?.length || 0,
          type: "project",
          isExpanded: expandedProjects[project.id],
          tasks: projectTasks,
        });

        // Si el proyecto está expandido, añadir sus tareas ordenadas por fecha
        if (expandedProjects[project.id]) {
          // Ordenar tareas del proyecto por fecha
          const sortedProjectTasks = [...projectTasks].sort((a, b) => {
            const dateA = a.start_date
              ? parseDateString(a.start_date)
              : a.due_date
                ? parseDateString(a.due_date)
                : new Date();
            const dateB = b.start_date
              ? parseDateString(b.start_date)
              : b.due_date
                ? parseDateString(b.due_date)
                : new Date();
            return dateA - dateB;
          });

          sortedProjectTasks.forEach((task) => {
            const taskStart = task.start_date
              ? parseDateString(task.start_date)
              : task.due_date
                ? (() => {
                    const d = parseDateString(task.due_date);
                    d.setDate(d.getDate() - 3);
                    return d;
                  })()
                : null;
            const taskEnd = parseDateString(task.due_date);

            if (!taskStart || !taskEnd) return;

            // Calcular días restantes para la tarea
            const taskDaysRemaining = getDaysRemaining(taskEnd);

            // Color basado en estado de la tarea
            const taskColors = getStatusColor(
              task.status,
              taskDaysRemaining,
              task.is_urgent,
            );

            itemList.push({
              id: `task-${task.id}`,
              taskId: task.id,
              parentProjectId: project.id,
              name: task.title,
              description: task.description,
              startDate: taskStart,
              endDate: taskEnd,
              // Las tareas no tienen progreso, solo estado
              progress: null,
              colors: taskColors,
              color: taskColors.bg,
              status: task.status,
              priority: task.priority,
              isUrgent: task.is_urgent,
              assignedUsers: task.assigned_users || [],
              type: "task",
              projectName: project.name,
              projectColor: project.color,
            });
          });
        }
      });
    } else if (viewMode === "tasks") {
      // Ordenar tareas por fecha de inicio/vencimiento
      const sortedTasks = [...tasksData].sort((a, b) => {
        const dateA = a.start_date
          ? parseDateString(a.start_date)
          : a.due_date
            ? parseDateString(a.due_date)
            : new Date();
        const dateB = b.start_date
          ? parseDateString(b.start_date)
          : b.due_date
            ? parseDateString(b.due_date)
            : new Date();
        return dateA - dateB;
      });

      sortedTasks.forEach((task) => {
        const taskStart = task.start_date
          ? parseDateString(task.start_date)
          : task.due_date
            ? (() => {
                const d = parseDateString(task.due_date);
                d.setDate(d.getDate() - 3);
                return d;
              })()
            : null;
        const taskEnd = parseDateString(task.due_date);

        if (!taskStart || !taskEnd) return;

        // Calcular días restantes para la tarea
        const taskDaysRemaining = getDaysRemaining(taskEnd);

        // Color basado en estado de la tarea
        const taskColors = getStatusColor(
          task.status,
          taskDaysRemaining,
          task.is_urgent,
        );

        itemList.push({
          id: `task-${task.id}`,
          taskId: task.id,
          name: task.title,
          description: task.description,
          startDate: taskStart,
          endDate: taskEnd,
          // Las tareas no tienen progreso, solo estado
          progress: null,
          colors: taskColors,
          color: taskColors.bg,
          status: task.status,
          priority: task.priority,
          isUrgent: task.is_urgent,
          assignedUsers: task.assigned_users || [],
          type: "task",
          projectName: task.project?.name || "Sin proyecto",
          projectColor: task.project?.color || "bg-gray-500",
        });
      });
    }

    // Aplicar filtros
    return itemList.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority =
        priorityFilter === "all" || item.priority === priorityFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          (item.status === "active" ||
            item.status === "todo" ||
            item.status === "in-progress")) ||
        (statusFilter === "completed" &&
          (item.status === "completed" || item.status === "done"));

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [
    projects,
    tasksData,
    viewMode,
    expandedProjects,
    searchTerm,
    priorityFilter,
    statusFilter,
  ]);

  // Clasificar un item en uno de los 4 grupos de estado (Atrasados / En
  // progreso / Próximos / Completados) para la vista agrupada
  const classifyGroup = (item) => {
    if (item.status === "done" || item.status === "completed") return "done";
    const daysRemaining = getDaysRemaining(item.endDate);
    if (daysRemaining !== null && daysRemaining < 0) return "late";
    if (
      item.status === "in-progress" ||
      item.status === "in_progress" ||
      item.status === "active"
    )
      return "progress";
    return "upcoming";
  };

  const GROUP_META = {
    late: { label: "Atrasados", stripe: "bg-red-500", text: "text-red-700" },
    progress: {
      label: "En progreso",
      stripe: "bg-brand-600",
      text: "text-brand-700",
    },
    upcoming: { label: "Próximos", stripe: "bg-gray-400", text: "text-gray-600" },
    done: { label: "Completados", stripe: "bg-green-500", text: "text-green-700" },
  };

  // Fondo de la barra según el grupo (más coherente con la franja de
  // métricas y las cabeceras de sección que con el estado granular)
  const getBarFill = (groupKey) => {
    switch (groupKey) {
      case "late":
        return "bg-linear-to-r from-red-400 to-red-600";
      case "progress":
        return "bg-linear-to-r from-brand-500 to-accent-500";
      case "done":
        return "bg-linear-to-r from-green-400 to-green-600";
      default:
        return "bg-gray-400";
    }
  };

  // Agrupar los items de nivel superior por estado, conservando las
  // subtareas de un proyecto expandido dentro del mismo grupo que su padre
  const groupedSections = useMemo(() => {
    const buckets = { late: [], progress: [], upcoming: [], done: [] };
    let currentGroupKey = null;

    items.forEach((item) => {
      const isSubtask = item.type === "task" && item.parentProjectId;
      if (!isSubtask) {
        currentGroupKey = classifyGroup(item);
        buckets[currentGroupKey].push({ item, groupKey: currentGroupKey });
      } else if (currentGroupKey) {
        buckets[currentGroupKey].push({ item, groupKey: currentGroupKey });
      }
    });

    return ["late", "progress", "upcoming", "done"]
      .map((key) => ({
        key,
        ...GROUP_META[key],
        rows: buckets[key],
        topLevelCount: buckets[key].filter(
          ({ item }) => !(item.type === "task" && item.parentProjectId),
        ).length,
      }))
      .filter((group) => group.rows.length > 0);
  }, [items]);

  // Calcular posición y ancho de la barra
  const getBarStyle = (item) => {
    const { start, end, days } = dateRange;

    // Si el item no está en el rango visible
    if (item.endDate < start || item.startDate > end) {
      return null;
    }

    // Calcular inicio y fin visible
    const visibleStart = item.startDate < start ? start : item.startDate;
    const visibleEnd = item.endDate > end ? end : item.endDate;

    const startOffset = Math.max(
      0,
      (visibleStart - start) / (1000 * 60 * 60 * 24),
    );
    const duration =
      Math.ceil((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1;

    const left = (startOffset / days) * 100;
    const width = Math.max((duration / days) * 100, 2); // Mínimo 2% de ancho

    // Determinar si las puntas están cortadas
    const isStartCut = item.startDate < start;
    const isEndCut = item.endDate > end;

    return {
      left: `${left}%`,
      width: `${width}%`,
      isStartCut,
      isEndCut,
    };
  };

  // Navegación
  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (timeScale === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + direction * 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Toggle expandir proyecto
  const toggleProject = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Obtener día de hoy si está en rango
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIndex = daysArray.findIndex(
    (d) =>
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear(),
  );

  // Formatear título del periodo
  const periodTitle = useMemo(() => {
    if (timeScale === "month") {
      return currentDate.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      });
    } else {
      const endDate = new Date(dateRange.end);
      return `${dateRange.start.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      })} - ${endDate.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    }
  }, [currentDate, timeScale, dateRange]);

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
      {/* Header */}
      <div className='p-4 border-b border-gray-200 space-y-4'>
        {/* Fila superior: Título y navegación */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-brand-100 rounded-lg'>
              <Calendar className='w-5 h-5 text-brand-600' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-gray-900'>
                Diagrama de Gantt
              </h2>
              <p className='text-sm text-gray-500'>{items.length} elementos</p>
            </div>
          </div>

          {/* Navegación temporal */}
          <div className='flex items-center gap-2'>
            <button
              onClick={goToToday}
              className='px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition'
            >
              Hoy
            </button>
            <div className='flex items-center bg-gray-100 rounded-lg'>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
                className='p-2 hover:bg-gray-200 rounded-l-lg transition'
              >
                <ChevronLeft className='w-4 h-4 text-gray-600' />
              </motion.button>
              <span className='px-4 py-1.5 text-sm font-medium text-gray-700 min-w-45 text-center capitalize'>
                {periodTitle}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(1)}
                className='p-2 hover:bg-gray-200 rounded-r-lg transition'
              >
                <ChevronRight className='w-4 h-4 text-gray-600' />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Fila de controles */}
        <div className='flex flex-wrap items-center gap-3'>
          {/* Selector de vista */}
          <div className='flex bg-gray-100 p-1 rounded-lg'>
            <button
              onClick={() => setViewMode("projects")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === "projects"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FolderKanban className='w-4 h-4' />
              Proyectos
            </button>
            <button
              onClick={() => setViewMode("tasks")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === "tasks"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ListChecks className='w-4 h-4' />
              Tareas
            </button>
          </div>

          {/* Escala temporal */}
          <div className='flex bg-gray-100 p-1 rounded-lg'>
            <button
              onClick={() => setTimeScale("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                timeScale === "month"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <CalendarDays className='w-4 h-4' />
              Mes
            </button>
            <button
              onClick={() => setTimeScale("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                timeScale === "week"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <CalendarRange className='w-4 h-4' />
              Semanas
            </button>
          </div>

          {/* Búsqueda */}
          <div className='relative flex-1 min-w-50 max-w-xs'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
            />
          </div>

          {/* Filtro de prioridad */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none'
          >
            <option value='all'>Todas las prioridades</option>
            <option value='high'>Alta</option>
            <option value='medium'>Media</option>
            <option value='low'>Baja</option>
          </select>

          {/* Filtro de estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none'
          >
            <option value='all'>Todos los estados</option>
            <option value='active'>Activos</option>
            <option value='completed'>Completados</option>
          </select>
        </div>
      </div>

      {/* Franja de métricas por estado */}
      {!loading && items.length > 0 && (
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-gray-200 bg-gray-50/60'>
          {["late", "progress", "upcoming", "done"].map((key) => {
            const meta = GROUP_META[key];
            const group = groupedSections.find((g) => g.key === key);
            return (
              <div
                key={key}
                className={`bg-white border border-gray-200 border-l-4 rounded-lg px-3.5 py-2.5 ${
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
                  value={group?.topLevelCount || 0}
                  className='block font-mono text-xl font-bold text-gray-900'
                />
                <span className='text-xs font-medium text-gray-500'>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Contenido del Gantt */}
      <div className='overflow-x-auto'>
        <div className='min-w-225'>
          {/* Header de días */}
          <div className='flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10'>
            <div className='w-72 shrink-0 p-3 font-medium text-gray-700 border-r border-gray-200 text-sm'>
              {viewMode === "projects" ? "Proyecto" : "Tarea"}
            </div>
            <div className='flex-1 flex'>
              {daysArray.map((day, index) => {
                const isToday = index === todayIndex;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isFirstOfMonth = day.getDate() === 1;

                return (
                  <div
                    key={index}
                    className={`flex-1 min-w-7.5 text-center border-r border-gray-100 ${
                      isToday ? "bg-brand-100" : isWeekend ? "bg-gray-100" : ""
                    } ${isFirstOfMonth ? "border-l-2 border-l-gray-300" : ""}`}
                  >
                    <div
                      className={`text-[10px] font-medium ${
                        isToday ? "text-brand-700" : "text-gray-500"
                      }`}
                    >
                      {day
                        .toLocaleDateString("es-ES", { weekday: "short" })
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        isToday ? "text-brand-700" : "text-gray-700"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filas */}
          <div className='divide-y divide-gray-100'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto'></div>
                <p className='mt-2 text-gray-500 text-sm'>Cargando...</p>
              </div>
            ) : items.length === 0 ? (
              <div className='p-12 text-center'>
                <FolderKanban className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                <p className='text-gray-500'>No hay elementos para mostrar</p>
                <p className='text-gray-400 text-sm mt-1'>
                  {searchTerm
                    ? "Intenta con otros términos de búsqueda"
                    : "Crea proyectos con fechas para verlos aquí"}
                </p>
              </div>
            ) : (
              groupedSections.map((group) => (
                <div key={group.key}>
                  {/* Cabecera de sección */}
                  <div className='flex items-center gap-2 px-3 py-1.5 bg-gray-50'>
                    <span className={`w-1 h-4 rounded-full ${group.stripe}`} />
                    <span className={`text-xs font-semibold ${group.text}`}>
                      {group.label}
                    </span>
                    <span className='text-[11px] font-mono text-gray-400'>
                      {group.topLevelCount}
                    </span>
                  </div>

                  <AnimatePresence>
                    {group.rows.map(({ item, groupKey }, index) => {
                      const barStyle = getBarStyle(item);
                      const daysRemaining = getDaysRemaining(item.endDate);
                      const isTask = item.type === "task";
                      const isSubTask = isTask && item.parentProjectId;

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`flex hover:bg-gray-50 transition-colors border-l-4 ${
                            group.stripe.replace("bg-", "border-l-")
                          } ${isSubTask ? "bg-gray-50/50" : ""}`}
                        >
                          {/* Info del item */}
                          <div
                            className={`w-72 shrink-0 p-3 border-r border-gray-200 ${
                              isSubTask ? "pl-8" : ""
                            }`}
                          >
                        <div className='flex items-start gap-2'>
                          {/* Indicador de color / expandir */}
                          {item.type === "project" ? (
                            <button
                              onClick={() => toggleProject(item.projectId)}
                              className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                item.isExpanded
                                  ? "bg-brand-100 text-brand-600"
                                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                              }`}
                            >
                              <ChevronRight
                                className={`w-3 h-3 transition-transform ${
                                  item.isExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                          ) : (
                            <div
                              className={`w-2 h-2 rounded-full ${item.colors.bg} shrink-0 mt-1.5`}
                            />
                          )}

                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-1.5'>
                              <span
                                className={`font-medium text-gray-900 text-sm truncate ${
                                  isSubTask ? "text-gray-700" : ""
                                }`}
                              >
                                {item.name}
                              </span>
                              {item.isUrgent && (
                                <AlertCircle className='w-3.5 h-3.5 text-red-500 shrink-0' />
                              )}
                            </div>

                            {/* Métricas según tipo */}
                            <div className='flex items-center gap-2 mt-1 text-xs text-gray-500'>
                              {item.type === "project" ? (
                                <>
                                  <span className='flex items-center gap-0.5'>
                                    <ListChecks className='w-3 h-3' />
                                    {item.completedTasks}/{item.tasksCount}
                                  </span>
                                  <span className='flex items-center gap-0.5'>
                                    <Users className='w-3 h-3' />
                                    {item.team}
                                  </span>
                                  <span className='flex items-center gap-1'>
                                    <ProgressRing
                                      percentage={item.progress}
                                      size={14}
                                      strokeWidth={2.5}
                                      color='var(--color-brand-600)'
                                      trackColor='#e5e7eb'
                                    />
                                    {item.progress}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  {!isSubTask && (
                                    <span className='flex items-center gap-0.5'>
                                      <FolderOpen className='w-3 h-3' />
                                      {item.projectName}
                                    </span>
                                  )}
                                  {item.assignedUsers?.length > 0 && (
                                    <span className='flex items-center gap-0.5'>
                                      <UserCircle className='w-3 h-3' />
                                      {item.assignedUsers.length}
                                    </span>
                                  )}
                                </>
                              )}
                              {daysRemaining !== null && (
                                <span
                                  className={`${
                                    item.status === "done" ||
                                    item.status === "completed"
                                      ? "text-green-600"
                                      : daysRemaining < 0
                                        ? "text-red-600"
                                        : daysRemaining <= 3
                                          ? "text-yellow-600"
                                          : ""
                                  }`}
                                >
                                  {item.status === "done" ||
                                  item.status === "completed" ? (
                                    <>
                                      <CheckCircle className='w-3 h-3 inline mr-0.5' />
                                      Completado
                                    </>
                                  ) : (
                                    <>
                                      <Clock className='w-3 h-3 inline mr-0.5' />
                                      {daysRemaining < 0
                                        ? `${Math.abs(daysRemaining)}d atraso`
                                        : daysRemaining === 0
                                          ? "Hoy"
                                          : `${daysRemaining}d`}
                                    </>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Badges */}
                            <div className='flex gap-1 mt-1.5'>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  item.status === "done" ||
                                  item.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : item.status === "in-progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : item.status === "active"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {item.status === "done" ||
                                item.status === "completed"
                                  ? "Completado"
                                  : item.status === "in-progress"
                                    ? "En progreso"
                                    : item.status === "active"
                                      ? "Activo"
                                      : item.status === "todo"
                                        ? "Pendiente"
                                        : item.status}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 ${getPriorityBadgeColor(
                                  item.priority,
                                )}`}
                              >
                                <Flag className='w-2.5 h-2.5' />
                                {item.priority === "high" ||
                                item.priority === "urgent"
                                  ? "Alta"
                                  : item.priority === "medium"
                                    ? "Media"
                                    : "Baja"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className='flex-1 relative py-2'>
                        {/* Grid de fondo */}
                        <div className='absolute inset-0 flex'>
                          {daysArray.map((day, i) => {
                            const isWeekend =
                              day.getDay() === 0 || day.getDay() === 6;
                            const isFirstOfMonth = day.getDate() === 1;
                            return (
                              <div
                                key={i}
                                className={`flex-1 min-w-7.5 border-r border-gray-100 ${
                                  isWeekend ? "bg-gray-50" : ""
                                } ${
                                  isFirstOfMonth
                                    ? "border-l-2 border-l-gray-200"
                                    : ""
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Línea de hoy */}
                        {todayIndex >= 0 && (
                          <div
                            className='absolute top-0 bottom-0 w-0.5 bg-brand-500 z-10'
                            style={{
                              left: `${
                                ((todayIndex + 0.5) / daysArray.length) * 100
                              }%`,
                            }}
                          >
                            <div className='absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-500 rounded-full' />
                          </div>
                        )}

                        {/* Barra del item */}
                        {barStyle && (
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{
                              delay: index * 0.02 + 0.1,
                              duration: 0.3,
                            }}
                            className='absolute top-1/2 -translate-y-1/2 h-8 group cursor-pointer z-5'
                            style={{
                              left: barStyle.left,
                              width: barStyle.width,
                              originX: 0,
                            }}
                          >
                            <div
                              className={`h-full relative overflow-hidden shadow-sm group-hover:shadow-md transition-shadow ${
                                barStyle.isStartCut
                                  ? "rounded-r-md"
                                  : barStyle.isEndCut
                                    ? "rounded-l-md"
                                    : "rounded-md"
                              }`}
                            >
                              {/* Fondo - Para proyectos con progreso o tareas completas */}
                              {item.type === "project" ? (
                                <>
                                  {/* Fondo base del proyecto */}
                                  <div
                                    className={`absolute inset-0 ${getBarFill(groupKey)} opacity-20`}
                                  />
                                  {/* Borde del proyecto */}
                                  <div
                                    className={`absolute inset-0 border-2 ${
                                      item.colors.border
                                    } ${
                                      barStyle.isStartCut
                                        ? "rounded-r-md border-l-0"
                                        : barStyle.isEndCut
                                          ? "rounded-l-md border-r-0"
                                          : "rounded-md"
                                    }`}
                                  />
                                  {/* Progreso del proyecto */}
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.progress}%` }}
                                    transition={{
                                      delay: index * 0.02 + 0.3,
                                      duration: 0.5,
                                    }}
                                    className={`absolute inset-y-0 left-0 ${getBarFill(
                                      groupKey,
                                    )} opacity-60 ${
                                      barStyle.isStartCut ? "" : "rounded-l-md"
                                    }`}
                                  />
                                </>
                              ) : (
                                <>
                                  {/* Barra sólida para tareas - color según estado */}
                                  <div
                                    className={`absolute inset-0 ${getBarFill(
                                      groupKey,
                                    )} ${
                                      item.status === "done" ||
                                      item.status === "completed"
                                        ? "opacity-80"
                                        : "opacity-70"
                                    }`}
                                  />
                                  {/* Borde de la tarea */}
                                  <div
                                    className={`absolute inset-0 border-2 ${
                                      item.colors.border
                                    } ${
                                      barStyle.isStartCut
                                        ? "rounded-r-md border-l-0"
                                        : barStyle.isEndCut
                                          ? "rounded-l-md border-r-0"
                                          : "rounded-md"
                                    }`}
                                  />
                                </>
                              )}

                              {/* Contenido de la barra */}
                              <div className='relative h-full flex items-center justify-between px-2 text-white'>
                                {item.type === "project" ? (
                                  <>
                                    <span className='text-xs font-semibold drop-shadow truncate'>
                                      {item.progress > 0
                                        ? `${item.progress}%`
                                        : ""}
                                    </span>
                                    {item.progress === 100 && (
                                      <CheckCircle className='w-4 h-4 text-white drop-shadow' />
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {/* Para tareas mostrar icono de estado */}
                                    {(item.status === "done" ||
                                      item.status === "completed") && (
                                      <CheckCircle className='w-4 h-4 text-white drop-shadow' />
                                    )}
                                    {item.status === "in-progress" && (
                                      <Clock className='w-4 h-4 text-white drop-shadow' />
                                    )}
                                    <span className='text-xs font-semibold drop-shadow truncate ml-1'>
                                      {item.status === "done" ||
                                      item.status === "completed"
                                        ? "✓"
                                        : item.status === "in-progress"
                                          ? "En curso"
                                          : ""}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Tooltip */}
                            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20'>
                              <div className='bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl'>
                                <div className='font-semibold mb-1'>
                                  {item.name}
                                </div>
                                <div className='text-gray-300 space-y-0.5'>
                                  <div>
                                    Inicio:{" "}
                                    {item.startDate.toLocaleDateString(
                                      "es-ES",
                                      {
                                        day: "numeric",
                                        month: "short",
                                      },
                                    )}
                                  </div>
                                  <div>
                                    Fin:{" "}
                                    {item.endDate.toLocaleDateString("es-ES", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </div>
                                  {item.type === "project" ? (
                                    <div>Progreso: {item.progress}%</div>
                                  ) : (
                                    <div>
                                      Estado:{" "}
                                      {item.status === "done" ||
                                      item.status === "completed"
                                        ? "Completada"
                                        : item.status === "in-progress"
                                          ? "En progreso"
                                          : "Pendiente"}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className='w-2 h-2 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1' />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>

          {/* Leyenda */}
          <div className='p-3 bg-gray-50 border-t border-gray-200'>
            <div className='flex flex-wrap items-center gap-4 text-xs text-gray-600'>
              <span className='font-medium text-gray-700'>Estados:</span>
              <div className='flex items-center gap-1.5'>
                <div className='w-4 h-2 bg-green-500 rounded' />
                <span>Completado</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className='w-4 h-2 bg-linear-to-r from-brand-500 to-accent-500 rounded' />
                <span>En progreso</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className='w-4 h-2 bg-gray-400 rounded' />
                <span>Pendiente</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className='w-4 h-2 bg-orange-500 rounded' />
                <span>Urgente</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className='w-4 h-2 bg-red-500 rounded' />
                <span>Atrasado</span>
              </div>
              <div className='flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-300'>
                <div className='w-0.5 h-4 bg-brand-500 rounded' />
                <span>Hoy</span>
              </div>
              <div className='ml-auto text-gray-400'>
                Click en ▶ para expandir tareas del proyecto
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;

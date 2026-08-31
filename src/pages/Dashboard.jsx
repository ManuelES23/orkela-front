import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { parseLocalDate } from "../utils/dateUtils";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useUserContext } from "../hooks/useOrganizationPermissions";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  StaggerContainer,
  StaggerItem,
} from "../components/animations/MotionComponents";
import ProgressRing from "../components/ui/ProgressRing";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import {
  FolderKanban,
  CheckCircle2,
  CheckCircle,
  Users,
  Clock,
  Calendar,
  CalendarClock,
  AlertTriangle,
  ChevronRight,
  ListTodo,
  Plus,
  BarChart3,
  Timer,
  Sparkles,
  Flame,
} from "lucide-react";
import { projectsAPI, tasksAPI, teamsAPI } from "../utils/api";

// Registrar componentes de Chart.js (mismo patrón que admin/SystemStats)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

const Dashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { isOrganizationContext: isInOrganizationMode } = useUserContext();
  const { registerRefresh, unregisterRefresh } = useRealtime();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsData, tasksData, teamsData] = await Promise.all([
        projectsAPI.getAll(),
        tasksAPI.getAll(),
        teamsAPI.getAll().catch(() => []),
      ]);

      setProjects(projectsData);
      setTasks(tasksData);
      setTeams(teamsData);
    } catch (err) {
      console.error("Error al cargar datos del dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    registerRefresh("dashboard", loadDashboardData);
    return () => unregisterRefresh("dashboard");
  }, [registerRefresh, unregisterRefresh, loadDashboardData]);

  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === "active");
    const completedTasks = tasks.filter((t) => t.status === "done");
    const pendingTasks = tasks.filter((t) => t.status !== "done");
    const urgentTasks = tasks.filter((t) => t.is_urgent && t.status !== "done");

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const completedThisWeek = tasks.filter(
      (t) => t.status === "done" && new Date(t.updated_at) >= oneWeekAgo,
    ).length;

    const avgProgress =
      activeProjects.length > 0
        ? Math.round(
            activeProjects.reduce((acc, p) => acc + (p.progress || 0), 0) /
              activeProjects.length,
          )
        : 0;

    return {
      activeProjects: activeProjects.length,
      totalProjects: projects.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      urgentTasks: urgentTasks.length,
      completedThisWeek,
      avgProgress,
      totalTeams: teams.length,
      // Ratios reales para los anillos de progreso (no valores inventados)
      completionRate:
        completedTasks.length + pendingTasks.length > 0
          ? Math.round(
              (completedTasks.length /
                (completedTasks.length + pendingTasks.length)) *
                100,
            )
          : 0,
      urgentRate:
        pendingTasks.length > 0
          ? Math.round((urgentTasks.length / pendingTasks.length) * 100)
          : 0,
      activeRate:
        projects.length > 0
          ? Math.round((activeProjects.length / projects.length) * 100)
          : 0,
    };
  }, [projects, tasks, teams]);

  // Tareas completadas por semana (últimas 8 semanas) para la curva de tendencia
  const weeklyCompletion = useMemo(() => {
    const weeks = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const count = tasks.filter((t) => {
        if (t.status !== "done" || !t.updated_at) return false;
        const updated = new Date(t.updated_at);
        return updated >= weekStart && updated <= weekEnd;
      }).length;

      weeks.push({
        label: weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
        count,
      });
    }
    return weeks;
  }, [tasks]);

  const weeklyAvg =
    weeklyCompletion.length > 0
      ? (
          weeklyCompletion.reduce((acc, w) => acc + w.count, 0) /
          weeklyCompletion.length
        ).toFixed(1)
      : "0";

  const tasksByDeadline = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getDays = (dueDate) => {
      if (!dueDate) return null;
      const due = parseLocalDate(dueDate);
      due.setHours(0, 0, 0, 0);
      return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    };

    const pending = tasks.filter((t) => t.status !== "done");

    return {
      overdue: pending.filter((t) => {
        const d = getDays(t.due_date);
        return d !== null && d < 0;
      }),
      dueToday: pending.filter((t) => getDays(t.due_date) === 0),
      dueSoon: pending.filter((t) => {
        const d = getDays(t.due_date);
        return d !== null && d > 0 && d <= 3;
      }),
      upcoming: pending.filter((t) => {
        const d = getDays(t.due_date);
        return d !== null && d > 3 && d <= 7;
      }),
    };
  }, [tasks]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Sin fecha";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 4);
  }, [projects]);

  const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = parseLocalDate(dateString);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  };

  const chartData = {
    labels: weeklyCompletion.map((w) => w.label),
    datasets: [
      {
        data: weeklyCompletion.map((w) => w.count),
        borderColor: "#7c3aed",
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { chartArea } = chart;
          if (!chartArea) return "rgba(124, 58, 237, 0.15)";
          const gradient = chart.ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          );
          gradient.addColorStop(0, "rgba(124, 58, 237, 0.22)");
          gradient.addColorStop(1, "rgba(124, 58, 237, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: (ctx) =>
          ctx.dataIndex === weeklyCompletion.length - 1 ? 5 : 0,
        pointHoverRadius: 5,
        pointBackgroundColor: "#7c3aed",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: "#1e1730",
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} completadas`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? "#8577a3" : "#9992ab", font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: isDark ? "#332752" : "#f0ebf9" },
        ticks: {
          color: isDark ? "#8577a3" : "#9992ab",
          font: { size: 11 },
          precision: 0,
        },
      },
    },
  };

  if (loading) {
    return (
      <Layout title='Dashboard' subtitle='Cargando...'>
        <DashboardSkeleton />
      </Layout>
    );
  }

  return (
    <Layout title='' subtitle=''>
      {/* Header con saludo */}
      <div className='mb-8'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex items-center justify-between'
        >
          <div>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-night-50 flex items-center gap-3'>
              {getGreeting()}, {user?.name?.split(" ")[0] || "Usuario"}
              <motion.span
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              >
                👋
              </motion.span>
            </h1>
            <p className='text-gray-500 dark:text-night-400 mt-1'>
              Aquí está el resumen de tu actividad
            </p>
          </div>
          <div className='hidden md:flex items-center gap-3'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/tasks")}
              className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-night-800 border border-gray-200 dark:border-night-700 rounded-lg text-gray-700 dark:text-night-300 hover:bg-gray-50 dark:hover:bg-night-700 transition-colors'
            >
              <ListTodo className='w-4 h-4' />
              Ver Tareas
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/projects")}
              className='flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-lg shadow-brand-600/25 hover:brightness-105 transition-all'
            >
              <Plus className='w-4 h-4' />
              Nuevo Proyecto
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Alerta de tareas urgentes */}
      <AnimatePresence>
        {(tasksByDeadline.overdue.length > 0 ||
          tasksByDeadline.dueToday.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className='mb-6'
          >
            <div className='bg-linear-to-r from-red-500 to-orange-500 rounded-xl p-4 text-white shadow-lg'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-white/20 rounded-lg'>
                    <Flame className='w-6 h-6' />
                  </div>
                  <div>
                    <h3 className='font-semibold'>¡Atención requerida!</h3>
                    <p className='text-sm text-white/90'>
                      {tasksByDeadline.overdue.length > 0 && (
                        <span>
                          {tasksByDeadline.overdue.length} tarea
                          {tasksByDeadline.overdue.length > 1 ? "s" : ""}{" "}
                          vencida{tasksByDeadline.overdue.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {tasksByDeadline.overdue.length > 0 &&
                        tasksByDeadline.dueToday.length > 0 &&
                        " • "}
                      {tasksByDeadline.dueToday.length > 0 && (
                        <span>
                          {tasksByDeadline.dueToday.length} vence
                          {tasksByDeadline.dueToday.length > 1 ? "n" : ""} hoy
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/tasks")}
                  className='px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-white/90 transition-colors'
                >
                  Ver todas
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anillos de progreso */}
      <StaggerContainer className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
        <StaggerItem>
          <motion.div
            whileHover={{ y: -4 }}
            className='bg-white dark:bg-night-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-night-700 cursor-pointer flex items-center gap-4'
            onClick={() => navigate("/projects")}
          >
            <ProgressRing percentage={stats.avgProgress} color='#7c3aed' size={52} />
            <div>
              <h3 className='text-2xl font-bold text-gray-900 dark:text-night-50 tabular-nums'>
                <AnimatedNumber value={stats.avgProgress} suffix='%' />
              </h3>
              <p className='text-sm text-gray-500 dark:text-night-400'>Progreso medio</p>
            </div>
          </motion.div>
        </StaggerItem>

        <StaggerItem>
          <motion.div
            whileHover={{ y: -4 }}
            className='bg-white dark:bg-night-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-night-700 cursor-pointer flex items-center gap-4'
            onClick={() => navigate("/tasks")}
          >
            <ProgressRing percentage={stats.completionRate} color='#16a34a' size={52} />
            <div>
              <h3 className='text-2xl font-bold text-gray-900 dark:text-night-50 tabular-nums'>
                <AnimatedNumber value={stats.completedTasks} />
              </h3>
              <p className='text-sm text-gray-500 dark:text-night-400'>Completadas</p>
            </div>
          </motion.div>
        </StaggerItem>

        <StaggerItem>
          <motion.div
            whileHover={{ y: -4 }}
            className='bg-white dark:bg-night-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-night-700 cursor-pointer flex items-center gap-4'
            onClick={() => navigate("/tasks")}
          >
            <ProgressRing
              percentage={stats.urgentRate}
              color={stats.urgentRate > 40 ? "#dc2626" : "#f97316"}
              size={52}
            />
            <div>
              <h3 className='text-2xl font-bold text-gray-900 dark:text-night-50 tabular-nums'>
                <AnimatedNumber value={stats.pendingTasks} />
              </h3>
              <p className='text-sm text-gray-500 dark:text-night-400'>
                Pendientes
                {stats.urgentTasks > 0 && (
                  <span className='text-red-600 font-medium'>
                    {" "}
                    · {stats.urgentTasks} urgente
                    {stats.urgentTasks > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        </StaggerItem>

        {isInOrganizationMode && (
          <StaggerItem>
            <motion.div
              whileHover={{ y: -4 }}
              className='bg-white dark:bg-night-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-night-700 cursor-pointer flex items-center gap-4'
              onClick={() => navigate("/teams")}
            >
              <ProgressRing
                percentage={stats.totalTeams > 0 ? 100 : 0}
                color='#c026d3'
                size={52}
              />
              <div>
                <h3 className='text-2xl font-bold text-gray-900 dark:text-night-50 tabular-nums'>
                  <AnimatedNumber value={stats.totalTeams} />
                </h3>
                <p className='text-sm text-gray-500 dark:text-night-400'>Equipos</p>
              </div>
            </motion.div>
          </StaggerItem>
        )}
      </StaggerContainer>

      {/* Sección principal */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Proyectos Recientes */}
        <div className='lg:col-span-2 space-y-6'>
          <div className='bg-white dark:bg-night-900 rounded-xl shadow-sm border border-gray-100 dark:border-night-700'>
            <div className='p-5 border-b border-gray-100 dark:border-night-700 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center'>
                  <FolderKanban className='w-5 h-5 text-brand-600' />
                </div>
                <div>
                  <h2 className='text-lg font-semibold text-gray-900 dark:text-night-50'>
                    Proyectos Recientes
                  </h2>
                  <p className='text-sm text-gray-500 dark:text-night-400'>
                    Tus proyectos actualizados recientemente
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/projects")}
                className='text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1'
              >
                Ver todos <ChevronRight className='w-4 h-4' />
              </button>
            </div>

            <div className='p-5'>
              {recentProjects.length === 0 ? (
                <div className='text-center py-8'>
                  <div className='w-16 h-16 bg-gray-100 dark:bg-night-800 rounded-full flex items-center justify-center mx-auto mb-3'>
                    <FolderKanban className='w-8 h-8 text-gray-400 dark:text-night-500' />
                  </div>
                  <p className='text-gray-500 dark:text-night-400'>No tienes proyectos aún</p>
                  <button
                    onClick={() => navigate("/projects")}
                    className='mt-3 text-brand-600 hover:text-brand-700 font-medium'
                  >
                    Crear tu primer proyecto
                  </button>
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {recentProjects.map((project, index) => {
                    const days = getDaysUntil(project.due_date);
                    // Solo mostrar como vencido si no está completado y no tiene 100% de progreso
                    const isCompleted =
                      project.status === "completed" ||
                      project.progress === 100;
                    const isOverdue = days !== null && days < 0 && !isCompleted;
                    const isDueSoon =
                      days !== null && days >= 0 && days <= 7 && !isCompleted;

                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className='border border-gray-200 dark:border-night-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group'
                      >
                        <div
                          className={`h-1.5 ${
                            project.color || "bg-brand-500"
                          }`}
                        />
                        <div className='p-4'>
                          <div className='flex items-start gap-3 mb-3'>
                            <div
                              className={`w-10 h-10 rounded-lg ${
                                project.color || "bg-brand-500"
                              } flex items-center justify-center text-white font-bold shrink-0`}
                            >
                              {project.name?.charAt(0).toUpperCase() || "P"}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <h3 className='font-semibold text-gray-900 dark:text-night-50 truncate group-hover:text-brand-600 transition-colors'>
                                {project.name}
                              </h3>
                              <div className='flex items-center gap-2 mt-1'>
                                {isCompleted ? (
                                  <span className='text-xs text-green-600 font-medium flex items-center gap-1'>
                                    <CheckCircle className='w-3 h-3' />
                                    Completado
                                  </span>
                                ) : isOverdue ? (
                                  <span className='text-xs text-red-600 font-medium flex items-center gap-1'>
                                    <AlertTriangle className='w-3 h-3' />
                                    Vencido
                                  </span>
                                ) : isDueSoon ? (
                                  <span className='text-xs text-orange-600 font-medium flex items-center gap-1'>
                                    <Clock className='w-3 h-3' />
                                    {days === 0 ? "Hoy" : `${days}d`}
                                  </span>
                                ) : (
                                  <span className='text-xs text-gray-500 dark:text-night-400'>
                                    {formatDate(project.due_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className='mb-3'>
                            <div className='flex items-center justify-between text-xs mb-1'>
                              <span className='text-gray-500 dark:text-night-400'>Progreso</span>
                              <span className='font-medium text-gray-700 dark:text-night-300 tabular-nums'>
                                {project.progress || 0}%
                              </span>
                            </div>
                            <div className='w-full bg-gray-100 dark:bg-night-800 rounded-full h-2'>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress || 0}%` }}
                                transition={{
                                  duration: 0.5,
                                  delay: index * 0.1,
                                }}
                                className={`h-2 rounded-full ${
                                  project.color || "bg-brand-500"
                                }`}
                              />
                            </div>
                          </div>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-night-400'>
                              <ListTodo className='w-3 h-3' />
                              {project.tasks?.length || 0} tareas
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                project.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : project.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                              }`}
                            >
                              {project.priority === "high"
                                ? "Alta"
                                : project.priority === "medium"
                                  ? "Media"
                                  : "Baja"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tendencia de tareas completadas */}
          <div className='bg-white dark:bg-night-900 rounded-xl shadow-sm border border-gray-100 dark:border-night-700 p-5'>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center'>
                  <BarChart3 className='w-5 h-5 text-brand-600' />
                </div>
                <div>
                  <h2 className='text-lg font-semibold text-gray-900 dark:text-night-50'>
                    Tareas completadas · últimas 8 semanas
                  </h2>
                  <p className='text-sm text-gray-500 dark:text-night-400'>
                    Promedio: <span className='tabular-nums'>{weeklyAvg}</span>/semana
                  </p>
                </div>
              </div>
            </div>
            <div className='h-48'>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className='space-y-6'>
          {/* Próximas Tareas */}
          <div className='bg-white dark:bg-night-900 rounded-xl shadow-sm border border-gray-100 dark:border-night-700'>
            <div className='p-4 border-b border-gray-100 dark:border-night-700 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CalendarClock className='w-5 h-5 text-brand-600' />
                <h2 className='font-semibold text-gray-900 dark:text-night-50'>Próximas Tareas</h2>
              </div>
              <button
                onClick={() => navigate("/tasks")}
                className='text-xs text-brand-600 hover:text-brand-700 font-medium'
              >
                Ver todas
              </button>
            </div>

            <div className='p-4 space-y-2 max-h-80 overflow-y-auto'>
              {tasksByDeadline.overdue.slice(0, 2).map((task) => (
                <motion.div
                  key={task.id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate("/tasks")}
                  className='p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:shadow-sm transition-all'
                >
                  <div className='flex items-start gap-2'>
                    <AlertTriangle className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 dark:text-night-50 truncate'>
                        {task.title}
                      </p>
                      <p className='text-xs text-red-600'>Vencida</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {tasksByDeadline.dueToday.slice(0, 2).map((task) => (
                <motion.div
                  key={task.id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate("/tasks")}
                  className='p-3 bg-orange-50 border border-orange-100 rounded-lg cursor-pointer hover:shadow-sm transition-all'
                >
                  <div className='flex items-start gap-2'>
                    <Timer className='w-4 h-4 text-orange-500 shrink-0 mt-0.5' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 dark:text-night-50 truncate'>
                        {task.title}
                      </p>
                      <p className='text-xs text-orange-600'>Vence hoy</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {tasksByDeadline.dueSoon.slice(0, 3).map((task) => (
                <motion.div
                  key={task.id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate("/tasks")}
                  className='p-3 bg-yellow-50 border border-yellow-100 rounded-lg cursor-pointer hover:shadow-sm transition-all'
                >
                  <div className='flex items-start gap-2'>
                    <Clock className='w-4 h-4 text-yellow-600 shrink-0 mt-0.5' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 dark:text-night-50 truncate'>
                        {task.title}
                      </p>
                      <p className='text-xs text-yellow-700'>
                        {formatDate(task.due_date)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {tasksByDeadline.upcoming.slice(0, 3).map((task) => (
                <motion.div
                  key={task.id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate("/tasks")}
                  className='p-3 bg-gray-50 dark:bg-night-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-night-700 transition-all'
                >
                  <div className='flex items-start gap-2'>
                    <Calendar className='w-4 h-4 text-gray-400 dark:text-night-500 shrink-0 mt-0.5' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 dark:text-night-50 truncate'>
                        {task.title}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-night-400'>
                        {formatDate(task.due_date)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {tasksByDeadline.overdue.length === 0 &&
                tasksByDeadline.dueToday.length === 0 &&
                tasksByDeadline.dueSoon.length === 0 &&
                tasksByDeadline.upcoming.length === 0 && (
                  <div className='text-center py-6'>
                    <CheckCircle2 className='w-10 h-10 text-green-400 mx-auto mb-2' />
                    <p className='text-sm text-gray-500 dark:text-night-400'>¡Todo al día!</p>
                    <p className='text-xs text-gray-400 dark:text-night-500'>
                      No tienes tareas próximas
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className='bg-linear-to-br from-brand-600 to-accent-600 rounded-xl p-5 text-white'>
            <div className='flex items-center gap-2 mb-4'>
              <Sparkles className='w-5 h-5' />
              <h2 className='font-semibold'>Tu Productividad</h2>
            </div>
            <div className='space-y-4'>
              <div>
                <div className='flex items-center justify-between text-sm mb-1'>
                  <span className='text-white/80'>Tareas completadas</span>
                  <span className='font-bold tabular-nums'>
                    {stats.completedTasks}/
                    {stats.completedTasks + stats.pendingTasks}
                  </span>
                </div>
                <div className='w-full bg-white/20 rounded-full h-2'>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        stats.completedTasks + stats.pendingTasks > 0
                          ? (stats.completedTasks /
                              (stats.completedTasks + stats.pendingTasks)) *
                            100
                          : 0
                      }%`,
                    }}
                    className='h-2 rounded-full bg-white'
                  />
                </div>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2'>
                <div className='bg-white/10 rounded-lg p-3 text-center'>
                  <div className='text-2xl font-bold tabular-nums'>
                    {stats.completedThisWeek}
                  </div>
                  <div className='text-xs text-white/70'>Esta semana</div>
                </div>
                <div className='bg-white/10 rounded-lg p-3 text-center'>
                  <div className='text-2xl font-bold tabular-nums'>{stats.avgProgress}%</div>
                  <div className='text-xs text-white/70'>Promedio</div>
                </div>
              </div>
            </div>
          </div>

          {/* Equipos */}
          {isInOrganizationMode && teams.length > 0 && (
            <div className='bg-white dark:bg-night-900 rounded-xl shadow-sm border border-gray-100 dark:border-night-700'>
              <div className='p-4 border-b border-gray-100 dark:border-night-700 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Users className='w-5 h-5 text-accent-600' />
                  <h2 className='font-semibold text-gray-900 dark:text-night-50'>Tus Equipos</h2>
                </div>
                <button
                  onClick={() => navigate("/teams")}
                  className='text-xs text-accent-600 hover:text-accent-700 font-medium'
                >
                  Ver todos
                </button>
              </div>
              <div className='p-4 space-y-2'>
                {teams.slice(0, 3).map((team) => (
                  <motion.div
                    key={team.id}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(`/teams/${team.id}`)}
                    className='flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-night-800 transition-colors'
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${
                        team.color || "bg-accent-500"
                      } flex items-center justify-center text-white text-sm font-bold`}
                    >
                      {team.name?.charAt(0).toUpperCase() || "T"}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 dark:text-night-50 truncate'>
                        {team.name}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-night-400'>
                        {team.members_count || 0} miembros
                      </p>
                    </div>
                    <ChevronRight className='w-4 h-4 text-gray-400 dark:text-night-500' />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  FolderKanban,
  CheckCircle,
  Activity,
  Calendar,
  Clock,
} from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SystemStats = () => {
  const [stats, setStats] = useState({
    dailyActiveUsers: [],
    projectsCreated: [],
    tasksCompleted: [],
    usersByRole: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // Simulación de datos estadísticos
    setStats({
      dailyActiveUsers: [12, 19, 15, 22, 18, 25, 20],
      projectsCreated: [3, 5, 2, 8, 4, 6, 7],
      tasksCompleted: [15, 22, 18, 30, 25, 28, 32],
      usersByRole: [
        { role: "Super Admin", count: 2 },
        { role: "Admin", count: 5 },
        { role: "Usuario", count: 15 },
      ],
    });
  };

  // Datos para gráfico de usuarios activos
  const activeUsersData = {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [
      {
        label: "Usuarios Activos",
        data: stats.dailyActiveUsers,
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Datos para gráfico de proyectos
  const projectsData = {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [
      {
        label: "Proyectos Creados",
        data: stats.projectsCreated,
        backgroundColor: "rgba(34, 197, 94, 0.8)",
      },
    ],
  };

  // Datos para gráfico de tareas
  const tasksData = {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [
      {
        label: "Tareas Completadas",
        data: stats.tasksCompleted,
        backgroundColor: "rgba(59, 130, 246, 0.8)",
      },
    ],
  };

  // Datos para gráfico de roles
  const rolesData = {
    labels: stats.usersByRole.map((u) => u.role),
    datasets: [
      {
        data: stats.usersByRole.map((u) => u.count),
        backgroundColor: [
          "rgba(147, 51, 234, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(107, 114, 128, 0.8)",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold text-gray-900'>
          Estadísticas del Sistema
        </h3>
        <p className='text-sm text-gray-600 mt-1'>
          Vista general del rendimiento
        </p>
      </div>

      {/* Gráficos principales */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Usuarios activos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white border border-gray-200 rounded-xl p-6'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2 bg-indigo-100 rounded-lg'>
              <Users className='w-5 h-5 text-indigo-600' />
            </div>
            <div>
              <h4 className='font-semibold text-gray-900'>Usuarios Activos</h4>
              <p className='text-sm text-gray-600'>Última semana</p>
            </div>
          </div>
          <div style={{ height: "250px" }}>
            <Line data={activeUsersData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Proyectos creados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='bg-white border border-gray-200 rounded-xl p-6'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2 bg-green-100 rounded-lg'>
              <FolderKanban className='w-5 h-5 text-green-600' />
            </div>
            <div>
              <h4 className='font-semibold text-gray-900'>Proyectos Creados</h4>
              <p className='text-sm text-gray-600'>Última semana</p>
            </div>
          </div>
          <div style={{ height: "250px" }}>
            <Bar data={projectsData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Tareas completadas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='bg-white border border-gray-200 rounded-xl p-6'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <CheckCircle className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <h4 className='font-semibold text-gray-900'>
                Tareas Completadas
              </h4>
              <p className='text-sm text-gray-600'>Última semana</p>
            </div>
          </div>
          <div style={{ height: "250px" }}>
            <Bar data={tasksData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Usuarios por rol */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='bg-white border border-gray-200 rounded-xl p-6'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2 bg-purple-100 rounded-lg'>
              <Activity className='w-5 h-5 text-purple-600' />
            </div>
            <div>
              <h4 className='font-semibold text-gray-900'>
                Distribución de Roles
              </h4>
              <p className='text-sm text-gray-600'>Usuarios por rol</p>
            </div>
          </div>
          <div style={{ height: "250px" }}>
            <Doughnut data={rolesData} options={doughnutOptions} />
          </div>
        </motion.div>
      </div>

      {/* Métricas adicionales */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <Activity className='w-8 h-8 text-blue-600' />
          </div>
          <h3 className='text-3xl font-bold text-blue-900 mb-1'>98.5%</h3>
          <p className='text-blue-700 text-sm'>Tiempo de actividad</p>
        </div>

        <div className='bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <TrendingUp className='w-8 h-8 text-green-600' />
          </div>
          <h3 className='text-3xl font-bold text-green-900 mb-1'>+24%</h3>
          <p className='text-green-700 text-sm'>Crecimiento mensual</p>
        </div>

        <div className='bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <Clock className='w-8 h-8 text-purple-600' />
          </div>
          <h3 className='text-3xl font-bold text-purple-900 mb-1'>2.4h</h3>
          <p className='text-purple-700 text-sm'>Promedio de uso diario</p>
        </div>
      </div>
    </div>
  );
};

export default SystemStats;

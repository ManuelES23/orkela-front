import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  FolderKanban,
  CheckCircle,
  Activity,
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
  // Simulación de datos estadísticos
  const [stats] = useState({
    dailyActiveUsers: [12, 19, 15, 22, 18, 25, 20],
    projectsCreated: [3, 5, 2, 8, 4, 6, 7],
    tasksCompleted: [15, 22, 18, 30, 25, 28, 32],
    usersByRole: [
      { role: "Super Admin", count: 2 },
      { role: "Admin", count: 5 },
      { role: "Usuario", count: 15 },
    ],
  });

  // Datos para gráfico de usuarios activos
  const activeUsersData = {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [
      {
        label: "Usuarios Activos",
        data: stats.dailyActiveUsers,
        borderColor: "rgb(124, 58, 237)",
        backgroundColor: "rgba(124, 58, 237, 0.12)",
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
        backgroundColor: "rgba(217, 70, 239, 0.8)",
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
          "rgba(217, 70, 239, 0.8)",
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

      {/* Gráfico protagonista: usuarios activos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-white border border-gray-200 rounded-xl p-6'
      >
        <div className='flex items-center gap-3 mb-4'>
          <div className='p-2 bg-brand-100 rounded-lg'>
            <Users className='w-5 h-5 text-brand-600' />
          </div>
          <div>
            <h4 className='font-semibold text-gray-900'>Usuarios Activos</h4>
            <p className='text-sm text-gray-600'>Última semana</p>
          </div>
        </div>
        <div style={{ height: "300px" }}>
          <Line data={activeUsersData} options={chartOptions} />
        </div>
      </motion.div>

      {/* Gráficos secundarios */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Proyectos creados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='bg-white border border-gray-200 rounded-xl p-6'
        >
          <div className='flex items-center gap-3 mb-4'>
            <div className='p-2 bg-accent-100 rounded-lg'>
              <FolderKanban className='w-5 h-5 text-accent-600' />
            </div>
            <div>
              <h4 className='font-semibold text-gray-900'>Proyectos</h4>
              <p className='text-sm text-gray-600'>Última semana</p>
            </div>
          </div>
          <div style={{ height: "200px" }}>
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
              <h4 className='font-semibold text-gray-900'>Tareas</h4>
              <p className='text-sm text-gray-600'>Última semana</p>
            </div>
          </div>
          <div style={{ height: "200px" }}>
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
            <div className='p-2 bg-gray-100 rounded-lg'>
              <Activity className='w-5 h-5 text-gray-600' />
            </div>
            <div>
              <h4 className='font-semibold text-gray-900'>Roles</h4>
              <p className='text-sm text-gray-600'>Usuarios por rol</p>
            </div>
          </div>
          <div style={{ height: "200px" }}>
            <Doughnut data={rolesData} options={doughnutOptions} />
          </div>
        </motion.div>
      </div>

      {/* Métricas adicionales */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='bg-white border border-gray-200 border-l-4 border-l-brand-500 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <Activity className='w-8 h-8 text-brand-600' />
          </div>
          <h3 className='text-3xl font-bold text-gray-900 mb-1'>98.5%</h3>
          <p className='text-gray-500 text-sm'>Tiempo de actividad</p>
        </div>

        <div className='bg-white border border-gray-200 border-l-4 border-l-green-500 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <TrendingUp className='w-8 h-8 text-green-600' />
          </div>
          <h3 className='text-3xl font-bold text-gray-900 mb-1'>+24%</h3>
          <p className='text-gray-500 text-sm'>Crecimiento mensual</p>
        </div>

        <div className='bg-white border border-gray-200 border-l-4 border-l-accent-500 rounded-xl p-6'>
          <div className='flex items-center justify-between mb-2'>
            <Clock className='w-8 h-8 text-accent-600' />
          </div>
          <h3 className='text-3xl font-bold text-gray-900 mb-1'>2.4h</h3>
          <p className='text-gray-500 text-sm'>Promedio de uso diario</p>
        </div>
      </div>
    </div>
  );
};

export default SystemStats;

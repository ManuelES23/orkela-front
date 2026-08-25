import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      // Simulación de logs
      const mockLogs = [
        {
          id: 1,
          level: "info",
          message: "Usuario admin@orkela.com inició sesión",
          timestamp: "2025-12-26 10:30:15",
          user: "admin@orkela.com",
          ip: "192.168.1.100",
        },
        {
          id: 2,
          level: "success",
          message: "Proyecto 'Website Redesign' creado exitosamente",
          timestamp: "2025-12-26 09:45:22",
          user: "demo@orkela.com",
          ip: "192.168.1.101",
        },
        {
          id: 3,
          level: "warning",
          message: "Intento de acceso a panel de admin sin permisos",
          timestamp: "2025-12-26 08:20:10",
          user: "user@orkela.com",
          ip: "192.168.1.102",
        },
        {
          id: 4,
          level: "error",
          message: "Error al intentar eliminar proyecto con tareas activas",
          timestamp: "2025-12-25 16:15:33",
          user: "manager@orkela.com",
          ip: "192.168.1.103",
        },
        {
          id: 5,
          level: "info",
          message: "Tarea 'Fix login bug' marcada como completada",
          timestamp: "2025-12-25 14:22:11",
          user: "demo@orkela.com",
          ip: "192.168.1.101",
        },
      ];

      setLogs(mockLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level) => {
    const levels = {
      info: { label: "Info", console: "text-blue-400", icon: Info },
      success: {
        label: "Success",
        console: "text-green-400",
        icon: CheckCircle,
      },
      warning: {
        label: "Warning",
        console: "text-yellow-400",
        icon: AlertCircle,
      },
      error: {
        label: "Error",
        console: "text-red-400",
        icon: XCircle,
      },
    };
    return levels[level] || levels.info;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600'></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900'>
            Logs del Sistema
          </h3>
          <p className='text-sm text-gray-600 mt-1'>
            Registro de actividad del sistema
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadLogs}
            className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition'
          >
            <RefreshCw className='w-4 h-4' />
            <span>Actualizar</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className='flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition'
          >
            <Download className='w-4 h-4' />
            <span>Exportar</span>
          </motion.button>
        </div>
      </div>

      {/* Filtros */}
      <div className='flex flex-col md:flex-row gap-4 mb-6'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
          <input
            type='text'
            placeholder='Buscar en logs...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
        >
          <option value='all'>Todos los niveles</option>
          <option value='info'>Info</option>
          <option value='success'>Success</option>
          <option value='warning'>Warning</option>
          <option value='error'>Error</option>
        </select>
      </div>

      {/* Consola de logs */}
      {filteredLogs.length === 0 ? (
        <div className='text-center py-12 bg-white border border-gray-200 rounded-lg'>
          <FileText className='w-12 h-12 text-gray-400 mx-auto mb-3' />
          <p className='text-gray-500'>No se encontraron logs</p>
        </div>
      ) : (
        <div className='bg-[#171223] rounded-xl p-4 sm:p-5 overflow-x-auto'>
          <div className='min-w-[640px] font-mono text-[13px]'>
            {filteredLogs.map((log, index) => {
              const levelBadge = getLevelBadge(log.level);
              const LevelIcon = levelBadge.icon;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className='flex items-baseline gap-4 py-2 border-b border-white/5 last:border-b-0'
                >
                  <span className='text-[#8b7fa8] shrink-0'>
                    {log.timestamp}
                  </span>
                  <span
                    className={`flex items-center gap-1 font-bold shrink-0 w-24 ${levelBadge.console}`}
                  >
                    <LevelIcon className='w-3.5 h-3.5 shrink-0' />
                    {levelBadge.label.toUpperCase()}
                  </span>
                  <span className='flex-1 text-gray-100'>{log.message}</span>
                  <span className='text-gray-500 text-xs shrink-0'>
                    {log.user} · {log.ip}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;

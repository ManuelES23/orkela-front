import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { parseLocalDate } from "../../utils/dateUtils";
import {
  Plus,
  Key,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

const LicensesManagement = ({ onStatsUpdate }) => {
  const { success, error } = useNotification();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLicenses();
  }, []);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      // Simulación de datos
      const mockLicenses = [
        {
          id: 1,
          key: "ORKL-2025-ENTP-0001",
          type: "Enterprise",
          status: "active",
          max_users: 50,
          current_users: 12,
          max_projects: 100,
          issued_date: "2025-01-01",
          expiry_date: "2026-01-01",
        },
        {
          id: 2,
          key: "ORKL-2025-PROF-0002",
          type: "Professional",
          status: "active",
          max_users: 20,
          current_users: 8,
          max_projects: 50,
          issued_date: "2025-02-15",
          expiry_date: "2025-08-15",
        },
        {
          id: 3,
          key: "ORKL-2024-ENTP-0003",
          type: "Enterprise",
          status: "expired",
          max_users: 30,
          current_users: 0,
          max_projects: 75,
          issued_date: "2024-01-01",
          expiry_date: "2025-01-01",
        },
      ];

      setLicenses(mockLicenses);

      const activeCount = mockLicenses.filter(
        (l) => l.status === "active",
      ).length;
      onStatsUpdate?.((prev) => ({ ...prev, activeLicenses: activeCount }));
    } catch (err) {
      error("Error al cargar licencias");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (license) => {
    const daysUntilExpiry = Math.ceil(
      (parseLocalDate(license.expiry_date) - new Date()) /
        (1000 * 60 * 60 * 24),
    );

    if (license.status === "expired" || daysUntilExpiry < 0) {
      return {
        label: "Expirada",
        color: "bg-red-100 text-red-700",
        icon: XCircle,
      };
    }
    if (daysUntilExpiry <= 30) {
      return {
        label: "Por vencer",
        color: "bg-yellow-100 text-yellow-700",
        icon: AlertCircle,
      };
    }
    return {
      label: "Activa",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
    };
  };

  const getTypeBadge = (type) => {
    const types = {
      Enterprise: {
        color: "bg-accent-100 text-accent-700",
        label: "Enterprise",
      },
      Professional: {
        color: "bg-blue-100 text-blue-700",
        label: "Professional",
      },
      Basic: { color: "bg-gray-100 text-gray-700", label: "Basic" },
    };
    return types[type] || types.Basic;
  };

  const formatDate = (dateString) => {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600'></div>
      </div>
    );
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900'>
            Gestión de Licencias
          </h3>
          <p className='text-sm text-gray-600 mt-1'>
            Administra las licencias del sistema
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className='flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition'
        >
          <Plus className='w-5 h-5' />
          <span>Nueva Licencia</span>
        </motion.button>
      </div>

      <div className='bg-white border border-gray-200 rounded-xl divide-y divide-gray-100'>
        {licenses.map((license, index) => {
          const statusBadge = getStatusBadge(license);
          const typeBadge = getTypeBadge(license.type);
          const StatusIcon = statusBadge.icon;
          const usagePercent = Math.min(
            100,
            (license.current_users / license.max_users) * 100,
          );
          const barColor =
            usagePercent > 80
              ? "bg-red-500"
              : usagePercent > 50
                ? "bg-yellow-500"
                : "bg-green-500";

          return (
            <motion.div
              key={license.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className='flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors'
            >
              {/* Identidad */}
              <div className='flex items-center gap-3 sm:w-64 shrink-0'>
                <div className='w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0'>
                  <Key className='w-4 h-4 text-brand-600' />
                </div>
                <p className='font-mono text-sm font-semibold text-gray-900 truncate'>
                  {license.key}
                </p>
              </div>

              {/* Uso */}
              <div className='flex items-center gap-2 sm:w-40 shrink-0'>
                <div className='flex-1 bg-gray-200 rounded-full h-1.5'>
                  <div
                    className={`h-1.5 rounded-full transition-all ${barColor}`}
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
                <span className='text-xs text-gray-500 shrink-0'>
                  {license.current_users}/{license.max_users}
                </span>
              </div>

              {/* Metadatos */}
              <div className='flex items-center flex-wrap gap-2 flex-1 text-sm'>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.color}`}
                >
                  {typeBadge.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}
                >
                  <StatusIcon className='w-3 h-3' />
                  {statusBadge.label}
                </span>
                <span className='text-xs text-gray-500'>
                  {license.max_projects} proyectos máx.
                </span>
                <span className='flex items-center gap-1 text-xs text-gray-400'>
                  <Calendar className='w-3 h-3' />
                  Vence {formatDate(license.expiry_date)}
                </span>
              </div>

              {/* Acciones */}
              <div className='flex items-center gap-1 shrink-0'>
                <button className='p-2 hover:bg-blue-50 rounded-lg transition'>
                  <Edit className='w-4 h-4 text-blue-600' />
                </button>
                <button className='p-2 hover:bg-red-50 rounded-lg transition'>
                  <Trash2 className='w-4 h-4 text-red-600' />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LicensesManagement;

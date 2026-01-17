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
        (l) => l.status === "active"
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
      (parseLocalDate(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
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
        color: "bg-purple-100 text-purple-700",
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
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600'></div>
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
          className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md'
        >
          <Plus className='w-5 h-5' />
          <span>Nueva Licencia</span>
        </motion.button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {licenses.map((license, index) => {
          const statusBadge = getStatusBadge(license);
          const typeBadge = getTypeBadge(license.type);
          const StatusIcon = statusBadge.icon;
          const usagePercent =
            (license.current_users / license.max_users) * 100;

          return (
            <motion.div
              key={license.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className='bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all'
            >
              <div className='flex items-start justify-between mb-4'>
                <div className='flex items-center gap-3'>
                  <div className='p-3 bg-indigo-100 rounded-lg'>
                    <Key className='w-6 h-6 text-indigo-600' />
                  </div>
                  <div>
                    <p className='font-mono text-sm font-semibold text-gray-900'>
                      {license.key}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.color}`}
                    >
                      {typeBadge.label}
                    </span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}
                >
                  <StatusIcon className='w-4 h-4' />
                  {statusBadge.label}
                </span>
              </div>

              <div className='space-y-3 mb-4'>
                <div>
                  <div className='flex justify-between text-sm mb-1'>
                    <span className='text-gray-600'>Usuarios</span>
                    <span className='font-medium text-gray-900'>
                      {license.current_users} / {license.max_users}
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usagePercent > 80
                          ? "bg-red-500"
                          : usagePercent > 50
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <p className='text-gray-600'>Proyectos máx.</p>
                    <p className='font-semibold text-gray-900'>
                      {license.max_projects}
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-600'>Vencimiento</p>
                    <p className='font-semibold text-gray-900'>
                      {formatDate(license.expiry_date)}
                    </p>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-between pt-4 border-t border-gray-200'>
                <div className='flex items-center gap-1 text-xs text-gray-500'>
                  <Calendar className='w-3 h-3' />
                  Emitida: {formatDate(license.issued_date)}
                </div>
                <div className='flex gap-2'>
                  <button className='p-2 hover:bg-blue-50 rounded-lg transition'>
                    <Edit className='w-4 h-4 text-blue-600' />
                  </button>
                  <button className='p-2 hover:bg-red-50 rounded-lg transition'>
                    <Trash2 className='w-4 h-4 text-red-600' />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LicensesManagement;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { parseLocalDate } from "../../utils/dateUtils";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Building2,
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import ConfirmModal from "../ui/ConfirmModal";
import UserAvatar from "../ui/UserAvatar";
import { adminUsersAPI, adminOrganizationsAPI } from "../../utils/adminAPI";

const UsersManagement = ({ onStatsUpdate }) => {
  const { success, error } = useNotification();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    userId: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const data = await adminOrganizationsAPI.getAll();
      setOrganizations(data);
    } catch (err) {
      console.error("Error al cargar organizaciones:", err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminUsersAPI.getAll();
      setUsers(data);

      if (onStatsUpdate) {
        onStatsUpdate({
          totalUsers: data.length,
          activeUsers: data.filter((u) => u.status === "active").length,
          inactiveUsers: data.filter((u) => u.status === "inactive").length,
        });
      }
    } catch (err) {
      error("Error al cargar usuarios");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (userId) => {
    setConfirmModal({ isOpen: true, userId });
  };

  const handleDeleteUser = async () => {
    const userId = confirmModal.userId;
    setDeleting(true);
    try {
      await adminUsersAPI.delete(userId);
      success("Usuario eliminado exitosamente");
      loadUsers();
    } catch (err) {
      error("Error al eliminar usuario");
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, userId: null });
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await adminUsersAPI.toggleStatus(userId);
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      success(`Usuario ${newStatus === "active" ? "activado" : "desactivado"}`);
      loadUsers();
    } catch (err) {
      error("Error al cambiar estado");
      console.error(err);
    }
  };

  // Filtrar usuarios por búsqueda, estado y organización
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    const matchesOrg =
      orgFilter === "all" ||
      (orgFilter === "none" && !user.organization_id) ||
      (orgFilter !== "none" && user.organization_id === parseInt(orgFilter));
    return matchesSearch && matchesStatus && matchesOrg;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
  };

  const activeUsers = filteredUsers.filter((u) => u.status === "active");
  const inactiveUsers = filteredUsers.filter((u) => u.status !== "active");

  const formatDate = (dateString) => {
    if (!dateString) return "Nunca";
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

  const renderUserRow = (user) => (
    <motion.div
      key={user.id}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 bg-white border border-gray-200 border-l-4 rounded-xl px-4 py-3 ${
        user.status === "active" ? "border-l-green-500" : "border-l-gray-300"
      }`}
    >
      <UserAvatar user={user} size='md' />
      <div className='min-w-0 flex-1'>
        <p className='font-medium text-gray-900 truncate'>{user.name}</p>
        <p className='text-sm text-gray-500 flex items-center gap-1 truncate'>
          <Mail className='w-3 h-3 shrink-0' />
          {user.email}
        </p>
      </div>

      <div className='hidden sm:flex items-center gap-1.5 text-sm text-gray-600 shrink-0 w-40'>
        {user.organization ? (
          <>
            <Building2 className='w-4 h-4 text-brand-500 shrink-0' />
            <span className='truncate'>{user.organization.name}</span>
          </>
        ) : (
          <span className='italic text-gray-400'>Sin organización</span>
        )}
      </div>

      <button
        onClick={() => handleToggleStatus(user.id, user.status)}
        className={`hidden xs:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
          user.status === "active"
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-red-100 text-red-700 hover:bg-red-200"
        }`}
      >
        {user.status === "active" ? (
          <>
            <CheckCircle className='w-3.5 h-3.5' />
            Activo
          </>
        ) : (
          <>
            <XCircle className='w-3.5 h-3.5' />
            Inactivo
          </>
        )}
      </button>

      <span className='hidden lg:flex items-center gap-1 text-xs text-gray-400 shrink-0 w-24'>
        <Calendar className='w-3 h-3' />
        {formatDate(user.created_at)}
      </span>

      <div className='flex items-center gap-1 shrink-0'>
        <button
          onClick={() => {
            setSelectedUser(user);
            setIsModalOpen(true);
          }}
          className='p-2 hover:bg-blue-50 rounded-lg transition-colors'
          title='Editar usuario'
        >
          <Edit className='w-4 h-4 text-blue-600' />
        </button>
        <button
          onClick={() => openDeleteConfirm(user.id)}
          className='p-2 hover:bg-red-50 rounded-lg transition-colors'
          title='Eliminar usuario'
        >
          <Trash2 className='w-4 h-4 text-red-600' />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div>
      {/* Header con título */}
      <div className='mb-6'>
        <h2 className='text-2xl font-bold text-gray-900'>
          Usuarios de la Aplicación
        </h2>
        <p className='text-gray-600 mt-1'>
          Gestiona los usuarios que utilizan el sistema
        </p>
      </div>

      {/* Stats compactas */}
      <div className='grid grid-cols-3 gap-3 mb-6'>
        <div className='bg-white border border-gray-200 rounded-xl px-4 py-3'>
          <p className='text-xl font-bold text-gray-900 font-mono'>
            {stats.total}
          </p>
          <p className='text-xs text-gray-500'>Total</p>
        </div>
        <div className='bg-white border border-gray-200 rounded-xl px-4 py-3'>
          <p className='text-xl font-bold text-green-600 font-mono'>
            {stats.active}
          </p>
          <p className='text-xs text-gray-500'>Activos</p>
        </div>
        <div className='bg-white border border-gray-200 rounded-xl px-4 py-3'>
          <p className='text-xl font-bold text-red-600 font-mono'>
            {stats.inactive}
          </p>
          <p className='text-xs text-gray-500'>Inactivos</p>
        </div>
      </div>

      {/* Header con búsqueda y filtros */}
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6'>
        <div className='flex-1 flex flex-wrap items-center gap-4'>
          <div className='relative flex-1 min-w-[200px] max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar usuarios...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
            />
          </div>

          {/* Filtro de estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
          >
            <option value='all'>Todos los estados</option>
            <option value='active'>Activos</option>
            <option value='inactive'>Inactivos</option>
          </select>

          {/* Filtro de organización */}
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
          >
            <option value='all'>Todas las organizaciones</option>
            <option value='none'>Sin organización</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className='flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition'
        >
          <Plus className='w-5 h-5' />
          <span>Nuevo Usuario</span>
        </motion.button>
      </div>

      {/* Usuarios agrupados por estado */}
      {filteredUsers.length === 0 ? (
        <div className='text-center py-12 bg-white rounded-xl border border-gray-200'>
          <Users className='w-12 h-12 text-gray-300 mx-auto mb-3' />
          <p className='text-gray-500'>No se encontraron usuarios</p>
        </div>
      ) : (
        <>
          {activeUsers.length > 0 && (
            <>
              <p className='text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2'>
                Activos
              </p>
              <div className='space-y-2 mb-6'>
                {activeUsers.map(renderUserRow)}
              </div>
            </>
          )}

          {inactiveUsers.length > 0 && (
            <>
              <p className='text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2'>
                Inactivos
              </p>
              <div className='space-y-2'>{inactiveUsers.map(renderUserRow)}</div>
            </>
          )}
        </>
      )}

      {/* Modal de crear/editar usuario */}
      {isModalOpen && (
        <UserModal
          user={selectedUser}
          organizations={organizations}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
            loadUsers();
          }}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, userId: null })}
        onConfirm={handleDeleteUser}
        title='Eliminar usuario'
        message='¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.'
        confirmText='Eliminar'
        type='danger'
        loading={deleting}
      />
    </div>
  );
};

// Modal de crear/editar usuario
const UserModal = ({ user, organizations = [], onClose, onSuccess }) => {
  const { success, error } = useNotification();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    password_confirmation: "",
    organization_id: user?.organization_id || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user && formData.password !== formData.password_confirmation) {
      error("Las contraseñas no coinciden");
      return;
    }

    try {
      // Preparar datos para enviar
      const dataToSend = {
        ...formData,
        organization_id:
          formData.organization_id === ""
            ? null
            : parseInt(formData.organization_id),
      };

      if (user) {
        await adminUsersAPI.update(user.id, dataToSend);
        success("Usuario actualizado exitosamente");
      } else {
        await adminUsersAPI.create(dataToSend);
        success("Usuario creado exitosamente");
      }
      onSuccess();
    } catch (err) {
      error(err.message || "Error al guardar usuario");
      console.error(err);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-20 md:pb-4'>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className='bg-white rounded-xl shadow-2xl w-full max-w-md'
      >
        <div className='p-6 border-b border-gray-200'>
          <h2 className='text-xl font-bold text-gray-900'>
            {user ? "Editar Usuario" : "Nuevo Usuario"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Nombre completo
            </label>
            <input
              type='text'
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Email
            </label>
            <input
              type='email'
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
            />
          </div>

          {!user && (
            <>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Contraseña
                </label>
                <input
                  type='password'
                  required={!user}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Confirmar contraseña
                </label>
                <input
                  type='password'
                  required={!user}
                  value={formData.password_confirmation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password_confirmation: e.target.value,
                    })
                  }
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent'
                />
              </div>
            </>
          )}

          {/* Organización */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Organización
            </label>
            <div className='relative'>
              <Building2 className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <select
                value={formData.organization_id}
                onChange={(e) =>
                  setFormData({ ...formData, organization_id: e.target.value })
                }
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none'
              >
                <option value=''>Sin organización (Usuario libre)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.plan})
                  </option>
                ))}
              </select>
            </div>
            <p className='mt-1 text-xs text-gray-500'>
              Los usuarios sin organización solo tienen acceso al plan gratuito
            </p>
          </div>

          <div className='flex justify-end gap-2 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition'
            >
              Cancelar
            </button>
            <button
              type='submit'
              className='px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg hover:shadow-md hover:shadow-brand-600/20 transition'
            >
              {user ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default UsersManagement;

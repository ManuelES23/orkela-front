import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import { getAssetUrl } from "../../utils/assetUrl";
import OrganizationModal from "../../components/modals/OrganizationModal";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Modal from "../../components/ui/Modal";
import { useNotification } from "../../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../../components/animations/MotionComponents";
import {
  Plus,
  Search,
  Building2,
  Users,
  FolderKanban,
  Edit,
  Trash2,
  Loader2,
  Crown,
  Globe,
  Mail,
  Calendar,
  ArrowRight,
  Eye,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import { organizationsAPI } from "../../utils/api";
import { adminUsersAPI, adminOrganizationsAPI } from "../../utils/adminAPI";

const AdminOrganizations = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    orgId: null,
    orgName: "",
  });
  const [deleting, setDeleting] = useState(false);

  // Estado para asignar owner
  const [assignOwnerModal, setAssignOwnerModal] = useState({
    isOpen: false,
    org: null,
  });
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [assigningOwner, setAssigningOwner] = useState(false);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminOrganizationsAPI.getAll();
      setOrganizations(data);
    } catch (err) {
      console.error("Error loading organizations:", err);
      showError("No se pudieron cargar las organizaciones");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const handleCreateOrg = () => {
    setSelectedOrg(null);
    setIsModalOpen(true);
  };

  const handleEditOrg = (org, e) => {
    e.stopPropagation();
    setSelectedOrg(org);
    setIsModalOpen(true);
  };

  const handleViewOrg = (orgId) => {
    navigate(`/organizations/${orgId}`);
  };

  const handleDeleteConfirm = (org, e) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      orgId: org.id,
      orgName: org.name,
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminOrganizationsAPI.delete(confirmModal.orgId);
      success("Organización eliminada exitosamente");
      setOrganizations((prev) =>
        prev.filter((o) => o.id !== confirmModal.orgId)
      );
    } catch (err) {
      showError(err.message || "No se pudo eliminar la organización");
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, orgId: null, orgName: "" });
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setSelectedOrg(null);
    loadOrganizations();
  };

  // Funciones para asignar owner
  const handleOpenAssignOwner = async (org, e) => {
    e?.stopPropagation();
    setAssignOwnerModal({ isOpen: true, org });
    setSelectedOwnerId("");

    // Cargar usuarios disponibles
    try {
      setLoadingUsers(true);
      const data = await adminUsersAPI.getAll();
      // Filtrar usuarios que ya son owners de otras organizaciones
      const availableUsers = data.filter(
        (u) =>
          !organizations.some((o) => o.owner_id === u.id && o.id !== org.id)
      );
      setUsers(availableUsers);
    } catch (err) {
      console.error("Error loading users:", err);
      showError("No se pudieron cargar los usuarios");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignOwner = async () => {
    if (!selectedOwnerId || !assignOwnerModal.org) return;

    setAssigningOwner(true);
    try {
      await organizationsAPI.assignOwner(
        assignOwnerModal.org.id,
        selectedOwnerId
      );
      success("Propietario asignado exitosamente");
      setAssignOwnerModal({ isOpen: false, org: null });
      loadOrganizations();
    } catch (err) {
      showError(err.message || "No se pudo asignar el propietario");
    } finally {
      setAssigningOwner(false);
    }
  };

  const handleChangeOwner = async () => {
    if (!selectedOwnerId || !assignOwnerModal.org) return;

    setAssigningOwner(true);
    try {
      await organizationsAPI.changeOwner(
        assignOwnerModal.org.id,
        selectedOwnerId
      );
      success("Propietario cambiado exitosamente");
      setAssignOwnerModal({ isOpen: false, org: null });
      loadOrganizations();
    } catch (err) {
      showError(err.message || "No se pudo cambiar el propietario");
    } finally {
      setAssigningOwner(false);
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.owner?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan = filterPlan === "all" || org.plan === filterPlan;
    const matchesStatus = filterStatus === "all" || org.status === filterStatus;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanBadge = (plan) => {
    const plans = {
      free: { bg: "bg-gray-100", text: "text-gray-700", label: "Gratis" },
      starter: { bg: "bg-blue-100", text: "text-blue-700", label: "Starter" },
      professional: {
        bg: "bg-brand-100",
        text: "text-brand-700",
        label: "Professional",
      },
      enterprise: {
        bg: "bg-accent-100",
        text: "text-accent-700",
        label: "Enterprise",
      },
    };
    const planStyle = plans[plan] || plans.free;
    return (
      <span
        className={`px-2 py-1 ${planStyle.bg} ${planStyle.text} rounded-full text-xs font-medium`}
      >
        {planStyle.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statuses = {
      active: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: CheckCircle,
        label: "Activa",
      },
      suspended: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: XCircle,
        label: "Suspendida",
      },
      trial: {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        icon: Clock,
        label: "Prueba",
      },
      pending: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        icon: AlertTriangle,
        label: "Sin Admin",
      },
      inactive: {
        bg: "bg-gray-100",
        text: "text-gray-700",
        icon: XCircle,
        label: "Inactiva",
      },
    };
    const statusStyle = statuses[status] || statuses.active;
    const Icon = statusStyle.icon;
    return (
      <span
        className={`flex items-center gap-1 px-2 py-1 ${statusStyle.bg} ${statusStyle.text} rounded-full text-xs font-medium`}
      >
        <Icon className='w-3 h-3' />
        {statusStyle.label}
      </span>
    );
  };

  // Estadísticas rápidas
  const stats = {
    total: organizations.length,
    active: organizations.filter((o) => o.status === "active").length,
    pending: organizations.filter((o) => o.status === "pending" || !o.owner_id)
      .length,
    suspended: organizations.filter((o) => o.status === "suspended").length,
  };

  // Agrupar por estado: primero las que necesitan administrador (mismo
  // criterio que stats.pending), luego el resto por su estado.
  const needsAdminOrgs = filteredOrganizations.filter(
    (o) => o.status === "pending" || !o.owner_id
  );
  const restOrgs = filteredOrganizations.filter(
    (o) => !(o.status === "pending" || !o.owner_id)
  );
  const statusGroups = [
    {
      key: "needs_admin",
      label: "Sin administrador",
      stripe: "border-l-orange-500",
      orgs: needsAdminOrgs,
    },
    {
      key: "active",
      label: "Activas",
      stripe: "border-l-green-500",
      orgs: restOrgs.filter((o) => o.status === "active"),
    },
    {
      key: "trial",
      label: "En prueba",
      stripe: "border-l-yellow-500",
      orgs: restOrgs.filter((o) => o.status === "trial"),
    },
    {
      key: "suspended",
      label: "Suspendidas",
      stripe: "border-l-red-500",
      orgs: restOrgs.filter((o) => o.status === "suspended"),
    },
    {
      key: "inactive",
      label: "Inactivas",
      stripe: "border-l-gray-300",
      orgs: restOrgs.filter((o) => o.status === "inactive"),
    },
  ];

  return (
    <Layout
      title='Gestión de Organizaciones'
      subtitle='Administra las organizaciones del sistema'
    >
      {/* Estadísticas compactas */}
      <FadeIn delay={0.1}>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
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
            <p className='text-xs text-gray-500'>Activas</p>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl px-4 py-3'>
            <p className='text-xl font-bold text-orange-600 font-mono'>
              {stats.pending}
            </p>
            <p className='text-xs text-gray-500'>Sin Admin</p>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl px-4 py-3'>
            <p className='text-xl font-bold text-red-600 font-mono'>
              {stats.suspended}
            </p>
            <p className='text-xs text-gray-500'>Suspendidas</p>
          </div>
        </div>
      </FadeIn>

      {/* Barra de acciones */}
      <FadeIn delay={0.2}>
        <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6'>
          <div className='flex flex-col sm:flex-row gap-3 flex-1 w-full'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por nombre, descripción o email del dueño...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
              />
            </div>

            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className='px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white'
            >
              <option value='all'>Todos los planes</option>
              <option value='free'>Gratis</option>
              <option value='starter'>Starter</option>
              <option value='professional'>Professional</option>
              <option value='enterprise'>Enterprise</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className='px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white'
            >
              <option value='all'>Todos los estados</option>
              <option value='active'>Activas</option>
              <option value='pending'>Sin Admin</option>
              <option value='inactive'>Inactivas</option>
              <option value='suspended'>Suspendidas</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateOrg}
            className='flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition w-full lg:w-auto justify-center font-medium'
          >
            <Plus className='w-5 h-5' />
            Nueva Organización
          </motion.button>
        </div>
      </FadeIn>

      {/* Loading State */}
      {loading && (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-brand-600' />
        </div>
      )}

      {/* Lista de Organizaciones */}
      {!loading && (
        <>
          {filteredOrganizations.length === 0 ? (
            <FadeIn>
              <div className='text-center py-12 bg-white rounded-xl border border-gray-200'>
                <Building2 className='w-16 h-16 text-gray-300 mx-auto mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  {searchTerm || filterPlan !== "all" || filterStatus !== "all"
                    ? "No se encontraron organizaciones"
                    : "No hay organizaciones"}
                </h3>
                <p className='text-gray-500 mb-4'>
                  {searchTerm || filterPlan !== "all" || filterStatus !== "all"
                    ? "Intenta con otros filtros de búsqueda"
                    : "Crea la primera organización para comenzar"}
                </p>
                {!searchTerm &&
                  filterPlan === "all" &&
                  filterStatus === "all" && (
                    <button
                      onClick={handleCreateOrg}
                      className='inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg hover:shadow-md hover:shadow-brand-600/20 transition'
                    >
                      <Plus className='w-5 h-5' />
                      Crear Organización
                    </button>
                  )}
              </div>
            </FadeIn>
          ) : (
            <>
              {statusGroups.map(
                (group) =>
                  group.orgs.length > 0 && (
                    <div key={group.key} className='mb-6'>
                      <p className='text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2'>
                        {group.label}
                      </p>
                      <div className='space-y-2'>
                        <AnimatePresence>
                          {group.orgs.map((org) => (
                            <motion.div
                              key={org.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className={`bg-white border border-gray-200 border-l-4 rounded-xl px-4 py-3 hover:shadow-sm transition-shadow ${group.stripe}`}
                            >
                              <div className='flex flex-col lg:flex-row lg:items-center gap-3'>
                                {/* Identidad */}
                                <div className='flex items-center gap-3 flex-1 min-w-0'>
                                  <div className='w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0'>
                                    {org.logo ? (
                                      <img
                                        src={getAssetUrl(org.logo)}
                                        alt={org.name}
                                        className='w-full h-full object-cover'
                                      />
                                    ) : (
                                      <Building2 className='w-5 h-5 text-brand-600' />
                                    )}
                                  </div>
                                  <div className='min-w-0'>
                                    <p className='font-medium text-gray-900 truncate'>
                                      {org.name}
                                    </p>
                                    {org.website && (
                                      <a
                                        href={org.website}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='text-xs text-brand-600 hover:underline flex items-center gap-1'
                                      >
                                        <Globe className='w-3 h-3' />
                                        {org.website.replace(
                                          /^https?:\/\//,
                                          ""
                                        )}
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Metadatos */}
                                <div className='flex items-center flex-wrap gap-3 shrink-0'>
                                  {org.owner ? (
                                    <div className='flex items-center gap-2'>
                                      <div className='w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center shrink-0'>
                                        <Crown className='w-3.5 h-3.5 text-amber-600' />
                                      </div>
                                      <div className='leading-tight'>
                                        <p className='text-sm font-medium text-gray-900'>
                                          {org.owner.name}
                                        </p>
                                        <p className='text-xs text-gray-500'>
                                          {org.owner.email}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) =>
                                          handleOpenAssignOwner(org, e)
                                        }
                                        className='p-1 hover:bg-amber-50 rounded transition-colors'
                                        title='Cambiar propietario'
                                      >
                                        <Edit className='w-3 h-3 text-amber-600' />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) =>
                                        handleOpenAssignOwner(org, e)
                                      }
                                      className='flex items-center gap-2 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors text-sm font-medium'
                                    >
                                      <UserPlus className='w-4 h-4' />
                                      Asignar Admin
                                    </button>
                                  )}

                                  {getPlanBadge(org.plan)}
                                  {getStatusBadge(org.status)}

                                  <span
                                    className='flex items-center gap-1 text-sm text-gray-600'
                                    title='Miembros'
                                  >
                                    <Users className='w-4 h-4' />
                                    {org.active_members_count || 0}
                                  </span>
                                  <span
                                    className='flex items-center gap-1 text-sm text-gray-600'
                                    title='Equipos'
                                  >
                                    <Users className='w-4 h-4' />
                                    {org.teams_count || 0}
                                  </span>
                                  <span
                                    className='flex items-center gap-1 text-sm text-gray-600'
                                    title='Proyectos'
                                  >
                                    <FolderKanban className='w-4 h-4' />
                                    {org.projects_count || 0}
                                  </span>
                                  <span className='hidden xl:flex items-center gap-1 text-xs text-gray-400'>
                                    <Calendar className='w-3 h-3' />
                                    {new Date(
                                      org.created_at
                                    ).toLocaleDateString("es-ES")}
                                  </span>

                                  <div className='flex items-center gap-1'>
                                    <button
                                      onClick={() => handleViewOrg(org.id)}
                                      className='p-2 hover:bg-brand-50 rounded-lg transition-colors'
                                      title='Ver detalles'
                                    >
                                      <Eye className='w-4 h-4 text-brand-600' />
                                    </button>
                                    <button
                                      onClick={(e) => handleEditOrg(org, e)}
                                      className='p-2 hover:bg-blue-50 rounded-lg transition-colors'
                                      title='Editar'
                                    >
                                      <Edit className='w-4 h-4 text-blue-600' />
                                    </button>
                                    <button
                                      onClick={(e) =>
                                        handleDeleteConfirm(org, e)
                                      }
                                      className='p-2 hover:bg-red-50 rounded-lg transition-colors'
                                      title='Eliminar'
                                    >
                                      <Trash2 className='w-4 h-4 text-red-600' />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
              )}
            </>
          )}
        </>
      )}

      {/* Modal de Organización */}
      <OrganizationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrg(null);
        }}
        organization={selectedOrg}
        onSuccess={handleSuccess}
      />

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, orgId: null, orgName: "" })
        }
        onConfirm={handleDelete}
        title='Eliminar Organización'
        message={`¿Estás seguro de que deseas eliminar la organización "${confirmModal.orgName}"? Esta acción eliminará todos los equipos, proyectos y datos asociados. Esta acción no se puede deshacer.`}
        confirmText='Eliminar'
        type='danger'
        loading={deleting}
      />

      {/* Modal para Asignar/Cambiar Owner */}
      <Modal
        isOpen={assignOwnerModal.isOpen}
        onClose={() => setAssignOwnerModal({ isOpen: false, org: null })}
        title={
          assignOwnerModal.org?.owner_id
            ? "Cambiar Propietario"
            : "Asignar Propietario"
        }
        size='sm'
      >
        <div className='space-y-5'>
          {/* Info de la organización */}
          <div className='p-4 bg-gray-50 rounded-lg'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center'>
                <Building2 className='w-5 h-5 text-brand-600' />
              </div>
              <div>
                <p className='font-medium text-gray-900'>
                  {assignOwnerModal.org?.name}
                </p>
                <p className='text-sm text-gray-500'>
                  Plan: {assignOwnerModal.org?.plan}
                </p>
              </div>
            </div>
          </div>

          {/* Info actual del owner (si existe) */}
          {assignOwnerModal.org?.owner && (
            <div className='p-4 bg-amber-50 border border-amber-200 rounded-lg'>
              <p className='text-sm font-medium text-amber-800 mb-2'>
                Propietario actual:
              </p>
              <div className='flex items-center gap-2'>
                <Crown className='w-4 h-4 text-amber-600' />
                <span className='text-amber-700'>
                  {assignOwnerModal.org.owner.name}
                </span>
                <span className='text-amber-600 text-sm'>
                  ({assignOwnerModal.org.owner.email})
                </span>
              </div>
              <p className='mt-2 text-xs text-amber-600'>
                El propietario actual será convertido a administrador.
              </p>
            </div>
          )}

          {/* Selector de nuevo owner */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              <UserPlus className='inline w-4 h-4 mr-1' />
              {assignOwnerModal.org?.owner_id
                ? "Nuevo Propietario"
                : "Seleccionar Propietario"}{" "}
              *
            </label>
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              disabled={loadingUsers}
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white'
            >
              <option value=''>
                {loadingUsers
                  ? "Cargando usuarios..."
                  : "Seleccionar usuario..."}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className='mt-1 text-xs text-gray-500'>
              Este usuario será el dueño y administrador principal de la
              organización.
            </p>
          </div>

          {/* Botones */}
          <div className='flex gap-3 pt-4'>
            <button
              onClick={
                assignOwnerModal.org?.owner_id
                  ? handleChangeOwner
                  : handleAssignOwner
              }
              disabled={!selectedOwnerId || assigningOwner}
              className='flex-1 bg-linear-to-r from-brand-600 to-accent-600 text-white py-3 rounded-lg font-semibold hover:shadow-md hover:shadow-brand-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {assigningOwner ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Procesando...
                </>
              ) : (
                <>
                  <Crown className='w-4 h-4' />
                  {assignOwnerModal.org?.owner_id
                    ? "Cambiar Propietario"
                    : "Asignar Propietario"}
                </>
              )}
            </button>
            <button
              onClick={() => setAssignOwnerModal({ isOpen: false, org: null })}
              disabled={assigningOwner}
              className='px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50'
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default AdminOrganizations;

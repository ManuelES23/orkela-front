import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { getAssetUrl } from "../utils/assetUrl";
import OrganizationModal from "../components/modals/OrganizationModal";
import OrganizationMailConfig from "../components/organizations/OrganizationMailConfig";
import ConfirmModal from "../components/ui/ConfirmModal";
import UserAvatar from "../components/ui/UserAvatar";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import {
  Building2,
  Users,
  FolderKanban,
  Settings,
  ArrowLeft,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  Globe,
  MapPin,
  Crown,
  Shield,
  MoreVertical,
  Calendar,
  Briefcase,
  BarChart3,
  Loader2,
  X,
  Check,
  Clock,
  Send,
  Ticket,
  UserMinus,
  CheckSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { organizationsAPI } from "../utils/api";

const OrganizationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();

  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    data: null,
  });

  // Members & Invitations
  const [members, setMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Teams
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Projects
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);

  // Member stats modal
  const [memberStatsModal, setMemberStatsModal] = useState({
    isOpen: false,
    member: null,
    stats: null,
    loading: false,
  });

  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member",
    job_title: "",
    department: "",
  });
  const [sendingInvite, setSendingInvite] = useState(false);

  const loadOrganization = useCallback(async () => {
    try {
      setLoading(true);
      const data = await organizationsAPI.getById(id);
      setOrganization(data);
    } catch (err) {
      console.error("Error loading organization:", err);
      // Si es error 403, mostrar mensaje específico y redirigir al dashboard
      if (
        err.message?.includes("administrador") ||
        err.message?.includes("403")
      ) {
        showError(
          "Solo el administrador de la organización puede acceder a esta vista"
        );
        navigate("/dashboard");
      } else {
        showError("No se pudo cargar la organización");
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showError]);

  const loadMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const [membersData, invitationsData] = await Promise.all([
        organizationsAPI.getMembers(id),
        organization?.can_manage
          ? organizationsAPI.getPendingInvitations(id)
          : Promise.resolve([]),
      ]);
      console.log("[DEBUG] Miembros cargados desde API:", membersData);
      setMembers(membersData);
      setPendingInvitations(invitationsData);
    } catch (err) {
      console.error("Error loading members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [id, organization?.can_manage]);

  const loadStats = useCallback(async () => {
    try {
      const data = await organizationsAPI.getStats(id);
      setStats(data);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, [id]);

  const loadTeams = useCallback(async () => {
    try {
      setLoadingTeams(true);
      const data = await organizationsAPI.getTeams(id);
      setTeams(data);
    } catch (err) {
      console.error("Error loading teams:", err);
    } finally {
      setLoadingTeams(false);
    }
  }, [id]);

  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const data = await organizationsAPI.getProjects(id);
      setProjects(data);
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  }, [id]);

  // Función de refresco silencioso para tiempo real - recarga TODOS los datos
  const refreshAllSilently = useCallback(async () => {
    try {
      // Recargar todo en paralelo
      const [orgData, statsData, teamsData, projectsData] = await Promise.all([
        organizationsAPI.getById(id),
        organizationsAPI.getStats(id),
        organizationsAPI.getTeams(id),
        organizationsAPI.getProjects(id),
      ]);

      console.log("[DEBUG] Datos de organización cargados:", {
        user_role: orgData.user_role,
        is_owner: orgData.is_owner,
        can_manage: orgData.can_manage,
        can_delete: orgData.can_delete,
        can_view_details: orgData.can_view_details,
        can_create_teams: orgData.can_create_teams,
        can_invite_members: orgData.can_invite_members,
      });
      setOrganization(orgData);
      setStats(statsData);
      setTeams(teamsData);
      setProjects(projectsData);

      // Cargar miembros e invitaciones
      const [membersData, invitationsData] = await Promise.all([
        organizationsAPI.getMembers(id),
        orgData?.can_manage
          ? organizationsAPI.getPendingInvitations(id)
          : Promise.resolve([]),
      ]);
      setMembers(membersData);
      setPendingInvitations(invitationsData);
    } catch (err) {
      console.error("Error refreshing organization data:", err);
    }
  }, [id]);

  // Carga inicial - cargar todo al abrir la página
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const orgData = await organizationsAPI.getById(id);
        setOrganization(orgData);

        // Cargar todos los datos en paralelo
        const [statsData, teamsData, projectsData, membersData] =
          await Promise.all([
            organizationsAPI.getStats(id),
            organizationsAPI.getTeams(id),
            organizationsAPI.getProjects(id),
            organizationsAPI.getMembers(id),
          ]);

        setStats(statsData);
        setTeams(teamsData);
        setProjects(projectsData);
        setMembers(membersData);

        // Cargar invitaciones si tiene permisos
        if (orgData?.can_manage) {
          const invitationsData = await organizationsAPI.getPendingInvitations(
            id
          );
          setPendingInvitations(invitationsData);
        }
      } catch (err) {
        console.error("Error loading organization:", err);
        if (
          err.message?.includes("administrador") ||
          err.message?.includes("403")
        ) {
          showError(
            "Solo el administrador de la organización puede acceder a esta vista"
          );
          navigate("/dashboard");
        } else {
          showError("No se pudo cargar la organización");
          navigate("/dashboard");
        }
      } finally {
        setLoading(false);
        setLoadingMembers(false);
        setLoadingTeams(false);
        setLoadingProjects(false);
      }
    };

    loadAllData();
  }, [id, navigate, showError]);

  // Registrar callback para actualizaciones en tiempo real
  useEffect(() => {
    registerRefresh("organizations", refreshAllSilently);
    return () => unregisterRefresh("organizations");
  }, [registerRefresh, unregisterRefresh, refreshAllSilently]);

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;

    setSendingInvite(true);
    try {
      await organizationsAPI.sendInvitation(id, inviteForm);
      success(`Invitación enviada a ${inviteForm.email}`);
      setInviteForm({
        email: "",
        role: "member",
        job_title: "",
        department: "",
      });
      setIsInviteModalOpen(false);
      loadMembers();
    } catch (err) {
      showError(err.message || "No se pudo enviar la invitación");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      await organizationsAPI.cancelInvitation(id, invitationId);
      success("Invitación cancelada");
      loadMembers();
    } catch (err) {
      showError(err.message || "No se pudo cancelar la invitación");
    }
  };

  const handleOpenMemberStats = async (member) => {
    setMemberStatsModal({
      isOpen: true,
      member: member,
      stats: null,
      loading: true,
    });

    try {
      const statsData = await organizationsAPI.getMemberStats(id, member.id);
      setMemberStatsModal((prev) => ({
        ...prev,
        stats: statsData,
        loading: false,
      }));
    } catch (err) {
      showError(err.message || "No se pudieron cargar las estadísticas");
      setMemberStatsModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const handleCloseMemberStats = () => {
    setMemberStatsModal({
      isOpen: false,
      member: null,
      stats: null,
      loading: false,
    });
  };

  const handleRemoveMember = async () => {
    if (!confirmModal.data) return;

    try {
      await organizationsAPI.removeMember(id, confirmModal.data.id);
      success(`${confirmModal.data.name} ha sido removido de la organización`);
      setConfirmModal({ isOpen: false, type: null, data: null });
      loadMembers();
    } catch (err) {
      showError(err.message || "No se pudo remover al miembro");
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    console.log("[DEBUG] Actualizando rol de miembro:", {
      organizationId: id,
      memberId: userId,
      newRole: newRole,
      canManage: organization?.can_manage,
    });

    try {
      const response = await organizationsAPI.updateMember(id, userId, {
        role: newRole,
      });
      console.log("[DEBUG] Respuesta del servidor:", response);
      success("Rol actualizado exitosamente");

      // Recargar todos los datos para asegurar que el rol se actualice en la UI
      console.log("[DEBUG] Recargando miembros...");
      await loadMembers();
      console.log("[DEBUG] Miembros recargados");
    } catch (err) {
      console.error("[ERROR] Error al actualizar rol:", {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "No se pudo actualizar el rol";
      showError(errorMessage);
    }
  };

  const getRoleBadge = (role, isOwner = false) => {
    if (isOwner) {
      return (
        <span className='flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium'>
          <Crown className='w-3 h-3' />
          Dueño
        </span>
      );
    }
    const roles = {
      admin: { bg: "bg-purple-100", text: "text-purple-700", icon: Shield },
      manager: { bg: "bg-blue-100", text: "text-blue-700", icon: Briefcase },
      member: { bg: "bg-gray-100", text: "text-gray-700", icon: Users },
    };
    const roleStyle = roles[role] || roles.member;
    const Icon = roleStyle.icon;
    return (
      <span
        className={`flex items-center gap-1 px-2 py-1 ${roleStyle.bg} ${roleStyle.text} rounded-full text-xs font-medium capitalize`}
      >
        <Icon className='w-3 h-3' />
        {role}
      </span>
    );
  };

  const tabs = [
    { id: "overview", label: "Resumen", icon: BarChart3 },
    { id: "members", label: "Miembros", icon: Users },
    { id: "teams", label: "Equipos", icon: Shield },
    { id: "projects", label: "Proyectos", icon: FolderKanban },
    { id: "settings", label: "Configuración", icon: Settings },
  ];

  // Mostrar loader de pantalla completa mientras carga
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='w-10 h-10 animate-spin text-indigo-600' />
          <p className='text-gray-600 font-medium'>Cargando organización...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <p className='text-gray-500 mb-4'>
            No se pudo cargar la organización
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className='text-indigo-600 hover:text-indigo-800 font-medium'
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout
      title={organization.name}
      subtitle={organization.industry || "Organización"}
    >
      {/* Header con info de la org */}
      <FadeIn>
        <div className='bg-white rounded-xl border border-gray-200 overflow-hidden mb-6'>
          {/* Banner */}
          <div className='h-32 bg-linear-to-br from-indigo-500 to-purple-600 relative'>
            <button
              onClick={() => navigate("/organizations")}
              className='absolute top-4 left-4 p-2 bg-white/90 hover:bg-white rounded-lg transition-colors'
            >
              <ArrowLeft className='w-5 h-5 text-gray-700' />
            </button>

            {organization.can_manage && (
              <div className='absolute top-4 right-4 flex gap-2'>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className='p-2 bg-white/90 hover:bg-white rounded-lg transition-colors'
                >
                  <Edit className='w-5 h-5 text-gray-700' />
                </button>
              </div>
            )}

            {/* Logo */}
            <div className='absolute -bottom-10 left-6'>
              <div className='w-20 h-20 bg-white rounded-xl shadow-lg flex items-center justify-center border-4 border-white overflow-hidden'>
                {organization.logo ? (
                  <img
                    src={getAssetUrl(organization.logo)}
                    alt={organization.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <Building2 className='w-10 h-10 text-indigo-600' />
                )}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className='pt-14 px-6 pb-6'>
            <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>
                  {organization.name}
                </h1>
                {organization.description && (
                  <p className='text-gray-500 mt-1 max-w-2xl'>
                    {organization.description}
                  </p>
                )}
                <div className='flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600'>
                  {organization.website && (
                    <a
                      href={organization.website}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 hover:text-indigo-600'
                    >
                      <Globe className='w-4 h-4' />
                      {organization.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  {organization.email && (
                    <span className='flex items-center gap-1'>
                      <Mail className='w-4 h-4' />
                      {organization.email}
                    </span>
                  )}
                  {organization.city && (
                    <span className='flex items-center gap-1'>
                      <MapPin className='w-4 h-4' />
                      {organization.city}, {organization.country}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats rápidos */}
              <div className='flex gap-6 bg-gray-50 rounded-lg px-6 py-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-gray-900'>
                    {organization.active_members_count || 0}
                  </p>
                  <p className='text-xs text-gray-500'>Miembros</p>
                </div>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-gray-900'>
                    {organization.teams_count || 0}
                  </p>
                  <p className='text-xs text-gray-500'>Equipos</p>
                </div>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-gray-900'>
                    {organization.projects_count || 0}
                  </p>
                  <p className='text-xs text-gray-500'>Proyectos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className='border-t border-gray-200 px-6'>
            <div className='flex gap-1 overflow-x-auto'>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className='w-4 h-4' />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Tab Content */}
      <AnimatePresence mode='wait'>
        {activeTab === "overview" && (
          <motion.div
            key='overview'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'>
              <div className='bg-white rounded-xl border border-gray-200 p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-3 bg-blue-100 rounded-lg'>
                    <Users className='w-6 h-6 text-blue-600' />
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-gray-900'>
                      {stats?.members_count || 0}
                    </p>
                    <p className='text-sm text-gray-500'>Miembros</p>
                  </div>
                </div>
              </div>

              <div className='bg-white rounded-xl border border-gray-200 p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-3 bg-purple-100 rounded-lg'>
                    <Shield className='w-6 h-6 text-purple-600' />
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-gray-900'>
                      {stats?.teams_count || 0}
                    </p>
                    <p className='text-sm text-gray-500'>Equipos</p>
                  </div>
                </div>
              </div>

              <div className='bg-white rounded-xl border border-gray-200 p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-3 bg-green-100 rounded-lg'>
                    <FolderKanban className='w-6 h-6 text-green-600' />
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-gray-900'>
                      {stats?.projects_count || 0}
                    </p>
                    <p className='text-sm text-gray-500'>Proyectos</p>
                  </div>
                </div>
              </div>

              <div className='bg-white rounded-xl border border-gray-200 p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-3 bg-orange-100 rounded-lg'>
                    <Ticket className='w-6 h-6 text-orange-600' />
                  </div>
                  <div>
                    <p className='text-2xl font-bold text-gray-900'>
                      {stats?.tickets?.total || 0}
                    </p>
                    <p className='text-sm text-gray-500'>Tickets</p>
                  </div>
                </div>
                {/* Desglose de tickets */}
                {stats?.tickets?.total > 0 && (
                  <div className='flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2'>
                    <span className='text-blue-600'>
                      {stats.tickets.open || 0} abiertos
                    </span>
                    <span className='text-yellow-600'>
                      {stats.tickets.in_progress || 0} en progreso
                    </span>
                    <span className='text-green-600'>
                      {stats.tickets.resolved || 0} resueltos
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Info adicional */}
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Información de la organización
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <p className='text-sm text-gray-500 mb-1'>Plan</p>
                  <p className='font-medium text-gray-900 capitalize'>
                    {organization.plan}
                  </p>
                </div>
                {organization.industry && (
                  <div>
                    <p className='text-sm text-gray-500 mb-1'>Industria</p>
                    <p className='font-medium text-gray-900'>
                      {organization.industry}
                    </p>
                  </div>
                )}
                {organization.size && (
                  <div>
                    <p className='text-sm text-gray-500 mb-1'>Tamaño</p>
                    <p className='font-medium text-gray-900'>
                      {organization.size} empleados
                    </p>
                  </div>
                )}
                {organization.phone && (
                  <div>
                    <p className='text-sm text-gray-500 mb-1'>Teléfono</p>
                    <p className='font-medium text-gray-900'>
                      {organization.phone}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "members" && (
          <motion.div
            key='members'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className='bg-white rounded-xl border border-gray-200'>
              {/* Header */}
              <div className='p-4 border-b border-gray-200 flex items-center justify-between'>
                <div>
                  <h3 className='font-semibold text-gray-900'>Miembros</h3>
                  <p className='text-sm text-gray-500'>
                    {members.length} miembros activos
                  </p>
                </div>
                {organization.can_manage && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition'
                  >
                    <UserPlus className='w-4 h-4' />
                    Invitar
                  </button>
                )}
              </div>

              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div className='p-4 bg-yellow-50 border-b border-yellow-100'>
                  <p className='text-sm font-medium text-yellow-800 mb-2'>
                    Invitaciones pendientes
                  </p>
                  <div className='space-y-2'>
                    {pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className='flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-200'
                      >
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center'>
                            <Clock className='w-4 h-4 text-yellow-600' />
                          </div>
                          <div>
                            <p className='text-sm font-medium text-gray-900'>
                              {inv.email}
                            </p>
                            <p className='text-xs text-gray-500'>
                              Rol: {inv.role}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className='p-1 text-red-500 hover:bg-red-50 rounded'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members List */}
              {loadingMembers ? (
                <div className='p-8 text-center'>
                  <Loader2 className='w-6 h-6 animate-spin text-gray-400 mx-auto' />
                </div>
              ) : (
                <div className='divide-y divide-gray-100'>
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className='p-4 flex items-center justify-between hover:bg-gray-50'
                    >
                      <div className='flex items-center gap-3'>
                        <UserAvatar user={member} size='md' />
                        <div>
                          <div className='flex items-center gap-2'>
                            <p className='font-medium text-gray-900'>
                              {member.name}
                            </p>
                            {getRoleBadge(
                              member.role,
                              member.id === organization.owner_id
                            )}
                          </div>
                          <p className='text-sm text-gray-500'>
                            {member.email}
                          </p>
                          {member.job_title && (
                            <p className='text-xs text-gray-400'>
                              {member.job_title}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        {/* Botón de estadísticas - visible para todos */}
                        <button
                          onClick={() => handleOpenMemberStats(member)}
                          className='p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors'
                          title='Ver estadísticas'
                        >
                          <BarChart3 className='w-4 h-4' />
                        </button>

                        {organization.can_manage &&
                          member.id !== organization.owner_id && (
                            <>
                              <select
                                value={member.role || "member"}
                                onChange={(e) =>
                                  handleUpdateMemberRole(
                                    member.id,
                                    e.target.value
                                  )
                                }
                                className='text-sm border border-gray-300 rounded-lg px-2 py-1'
                              >
                                <option value='admin'>Admin</option>
                                <option value='manager'>Manager</option>
                                <option value='member'>Miembro</option>
                              </select>
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    type: "removeMember",
                                    data: member,
                                  })
                                }
                                className='p-2 text-red-500 hover:bg-red-50 rounded-lg'
                              >
                                <UserMinus className='w-4 h-4' />
                              </button>
                            </>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "teams" && (
          <motion.div
            key='teams'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {loadingTeams ? (
              <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
                <Loader2 className='w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3' />
                <p className='text-gray-500'>Cargando equipos...</p>
              </div>
            ) : teams.length === 0 ? (
              <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
                <Shield className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                <h3 className='text-lg font-medium text-gray-900 mb-1'>
                  No hay equipos
                </h3>
                <p className='text-gray-500 mb-4'>
                  Los equipos de esta organización aparecerán aquí
                </p>
                <button
                  onClick={() => navigate("/teams")}
                  className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition'
                >
                  Crear equipo
                </button>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className='bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer'
                    onClick={() => navigate(`/teams/${team.id}`)}
                  >
                    <div className='flex items-start gap-3 mb-3'>
                      <div
                        className={`w-10 h-10 rounded-lg ${
                          team.color || "bg-indigo-500"
                        } flex items-center justify-center text-white font-bold text-lg`}
                      >
                        {team.name?.charAt(0).toUpperCase() || "T"}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h4 className='font-semibold text-gray-900 truncate'>
                          {team.name}
                        </h4>
                        <p className='text-sm text-gray-500 line-clamp-1'>
                          {team.description || "Sin descripción"}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-1 text-gray-500'>
                        <Users className='w-4 h-4' />
                        <span>
                          {team.members_count || team.members?.length || 0}{" "}
                          miembros
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          team.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {team.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Owner del equipo */}
                    {team.user && (
                      <div className='mt-3 pt-3 border-t border-gray-100 flex items-center gap-2'>
                        <UserAvatar user={team.user} size='xs' />
                        <span className='text-xs text-gray-500'>
                          Creado por {team.user.name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "projects" && (
          <motion.div
            key='projects'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {loadingProjects ? (
              <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
                <Loader2 className='w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3' />
                <p className='text-gray-500'>Cargando proyectos...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
                <FolderKanban className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                <h3 className='text-lg font-medium text-gray-900 mb-1'>
                  No hay proyectos
                </h3>
                <p className='text-gray-500 mb-4'>
                  Los proyectos de esta organización aparecerán aquí
                </p>
                <button
                  onClick={() => navigate("/projects")}
                  className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition'
                >
                  Crear proyecto
                </button>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className='bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer'
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className='flex items-start gap-3 mb-3'>
                      <div
                        className={`w-10 h-10 rounded-lg ${
                          project.color || "bg-blue-500"
                        } flex items-center justify-center text-white font-bold text-lg`}
                      >
                        {project.name?.charAt(0).toUpperCase() || "P"}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h4 className='font-semibold text-gray-900 truncate'>
                          {project.name}
                        </h4>
                        <p className='text-sm text-gray-500 line-clamp-1'>
                          {project.description || "Sin descripción"}
                        </p>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className='mb-3'>
                      <div className='flex items-center justify-between text-sm mb-1'>
                        <span className='text-gray-500'>Progreso</span>
                        <span className='font-medium text-gray-900'>
                          {project.progress || 0}%
                        </span>
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-2'>
                        <div
                          className='bg-indigo-600 h-2 rounded-full transition-all'
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-1 text-gray-500'>
                        <CheckSquare className='w-4 h-4' />
                        <span>{project.tasks_count || 0} tareas</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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

                    {/* Fecha de vencimiento */}
                    {project.due_date && (
                      <div className='mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500'>
                        <Calendar className='w-4 h-4' />
                        <span>
                          Vence:{" "}
                          {new Date(project.due_date).toLocaleDateString(
                            "es-ES",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    )}

                    {/* Equipo asignado */}
                    {project.team && (
                      <div className='mt-2 flex items-center gap-2'>
                        <div
                          className={`w-5 h-5 rounded ${
                            project.team.color || "bg-indigo-500"
                          } flex items-center justify-center text-white text-xs font-medium`}
                        >
                          {project.team.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className='text-xs text-gray-500'>
                          {project.team.name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            key='settings'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className='space-y-6'
          >
            {/* Configuración General */}
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-6'>
                Configuración general
              </h3>

              {organization.is_owner ? (
                <div className='space-y-6'>
                  <div className='p-4 bg-gray-50 rounded-lg'>
                    <h4 className='font-medium text-gray-900 mb-2'>
                      Plan actual
                    </h4>
                    <p className='text-gray-600 capitalize'>
                      {organization.plan}
                    </p>
                    <button className='mt-3 text-indigo-600 font-medium text-sm hover:underline'>
                      Mejorar plan →
                    </button>
                  </div>

                  <div className='p-4 border border-red-200 rounded-lg bg-red-50'>
                    <h4 className='font-medium text-red-800 mb-2'>
                      Zona de peligro
                    </h4>
                    <p className='text-red-600 text-sm mb-3'>
                      Eliminar la organización borrará todos los datos asociados
                      de forma permanente.
                    </p>
                    <button className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm'>
                      Eliminar organización
                    </button>
                  </div>
                </div>
              ) : (
                <div className='text-center py-8'>
                  <Settings className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                  <p className='text-gray-500'>
                    Solo el dueño de la organización puede acceder a la
                    configuración
                  </p>
                </div>
              )}
            </div>

            {/* Configuración de Correo */}
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-6'>
                Configuración de correo
              </h3>
              <OrganizationMailConfig
                organizationId={id}
                isOwner={organization.is_owner}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <OrganizationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        organization={organization}
        onSuccess={() => {
          setIsEditModalOpen(false);
          loadOrganization();
        }}
      />

      {/* Invite Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4'>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='absolute inset-0 bg-black/50'
              onClick={() => setIsInviteModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='relative bg-white rounded-xl shadow-xl max-w-md w-full p-6'
            >
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Invitar miembro
              </h3>
              <form onSubmit={handleSendInvitation} className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Email *
                  </label>
                  <input
                    type='email'
                    required
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500'
                    placeholder='email@ejemplo.com'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Rol
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        role: e.target.value,
                      }))
                    }
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg'
                  >
                    <option value='member'>Miembro</option>
                    <option value='manager'>Manager</option>
                    <option value='admin'>Admin</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Puesto (opcional)
                  </label>
                  <input
                    type='text'
                    value={inviteForm.job_title}
                    onChange={(e) =>
                      setInviteForm((prev) => ({
                        ...prev,
                        job_title: e.target.value,
                      }))
                    }
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg'
                    placeholder='Ej: Desarrollador Senior'
                  />
                </div>
                <div className='flex gap-3 pt-4'>
                  <button
                    type='submit'
                    disabled={sendingInvite}
                    className='flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2'
                  >
                    {sendingInvite ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Send className='w-4 h-4' />
                    )}
                    Enviar invitación
                  </button>
                  <button
                    type='button'
                    onClick={() => setIsInviteModalOpen(false)}
                    className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, type: null, data: null })
        }
        onConfirm={
          confirmModal.type === "removeMember" ? handleRemoveMember : null
        }
        title='Remover miembro'
        message={`¿Estás seguro de que deseas remover a ${confirmModal.data?.name} de la organización?`}
        confirmText='Remover'
        type='danger'
      />

      {/* Member Stats Modal */}
      <AnimatePresence>
        {memberStatsModal.isOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4'>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='absolute inset-0 bg-black/50'
              onClick={handleCloseMemberStats}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto'
            >
              {/* Header */}
              <div className='sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <UserAvatar user={memberStatsModal.member} size='md' />
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900'>
                      {memberStatsModal.member?.name}
                    </h3>
                    <p className='text-sm text-gray-500'>
                      {memberStatsModal.member?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseMemberStats}
                  className='p-2 hover:bg-gray-100 rounded-lg'
                >
                  <X className='w-5 h-5 text-gray-500' />
                </button>
              </div>

              {/* Content */}
              <div className='p-6'>
                {memberStatsModal.loading ? (
                  <div className='flex flex-col items-center justify-center py-12'>
                    <Loader2 className='w-8 h-8 animate-spin text-indigo-600 mb-3' />
                    <p className='text-gray-500'>Cargando estadísticas...</p>
                  </div>
                ) : memberStatsModal.stats ? (
                  <div className='space-y-6'>
                    {/* Productividad */}
                    <div className='bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white'>
                      <div className='flex items-center gap-2 mb-4'>
                        <Sparkles className='w-5 h-5' />
                        <h4 className='font-semibold'>Productividad</h4>
                      </div>

                      {/* Barra de progreso principal */}
                      <div className='mb-4'>
                        <div className='flex justify-between items-center mb-2'>
                          <span className='text-sm text-indigo-100'>
                            Tareas completadas
                          </span>
                          <span className='font-bold'>
                            {memberStatsModal.stats.tasks?.completed || 0}/
                            {(memberStatsModal.stats.tasks?.completed || 0) +
                              (memberStatsModal.stats.tasks?.pending || 0)}
                          </span>
                        </div>
                        <div className='w-full bg-white/20 rounded-full h-3'>
                          <div
                            className='bg-white h-3 rounded-full transition-all duration-500'
                            style={{
                              width: `${
                                memberStatsModal.stats.productivity
                                  ?.percentage || 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Métricas de productividad */}
                      <div className='grid grid-cols-3 gap-3'>
                        <div className='bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm'>
                          <p className='text-2xl font-bold'>
                            {memberStatsModal.stats.productivity?.percentage ||
                              0}
                            %
                          </p>
                          <p className='text-xs text-indigo-100'>Completado</p>
                        </div>
                        <div className='bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm'>
                          <div className='flex items-center justify-center gap-1'>
                            <TrendingUp className='w-4 h-4' />
                            <p className='text-2xl font-bold'>
                              {memberStatsModal.stats.productivity
                                ?.completed_this_week || 0}
                            </p>
                          </div>
                          <p className='text-xs text-indigo-100'>Esta semana</p>
                        </div>
                        <div className='bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm'>
                          <p className='text-2xl font-bold'>
                            {memberStatsModal.stats.productivity
                              ?.avg_project_progress || 0}
                            %
                          </p>
                          <p className='text-xs text-indigo-100'>
                            Avg. Progreso
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Proyectos */}
                    <div className='bg-blue-50 rounded-xl p-4'>
                      <div className='flex items-center gap-2 mb-3'>
                        <FolderKanban className='w-5 h-5 text-blue-600' />
                        <h4 className='font-semibold text-blue-900'>
                          Proyectos
                        </h4>
                      </div>
                      <div className='grid grid-cols-3 gap-4'>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-blue-600'>
                            {memberStatsModal.stats.projects?.owned || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Propios</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-blue-600'>
                            {memberStatsModal.stats.projects?.collaborating ||
                              0}
                          </p>
                          <p className='text-xs text-gray-500'>Colabora</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-blue-600'>
                            {memberStatsModal.stats.projects?.total || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Total</p>
                        </div>
                      </div>
                    </div>

                    {/* Tareas */}
                    <div className='bg-green-50 rounded-xl p-4'>
                      <div className='flex items-center gap-2 mb-3'>
                        <CheckSquare className='w-5 h-5 text-green-600' />
                        <h4 className='font-semibold text-green-900'>Tareas</h4>
                        {memberStatsModal.stats.tasks?.completion_rate > 0 && (
                          <span className='ml-auto text-sm font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full'>
                            {memberStatsModal.stats.tasks.completion_rate}%
                            completado
                          </span>
                        )}
                      </div>
                      <div className='grid grid-cols-4 gap-3'>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-green-600'>
                            {memberStatsModal.stats.tasks?.created || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Creadas</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-green-600'>
                            {memberStatsModal.stats.tasks?.assigned || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Asignadas</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-green-600'>
                            {memberStatsModal.stats.tasks?.completed || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Completadas</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-yellow-600'>
                            {memberStatsModal.stats.tasks?.pending || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Pendientes</p>
                        </div>
                      </div>
                    </div>

                    {/* Tickets */}
                    <div className='bg-orange-50 rounded-xl p-4'>
                      <div className='flex items-center gap-2 mb-3'>
                        <Ticket className='w-5 h-5 text-orange-600' />
                        <h4 className='font-semibold text-orange-900'>
                          Tickets
                        </h4>
                        {memberStatsModal.stats.tickets?.resolution_rate >
                          0 && (
                          <span className='ml-auto text-sm font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full'>
                            {memberStatsModal.stats.tickets.resolution_rate}%
                            resueltos
                          </span>
                        )}
                      </div>
                      <div className='grid grid-cols-4 gap-3'>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-orange-600'>
                            {memberStatsModal.stats.tickets?.created || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Creados</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-orange-600'>
                            {memberStatsModal.stats.tickets?.assigned || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Asignados</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-green-600'>
                            {memberStatsModal.stats.tickets?.resolved || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Resueltos</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-red-600'>
                            {memberStatsModal.stats.tickets?.open || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Abiertos</p>
                        </div>
                      </div>
                    </div>

                    {/* Equipos */}
                    <div className='bg-purple-50 rounded-xl p-4'>
                      <div className='flex items-center gap-2 mb-3'>
                        <Users className='w-5 h-5 text-purple-600' />
                        <h4 className='font-semibold text-purple-900'>
                          Equipos
                        </h4>
                      </div>
                      <div className='grid grid-cols-3 gap-4'>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-purple-600'>
                            {memberStatsModal.stats.teams?.owned || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Lidera</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-purple-600'>
                            {memberStatsModal.stats.teams?.member_of || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Miembro</p>
                        </div>
                        <div className='bg-white rounded-lg p-3 text-center'>
                          <p className='text-2xl font-bold text-purple-600'>
                            {memberStatsModal.stats.teams?.total || 0}
                          </p>
                          <p className='text-xs text-gray-500'>Total</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='text-center py-12'>
                    <BarChart3 className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                    <p className='text-gray-500'>
                      No se pudieron cargar las estadísticas
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default OrganizationDetail;

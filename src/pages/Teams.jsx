import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import TeamModal from "../components/modals/TeamModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { useAuth } from "../context/AuthContext";
import {
  useOrganizationPermissions,
  useUserContext,
} from "../hooks/useOrganizationPermissions";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import ProgressRing from "../components/ui/ProgressRing";
import { motionTokens } from "../components/animations/variants";
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  Loader2,
  FolderKanban,
  Mail,
  ArrowRight,
  Info,
  Ticket,
  CheckSquare,
} from "lucide-react";
import { teamsAPI, teamInvitationsAPI } from "../utils/api";

// Paleta de colores de equipo (mismos valores que el selector en TeamModal) —
// se usa solo para derivar el tinte de fondo de cada tarjeta a partir del
// dato guardado (team.color, una clase Tailwind literal), nunca se reasigna.
const TEAM_COLOR_HEX = {
  "bg-indigo-500": "#6366f1",
  "bg-blue-500": "#3b82f6",
  "bg-cyan-500": "#06b6d4",
  "bg-teal-500": "#14b8a6",
  "bg-green-500": "#22c55e",
  "bg-lime-500": "#84cc16",
  "bg-emerald-500": "#10b981",
  "bg-yellow-500": "#eab308",
  "bg-amber-500": "#f59e0b",
  "bg-orange-500": "#f97316",
  "bg-red-500": "#ef4444",
  "bg-rose-500": "#f43f5e",
  "bg-pink-500": "#ec4899",
  "bg-purple-500": "#a855f7",
  "bg-violet-500": "#8b5cf6",
  "bg-slate-500": "#64748b",
};
const getTeamHex = (team) =>
  TEAM_COLOR_HEX[team.color] || TEAM_COLOR_HEX["bg-indigo-500"];

const Teams = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();

  // Permisos de organización
  const { isOrganizationContext } = useUserContext();
  const { canCreateTeams, role, hasOrganization } =
    useOrganizationPermissions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    teamId: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitingTeamId, setInvitingTeamId] = useState(null);

  // Función para cargar equipos con indicador de carga (carga inicial)
  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamsAPI.getAll();
      setTeams(data);
    } catch (err) {
      console.error("Error al cargar equipos:", err);
      setError("No se pudieron cargar los equipos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para actualizar equipos silenciosamente (sin spinner, para tiempo real)
  const refreshTeamsSilently = useCallback(async () => {
    try {
      console.log("🔄 Refreshing teams...");
      const data = await teamsAPI.getAll();
      console.log("✅ Teams received:", data);
      setTeams(data);
    } catch (err) {
      console.error("Error refreshing teams:", err);
      // No mostrar error en actualización silenciosa
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Registrar callback para refrescar datos en tiempo real (silencioso)
  useEffect(() => {
    registerRefresh("teams", refreshTeamsSilently);
    return () => unregisterRefresh("teams");
  }, [registerRefresh, unregisterRefresh, refreshTeamsSilently]);

  const openDeleteConfirm = (teamId) => {
    setConfirmModal({ isOpen: true, teamId });
  };

  const handleDelete = async () => {
    const teamId = confirmModal.teamId;

    // Guardar equipos originales para posible rollback
    const originalTeams = [...teams];

    // Actualización optimista - remover de UI inmediatamente
    setTeams((prev) => prev.filter((t) => t.id !== teamId));

    setDeleting(true);
    try {
      await teamsAPI.delete(teamId);
      success("Equipo eliminado exitosamente");
      // No necesitamos recargar, ya actualizamos optimísticamente
    } catch (err) {
      // Revertir en caso de error
      setTeams(originalTeams);
      console.error("Error al eliminar equipo:", err);
      showError(err.message || "No se pudo eliminar el equipo");
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, teamId: null });
    }
  };

  const handleEdit = (team, e) => {
    e.stopPropagation();
    setSelectedTeam(team);
    setIsModalOpen(true);
  };

  const handleViewTeam = (team) => {
    navigate(`/teams/${team.id}`);
  };

  const handleNewTeam = () => {
    setSelectedTeam(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTeam(null);
  };

  const handleSuccess = async () => {
    // Refrescar la lista de equipos primero
    await refreshTeamsSilently();
    // El modal se cierra solo después de onSuccess (no necesitamos llamar handleCloseModal)
  };

  const handleSendInvite = async (teamId) => {
    if (!inviteEmail) {
      showError("Por favor ingresa un email");
      return;
    }

    try {
      await teamInvitationsAPI.sendInvitation(teamId, inviteEmail);
      success("Invitación enviada exitosamente");
      setInviteEmail("");
      setInvitingTeamId(null);
    } catch (err) {
      console.error("Error al enviar invitación:", err);
      showError(err.message || "No se pudo enviar la invitación");
    }
  };

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      searchTerm === "" ||
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <Layout title='Equipos' subtitle='Gestiona tus equipos de trabajo'>
      {/* Barra de acciones */}
      <FadeIn delay={0.1}>
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6'>
          <div className='relative flex-1 w-full md:w-auto'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar equipos...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
            />
          </div>

          {/* Solo mostrar botón de crear equipo si tiene permisos */}
          {canCreateTeams ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewTeam}
              className='flex items-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition w-full md:w-auto justify-center'
            >
              <Plus className='w-5 h-5' />
              Nuevo Equipo
            </motion.button>
          ) : (
            isOrganizationContext && (
              <div className='flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg w-full md:w-auto justify-center'>
                <Info className='w-4 h-4' />
                <span className='text-sm'>
                  Solo{" "}
                  {role === "member"
                    ? "propietarios, administradores y managers"
                    : "tu rol"}{" "}
                  pueden crear equipos
                </span>
              </div>
            )
          )}
        </div>
      </FadeIn>

      {/* Loading y Error States */}
      {loading && (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-brand-600' />
        </div>
      )}

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg'>
          {error}
        </div>
      )}

      {/* Lista de equipos */}
      {!loading && !error && (
        <>
          {filteredTeams.length === 0 ? (
            <div className='text-center py-12'>
              <Users className='w-16 h-16 text-gray-300 mx-auto mb-4' />
              <p className='text-gray-500 text-lg'>
                {searchTerm
                  ? "No se encontraron equipos con ese criterio"
                  : "No hay equipos creados aún"}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleNewTeam}
                  className='mt-4 text-brand-600 hover:text-brand-700 font-medium'
                >
                  Crear tu primer equipo
                </button>
              )}
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              <AnimatePresence mode='popLayout'>
                {filteredTeams.map((team) => {
                  const hex = getTeamHex(team);
                  const pct =
                    team.task_count > 0
                      ? Math.round(
                          ((team.completed_tasks || 0) / team.task_count) *
                            100,
                        )
                      : 0;

                  return (
                    <motion.div
                      key={team.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      transition={motionTokens.springSoft}
                      onClick={() => handleViewTeam(team)}
                      style={{
                        background: `linear-gradient(160deg, ${hex}14, #fff 55%)`,
                        borderColor: `${hex}33`,
                      }}
                      className='rounded-2xl border cursor-pointer group transition-shadow hover:shadow-lg p-6 relative overflow-hidden'
                    >
                      {/* Acciones */}
                      {team.can_edit && (
                        <div className='absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                          <button
                            onClick={(e) => handleEdit(team, e)}
                            className='p-1.5 bg-white/80 hover:bg-blue-50 rounded transition'
                          >
                            <Edit className='w-4 h-4 text-blue-600' />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirm(team.id);
                            }}
                            className='p-1.5 bg-white/80 hover:bg-red-50 rounded transition'
                          >
                            <Trash2 className='w-4 h-4 text-red-600' />
                          </button>
                        </div>
                      )}

                      {/* Icono de identidad */}
                      <div
                        className='w-12 h-12 rounded-xl flex items-center justify-center shadow-sm mb-4'
                        style={{ background: hex }}
                      >
                        <Users className='w-6 h-6 text-white' />
                      </div>

                      <h3 className='font-bold text-gray-900 text-lg mb-1'>
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className='text-sm text-gray-600 line-clamp-2 mb-4'>
                          {team.description}
                        </p>
                      )}

                      {/* Estadísticas como píldoras */}
                      <div className='flex flex-wrap gap-2 mb-4'>
                        <span className='inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700'>
                          <Users className='w-3.5 h-3.5 text-gray-400' />
                          {team.member_count || 0}
                        </span>
                        <span className='inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700'>
                          <FolderKanban className='w-3.5 h-3.5 text-gray-400' />
                          {team.project_count || 0}
                        </span>
                        <span className='inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700'>
                          <Ticket className='w-3.5 h-3.5 text-gray-400' />
                          {team.ticket_count || 0}
                          {team.open_tickets > 0 && (
                            <span className='px-1.5 py-0.5 -mr-1 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full'>
                              {team.open_tickets}
                            </span>
                          )}
                        </span>
                        <span className='inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700'>
                          <CheckSquare className='w-3.5 h-3.5 text-gray-400' />
                          {team.task_count || 0}
                        </span>
                      </div>

                      {/* Progreso de tareas */}
                      {team.task_count > 0 && (
                        <div
                          className='flex items-center justify-between pt-4 border-t mb-3'
                          style={{ borderColor: `${hex}26` }}
                        >
                          <span className='text-xs text-gray-500'>
                            {pct}% completado
                          </span>
                          <ProgressRing
                            percentage={pct}
                            size={32}
                            strokeWidth={3.5}
                            color={hex}
                            trackColor='#e5e7eb'
                          />
                        </div>
                      )}

                      {/* Acciones */}
                      <div
                        className={`flex items-center gap-2 ${
                          team.task_count > 0
                            ? ""
                            : "pt-4 border-t"
                        }`}
                        style={
                          team.task_count > 0
                            ? undefined
                            : { borderColor: `${hex}26` }
                        }
                      >
                        {invitingTeamId === team.id ? (
                          <div className='flex gap-2 flex-1'>
                            <input
                              type='email'
                              placeholder='Email...'
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className='flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendInvite(team.id);
                              }}
                              className='px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition shrink-0'
                            >
                              Enviar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvitingTeamId(null);
                                setInviteEmail("");
                              }}
                              className='px-2 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg bg-white hover:bg-gray-50 transition shrink-0'
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            {team.is_owner && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInvitingTeamId(team.id);
                                }}
                                className='flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors'
                              >
                                <Mail className='w-4 h-4' />
                                Invitar
                              </button>
                            )}
                            <span className='ml-auto flex items-center gap-1 text-sm text-gray-500 group-hover:text-brand-700 transition-colors'>
                              Ver equipo
                              <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                            </span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Modal de Equipo */}
      <TeamModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        team={selectedTeam}
        onSuccess={handleSuccess}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, teamId: null })}
        onConfirm={handleDelete}
        title='Eliminar equipo'
        message='¿Estás seguro de que deseas eliminar este equipo? Esta acción no se puede deshacer y eliminará todos los proyectos asociados.'
        confirmText='Eliminar'
        type='danger'
        loading={deleting}
      />
    </Layout>
  );
};

export default Teams;

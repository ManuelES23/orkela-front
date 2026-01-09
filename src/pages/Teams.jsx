import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import TeamModal from "../components/modals/TeamModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useNotification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  Loader2,
  FolderKanban,
  Mail,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { teamsAPI, teamInvitationsAPI } from "../utils/api";

const Teams = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();
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
              className='pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewTeam}
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition w-full md:w-auto justify-center'
          >
            <Plus className='w-5 h-5' />
            Nuevo Equipo
          </motion.button>
        </div>
      </FadeIn>

      {/* Loading y Error States */}
      {loading && (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
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
                  className='mt-4 text-indigo-600 hover:text-indigo-700 font-medium'
                >
                  Crear tu primer equipo
                </button>
              )}
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              <AnimatePresence mode='popLayout'>
                {filteredTeams.map((team) => (
                  <motion.div
                    key={team.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    onClick={() => handleViewTeam(team)}
                    className='bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer group hover:border-indigo-300 transition-colors overflow-hidden'
                  >
                    {/* Barra de color superior */}
                    <div className={`h-1.5 ${team.color || "bg-indigo-500"}`} />

                    {/* Header del equipo */}
                    <div className='p-6'>
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-3 mb-1'>
                            <div
                              className={`w-10 h-10 rounded-lg ${
                                team.color || "bg-indigo-500"
                              } flex items-center justify-center shadow-sm`}
                            >
                              <Users className='w-5 h-5 text-white' />
                            </div>
                            <h3 className='font-semibold text-gray-900 text-lg'>
                              {team.name}
                            </h3>
                          </div>
                          {team.description && (
                            <p className='text-sm text-gray-600 line-clamp-2'>
                              {team.description}
                            </p>
                          )}
                        </div>

                        {team.can_edit && (
                          <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                            <button
                              onClick={(e) => handleEdit(team, e)}
                              className='p-1.5 hover:bg-blue-50 rounded transition'
                            >
                              <Edit className='w-4 h-4 text-blue-600' />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteConfirm(team.id);
                              }}
                              className='p-1.5 hover:bg-red-50 rounded transition'
                            >
                              <Trash2 className='w-4 h-4 text-red-600' />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Estadísticas */}
                      <div className='flex items-center gap-4 mb-4'>
                        <div className='flex items-center gap-2 text-gray-600'>
                          <span className='text-sm'>
                            {team.member_count || 0} miembros
                          </span>
                        </div>
                        <div className='flex items-center gap-2 text-gray-600'>
                          <FolderKanban className='w-4 h-4' />
                          <span className='text-sm'>
                            {team.projects?.length || team.project_count || 0}{" "}
                            proyectos
                          </span>
                        </div>
                      </div>

                      {/* Ir al equipo */}
                      <div className='pt-4 border-t border-gray-100 flex items-center justify-between'>
                        {team.is_owner && invitingTeamId !== team.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInvitingTeamId(team.id);
                            }}
                            className='flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium'
                          >
                            <Mail className='w-4 h-4' />
                            Invitar
                          </button>
                        )}

                        {invitingTeamId === team.id && (
                          <div className='flex gap-2 flex-1'>
                            <input
                              type='email'
                              placeholder='Email...'
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className='flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendInvite(team.id);
                              }}
                              className='px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition'
                            >
                              Enviar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvitingTeamId(null);
                                setInviteEmail("");
                              }}
                              className='px-2 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition'
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {invitingTeamId !== team.id && (
                          <span className='flex items-center gap-1 text-sm text-gray-500 group-hover:text-indigo-600 transition-colors'>
                            Ver equipo
                            <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
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

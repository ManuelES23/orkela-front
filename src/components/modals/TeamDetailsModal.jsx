import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import UserAvatar from "../ui/UserAvatar";
import { useNotification } from "../../context/NotificationContext";
import { motion } from "framer-motion";
import {
  Users,
  Mail,
  FolderKanban,
  Calendar,
  Send,
  Trash2,
  Crown,
  User,
  X,
  Loader2,
} from "lucide-react";
import { teamsAPI, teamInvitationsAPI } from "../../utils/api";

const TeamDetailsModal = ({ isOpen, onClose, team, onUpdate }) => {
  const { success, error: showError } = useNotification();
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (isOpen && team) {
      loadTeamDetails();
    }
  }, [isOpen, team]);

  const loadTeamDetails = async () => {
    try {
      setLoading(true);
      const data = await teamsAPI.getById(team.id);
      setTeamDetails(data);
    } catch (err) {
      console.error("Error loading team details:", err);
      showError("Error al cargar los detalles del equipo");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setSendingInvite(true);
    try {
      await teamInvitationsAPI.sendInvitation(team.id, inviteEmail.trim());
      success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail("");
      await loadTeamDetails();
    } catch (err) {
      showError(err.response?.data?.message || "Error al enviar invitación");
    } finally {
      setSendingInvite(false);
    }
  };

  if (!team) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={teamDetails?.name || team.name}
      size='lg'
    >
      {loading ? (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        </div>
      ) : teamDetails ? (
        <div className='space-y-6'>
          {/* Header con color */}
          <div className={`${teamDetails.color} rounded-lg p-6 text-white`}>
            <div className='flex items-start justify-between'>
              <div>
                <h2 className='text-2xl font-bold mb-2'>{teamDetails.name}</h2>
                <p className='text-white/90'>
                  {teamDetails.description || "Sin descripción"}
                </p>
              </div>
              <div className='flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full'>
                <Users className='w-4 h-4' />
                <span className='font-medium'>
                  {teamDetails.members?.length || 0} miembros
                </span>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-blue-50 rounded-lg p-4'>
              <div className='flex items-center gap-2 text-blue-600 mb-1'>
                <FolderKanban className='w-5 h-5' />
                <span className='font-semibold'>Proyectos</span>
              </div>
              <p className='text-2xl font-bold text-blue-700'>
                {teamDetails.projects?.length || 0}
              </p>
            </div>
            <div className='bg-green-50 rounded-lg p-4'>
              <div className='flex items-center gap-2 text-green-600 mb-1'>
                <Users className='w-5 h-5' />
                <span className='font-semibold'>Miembros</span>
              </div>
              <p className='text-2xl font-bold text-green-700'>
                {(teamDetails.members?.length || 0) + 1}
              </p>
            </div>
          </div>

          {/* Miembros */}
          <div>
            <h3 className='text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2'>
              <Users className='w-5 h-5' />
              Miembros del Equipo
            </h3>
            <div className='space-y-2'>
              {/* Owner */}
              <div className='flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100'>
                <UserAvatar user={teamDetails.user} size='md' />
                <div className='flex-1'>
                  <p className='font-semibold text-gray-900'>
                    {teamDetails.user?.name}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {teamDetails.user?.email}
                  </p>
                </div>
                <div className='flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium'>
                  <Crown className='w-3 h-3' />
                  Dueño
                </div>
              </div>

              {/* Members */}
              {teamDetails.members?.map((member) => (
                <div
                  key={member.id}
                  className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'
                >
                  <UserAvatar user={member} size='md' />
                  <div className='flex-1'>
                    <p className='font-medium text-gray-900'>{member.name}</p>
                    <p className='text-xs text-gray-500'>{member.email}</p>
                  </div>
                  <div className='flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs'>
                    <User className='w-3 h-3' />
                    {member.pivot?.role || "Miembro"}
                  </div>
                </div>
              ))}

              {teamDetails.members?.length === 0 && (
                <p className='text-center text-gray-500 py-4'>
                  No hay miembros adicionales aún
                </p>
              )}
            </div>
          </div>

          {/* Invitar por email */}
          {teamDetails.is_owner && (
            <div className='border-t pt-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2'>
                <Mail className='w-5 h-5' />
                Invitar Nuevos Miembros
              </h3>
              <form onSubmit={handleSendInvite} className='flex gap-2'>
                <div className='flex-1 relative'>
                  <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='email'
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder='email@ejemplo.com'
                    disabled={sendingInvite}
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100'
                  />
                </div>
                <button
                  type='submit'
                  disabled={!inviteEmail.trim() || sendingInvite}
                  className='px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2'
                >
                  {sendingInvite ? (
                    <Loader2 className='w-5 h-5 animate-spin' />
                  ) : (
                    <Send className='w-5 h-5' />
                  )}
                  Enviar
                </button>
              </form>
              <p className='mt-2 text-xs text-gray-500'>
                Se enviará una invitación por correo electrónico
              </p>
            </div>
          )}

          {/* Proyectos del equipo */}
          {teamDetails.projects && teamDetails.projects.length > 0 && (
            <div className='border-t pt-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2'>
                <FolderKanban className='w-5 h-5' />
                Proyectos del Equipo
              </h3>
              <div className='space-y-2'>
                {teamDetails.projects.map((project) => (
                  <div
                    key={project.id}
                    className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${project.color}`}
                    ></div>
                    <div className='flex-1'>
                      <p className='font-medium text-gray-900'>
                        {project.name}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {project.description}
                      </p>
                    </div>
                    {project.due_date && (
                      <div className='flex items-center gap-1 text-xs text-gray-500'>
                        <Calendar className='w-3 h-3' />
                        {new Date(project.due_date).toLocaleDateString("es-ES")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className='text-center py-8 text-gray-500'>
          No se pudo cargar la información del equipo
        </div>
      )}
    </Modal>
  );
};

export default TeamDetailsModal;

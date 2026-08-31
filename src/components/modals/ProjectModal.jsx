import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import UserAvatar from "../ui/UserAvatar";
import { useNotification } from "../../context/NotificationContext";
import {
  FolderKanban,
  Calendar,
  Flag,
  Users as UsersIcon,
  UserCheck,
  Mail,
  Send,
  Loader2,
} from "lucide-react";
import { projectsAPI, invitationsAPI, teamsAPI } from "../../utils/api";

const ProjectModal = ({
  isOpen,
  onClose,
  project = null,
  teamId = null,
  onSuccess,
}) => {
  const { success, error: showError } = useNotification();
  const [formData, setFormData] = useState({
    name: project?.name || "",
    description: project?.description || "",
    due_date: project?.due_date || "",
    priority: project?.priority || "medium",
    color: project?.color || "bg-blue-500",
    team_id: project?.team_id || teamId || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) {
        setInitializing(true);
        return;
      }

      try {
        setInitializing(true);
        setError(null);

        // 1. Cargar equipos
        const teamsData = await teamsAPI.getAll();
        setTeams(teamsData);

        // 2. Establecer formData
        setFormData({
          name: project?.name || "",
          description: project?.description || "",
          due_date: project?.due_date ? project.due_date.split("T")[0] : "",
          priority: project?.priority || "medium",
          color: project?.color || "bg-blue-500",
          team_id: project?.team_id || teamId || "",
        });
        setInviteEmail("");

        // TODO LISTO
        setInitializing(false);
      } catch (err) {
        console.error("Error al cargar equipos:", err);
        setInitializing(false);
      }
    };

    initializeModal();
  }, [isOpen, project, teamId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !project) return;

    setSendingInvite(true);
    try {
      const result = await invitationsAPI.sendInvitation(
        project.id,
        inviteEmail
      );
      success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail("");
    } catch (err) {
      showError(err.response?.data?.message || "Error al enviar invitación");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (project) {
        // Actualizar proyecto existente
        await projectsAPI.update(project.id, formData);
      } else {
        // Crear nuevo proyecto
        await projectsAPI.create(formData);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Error al guardar el proyecto");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    { value: "bg-indigo-500", label: "Indigo", hex: "#6366f1" },
    { value: "bg-blue-500", label: "Azul", hex: "#3b82f6" },
    { value: "bg-cyan-500", label: "Cian", hex: "#06b6d4" },
    { value: "bg-teal-500", label: "Turquesa", hex: "#14b8a6" },
    { value: "bg-green-500", label: "Verde", hex: "#22c55e" },
    { value: "bg-lime-500", label: "Lima", hex: "#84cc16" },
    { value: "bg-yellow-500", label: "Amarillo", hex: "#eab308" },
    { value: "bg-orange-500", label: "Naranja", hex: "#f97316" },
    { value: "bg-red-500", label: "Rojo", hex: "#ef4444" },
    { value: "bg-pink-500", label: "Rosa", hex: "#ec4899" },
    { value: "bg-purple-500", label: "Morado", hex: "#a855f7" },
    { value: "bg-violet-500", label: "Violeta", hex: "#8b5cf6" },
    { value: "bg-slate-500", label: "Gris", hex: "#64748b" },
    { value: "bg-rose-500", label: "Rosa fuerte", hex: "#f43f5e" },
    { value: "bg-amber-500", label: "Ámbar", hex: "#f59e0b" },
    { value: "bg-emerald-500", label: "Esmeralda", hex: "#10b981" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? "Editar Proyecto" : "Nuevo Proyecto"}
      size='md'
    >
      {initializing ? (
        <div className='flex flex-col items-center justify-center py-12'>
          <Loader2 className='w-10 h-10 text-brand-600 animate-spin mb-4' />
          <p className='text-gray-600 dark:text-night-300 font-medium'>Cargando datos...</p>
          <p className='text-gray-400 dark:text-night-500 text-sm mt-1'>Preparando el formulario</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* Nombre del proyecto */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              Nombre del Proyecto *
            </label>
            <div className='relative'>
              <FolderKanban className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500 transition-colors' />
              <input
                type='text'
                name='name'
                value={formData.name}
                onChange={handleChange}
                className='w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all duration-200 hover:border-gray-400'
                placeholder='Ej: Rediseño de Website'
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              Descripción
            </label>
            <textarea
              name='description'
              value={formData.description}
              onChange={handleChange}
              rows='3'
              className='w-full px-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none transition-all duration-200 hover:border-gray-400'
              placeholder='Describe brevemente el proyecto...'
            ></textarea>
          </div>

          {/* Fecha de vencimiento y Prioridad */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
                Fecha de Vencimiento
              </label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500 transition-colors' />
                <input
                  type='date'
                  name='due_date'
                  value={formData.due_date}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all duration-200 hover:border-gray-400'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
                Prioridad
              </label>
              <div className='relative'>
                <Flag className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500 transition-colors' />
                <select
                  name='priority'
                  value={formData.priority}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none transition-all duration-200 hover:border-gray-400'
                >
                  <option value='low'>Baja</option>
                  <option value='medium'>Media</option>
                  <option value='high'>Alta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Color del proyecto */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              Color del Proyecto
            </label>
            <div className='grid grid-cols-8 gap-2'>
              {colors.map((color) => (
                <button
                  key={color.value}
                  type='button'
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, color: color.value }))
                  }
                  className={`w-8 h-8 rounded-lg ${color.value} ${
                    formData.color === color.value
                      ? "ring-2 ring-offset-2 ring-brand-600 scale-110"
                      : "hover:scale-110 opacity-80 hover:opacity-100"
                  } transition-all duration-200`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Equipo asignado */}
          {teams.length > 0 && (
            <div className='border-2 border-brand-200 dark:border-brand-800 rounded-lg p-4 bg-brand-50/50'>
              <label className='block text-sm font-medium text-gray-900 dark:text-night-50 mb-2'>
                <UsersIcon className='inline w-4 h-4 mr-1' />
                Opción 1: Asignar Equipo Completo
              </label>
              <select
                name='team_id'
                value={formData.team_id}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none transition-all duration-200 hover:border-gray-400 bg-white dark:bg-night-900'
              >
                <option value=''>Sin equipo asignado</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.member_count || 0} miembros)
                  </option>
                ))}
              </select>
              <p className='text-xs text-gray-600 dark:text-night-300 mt-2'>
                ✓ Todos los miembros del equipo tendrán acceso automáticamente
              </p>
              {formData.team_id && (
                <p className='text-xs text-brand-600 mt-1 font-medium'>
                  📌 Equipo seleccionado - Los usuarios individuales se
                  ignorarán
                </p>
              )}
            </div>
          )}

          {/* Separador visual */}
          {teams.length > 0 && (
            <div className='flex items-center gap-3 my-4'>
              <div className='flex-1 border-t border-gray-300 dark:border-night-600'></div>
              <span className='text-sm text-gray-500 dark:text-night-400 font-medium'>O</span>
              <div className='flex-1 border-t border-gray-300 dark:border-night-600'></div>
            </div>
          )}

          {/* Miembros del equipo */}
          <div
            className={`${
              formData.team_id
                ? "opacity-50 pointer-events-none"
                : "border-2 border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50/50"
            }`}
          >
            <label className='block text-sm font-medium text-gray-900 dark:text-night-50 mb-2'>
              <UserCheck className='inline w-4 h-4 mr-1' />
              {teams.length > 0
                ? "Opción 2: Invitar Colaboradores"
                : "Colaboradores del Proyecto"}
            </label>

            {formData.team_id ? (
              <p className='text-sm text-gray-500 dark:text-night-400 py-4 text-center border border-gray-300 dark:border-night-600 rounded-lg bg-gray-50 dark:bg-night-800'>
                Has seleccionado un equipo. Todos los miembros tendrán acceso
                automáticamente.
              </p>
            ) : (
              <>
                {/* Mostrar colaboradores actuales del proyecto */}
                {project && project.users && project.users.length > 0 && (
                  <div className='mb-3'>
                    <p className='text-xs text-gray-700 dark:text-night-300 mb-2 font-medium'>
                      Colaboradores actuales:
                    </p>
                    <div className='max-h-32 overflow-y-auto border border-gray-300 dark:border-night-600 rounded-lg p-2 space-y-1 bg-white dark:bg-night-900'>
                      {project.users.map((user) => (
                        <div
                          key={user.id}
                          className='flex items-center gap-2 p-2 bg-gray-50 dark:bg-night-800 rounded'
                        >
                          <UserAvatar user={user} size='sm' />
                          <div className='flex-1'>
                            <p className='text-sm font-medium text-gray-900 dark:text-night-50'>
                              {user.name}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-night-400'>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invitar por email */}
                {project ? (
                  <div className='border border-gray-300 dark:border-night-600 rounded-lg p-3 bg-white dark:bg-night-900'>
                    <p className='text-xs text-gray-700 dark:text-night-300 mb-2 font-medium'>
                      Invitar nuevo colaborador por email:
                    </p>
                    <div className='flex gap-2'>
                      <div className='flex-1 relative'>
                        <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-night-500' />
                        <input
                          type='email'
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSendInvite(e);
                            }
                          }}
                          placeholder='email@ejemplo.com'
                          className='w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-night-600 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent'
                        />
                      </div>
                      <button
                        type='button'
                        onClick={handleSendInvite}
                        disabled={sendingInvite || !inviteEmail}
                        className='px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        <Send className='w-4 h-4' />
                      </button>
                    </div>
                    <p className='text-xs text-gray-500 dark:text-night-400 mt-1'>
                      El usuario recibirá una invitación que debe aceptar
                    </p>
                  </div>
                ) : (
                  <p className='text-sm text-gray-500 dark:text-night-400 text-center py-4 border border-gray-200 dark:border-night-700 rounded-lg bg-white dark:bg-night-900'>
                    Una vez creado el proyecto, podrás invitar colaboradores por
                    email. Ellos deberán aceptar la invitación para unirse.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className='p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm'>
              {error}
            </div>
          )}

          {/* Botones */}
          <div className='flex gap-3 pt-4'>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading
                ? "Guardando..."
                : project
                ? "Guardar Cambios"
                : "Crear Proyecto"}
            </button>
            <button
              type='button'
              onClick={onClose}
              disabled={loading}
              className='px-6 py-3 border border-gray-300 dark:border-night-600 text-gray-700 dark:text-night-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-night-800 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ProjectModal;

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Select from "react-select";
import { selectStyles } from "../../utils/reactSelectStyles";
import {
  Ticket,
  MessageSquare,
  Flag,
  Users,
  FolderKanban,
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MoreHorizontal,
  Loader2,
  Inbox,
  Info,
} from "lucide-react";
import { ticketsAPI, teamsAPI, projectsAPI } from "../../utils/api";

const TicketModal = ({
  isOpen,
  onClose,
  ticket = null,
  teamId = null,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "request",
    priority: "medium",
    team_id: "",
    project_id: "",
  });
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) {
        setInitializing(true);
        return;
      }

      try {
        setInitializing(true);
        setError(null);

        // 1. Cargar equipos y proyectos en paralelo
        const [teamsData, projectsData] = await Promise.all([
          teamsAPI.getAll(),
          projectsAPI.getAll(),
        ]);
        setTeams(teamsData);
        setProjects(projectsData);

        // 2. Establecer formData
        if (ticket) {
          setFormData({
            title: ticket.title || "",
            description: ticket.description || "",
            type: ticket.type || "request",
            priority: ticket.priority || "medium",
            team_id: ticket.team_id || teamId || "",
            project_id: ticket.project_id || "",
          });
        } else {
          setFormData({
            title: "",
            description: "",
            type: "request",
            priority: "medium",
            team_id: teamId || "",
            project_id: "",
          });
        }

        // TODO LISTO
        setInitializing(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setInitializing(false);
      }
    };

    initializeModal();
  }, [isOpen, ticket, teamId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Opciones para react-select de equipos
  const teamOptions = teams.map((team) => ({
    value: team.id,
    label: team.name,
    color: team.color,
    memberCount: team.members?.length || 0,
  }));

  // Opciones para react-select de proyectos
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
    color: project.color,
  }));

  const typeOptions = [
    {
      value: "request",
      label: "Solicitud",
      icon: MessageSquare,
      color: "text-blue-500 dark:text-blue-400",
    },
    { value: "bug", label: "Bug / Error", icon: Bug, color: "text-red-500 dark:text-red-400" },
    {
      value: "question",
      label: "Pregunta",
      icon: HelpCircle,
      color: "text-accent-500",
    },
    {
      value: "feature",
      label: "Nueva Funcionalidad",
      icon: Lightbulb,
      color: "text-yellow-500 dark:text-yellow-400",
    },
    {
      value: "support",
      label: "Soporte",
      icon: Headphones,
      color: "text-green-500 dark:text-green-400",
    },
    {
      value: "other",
      label: "Otro",
      icon: MoreHorizontal,
      color: "text-gray-500 dark:text-night-400",
    },
  ];

  const priorityOptions = [
    { value: "low", label: "Baja", color: "bg-gray-100 dark:bg-night-800 text-gray-600 dark:text-night-300" },
    { value: "medium", label: "Media", color: "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400" },
    { value: "high", label: "Alta", color: "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" },
    { value: "urgent", label: "Urgente", color: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSend = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        team_id: formData.team_id || null,
        project_id: formData.project_id || null,
      };

      if (ticket) {
        await ticketsAPI.update(ticket.id, dataToSend);
      } else {
        await ticketsAPI.create(dataToSend);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Error al guardar el ticket");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ticket ? "Editar Ticket" : "Nuevo Ticket"}
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
          {/* Título */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              Título del Ticket *
            </label>
            <div className='relative'>
              <Ticket className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500' />
              <input
                type='text'
                name='title'
                value={formData.title}
                onChange={handleChange}
                className='w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all duration-200 hover:border-gray-400'
                placeholder='Ej: Solicitud de acceso al sistema'
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              Descripción *
            </label>
            <textarea
              name='description'
              value={formData.description}
              onChange={handleChange}
              rows='4'
              className='w-full px-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none transition-all duration-200 hover:border-gray-400'
              placeholder='Describe detalladamente tu solicitud o problema...'
              required
            ></textarea>
          </div>

          {/* Tipo y Prioridad */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
                Tipo *
              </label>
              <select
                name='type'
                value={formData.type}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none appearance-none'
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
                Prioridad *
              </label>
              <select
                name='priority'
                value={formData.priority}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none appearance-none'
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Asignar a Equipo */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              <div className='flex items-center gap-2'>
                <Users className='w-4 h-4' />
                Asignar a equipo *
              </div>
            </label>

            <Select
              options={teamOptions}
              value={
                teamOptions.find((opt) => opt.value === formData.team_id) ||
                null
              }
              onChange={(selected) =>
                setFormData((prev) => ({
                  ...prev,
                  team_id: selected?.value || "",
                }))
              }
              placeholder='Seleccionar equipo...'
              isClearable
              styles={selectStyles}
              noOptionsMessage={() => "No hay equipos disponibles"}
              formatOptionLabel={(option) => (
                <div className='flex items-center gap-2'>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      option.color || "bg-gray-400 dark:bg-night-500"
                    }`}
                  />
                  <span className='font-medium'>{option.label}</span>
                  {option.memberCount > 0 && (
                    <span className='text-xs text-gray-400 dark:text-night-500'>
                      ({option.memberCount} miembros)
                    </span>
                  )}
                </div>
              )}
            />

            {/* Info sobre el buzón */}
            <div className='mt-2 p-3 bg-accent-50 dark:bg-accent-900/20 rounded-lg flex items-start gap-2'>
              <Inbox className='w-4 h-4 text-accent-600 mt-0.5 shrink-0' />
              <p className='text-xs text-accent-700 dark:text-accent-300'>
                El ticket llegará al <strong>buzón del equipo</strong>. Los
                miembros del equipo podrán tomarlo o el líder podrá asignarlo a
                alguien específico.
              </p>
            </div>
          </div>

          {/* Proyecto relacionado (opcional) */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              Proyecto relacionado{" "}
              <span className='text-gray-400 dark:text-night-500'>(opcional)</span>
            </label>
            <Select
              options={projectOptions}
              value={
                projectOptions.find(
                  (opt) => opt.value === formData.project_id
                ) || null
              }
              onChange={(selected) =>
                setFormData((prev) => ({
                  ...prev,
                  project_id: selected?.value || "",
                }))
              }
              placeholder='Seleccionar proyecto...'
              isClearable
              styles={selectStyles}
              noOptionsMessage={() => "No hay proyectos disponibles"}
            />
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
              className='flex-1 bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {loading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  Guardando...
                </>
              ) : ticket ? (
                "Guardar Cambios"
              ) : (
                "Crear Ticket"
              )}
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

export default TicketModal;

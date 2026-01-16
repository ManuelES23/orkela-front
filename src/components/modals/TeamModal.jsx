import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Select from "react-select";
import UserAvatar from "../ui/UserAvatar";
import {
  Users,
  Type,
  FileText,
  Palette,
  X,
  Check,
  Mail,
  Plus,
  UserPlus,
  Loader2,
} from "lucide-react";
import { teamsAPI, teamInvitationsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";

const TeamModal = ({ isOpen, onClose, team = null, onSuccess }) => {
  const { success, error: showError, info } = useNotification();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "bg-indigo-500",
  });
  // IDs de usuarios a invitar (ya no se agregan directamente)
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [inviteEmails, setInviteEmails] = useState([""]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const colorOptions = [
    { value: "bg-indigo-500", label: "Indigo", color: "#6366f1" },
    { value: "bg-blue-500", label: "Azul", color: "#3b82f6" },
    { value: "bg-cyan-500", label: "Cian", color: "#06b6d4" },
    { value: "bg-teal-500", label: "Turquesa", color: "#14b8a6" },
    { value: "bg-green-500", label: "Verde", color: "#22c55e" },
    { value: "bg-lime-500", label: "Lima", color: "#84cc16" },
    { value: "bg-emerald-500", label: "Esmeralda", color: "#10b981" },
    { value: "bg-yellow-500", label: "Amarillo", color: "#eab308" },
    { value: "bg-amber-500", label: "Ámbar", color: "#f59e0b" },
    { value: "bg-orange-500", label: "Naranja", color: "#f97316" },
    { value: "bg-red-500", label: "Rojo", color: "#ef4444" },
    { value: "bg-rose-500", label: "Rosa fuerte", color: "#f43f5e" },
    { value: "bg-pink-500", label: "Rosa", color: "#ec4899" },
    { value: "bg-purple-500", label: "Púrpura", color: "#a855f7" },
    { value: "bg-violet-500", label: "Violeta", color: "#8b5cf6" },
    { value: "bg-slate-500", label: "Gris", color: "#64748b" },
  ];

  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) {
        setInitializing(true);
        return;
      }

      try {
        setInitializing(true);
        setError(null);

        // 1. Cargar miembros disponibles
        const data = await teamsAPI.getAvailableMembers(team?.id);
        setAvailableMembers(data);

        // 2. Establecer formData
        setFormData({
          name: team?.name || "",
          description: team?.description || "",
          color: team?.color || "bg-indigo-500",
        });
        setSelectedUserIds([]);
        setInviteEmails([""]);

        // TODO LISTO
        setInitializing(false);
      } catch (err) {
        console.error("Error loading available members:", err);
        setAvailableMembers([]);
        setInitializing(false);
      }
    };

    initializeModal();
  }, [isOpen, team]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Opciones para react-select
  const memberOptions = availableMembers.map((member) => ({
    value: member.id,
    label: member.name,
    email: member.email,
    avatar: member.avatar,
  }));

  // Valores seleccionados para react-select
  const selectedMembers = memberOptions.filter((option) =>
    selectedUserIds.includes(option.value)
  );

  // Manejar cambio en react-select
  const handleMemberChange = (selectedOptions) => {
    setSelectedUserIds(
      selectedOptions ? selectedOptions.map((opt) => opt.value) : []
    );
  };

  // Componente personalizado para las opciones
  const CustomOption = ({ data, innerProps, isSelected }) => (
    <div
      {...innerProps}
      className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
        isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
      }`}
    >
      <div className='flex items-center gap-2'>
        <UserAvatar
          user={{ name: data.label, avatar: data.avatar }}
          size='sm'
        />
        <div>
          <div className='text-sm font-medium text-gray-900'>{data.label}</div>
          <div className='text-xs text-gray-500'>{data.email}</div>
        </div>
      </div>
      {isSelected && <Check className='w-4 h-4 text-indigo-600' />}
    </div>
  );

  // Componente personalizado para los tags seleccionados
  const CustomMultiValue = ({ data, removeProps }) => (
    <div className='flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm m-0.5'>
      <UserAvatar user={{ name: data.label, avatar: data.avatar }} size='xs' />
      <span>{data.label}</span>
      <button
        {...removeProps}
        type='button'
        className='ml-1 hover:bg-indigo-200 rounded-full p-0.5'
      >
        <X className='w-3 h-3' />
      </button>
    </div>
  );

  // Estilos personalizados para react-select
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(99, 102, 241, 0.2)" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#6366f1" : "#9ca3af",
      },
      padding: "4px",
      borderRadius: "0.5rem",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.5rem",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      zIndex: 20,
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "transparent",
      margin: 0,
    }),
    multiValueRemove: (base) => ({
      ...base,
      display: "none",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
    }),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let teamId;

      if (team) {
        // Actualizar equipo existente (solo nombre, descripción, color)
        await teamsAPI.update(team.id, formData);
        teamId = team.id;
        success("Equipo actualizado exitosamente");
      } else {
        // Crear nuevo equipo (sin user_ids - los miembros se agregan por invitación)
        const newTeam = await teamsAPI.create(formData);
        teamId = newTeam.id;
      }

      // Enviar invitaciones a usuarios seleccionados (por ID)
      let userInviteCount = 0;
      if (selectedUserIds.length > 0) {
        // Obtener emails de los usuarios seleccionados
        const selectedUsers = availableMembers.filter((m) =>
          selectedUserIds.includes(m.id)
        );

        const userInvitePromises = selectedUsers.map((user) =>
          teamInvitationsAPI
            .sendInvitation(teamId, user.email)
            .then(() => ({ success: true, email: user.email }))
            .catch((err) => {
              console.error(`Error invitando a ${user.email}:`, err);
              return { success: false, email: user.email };
            })
        );

        const userResults = await Promise.all(userInvitePromises);
        userInviteCount = userResults.filter((r) => r.success).length;
      }

      // Enviar invitaciones por email (usuarios externos)
      let emailInviteCount = 0;
      const validEmails = inviteEmails.filter((email) => email.trim() !== "");
      if (validEmails.length > 0) {
        const emailInvitePromises = validEmails.map((email) =>
          teamInvitationsAPI
            .sendInvitation(teamId, email.trim())
            .then(() => ({ success: true, email }))
            .catch((err) => {
              console.error(`Error invitando a ${email}:`, err);
              return { success: false, email };
            })
        );

        const emailResults = await Promise.all(emailInvitePromises);
        emailInviteCount = emailResults.filter((r) => r.success).length;
      }

      // Mostrar mensaje de éxito con resumen de invitaciones
      const totalInvites = userInviteCount + emailInviteCount;
      const totalAttempts = selectedUserIds.length + validEmails.length;

      if (!team) {
        if (totalInvites > 0) {
          success(
            `Equipo creado. ${totalInvites} invitación${
              totalInvites > 1 ? "es" : ""
            } enviada${totalInvites > 1 ? "s" : ""}`
          );
        } else if (totalAttempts > 0) {
          showError(
            "Equipo creado, pero hubo errores al enviar las invitaciones"
          );
        } else {
          success("Equipo creado exitosamente");
        }
      } else if (totalInvites > 0) {
        info(
          `${totalInvites} invitación${totalInvites > 1 ? "es" : ""} enviada${
            totalInvites > 1 ? "s" : ""
          }`
        );
      }

      // Esperar a que onSuccess termine (puede ser async para refrescar datos)
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (err) {
      setError(err.message || "Error al guardar el equipo");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={team ? "Editar Equipo" : "Nuevo Equipo"}
      size='md'
    >
      {initializing ? (
        <div className='flex flex-col items-center justify-center py-12'>
          <Loader2 className='w-10 h-10 text-indigo-600 animate-spin mb-4' />
          <p className='text-gray-600 font-medium'>Cargando datos...</p>
          <p className='text-gray-400 text-sm mt-1'>Preparando el formulario</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* Nombre del equipo */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Nombre del Equipo *
            </label>
            <div className='relative'>
              <Type className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors' />
              <input
                type='text'
                name='name'
                value={formData.name}
                onChange={handleChange}
                className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-400'
                placeholder='Ej: Equipo de Desarrollo'
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Descripción
            </label>
            <div className='relative'>
              <FileText className='absolute left-3 top-3 w-5 h-5 text-gray-400' />
              <textarea
                name='description'
                value={formData.description}
                onChange={handleChange}
                rows='3'
                className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all duration-200 hover:border-gray-400'
                placeholder='Describe el propósito de este equipo...'
              ></textarea>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Color del Equipo
            </label>
            <div className='grid grid-cols-8 gap-2'>
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type='button'
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      color: colorOption.value,
                    }))
                  }
                  className={`w-8 h-8 rounded-lg ${
                    colorOption.value
                  } transition-all duration-200 ${
                    formData.color === colorOption.value
                      ? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
                      : "hover:scale-110 opacity-80 hover:opacity-100"
                  }`}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>

          {/* Invitar miembros (por selección) */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              <UserPlus className='inline w-4 h-4 mr-1' />
              Invitar Miembros
            </label>
            <Select
              isMulti
              options={memberOptions}
              value={selectedMembers}
              onChange={handleMemberChange}
              isLoading={loadingMembers}
              placeholder='Buscar y seleccionar usuarios a invitar...'
              noOptionsMessage={() =>
                "No hay usuarios disponibles para invitar"
              }
              components={{
                Option: CustomOption,
                MultiValue: CustomMultiValue,
              }}
              styles={selectStyles}
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              isClearable={false}
            />
            <p className='mt-1 text-xs text-gray-500'>
              Los usuarios seleccionados recibirán una invitación para unirse al
              equipo
            </p>
          </div>

          {/* Invitaciones por email - Solo al crear */}
          {!team && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <Mail className='inline w-4 h-4 mr-1' />
                Invitar por Email (Opcional)
              </label>
              <div className='space-y-2'>
                {inviteEmails.map((email, index) => (
                  <div key={index} className='flex gap-2'>
                    <input
                      type='email'
                      value={email}
                      onChange={(e) => {
                        const newEmails = [...inviteEmails];
                        newEmails[index] = e.target.value;
                        setInviteEmails(newEmails);
                      }}
                      className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                      placeholder='email@ejemplo.com'
                    />
                    {inviteEmails.length > 1 && (
                      <button
                        type='button'
                        onClick={() =>
                          setInviteEmails(
                            inviteEmails.filter((_, i) => i !== index)
                          )
                        }
                        className='px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                      >
                        <X className='w-5 h-5' />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type='button'
                  onClick={() => setInviteEmails([...inviteEmails, ""])}
                  className='flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors'
                >
                  <Plus className='w-4 h-4' />
                  Agregar otro email
                </button>
              </div>
              <p className='mt-1 text-xs text-gray-500'>
                Las invitaciones se enviarán automáticamente al crear el equipo
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className='p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm'>
              {error}
            </div>
          )}

          {/* Botones */}
          <div className='flex gap-3 pt-4'>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading
                ? "Guardando..."
                : team
                ? "Guardar Cambios"
                : "Crear Equipo"}
            </button>
            <button
              type='button'
              onClick={onClose}
              disabled={loading}
              className='px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default TeamModal;

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Select from "react-select";
import UserAvatar from "../ui/UserAvatar";
import {
  CheckSquare,
  Calendar,
  Flag,
  FolderKanban,
  Users,
  X,
  Check,
  Loader2,
  ListTodo,
  Tag,
} from "lucide-react";
import { tasksAPI, projectsAPI } from "../../utils/api";
import TaskChecklist from "../tasks/TaskChecklist";
import TagSelector from "../tasks/TagSelector";

const TaskModal = ({
  isOpen,
  onClose,
  task = null,
  projectId = null,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "",
    priority: "medium",
    start_date: "",
    due_date: "",
    status: "pending",
    is_urgent: false,
    assigned_user_ids: [],
    tag_ids: [],
  });
  const [checklistItems, setChecklistItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Efecto principal para inicializar el modal
  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) {
        // Limpiar completamente cuando se cierra el modal
        setChecklistItems([]);
        setProjectMembers([]);
        setFormData({
          title: "",
          description: "",
          project_id: "",
          priority: "medium",
          start_date: "",
          due_date: "",
          status: "pending",
          is_urgent: false,
          assigned_user_ids: [],
          tag_ids: [],
        });
        setInitializing(true);
        return;
      }

      try {
        // Mostrar estado de carga
        setInitializing(true);
        setError(null);

        // 1. Cargar proyectos
        const projectsData = await projectsAPI.getAll();
        setProjects(projectsData);

        // 2. Determinar el project_id a usar
        const targetProjectId = task?.project_id || projectId || "";

        // 3. Si hay un proyecto, cargar sus miembros
        let members = [];
        if (targetProjectId) {
          try {
            members = await tasksAPI.getProjectMembers(targetProjectId);
            setProjectMembers(members);
          } catch (err) {
            console.error("Error loading project members:", err);
            setProjectMembers([]);
          }
        }

        // 4. Establecer el formData con todos los datos
        setFormData({
          title: task?.title || "",
          description: task?.description || "",
          project_id: targetProjectId,
          priority: task?.priority || "medium",
          start_date: task?.start_date ? task.start_date.split("T")[0] : "",
          due_date: task?.due_date ? task.due_date.split("T")[0] : "",
          status: task?.status || "pending",
          is_urgent: task?.is_urgent || false,
          assigned_user_ids: task?.assigned_users?.map((u) => u.id) || [],
          tag_ids: task?.tags?.map((t) => t.id) || [],
        });

        // 5. Establecer checklist items
        setChecklistItems(task?.checklist_items || []);

        // TODO LISTO - Permitir renderizado
        setInitializing(false);
      } catch (err) {
        console.error("Error initializing modal:", err);
        setError("Error al cargar los datos del formulario");
        setInitializing(false);
      }
    };

    initializeModal();
  }, [isOpen, task, projectId]);

  // Cargar miembros del proyecto cuando cambie el proyecto seleccionado MANUALMENTE
  useEffect(() => {
    // Solo ejecutar si el modal está abierto y no estamos en la inicialización
    if (!isOpen) return;

    const fetchProjectMembers = async () => {
      if (!formData.project_id) {
        setProjectMembers([]);
        return;
      }

      try {
        setLoadingMembers(true);
        const members = await tasksAPI.getProjectMembers(formData.project_id);
        setProjectMembers(members);
      } catch (err) {
        console.error("Error loading project members:", err);
        setProjectMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };

    // Solo cargar si el project_id cambió después de la inicialización
    if (formData.project_id && isOpen) {
      fetchProjectMembers();
    }
  }, [formData.project_id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Si cambia el proyecto, limpiar usuarios asignados y tags
    if (name === "project_id") {
      setFormData((prev) => ({
        ...prev,
        project_id: value,
        assigned_user_ids: [],
        tag_ids: [],
      }));
    }
  };

  // Opciones para react-select
  const memberOptions = projectMembers.map((member) => ({
    value: member.id,
    label: member.name,
    email: member.email,
    avatar: member.avatar,
    isOwner: member.is_owner,
  }));

  // Valores seleccionados para react-select
  const selectedMembers = memberOptions.filter((option) =>
    formData.assigned_user_ids.includes(option.value),
  );

  // Manejar cambio en react-select
  const handleMemberChange = (selectedOptions) => {
    setFormData((prev) => ({
      ...prev,
      assigned_user_ids: selectedOptions
        ? selectedOptions.map((opt) => opt.value)
        : [],
    }));
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
          <div className='text-sm font-medium text-gray-900'>
            {data.label}
            {data.isOwner && (
              <span className='ml-1 text-xs text-indigo-500'>(Dueño)</span>
            )}
          </div>
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
      {data.isOwner && <span className='text-xs text-indigo-500'>(Dueño)</span>}
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

  const getSelectedUsers = () => {
    return projectMembers.filter((member) =>
      formData.assigned_user_ids.includes(member.id),
    );
  };

  // Callback para cuando cambian los items del checklist en modo local (crear tarea)
  const handleChecklistChange = (items) => {
    setChecklistItems(items);
  };

  // Callback para cuando cambian los tags seleccionados
  const handleTagsChange = (tagIds) => {
    setFormData((prev) => ({
      ...prev,
      tag_ids: tagIds,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSend = {
        ...formData,
        due_date: formData.due_date || null,
      };

      if (task) {
        // Editar tarea existente (checklist se maneja por API directamente)
        await tasksAPI.update(task.id, dataToSend);
      } else {
        // Crear tarea nueva - incluir checklist items si hay
        if (checklistItems.length > 0) {
          dataToSend.checklist_items = checklistItems.map((item, index) => ({
            text: item.text,
            is_completed: item.is_completed,
            order: index,
          }));
        }
        await tasksAPI.create(dataToSend);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Error al guardar la tarea");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? "Editar Tarea" : "Nueva Tarea"}
      size='md'
    >
      {/* Loading State - Mostrar mientras se cargan los datos */}
      {initializing ? (
        <div className='flex flex-col items-center justify-center py-12'>
          <Loader2 className='w-10 h-10 text-indigo-600 animate-spin mb-4' />
          <p className='text-gray-600 font-medium'>Cargando datos...</p>
          <p className='text-gray-400 text-sm mt-1'>Preparando el formulario</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* Título de la tarea */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Título de la Tarea *
            </label>
            <div className='relative'>
              <CheckSquare className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors' />
              <input
                type='text'
                name='title'
                value={formData.title}
                onChange={handleChange}
                className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-400'
                placeholder='Ej: Diseñar mockups para landing'
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Descripción
            </label>
            <textarea
              name='description'
              value={formData.description}
              onChange={handleChange}
              rows='3'
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all duration-200 hover:border-gray-400'
              placeholder='Describe la tarea en detalle...'
            ></textarea>
          </div>

          {/* Lista de tareas (Checklist) - Opcional */}
          <div className='border border-gray-200 rounded-lg p-4 bg-gray-50/50'>
            <TaskChecklist
              taskId={task?.id}
              items={checklistItems}
              onLocalChange={handleChecklistChange}
            />
          </div>

          {/* Proyecto y Estado */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Proyecto *
              </label>
              <div className='relative'>
                <FolderKanban className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <select
                  name='project_id'
                  value={formData.project_id}
                  onChange={handleChange}
                  disabled={!!projectId}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed'
                  required
                >
                  <option value=''>Seleccionar proyecto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Estado
              </label>
              <select
                name='status'
                value={formData.status}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none'
              >
                <option value='pending'>Pendiente</option>
                <option value='in_progress'>En progreso</option>
                <option value='completed'>Completada</option>
                <option value='cancelled'>Cancelada</option>
              </select>
            </div>
          </div>

          {/* Asignar Usuarios */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Asignar a
            </label>
            <Select
              isMulti
              options={memberOptions}
              value={selectedMembers}
              onChange={handleMemberChange}
              isDisabled={!formData.project_id}
              isLoading={loadingMembers}
              placeholder={
                !formData.project_id
                  ? "Selecciona un proyecto primero"
                  : loadingMembers
                    ? "Cargando miembros..."
                    : "Buscar y seleccionar miembros..."
              }
              noOptionsMessage={() => "No hay miembros en este proyecto"}
              components={{
                Option: CustomOption,
                MultiValue: CustomMultiValue,
              }}
              styles={selectStyles}
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              isClearable={false}
            />
          </div>

          {/* Etiquetas */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              <div className='flex items-center gap-2'>
                <Tag className='w-4 h-4' />
                Etiquetas
              </div>
            </label>
            <TagSelector
              projectId={formData.project_id}
              selectedTagIds={formData.tag_ids}
              onChange={handleTagsChange}
              showManageHint={true}
            />
          </div>

          {/* Prioridad y Fecha */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Prioridad
              </label>
              <div className='relative'>
                <Flag className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <select
                  name='priority'
                  value={formData.priority}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none'
                >
                  <option value='low'>Baja</option>
                  <option value='medium'>Media</option>
                  <option value='high'>Alta</option>
                  <option value='urgent'>Urgente</option>
                </select>
              </div>
            </div>

            <div className='flex items-center pt-7'>
              <input
                type='checkbox'
                name='is_urgent'
                checked={formData.is_urgent}
                onChange={handleChange}
                className='w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
              />
              <label className='ml-2 text-sm font-medium text-gray-700'>
                Marcar como urgente
              </label>
            </div>
          </div>

          {/* Fechas de inicio y vencimiento */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Fecha de Inicio
              </label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='date'
                  name='start_date'
                  value={formData.start_date}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Fecha de Vencimiento
              </label>
              <div className='relative'>
                <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='date'
                  name='due_date'
                  value={formData.due_date}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
                />
              </div>
            </div>
          </div>

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
                : task
                  ? "Guardar Cambios"
                  : "Crear Tarea"}
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

export default TaskModal;

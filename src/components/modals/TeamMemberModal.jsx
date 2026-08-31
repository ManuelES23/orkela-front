import { useState } from "react";
import Modal from "../ui/Modal";
import { Mail, User, Briefcase, Building2 } from "lucide-react";
import { teamMembersAPI } from "../../utils/api";

const TeamMemberModal = ({ isOpen, onClose, member = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: member?.name || "",
    email: member?.email || "",
    role: member?.role || "",
    department: member?.department || "",
    avatar: member?.avatar || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (member) {
        await teamMembersAPI.update(member.id, formData);
      } else {
        await teamMembersAPI.create(formData);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Error al guardar el miembro del equipo");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    "Project Manager",
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "UI/UX Designer",
    "QA Engineer",
    "DevOps Engineer",
    "Product Owner",
    "Scrum Master",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member ? "Editar Miembro" : "Invitar Miembro"}
      size='md'
    >
      <form onSubmit={handleSubmit} className='space-y-5'>
        {/* Nombre completo */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
            Nombre Completo *
          </label>
          <div className='relative'>
            <User className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500 transition-colors' />
            <input
              type='text'
              name='name'
              value={formData.name}
              onChange={handleChange}
              className='w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all duration-200 hover:border-gray-400'
              placeholder='Ej: Juan Pérez'
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
            Correo Electrónico *
          </label>
          <div className='relative'>
            <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500' />
            <input
              type='email'
              name='email'
              value={formData.email}
              onChange={handleChange}
              className='w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
              placeholder='juan.perez@orkela.com'
              required
            />
          </div>
        </div>

        {/* Rol y Departamento */}
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              Rol *
            </label>
            <div className='relative'>
              <Briefcase className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500' />
              <input
                type='text'
                name='role'
                value={formData.role}
                onChange={handleChange}
                className='w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
                placeholder='Ej: Frontend Developer'
                required
              />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-2'>
              Departamento
            </label>
            <div className='relative'>
              <Building2 className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-night-500' />
              <input
                type='text'
                name='department'
                value={formData.department}
                onChange={handleChange}
                className='w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
                placeholder='Ej: Desarrollo'
              />
            </div>
          </div>
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
              : member
              ? "Guardar Cambios"
              : "Invitar Miembro"}
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
    </Modal>
  );
};

export default TeamMemberModal;

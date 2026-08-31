import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useNotification } from "../../context/NotificationContext";
import { Loader2, Star, Layers, Eye, GanttChartSquare, FileDown } from "lucide-react";
import { adminPlansAPI } from "../../utils/adminAPI";

const emptyForm = (scope) => ({
  name: "",
  scope,
  is_default: false,
  is_custom: false,
  is_active: true,
  members_limit: 0,
  projects_limit: 0,
  teams_limit: 0,
  storage_mb_limit: 0,
  collaborators_per_project_limit: 0,
  monthly_price: 0,
  annual_price: 0,
  display_order: 0,
  features: { gantt: false, exports: false },
});

const PlanModal = ({ isOpen, onClose, plan = null, defaultScope = "organization", onSuccess }) => {
  const { success, error: showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm(defaultScope));

  useEffect(() => {
    if (!isOpen) return;
    setFormData(
      plan
        ? {
            name: plan.name,
            scope: plan.scope,
            is_default: plan.is_default,
            is_custom: plan.is_custom,
            is_active: plan.is_active,
            members_limit: plan.members_limit,
            projects_limit: plan.projects_limit,
            teams_limit: plan.teams_limit,
            storage_mb_limit: plan.storage_mb_limit,
            collaborators_per_project_limit: plan.collaborators_per_project_limit ?? 0,
            monthly_price: plan.monthly_price,
            annual_price: plan.annual_price,
            display_order: plan.display_order,
            features: plan.features ?? { gantt: false, exports: false },
          }
        : emptyForm(defaultScope),
    );
  }, [isOpen, plan, defaultScope]);

  const isPersonal = formData.scope === "personal";

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFeatureChange = (key) => (e) => {
    setFormData((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: e.target.checked },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      members_limit: Number(formData.members_limit),
      projects_limit: Number(formData.projects_limit),
      teams_limit: Number(formData.teams_limit),
      storage_mb_limit: Number(formData.storage_mb_limit),
      collaborators_per_project_limit: Number(formData.collaborators_per_project_limit),
      monthly_price: Number(formData.monthly_price),
      annual_price: Number(formData.annual_price),
      display_order: Number(formData.display_order),
    };

    try {
      if (plan) {
        // scope es inmutable después de creado — no se envía en update.
        const { scope: _scope, ...updatePayload } = payload;
        await adminPlansAPI.update(plan.id, updatePayload);
        success("Plan actualizado exitosamente");
      } else {
        await adminPlansAPI.create(payload);
        success("Plan creado exitosamente");
      }
      onSuccess?.();
    } catch (err) {
      showError(err.message || "Error al guardar el plan");
    } finally {
      setLoading(false);
    }
  };

  const limitField = (name, label) => (
    <div>
      <label className='block text-sm font-medium text-gray-700 mb-2'>
        {label} <span className='text-gray-400'>(-1 = ilimitado)</span>
      </label>
      <input
        type='number'
        name={name}
        value={formData[name]}
        onChange={handleChange}
        min={-1}
        required
        className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? "Editar plan" : `Nuevo plan ${isPersonal ? "personal" : "empresarial"}`}
      size='md'
    >
      <form onSubmit={handleSubmit} className='space-y-5'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Nombre del plan *
          </label>
          <input
            type='text'
            name='name'
            value={formData.name}
            onChange={handleChange}
            required
            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
            placeholder='Ej: Business'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Orden de visualización
          </label>
          <input
            type='number'
            name='display_order'
            value={formData.display_order}
            onChange={handleChange}
            min={0}
            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
          />
        </div>

        {isPersonal ? (
          <div className='grid grid-cols-2 gap-4'>
            {limitField("projects_limit", "Proyectos")}
            {limitField("collaborators_per_project_limit", "Colaboradores por proyecto")}
            {limitField("storage_mb_limit", "Almacenamiento (MB)")}
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4'>
            {limitField("members_limit", "Miembros")}
            {limitField("projects_limit", "Proyectos")}
            {limitField("teams_limit", "Equipos")}
            {limitField("storage_mb_limit", "Almacenamiento (MB)")}
          </div>
        )}

        {isPersonal && (
          <div className='space-y-3 border-t border-gray-100 pt-4'>
            <label className='flex items-center gap-2 text-sm text-gray-700'>
              <input
                type='checkbox'
                checked={formData.features.gantt}
                onChange={handleFeatureChange("gantt")}
                className='rounded border-gray-300 text-brand-600 focus:ring-brand-500'
              />
              <GanttChartSquare className='w-4 h-4 text-gray-400' />
              Incluye Gantt
            </label>
            <label className='flex items-center gap-2 text-sm text-gray-700'>
              <input
                type='checkbox'
                checked={formData.features.exports}
                onChange={handleFeatureChange("exports")}
                className='rounded border-gray-300 text-brand-600 focus:ring-brand-500'
              />
              <FileDown className='w-4 h-4 text-gray-400' />
              Incluye exportar reportes
            </label>
          </div>
        )}

        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Precio mensual (MXN)
            </label>
            <input
              type='number'
              name='monthly_price'
              value={formData.monthly_price}
              onChange={handleChange}
              min={0}
              step='0.01'
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Precio anual (MXN)
            </label>
            <input
              type='number'
              name='annual_price'
              value={formData.annual_price}
              onChange={handleChange}
              min={0}
              step='0.01'
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
            />
          </div>
        </div>

        <div className='space-y-3 border-t border-gray-100 pt-4'>
          <label className='flex items-center gap-2 text-sm text-gray-700'>
            <input
              type='checkbox'
              name='is_active'
              checked={formData.is_active}
              onChange={handleChange}
              className='rounded border-gray-300 text-brand-600 focus:ring-brand-500'
            />
            <Eye className='w-4 h-4 text-gray-400' />
            Activo (visible para asignar)
          </label>
          {!isPersonal && (
            <label className='flex items-center gap-2 text-sm text-gray-700'>
              <input
                type='checkbox'
                name='is_custom'
                checked={formData.is_custom}
                onChange={handleChange}
                className='rounded border-gray-300 text-brand-600 focus:ring-brand-500'
              />
              <Layers className='w-4 h-4 text-gray-400' />
              Personalizable por organización (tipo Enterprise)
            </label>
          )}
          <label className='flex items-center gap-2 text-sm text-gray-700'>
            <input
              type='checkbox'
              name='is_default'
              checked={formData.is_default}
              onChange={handleChange}
              className='rounded border-gray-300 text-brand-600 focus:ring-brand-500'
            />
            <Star className='w-4 h-4 text-gray-400' />
            Plan default {isPersonal ? "(usuarios nuevos y downgrades caen acá)" : "(nuevas organizaciones y downgrades caen acá)"}
          </label>
        </div>

        <div className='flex gap-3 pt-4'>
          <button
            type='submit'
            disabled={loading}
            className='flex-1 bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {loading ? (
              <>
                <Loader2 className='w-5 h-5 animate-spin' />
                Guardando...
              </>
            ) : plan ? (
              "Guardar cambios"
            ) : (
              "Crear plan"
            )}
          </button>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50'
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PlanModal;

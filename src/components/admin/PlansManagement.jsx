import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Users, Loader2 } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import { adminPlansAPI } from "../../utils/adminAPI";
import PlanModal from "../modals/PlanModal";
import ConfirmModal from "../ui/ConfirmModal";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);

const PlansManagement = () => {
  const { success, error: showError } = useNotification();
  const [scope, setScope] = useState("organization");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, plan: null });
  const [deleting, setDeleting] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminPlansAPI.getAll(scope);
      setPlans(data);
    } catch (err) {
      showError("No se pudieron cargar los planes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [showError, scope]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleCreate = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    loadPlans();
  };

  const handleDeleteClick = (plan) => {
    setConfirmModal({ isOpen: true, plan });
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal.plan) return;
    try {
      setDeleting(true);
      await adminPlansAPI.delete(confirmModal.plan.id);
      success("Plan eliminado exitosamente");
      setConfirmModal({ isOpen: false, plan: null });
      loadPlans();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el plan");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600'></div>
      </div>
    );
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div className='inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50'>
          <button
            type='button'
            onClick={() => setScope("organization")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              scope === "organization" ? "bg-white shadow-sm text-brand-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Empresariales
          </button>
          <button
            type='button'
            onClick={() => setScope("personal")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              scope === "personal" ? "bg-white shadow-sm text-brand-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Personales
          </button>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreate}
          className='flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition font-medium'
        >
          <Plus className='w-4 h-4' />
          Nuevo plan
        </motion.button>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border rounded-xl p-4 ${plan.is_default ? "border-brand-300" : "border-gray-200"}`}
          >
            <div className='flex items-start justify-between mb-2'>
              <p className='font-semibold text-gray-900'>{plan.name}</p>
              {!plan.is_active && (
                <span className='text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full'>
                  Inactivo
                </span>
              )}
            </div>
            <div className='flex gap-1.5 mb-3'>
              {plan.is_default && (
                <span className='text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full'>
                  Default
                </span>
              )}
              {plan.is_custom && (
                <span className='text-xs px-2 py-0.5 bg-accent-100 text-accent-700 rounded-full'>
                  Custom
                </span>
              )}
            </div>
            <p className='text-2xl font-semibold text-gray-900'>
              {formatPrice(plan.monthly_price)}
            </p>
            <p className='text-xs text-gray-500 mb-3'>
              por mes · o {formatPrice(plan.annual_price)}/año
            </p>
            {plan.scope === "personal" ? (
              <div className='flex items-center gap-1.5 text-xs text-gray-500 mb-4'>
                <Users className='w-3.5 h-3.5' />
                {plan.projects_limit === -1 ? "Ilimitados" : plan.projects_limit} proyectos
              </div>
            ) : (
              <div className='flex items-center gap-1.5 text-xs text-gray-500 mb-4'>
                <Users className='w-3.5 h-3.5' />
                {plan.members_limit === -1 ? "Ilimitado" : plan.members_limit} miembros
              </div>
            )}
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => handleEdit(plan)}
                className='flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
              >
                <Edit className='w-3.5 h-3.5' />
                Editar
              </button>
              <button
                type='button'
                onClick={() => handleDeleteClick(plan)}
                className='px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors'
                title='Eliminar plan'
              >
                <Trash2 className='w-3.5 h-3.5' />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={selectedPlan}
        defaultScope={scope}
        onSuccess={handleModalSuccess}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, plan: null })}
        onConfirm={handleConfirmDelete}
        title='Eliminar plan'
        message={`¿Eliminar el plan "${confirmModal.plan?.name}"? Esta acción no se puede deshacer.`}
        loading={deleting}
      />
    </div>
  );
};

export default PlansManagement;

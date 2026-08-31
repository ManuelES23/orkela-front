import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, GanttChartSquare, FileDown, AlertTriangle } from "lucide-react";
import { plansAPI } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);

const limitLabelMap = {
  projects_limit: "proyectos",
  collaborators_per_project_limit: "colaboradores por proyecto",
  storage_mb_limit: "MB de almacenamiento",
};

const MyPlanSection = () => {
  const { user, refreshUser } = useAuth();
  const { success, error: showError } = useNotification();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switchingPlanId, setSwitchingPlanId] = useState(null);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const data = await plansAPI.getPersonalCatalog();
      setPlans(data);
    } catch (err) {
      showError("No se pudo cargar el catálogo de planes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleSwitch = async (planId) => {
    try {
      setSwitchingPlanId(planId);
      await plansAPI.switchMyPlan(planId);
      await refreshUser();
      success("Tu plan se actualizó exitosamente");
    } catch (err) {
      // request() en api.js lanza APIError con el body completo en
      // err.data (ver src/utils/api.js:4-13) — ahí viene blocked_by.
      const blockedBy = err.data?.blocked_by;
      if (blockedBy?.length) {
        const detail = blockedBy
          .map((b) => `${b.current ?? b.current_mb} / ${b.allowed} ${limitLabelMap[b.limit] ?? b.limit}`)
          .join(", ");
        showError(`No puedes cambiar a ese plan: excedes ${detail}`);
      } else {
        showError(err.message || "No se pudo cambiar de plan");
      }
      console.error(err);
    } finally {
      setSwitchingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600'></div>
      </div>
    );
  }

  return (
    <div className='bg-white dark:bg-night-900 rounded-2xl border border-gray-100 dark:border-night-700 shadow-sm p-6'>
      <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-night-500 mb-4'>
        Mi plan
      </h3>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {plans.map((plan) => {
          const isCurrent = user?.plan?.id === plan.id;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border rounded-xl p-4 ${isCurrent ? "border-brand-400 ring-1 ring-brand-200" : "border-gray-200 dark:border-night-700"}`}
            >
              <div className='flex items-start justify-between mb-2'>
                <p className='font-semibold text-gray-900 dark:text-night-50'>{plan.name}</p>
                {isCurrent && (
                  <span className='flex items-center gap-1 text-xs px-2 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full'>
                    <Check className='w-3 h-3' /> Actual
                  </span>
                )}
              </div>
              <p className='text-2xl font-semibold text-gray-900 dark:text-night-50'>
                {formatPrice(plan.monthly_price)}
              </p>
              <p className='text-xs text-gray-500 dark:text-night-400 mb-3'>
                por mes · o {formatPrice(plan.annual_price)}/año
              </p>
              <p className='text-xs text-gray-500 dark:text-night-400 mb-1'>
                {plan.projects_limit === -1 ? "Proyectos ilimitados" : `${plan.projects_limit} proyectos`}
              </p>
              <p className='text-xs text-gray-500 dark:text-night-400 mb-3'>
                {plan.collaborators_per_project_limit === -1
                  ? "Colaboradores ilimitados por proyecto"
                  : `${plan.collaborators_per_project_limit} colaboradores por proyecto`}
              </p>
              <div className='flex gap-2 mb-4'>
                {plan.features?.gantt && (
                  <span className='flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-night-800 text-gray-600 dark:text-night-300 rounded-full'>
                    <GanttChartSquare className='w-3 h-3' /> Gantt
                  </span>
                )}
                {plan.features?.exports && (
                  <span className='flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-night-800 text-gray-600 dark:text-night-300 rounded-full'>
                    <FileDown className='w-3 h-3' /> Exports
                  </span>
                )}
              </div>
              <button
                type='button'
                disabled={isCurrent || switchingPlanId === plan.id}
                onClick={() => handleSwitch(plan.id)}
                className='w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-night-700 rounded-lg hover:bg-gray-50 dark:hover:bg-night-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {switchingPlanId === plan.id ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : isCurrent ? (
                  "Plan actual"
                ) : (
                  "Cambiar a este plan"
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
      <p className='flex items-start gap-1.5 text-xs text-gray-400 dark:text-night-500 mt-4'>
        <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-0.5' />
        El cambio de plan es inmediato y sin cargo por ahora. Si tu uso actual excede los límites del plan elegido, el cambio se bloqueará hasta que reduzcas lo necesario.
      </p>
    </div>
  );
};

export default MyPlanSection;

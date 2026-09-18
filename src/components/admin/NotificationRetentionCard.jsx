import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, CheckCircle, Loader2 } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import settingsAPI from "../../utils/settingsAPI";
import { useNotification } from "../../context/NotificationContext";
import { motionTokens } from "../animations/variants";

const optionLabel = (days) => (days === 0 ? "Siempre" : `${days} días`);

const optionHint = (days) =>
  days === 0
    ? "No se borra nada"
    : days === 7
      ? "Historial corto"
      : days === 30
        ? "Recomendado"
        : "Historial largo";

/**
 * Retención global del historial de notificaciones (solo superadmin):
 * cuántos días se guardan antes de que la purga diaria las borre.
 */
const NotificationRetentionCard = () => {
  const { success, error: showError } = useNotification();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState([7, 30, 90, 0]);
  const [saved, setSaved] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    settingsAPI
      .getNotificationSettings()
      .then((response) => {
        if (!active) return;
        setOptions(response.data?.options || [7, 30, 90, 0]);
        setSaved(response.data?.retention_days ?? 30);
        setSelected(response.data?.retention_days ?? 30);
      })
      .catch((err) => {
        console.error(err);
        if (active) showError("No se pudo cargar la retención de notificaciones");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [showError]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await settingsAPI.updateNotificationSettings(selected);
      const days = response.data?.retention_days ?? selected;
      setSaved(days);
      setSelected(days);
      success(response.message || "Retención de notificaciones actualizada");
    } catch (err) {
      console.error(err);
      showError(err.message || "No se pudo guardar la retención");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className='mt-6'>
      <Card.Header>
        <div className='flex items-center gap-2'>
          <Bell className='w-5 h-5 text-brand-600 dark:text-brand-400' />
          <h3 className='text-lg font-semibold text-gray-900 dark:text-night-50'>
            Historial de notificaciones
          </h3>
        </div>
        <p className='text-sm text-gray-600 dark:text-night-300 mt-1'>
          Cuánto tiempo se guardan las notificaciones de todos los usuarios. Una tarea diaria borra
          las que superen el plazo.
        </p>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-16 rounded-xl' />
            ))}
          </div>
        ) : (
          <div role='radiogroup' aria-label='Retención' className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            {options.map((days) => {
              const active = selected === days;
              return (
                <button
                  key={days}
                  type='button'
                  role='radio'
                  aria-checked={active}
                  aria-label={optionLabel(days)}
                  onClick={() => setSelected(days)}
                  className={`relative text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active
                      ? "border-brand-400 dark:border-brand-500/60"
                      : "border-gray-200 dark:border-night-700 hover:border-brand-200 dark:hover:border-brand-500/30 bg-white dark:bg-night-900"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId='retention-option'
                      transition={reduceMotion ? { duration: 0 } : motionTokens.springSnappy}
                      className='absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-300 dark:ring-brand-500/40'
                    />
                  )}
                  <span className='relative block text-sm font-semibold text-gray-900 dark:text-night-50'>
                    {optionLabel(days)}
                  </span>
                  <span className='relative block text-xs text-gray-500 dark:text-night-400 mt-0.5'>
                    {optionHint(days)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className='flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-5 mt-5 border-t border-gray-100 dark:border-night-700'>
          <p className='text-xs text-gray-500 dark:text-night-400'>
            {saved === null
              ? ""
              : saved === 0
                ? "Ahora: se guardan siempre."
                : `Ahora: se guardan ${saved} días.`}
          </p>
          <Button onClick={handleSave} disabled={loading || saving || selected === saved}>
            {saving ? <Loader2 className='w-4 h-4 animate-spin' /> : <CheckCircle className='w-4 h-4' />}
            {saving ? "Guardando..." : "Guardar retención"}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default NotificationRetentionCard;

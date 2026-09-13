import { motion, useReducedMotion } from "framer-motion";
import { Check, X, Clock, Loader2 } from "lucide-react";
import { motionTokens } from "../animations/variants";

const LABELS = {
  recovery: ["Correo", "Revisa tu bandeja", "Nueva contraseña"],
  signup: ["Crea tu cuenta", "Confirma tu correo", "¡Listo!"],
};

const RING_ACTIVE =
  "bg-white dark:bg-night-900 border-2 border-brand-500 text-brand-600 dark:text-brand-300 ring-4 ring-brand-100 dark:ring-brand-900/40";

const DOT_STYLES = {
  done: "text-white bg-linear-to-br from-brand-600 to-accent-600",
  active: RING_ACTIVE,
  loading: RING_ACTIVE,
  error:
    "bg-white dark:bg-night-900 border-2 border-red-500 text-red-600 dark:text-red-400 ring-4 ring-red-100 dark:ring-red-950/40",
  warning:
    "bg-white dark:bg-night-900 border-2 border-amber-500 text-amber-600 dark:text-amber-400 ring-4 ring-amber-100 dark:ring-amber-950/40",
  todo: "bg-white dark:bg-night-900 border-2 border-gray-200 dark:border-night-700 text-gray-400 dark:text-night-500",
};

const LABEL_STYLES = {
  done: "text-gray-900 dark:text-night-50",
  active: "text-gray-900 dark:text-night-50",
  loading: "text-gray-900 dark:text-night-50",
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  todo: "text-gray-500 dark:text-night-400",
};

// Pasos anteriores al actual: done; el actual: status; los siguientes: todo.
const stepState = (step, current, status) => {
  if (step < current) return "done";
  if (step === current) return status;
  return "todo";
};

const DotContent = ({ state, step }) => {
  if (state === "done") return <Check className='w-[18px] h-[18px]' strokeWidth={3} aria-hidden='true' />;
  if (state === "error") return <X className='w-[18px] h-[18px]' strokeWidth={3} aria-hidden='true' />;
  if (state === "warning") return <Clock className='w-4 h-4' strokeWidth={2.5} aria-hidden='true' />;
  if (state === "loading") return <Loader2 className='w-4 h-4 animate-spin' strokeWidth={2.5} aria-hidden='true' />;
  return step;
};

/**
 * Indicador de progreso de 3 pasos para los flujos de recuperación de
 * contraseña y confirmación de correo. El paso se deriva de la ruta/estado
 * de la página que lo usa (sin store global).
 */
const AuthStepper = ({ flow, current, status = "active" }) => {
  const prefersReducedMotion = useReducedMotion();
  const labels = LABELS[flow] ?? LABELS.recovery;
  // Relleno hasta el último paso completo: el actual cuenta si su estado es done.
  const lastDone = status === "done" ? current : current - 1;
  const fill = Math.min(Math.max(lastDone, 0), labels.length - 1) / (labels.length - 1);

  return (
    <div className='relative mb-[26px]'>
      {/* Track entre los centros del primer y último punto */}
      <div
        aria-hidden='true'
        className='absolute top-[17px] left-[16.66%] right-[16.66%] h-[3px] rounded-full bg-gray-200 dark:bg-night-700'
      >
        <motion.div
          className='absolute inset-0 rounded-full origin-left bg-linear-to-r from-brand-600 to-accent-600'
          data-fill={fill}
          initial={false}
          animate={{ scaleX: fill }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: motionTokens.ease, delay: 0.1 }
          }
        />
      </div>

      <ol aria-label='Progreso' className='relative grid grid-cols-3'>
        {labels.map((label, index) => {
          const step = index + 1;
          const state = stepState(step, current, status);
          const isCurrent = step === current && state !== "done";

          return (
            <li
              key={label}
              data-state={state}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex flex-col items-center gap-1.5 text-center font-semibold text-[11.5px] sm:text-[13px] ${LABEL_STYLES[state]}`}
            >
              <span
                className={`relative grid place-items-center w-9 h-9 rounded-full text-sm font-extrabold transition-colors ${DOT_STYLES[state]}`}
              >
                {isCurrent && !prefersReducedMotion && (
                  <motion.span
                    key={`${current}-${status}`}
                    aria-hidden='true'
                    className='absolute inset-0 rounded-full pointer-events-none'
                    initial={{ boxShadow: "0 0 0 0 rgba(139,92,246,0.45)" }}
                    animate={{ boxShadow: "0 0 0 12px rgba(139,92,246,0)" }}
                    transition={{ duration: 1.8, ease: "easeOut", delay: 0.5, repeat: 1 }}
                  />
                )}
                <DotContent state={state} step={step} />
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default AuthStepper;

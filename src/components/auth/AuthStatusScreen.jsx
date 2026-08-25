import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { motionTokens, statusIconVariants, shakeVariants } from "../animations/variants";

const TONE_STYLES = {
  loading: "bg-brand-100 text-brand-600",
  info: "bg-brand-100 text-brand-600",
  success: "bg-green-100 text-green-600",
  error: "bg-red-100 text-red-600",
};

/**
 * Card centrada y animada para los flujos de estado de invitación
 * (checking / redirecting / accepting / success / error). Reemplaza los
 * bloques de JSX casi idénticos repetidos en las 3 pantallas de Accept*.
 */
export const AuthStatusCard = ({ statusKey, maxWidth = "max-w-md", children }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(140%_100%_at_50%_0%,var(--color-brand-50)_0%,#f7f5fb_55%)]'>
      <AnimatePresence mode='wait'>
        <motion.div
          key={statusKey}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
          className={`w-full ${maxWidth} bg-white rounded-2xl shadow-xl p-8 text-center`}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/**
 * Pantalla de estado con icono circular animado + título + contenido libre.
 * tone: "loading" | "info" | "success" | "error"
 */
const AuthStatusScreen = ({
  statusKey,
  tone = "info",
  icon: Icon,
  spin = false,
  title,
  maxWidth,
  children,
}) => {
  const isError = tone === "error";

  return (
    <AuthStatusCard statusKey={statusKey} maxWidth={maxWidth}>
      <motion.div
        variants={isError ? shakeVariants : statusIconVariants}
        initial={isError ? "initial" : "hidden"}
        animate={isError ? "shake" : "visible"}
        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${TONE_STYLES[tone]}`}
      >
        {Icon && <Icon className={`w-8 h-8 ${spin ? "animate-spin" : ""}`} />}
      </motion.div>

      <h2 className='text-xl font-bold text-gray-900 mb-2'>{title}</h2>

      {children}
    </AuthStatusCard>
  );
};

export default AuthStatusScreen;

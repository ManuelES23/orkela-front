import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "../animations/variants";

/**
 * Pantalla de carga de marca ("Pulso"): reemplaza los spinners grises
 * sueltos de App.jsx (Suspense), PrivateRoute, AdminRoute y
 * OrganizationRoute por un único componente animado con framer-motion,
 * usando los mismos tokens que AuthStatusScreen.
 *
 * fullScreen=true  -> ocupa min-h-screen (guards de ruta, PageLoader).
 * fullScreen=false -> se ajusta al contenedor (ej. dentro de <Layout>).
 */
const LoadingScreen = ({ message = "Cargando...", fullScreen = true, className = "" }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={`${fullScreen ? "min-h-screen" : "py-24"} flex items-center justify-center bg-[radial-gradient(120%_100%_at_50%_38%,var(--color-brand-100)_0%,transparent_60%)] dark:bg-[radial-gradient(120%_100%_at_50%_38%,var(--color-brand-900)_0%,transparent_60%)] ${className}`}
    >
      <div className='flex flex-col items-center gap-4'>
        <div className='relative w-12 h-12'>
          {!prefersReducedMotion && (
            <motion.span
              aria-hidden='true'
              className='absolute inset-0 rounded-2xl bg-brand-600'
              animate={{ scale: [1, 1.9], opacity: [0.45, 0] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <motion.div
            className='absolute inset-0 rounded-2xl bg-brand-600'
            animate={
              prefersReducedMotion
                ? {}
                : { scale: [0.94, 1.04, 0.94], opacity: [0.9, 1, 0.9] }
            }
            transition={{ duration: 1.9, repeat: Infinity, ease: motionTokens.ease }}
          />
        </div>

        <div className='w-28 h-[3px] rounded-full bg-brand-100 dark:bg-night-800 overflow-hidden'>
          <motion.div
            className='h-full w-[46%] rounded-full bg-brand-600'
            animate={prefersReducedMotion ? {} : { x: ["-120%", "260%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: motionTokens.duration.base }}
            className='text-xs font-medium tracking-wide text-gray-400 dark:text-night-500'
          >
            {message}
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;

import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "../../animations/variants";

/** Encabezado de la sección con el medidor "N de 3 formas de entrar activas". */
const AccessMeter = ({ active, total }) => {
  const reduce = useReducedMotion();

  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-2 mb-5'>
      <div className='flex-1 min-w-0'>
        <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-night-500'>
          Acceso y seguridad
        </h3>
        <p className='font-bold text-gray-900 dark:text-night-50' aria-live='polite'>
          {active} de {total} formas de entrar activas
        </p>
      </div>
      <div className='flex w-40 gap-1' aria-hidden='true'>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className='relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-night-700'>
            <motion.span
              className='absolute inset-0 origin-left rounded-full bg-linear-to-r from-brand-600 to-accent-600'
              initial={false}
              animate={{ scaleX: i < active ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : motionTokens.springSoft}
            />
          </span>
        ))}
      </div>
    </div>
  );
};

export default AccessMeter;

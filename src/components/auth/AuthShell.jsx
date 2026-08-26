import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "../animations/variants";

/**
 * Layout compartido para las pantallas de autenticación (Login / Register).
 *
 * Desktop: panel izquierdo de marca (isotipo real + gradiente + mensaje de
 * valor) + panel derecho con el formulario, ambos a escala generosa.
 * Mobile: colapsa a una sola columna con un header de marca compacto.
 */
const AuthShell = ({ formHeader, heading, description, badge, children }) => {
  const prefersReducedMotion = useReducedMotion();

  const squareFloat = (delta, duration) =>
    prefersReducedMotion
      ? {}
      : {
          animate: { y: [0, delta, 0] },
          transition: { duration, repeat: Infinity, ease: "easeInOut" },
        };

  return (
    <div className='min-h-screen w-full flex bg-[#f7f5fb]'>
      {/* Panel de marca (oculto en mobile) */}
      <div className='hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between p-14 xl:p-16 text-white bg-[radial-gradient(130%_120%_at_15%_8%,var(--color-brand-500)_0%,var(--color-brand-700)_45%,#3b1670_100%)]'>
        {/* Confetti de cuadrados: eco del isotipo */}
        <div className='absolute inset-0 pointer-events-none' aria-hidden='true'>
          <motion.span
            {...squareFloat(-10, 7)}
            className='absolute top-[8%] right-[12%] w-16 h-16 rounded-2xl rotate-12 bg-linear-to-br from-accent-300 to-brand-400 opacity-55'
          />
          <motion.span
            {...squareFloat(8, 9)}
            className='absolute top-[19%] right-[6%] w-9 h-9 rounded-lg bg-linear-to-br from-accent-300 to-brand-400 opacity-40'
          />
          <motion.span
            {...squareFloat(-6, 8)}
            className='absolute top-[4%] right-[27%] w-6 h-6 rounded-md bg-accent-300 opacity-35'
          />
          <motion.span
            {...squareFloat(7, 10)}
            className='absolute top-[15%] right-[22%] w-11 h-11 rounded-xl -rotate-6 bg-accent-300 opacity-30'
          />
        </div>

        <div className='relative z-10 flex items-center gap-3'>
          <img
            src='/img/isotipo_orkela.png'
            alt='Orkela'
            className='w-14 h-14 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]'
          />
          <span className='font-extrabold text-2xl tracking-tight'>Orkela</span>
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.slow, ease: motionTokens.ease }}
          className='relative z-10 max-w-md'
        >
          {badge && (
            <span className='inline-flex items-center gap-2 bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-full px-4 py-2 text-sm font-semibold mb-7'>
              <span className='w-2 h-2 rounded-full bg-emerald-300' />
              {badge}
            </span>
          )}
          <h1 className='text-5xl xl:text-[3.4rem] font-extrabold leading-[1.05] mb-5 tracking-tight text-balance'>
            {heading}
          </h1>
          <p className='text-white/80 text-lg leading-relaxed'>{description}</p>
        </motion.div>

        <p className='relative z-10 text-white/50 text-sm'>
          © {new Date().getFullYear()} Orkela Projects
        </p>
      </div>

      {/* Panel de formulario */}
      <div className='flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14'>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: motionTokens.duration.slow, ease: motionTokens.ease }}
          className='w-full max-w-lg'
        >
          <div className='lg:hidden flex items-center gap-2.5 mb-9 justify-center'>
            <img src='/img/isotipo_orkela.png' alt='Orkela' className='w-10 h-10 object-contain' />
            <span className='font-extrabold text-2xl text-brand-700'>Orkela</span>
          </div>

          {formHeader}
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthShell;

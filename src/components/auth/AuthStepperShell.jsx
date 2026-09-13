import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import AuthStepper from "./AuthStepper";
import { motionTokens } from "../animations/variants";

const TOTAL_STEPS = 3;

/**
 * Layout de los flujos por pasos (recuperar contraseña / confirmar correo):
 * banda de marca arriba + tarjeta flotante con el stepper, un caption de
 * paso y el panel de la pantalla (children).
 */
const AuthStepperShell = ({ flow, current, status = "active", backLink, caption, children }) => {
  const prefersReducedMotion = useReducedMotion();

  const squareFloat = (delta, duration) =>
    prefersReducedMotion
      ? {}
      : {
          animate: { y: [0, delta, 0] },
          transition: { duration, repeat: Infinity, ease: "easeInOut" },
        };

  const allDone = current >= TOTAL_STEPS && status === "done";
  const captionText = caption ?? (allDone ? "¡Completado!" : `Paso ${current} de ${TOTAL_STEPS}`);

  return (
    <div className='relative min-h-screen w-full bg-[#f7f5fb] dark:bg-night-950'>
      {/* Banda de marca */}
      <div className='absolute inset-x-0 top-0 h-[170px] sm:h-[210px] overflow-hidden text-white bg-[radial-gradient(130%_160%_at_15%_0%,var(--color-brand-500)_0%,var(--color-brand-700)_50%,#3b1670_100%)] px-5 py-5 sm:px-10 sm:py-6 flex items-start justify-between'>
        {/* Confetti de cuadrados: eco del isotipo (mismo que AuthShell) */}
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

        <div className='relative z-10 flex items-center gap-2.5'>
          <img
            src='/img/isotipo_orkela.png'
            alt=''
            aria-hidden='true'
            className='w-10 h-10 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]'
          />
          <span className='text-[22px] font-extrabold tracking-tight'>Orkela</span>
        </div>

        {backLink && (
          <Link
            to={backLink.to}
            className='relative z-10 mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-white/85 hover:text-white transition-colors'
          >
            <ArrowLeft className='w-4 h-4' aria-hidden='true' />
            {backLink.label}
          </Link>
        )}
      </div>

      {/* Tarjeta flotante (padding en el contenedor para evitar colapso de márgenes con la banda) */}
      <main className='relative z-10 pt-[78px] sm:pt-[84px] pb-12'>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
          className='mx-auto w-[580px] max-w-[calc(100%-32px)] bg-white dark:bg-night-900 rounded-[20px] shadow-[0_24px_48px_-16px_rgba(59,22,112,0.35)] dark:shadow-[0_0_0_1px_var(--color-night-700),0_24px_48px_-16px_rgba(0,0,0,0.6)] px-5 pt-[22px] pb-6 sm:px-9 sm:pt-7 sm:pb-8'
        >
          <AuthStepper flow={flow} current={current} status={status} />
          <p className='mb-1 text-[13px] font-bold text-gray-500 dark:text-night-400'>{captionText}</p>
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default AuthStepperShell;

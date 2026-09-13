import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mail, Send, AlertCircle, MailCheck, ArrowLeft, RotateCw } from "lucide-react";
import AuthStepperShell from "../components/auth/AuthStepperShell";
import AuthInput from "../components/auth/AuthInput";
import Button from "../components/ui/Button";
import { motionTokens } from "../components/animations/variants";
import { authAPI } from "../utils/api";
import { getRetryMessage } from "../utils/authErrors";

const RESEND_COOLDOWN = 60;

// Avance/retroceso de paso dentro de la página: slide horizontal según dirección.
const panelVariants = {
  enter: ({ dir, offset }) => ({ x: offset * dir, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: motionTokens.duration.base, ease: motionTokens.ease } },
  exit: ({ dir, offset }) => ({
    x: -offset * dir,
    opacity: 0,
    transition: { duration: motionTokens.duration.fast, ease: motionTokens.ease },
  }),
};

const headingClass =
  "text-[22px] sm:text-[26px] leading-tight font-extrabold tracking-tight text-gray-900 dark:text-night-50 mb-2";
const bodyClass = "text-gray-500 dark:text-night-400 mb-[22px]";

const ErrorAlert = ({ children }) => (
  <div
    role='alert'
    className='p-3 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start gap-2'
  >
    <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' aria-hidden='true' />
    {children}
  </div>
);

const ForgotPassword = () => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [email, setEmail] = useState(location.state?.email || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [dir, setDir] = useState(1);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!sent || cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sent, cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setDir(1);
      setCooldown(RESEND_COOLDOWN);
      setSent(true);
    } catch (err) {
      setError(getRetryMessage(err) || "No pudimos procesar la solicitud. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResending(true);

    try {
      await authAPI.forgotPassword(email);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(getRetryMessage(err) || "No pudimos reenviar el correo. Inténtalo de nuevo.");
    } finally {
      setResending(false);
    }
  };

  const handleUseOtherEmail = () => {
    setError("");
    setCooldown(0);
    setDir(-1);
    setSent(false);
  };

  const custom = { dir, offset: prefersReducedMotion ? 0 : 24 };

  return (
    <AuthStepperShell
      flow='recovery'
      current={sent ? 2 : 1}
      status='active'
      backLink={{ to: "/login", label: "Volver a iniciar sesión" }}
    >
      <AnimatePresence mode='wait' initial={false} custom={custom}>
        {sent ? (
          <motion.div key='sent' custom={custom} variants={panelVariants} initial='enter' animate='center' exit='exit'>
            <div className='flex items-start gap-4 mb-1.5'>
              <div className='grid place-items-center shrink-0 w-[52px] h-[52px] rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300'>
                <MailCheck className='w-[26px] h-[26px]' aria-hidden='true' />
              </div>
              <div>
                <h1 className={headingClass}>Revisa tu bandeja</h1>
                <p role='status' className={bodyClass}>
                  Si existe una cuenta con <strong className='text-gray-900 dark:text-night-50'>{email}</strong>, te
                  enviamos un enlace para restablecer tu contraseña. El enlace vence en 60 minutos.
                </p>
              </div>
            </div>

            <div className='space-y-4'>
              {error && <ErrorAlert>{error}</ErrorAlert>}

              <button
                type='button'
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                aria-busy={resending}
                className='w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-night-700 bg-white dark:bg-night-900 px-6 py-3.5 text-base font-semibold text-gray-700 dark:text-night-200 transition-colors enabled:hover:border-brand-300 enabled:hover:text-brand-700 dark:enabled:hover:border-brand-700 dark:enabled:hover:text-brand-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer'
              >
                <RotateCw className={`w-[18px] h-[18px] ${resending ? "animate-spin" : ""}`} aria-hidden='true' />
                {cooldown > 0 ? (
                  <span>
                    Reenviar correo en <span className='tabular-nums font-bold'>{cooldown}</span>s
                  </span>
                ) : (
                  <span>Reenviar correo</span>
                )}
              </button>
            </div>

            <button
              type='button'
              onClick={handleUseOtherEmail}
              className='mx-auto mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 cursor-pointer'
            >
              <ArrowLeft className='w-3.5 h-3.5' aria-hidden='true' />
              Usar otro correo
            </button>
          </motion.div>
        ) : (
          <motion.div key='form' custom={custom} variants={panelVariants} initial='enter' animate='center' exit='exit'>
            <h1 className={headingClass}>Recupera tu contraseña</h1>
            <p className={bodyClass}>Ingresa el correo de tu cuenta y te enviaremos un enlace seguro.</p>

            <form onSubmit={handleSubmit} className='space-y-5' noValidate>
              {error && <ErrorAlert>{error}</ErrorAlert>}

              <AuthInput
                label='Correo electrónico'
                icon={Mail}
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='tu@empresa.com'
                autoComplete='email'
                required
              />

              <Button type='submit' variant='brand' size='xl' loading={loading} loadingText='Enviando...' className='w-full'>
                <Send className='w-5 h-5' aria-hidden='true' />
                Enviar enlace
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthStepperShell>
  );
};

export default ForgotPassword;

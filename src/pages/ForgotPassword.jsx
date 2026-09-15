import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mail, Send, MailCheck, ArrowLeft, ArrowRight } from "lucide-react";
import AuthStepperShell from "../components/auth/AuthStepperShell";
import AuthInput from "../components/auth/AuthInput";
import { AuthPanelHeading, AuthPanelTile, AuthAlert, AuthResendButton } from "../components/auth/AuthPanel";
import Button from "../components/ui/Button";
import { motionTokens } from "../components/animations/variants";
import { useHasChanged } from "../hooks/useHasChanged";
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

const bodyClass = "text-gray-500 dark:text-night-400 mb-[22px]";

const ForgotPassword = () => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [email, setEmail] = useState(location.state?.email || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  // El backend responde account_not_found cuando el correo no tiene cuenta:
  // en vez de un error genérico se ofrece ir a registrarse con ese correo.
  const [notFound, setNotFound] = useState(false);
  const [dir, setDir] = useState(1);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const focusHeading = useHasChanged(sent);

  useEffect(() => {
    if (!sent || cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sent, cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotFound(false);
    setLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setDir(1);
      setCooldown(RESEND_COOLDOWN);
      setSent(true);
    } catch (err) {
      if (err?.code === "account_not_found") {
        setNotFound(true);
      } else {
        setError(getRetryMessage(err) || "No pudimos procesar la solicitud. Inténtalo de nuevo.");
      }
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

  const custom = { dir, offset: 24 };
  // Con movimiento reducido no hay slide ni fade: el panel cambia sin animación.
  const slide = prefersReducedMotion
    ? {}
    : { custom, variants: panelVariants, initial: "enter", animate: "center", exit: "exit" };

  return (
    <AuthStepperShell
      flow='recovery'
      current={sent ? 2 : 1}
      status='active'
      backLink={{ to: "/login", label: "Volver a iniciar sesión" }}
    >
      <AnimatePresence mode='wait' initial={false} custom={custom}>
        {sent ? (
          <motion.div key='sent' {...slide}>
            <div className='flex items-start gap-4 mb-1.5'>
              <AuthPanelTile icon={MailCheck} />
              <div>
                <AuthPanelHeading focusOnMount={focusHeading}>Revisa tu bandeja</AuthPanelHeading>
                <p role='status' className={bodyClass}>
                  Te enviamos un enlace a <strong className='text-gray-900 dark:text-night-50'>{email}</strong> para
                  restablecer tu contraseña. El enlace vence en 60 minutos.
                </p>
              </div>
            </div>

            <div className='space-y-4'>
              {error && <AuthAlert tone='error'>{error}</AuthAlert>}
              <AuthResendButton cooldown={cooldown} sending={resending} onClick={handleResend} />
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
          <motion.div key='form' {...slide}>
            <AuthPanelHeading focusOnMount={focusHeading}>Recupera tu contraseña</AuthPanelHeading>
            <p className={bodyClass}>Ingresa el correo de tu cuenta y te enviaremos un enlace seguro.</p>

            <form onSubmit={handleSubmit} className='space-y-5' noValidate>
              {error && <AuthAlert tone='error'>{error}</AuthAlert>}

              <AnimatePresence initial={false}>
                {notFound && (
                  <motion.div
                    key='not-found'
                    initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
                    className='overflow-hidden'
                  >
                    <AuthAlert tone='warning'>
                      <strong className='font-semibold'>{email}</strong> no tiene una cuenta en Orkela.{" "}
                      <Link
                        to='/register'
                        state={{ email }}
                        className='inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline'
                      >
                        Crear una cuenta
                        <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
                      </Link>
                    </AuthAlert>
                  </motion.div>
                )}
              </AnimatePresence>

              <AuthInput
                label='Correo electrónico'
                icon={Mail}
                type='email'
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setNotFound(false);
                }}
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

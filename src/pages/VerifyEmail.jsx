import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, CheckCircle2, MailCheck, Clock, Link2Off, Hourglass, Mail, Send, LogIn } from "lucide-react";
import AuthStepperShell from "../components/auth/AuthStepperShell";
import AuthInput from "../components/auth/AuthInput";
import { AuthPanelHeading, AuthPanelTile, AuthAlert, AuthButtonLink } from "../components/auth/AuthPanel";
import Button from "../components/ui/Button";
import ContextSelectionModal from "../components/modals/ContextSelectionModal";
import { motionTokens } from "../components/animations/variants";
import { useAuth } from "../context/AuthContext";
import { usePostLoginRedirect } from "../hooks/usePostLoginRedirect";
import { useHasChanged } from "../hooks/useHasChanged";
import { authAPI } from "../utils/api";
import { getRetryMessage } from "../utils/authErrors";

const LINK_PARAMS = ["id", "hash", "expires", "signature"];

// Presentación por estado: paso del stepper + tile + textos.
const SCREENS = {
  verifying: {
    current: 2,
    status: "loading",
    tile: { icon: Loader2, tone: "brand", spin: true },
    title: "Confirmando tu correo...",
    body: "Esto solo toma un momento. No cierres esta página.",
  },
  success: {
    current: 3,
    status: "done",
    tile: { icon: CheckCircle2, tone: "success" },
    title: "¡Correo confirmado!",
    body: "Entrando a tu espacio de trabajo...",
  },
  already_verified: {
    current: 3,
    status: "done",
    caption: "Nada pendiente",
    tile: { icon: MailCheck, tone: "brand" },
    title: "Tu correo ya está confirmado",
    body: "No necesitas hacer nada más. Inicia sesión para continuar.",
  },
  link_expired: {
    current: 2,
    status: "warning",
    tile: { icon: Clock, tone: "warning" },
    title: "El enlace venció",
    body: "Por seguridad, los enlaces de confirmación vencen. Ingresa tu correo y te enviaremos uno nuevo.",
  },
  link_invalid: {
    current: 2,
    status: "error",
    tile: { icon: Link2Off, tone: "error" },
    title: "Enlace no válido",
    body: "El enlace está incompleto o ya se usó. Revisa que copiaste la dirección completa o pide un correo nuevo.",
  },
  // Distinto de link_invalid: el enlace en sí es válido, solo hay que
  // esperar el límite de intentos (auth-link) antes de reintentar.
  rate_limited: {
    current: 2,
    status: "warning",
    tile: { icon: Hourglass, tone: "warning" },
    title: "Demasiados intentos",
    body: null,
  },
};

// Cambio de estado sin avance de paso: solo fade.
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: motionTokens.duration.base, ease: motionTokens.ease },
};

const ResendForm = () => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tone: "success" | "error", text }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      await authAPI.resendVerification(email);
      setFeedback({ tone: "success", text: "Si la cuenta existe y falta confirmarla, te enviamos un nuevo correo." });
    } catch (err) {
      setFeedback({ tone: "error", text: getRetryMessage(err) || "No pudimos reenviar el correo. Inténtalo de nuevo." });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-5' noValidate>
      {feedback && <AuthAlert tone={feedback.tone}>{feedback.text}</AuthAlert>}
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
      <Button type='submit' variant='brand' size='xl' className='w-full' loading={sending} loadingText='Reenviando...'>
        <Send className='w-5 h-5' aria-hidden='true' />
        Reenviar correo
      </Button>
    </form>
  );
};

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { loginWithResult } = useAuth();
  const { completeLogin, showContextModal, pendingUser, contextLoading, handleContextSelect } =
    usePostLoginRedirect();

  const params = Object.fromEntries(LINK_PARAMS.map((key) => [key, searchParams.get(key)]));
  const hasAllParams = LINK_PARAMS.every((key) => params[key]);

  // verifying | success | already_verified | link_expired | link_invalid | rate_limited
  const [status, setStatus] = useState(hasAllParams ? "verifying" : "link_invalid");
  const [retryMessage, setRetryMessage] = useState("");
  const [retrying, setRetrying] = useState(false);
  const hasRequestedRef = useRef(false);
  const focusHeading = useHasChanged(status);
  const prefersReducedMotion = useReducedMotion();

  const attemptVerify = async () => {
    try {
      const data = await authAPI.verifyEmail(params);
      setStatus("success");
      completeLogin(loginWithResult(data));
    } catch (err) {
      if (err?.status === 429) {
        setRetryMessage(getRetryMessage(err));
        setStatus("rate_limited");
      } else {
        setStatus(["already_verified", "link_expired"].includes(err?.code) ? err.code : "link_invalid");
      }
    }
  };

  useEffect(() => {
    // El POST consume el enlace: evitar el doble efecto de StrictMode.
    if (!hasAllParams || hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    attemptVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    await attemptVerify();
    setRetrying(false);
  };

  const screen = SCREENS[status];

  return (
    <>
      <AuthStepperShell
        flow='signup'
        current={screen.current}
        status={screen.status}
        caption={screen.caption}
        backLink={{ to: "/login", label: "Volver a iniciar sesión" }}
      >
        <AnimatePresence mode='wait' initial={false}>
          <motion.div key={status} {...(prefersReducedMotion ? {} : fade)}>
            <div className='flex items-start gap-4 mb-[22px]'>
              <AuthPanelTile {...screen.tile} />
              <div>
                <AuthPanelHeading focusOnMount={focusHeading}>{screen.title}</AuthPanelHeading>
                <p
                  role={status === "verifying" || status === "success" ? "status" : undefined}
                  className='text-gray-500 dark:text-night-400'
                >
                  {status === "rate_limited" ? retryMessage : screen.body}
                </p>
              </div>
            </div>

            {status === "already_verified" && (
              <AuthButtonLink to='/login' icon={LogIn}>
                Iniciar sesión
              </AuthButtonLink>
            )}

            {status === "rate_limited" && (
              <Button
                type='button'
                variant='outline'
                size='xl'
                className='w-full'
                loading={retrying}
                loadingText='Reintentando...'
                onClick={handleRetry}
              >
                Reintentar
              </Button>
            )}

            {(status === "link_expired" || status === "link_invalid") && <ResendForm />}

            {status === "link_invalid" && (
              <p className='mt-4 text-center text-sm text-gray-500 dark:text-night-400'>
                ¿Ya confirmaste tu correo?{" "}
                <Link
                  to='/login'
                  className='font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
                >
                  Iniciar sesión
                </Link>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </AuthStepperShell>

      <ContextSelectionModal
        isOpen={showContextModal}
        user={pendingUser}
        onSelect={handleContextSelect}
        loading={contextLoading}
      />
    </>
  );
};

export default VerifyEmail;

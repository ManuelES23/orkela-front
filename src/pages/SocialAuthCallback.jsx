import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { socialAuthAPI } from "../utils/api";
import AuthShell from "../components/auth/AuthShell";
import Button from "../components/ui/Button";
import ContextSelectionModal from "../components/modals/ContextSelectionModal";
import { usePostLoginRedirect } from "../hooks/usePostLoginRedirect";

const PROVIDER_LABEL = { google: "Google", microsoft: "Microsoft" };

// Solo confiamos en err.message cuando parece un error de API real (no un
// SyntaxError/TypeError crudo de un response.json() sobre HTML/red caída).
const getFriendlyErrorMessage = (err, fallback) => {
  const message = err?.message || "";
  const looksLikeParseError =
    message.includes("Unexpected token") || message.includes("JSON");
  if (err?.name === "Error" && message && !looksLikeParseError) {
    return message;
  }
  return fallback;
};

const SocialAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { loginWithSocialResult } = useAuth();
  const {
    completeLogin,
    showContextModal,
    pendingUser,
    contextLoading,
    handleContextSelect,
  } = usePostLoginRedirect();

  const [status, setStatus] = useState("loading"); // loading | pending | error
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const ticket = searchParams.get("ticket");
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    if (!ticket) {
      setStatus("error");
      setError("Falta el ticket de acceso. Volvé a intentarlo desde el login.");
      return;
    }

    if (hasExchangedRef.current) return;
    hasExchangedRef.current = true;

    (async () => {
      try {
        const data = await socialAuthAPI.exchange(ticket);

        if (data.pending) {
          setProfile(data.profile);
          setStatus("pending");
          return;
        }

        const userData = loginWithSocialResult(data);
        completeLogin(userData);
      } catch (err) {
        console.error("Error en el callback de login social:", err);
        setStatus("error");
        setError(
          getFriendlyErrorMessage(err, "El enlace de acceso expiró o no es válido.")
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  const handleConfirm = async () => {
    setConfirming(true);
    setError("");
    try {
      const data = await socialAuthAPI.confirm(ticket);
      const userData = loginWithSocialResult(data);
      completeLogin(userData);
    } catch (err) {
      console.error("Error confirmando cuenta social:", err);
      setStatus("error");
      setError(
        getFriendlyErrorMessage(
          err,
          "El enlace de acceso expiró. Volvé a intentarlo desde el login."
        )
      );
      setConfirming(false);
    }
  };

  return (
    <AuthShell
      badge='Todo en un solo lugar'
      heading='Organiza tus proyectos con claridad'
      description='Gestiona equipos, tareas y tickets de forma simple, ordenada y sin complicaciones.'
    >
      {status === "loading" && (
        <div className='flex flex-col items-center gap-4 py-10 text-gray-500 dark:text-night-400'>
          <div className='w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin' />
          <p>Confirmando tu acceso...</p>
        </div>
      )}

      {status === "pending" && profile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className='space-y-6'
        >
          <div className='flex flex-col items-center text-center gap-3'>
            <div className='w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center'>
              <UserPlus className='w-7 h-7 text-brand-600 dark:text-brand-300' />
            </div>
            <h2 className='text-2xl font-extrabold text-gray-900 dark:text-night-50'>
              Crear tu cuenta de Orkela
            </h2>
            <p className='text-gray-500 dark:text-night-400'>
              Vamos a crear tu cuenta con{" "}
              <span className='font-semibold text-gray-700 dark:text-night-200'>
                {profile.email}
              </span>{" "}
              usando tu cuenta de {PROVIDER_LABEL[profile.provider] || profile.provider}.
            </p>
          </div>

          {error && (
            <div
              role='alert'
              className='p-3 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start gap-2'
            >
              <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
              {error}
            </div>
          )}

          <Button
            variant='brand'
            size='xl'
            className='w-full'
            loading={confirming}
            loadingText='Creando cuenta...'
            onClick={handleConfirm}
          >
            <CheckCircle2 className='w-5 h-5' />
            Crear cuenta
          </Button>

          <Link
            to='/login'
            className='block text-center text-base text-gray-500 dark:text-night-400 hover:text-gray-700 dark:hover:text-night-200'
          >
            Cancelar
          </Link>
        </motion.div>
      )}

      {status === "error" && (
        <div className='space-y-6 text-center'>
          <div
            role='alert'
            className='p-3 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start gap-2 text-left'
          >
            <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
            {error}
          </div>
          <Link
            to='/login'
            className='font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
          >
            Volver al login
          </Link>
        </div>
      )}

      <ContextSelectionModal
        isOpen={showContextModal}
        user={pendingUser}
        onSelect={handleContextSelect}
        loading={contextLoading}
      />
    </AuthShell>
  );
};

export default SocialAuthCallback;

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import AuthStepperShell from "../components/auth/AuthStepperShell";
import { AuthPanelHeading, AuthPanelTile, AuthAlert, AuthResendButton } from "../components/auth/AuthPanel";
import { authAPI } from "../utils/api";
import { getRetryMessage } from "../utils/authErrors";

const RESEND_COOLDOWN_SECONDS = 60;

const CheckEmail = () => {
  const location = useLocation();
  const email = location.state?.email || "";

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tone: "success" | "error", text }

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timeoutId = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timeoutId);
  }, [cooldown]);

  const handleResend = async () => {
    setSending(true);
    setFeedback(null);
    try {
      await authAPI.resendVerification(email);
      setFeedback({ tone: "success", text: "Te enviamos un nuevo correo de confirmación." });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setFeedback({ tone: "error", text: getRetryMessage(err) || "No pudimos reenviar el correo. Inténtalo de nuevo." });
      setCooldown(err?.retryAfter ?? RESEND_COOLDOWN_SECONDS);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthStepperShell
      flow='signup'
      current={2}
      status='active'
      backLink={{ to: "/login", label: "Volver a iniciar sesión" }}
    >
      <div className='flex items-start gap-4 mb-[22px]'>
        <AuthPanelTile icon={Mail} />
        <div>
          <AuthPanelHeading>Confirma tu correo</AuthPanelHeading>
          <p className='text-gray-500 dark:text-night-400'>
            {email ? (
              <>
                Te enviamos un enlace de confirmación a{" "}
                <strong className='text-gray-900 dark:text-night-50'>{email}</strong>. Ábrelo para completar tu
                registro. Vence en 24 horas.
              </>
            ) : (
              "Te enviamos un enlace de confirmación. Ábrelo para completar tu registro."
            )}
          </p>
        </div>
      </div>

      {(feedback || email) && (
        <div className='space-y-4'>
          {feedback && <AuthAlert tone={feedback.tone}>{feedback.text}</AuthAlert>}
          {email && <AuthResendButton cooldown={cooldown} sending={sending} onClick={handleResend} />}
        </div>
      )}

      <p className='mt-4 text-center text-sm text-gray-500 dark:text-night-400'>
        ¿Ya lo confirmaste?{" "}
        <Link
          to='/login'
          className='font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
        >
          Iniciar sesión
        </Link>
      </p>
    </AuthStepperShell>
  );
};

export default CheckEmail;

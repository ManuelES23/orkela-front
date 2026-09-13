import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, KeyRound, Link2Off, RotateCw } from "lucide-react";
import AuthStepperShell from "../components/auth/AuthStepperShell";
import AuthInput from "../components/auth/AuthInput";
import PasswordChecklist from "../components/auth/PasswordChecklist";
import { AuthPanelHeading, AuthPanelTile, AuthAlert, AuthButtonLink } from "../components/auth/AuthPanel";
import Button from "../components/ui/Button";
import { motionTokens } from "../components/animations/variants";
import { useHasChanged } from "../hooks/useHasChanged";
import { authAPI } from "../utils/api";
import { isPasswordValid } from "../utils/passwordRules";
import { getRetryMessage, getPasswordError } from "../utils/authErrors";

// Cambio de estado sin avance de paso: solo fade.
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: motionTokens.duration.base, ease: motionTokens.ease },
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [linkInvalid, setLinkInvalid] = useState(!token || !email);
  const [loading, setLoading] = useState(false);
  const focusHeading = useHasChanged(linkInvalid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = {};
    if (!isPasswordValid(password)) errors.password = "La contraseña no cumple los requisitos";
    if (password !== confirmation) errors.confirmation = "Las contraseñas no coinciden";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await authAPI.resetPassword({ token, email, password, password_confirmation: confirmation });
      navigate("/login", {
        replace: true,
        state: { email, message: "Tu contraseña fue actualizada. Inicia sesión con tu nueva contraseña." },
      });
    } catch (err) {
      if (err?.code === "link_invalid") {
        setLinkInvalid(true);
      } else {
        setError(getRetryMessage(err) || getPasswordError(err) || "No pudimos guardar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthStepperShell
      flow='recovery'
      current={3}
      status={linkInvalid ? "error" : "active"}
      backLink={{ to: "/login", label: "Volver a iniciar sesión" }}
    >
      <AnimatePresence mode='wait' initial={false}>
        {linkInvalid ? (
          <motion.div key='invalid' {...fade}>
            <div className='flex items-start gap-4 mb-[22px]'>
              <AuthPanelTile icon={Link2Off} tone='error' />
              <div>
                <AuthPanelHeading focusOnMount={focusHeading}>Este enlace ya no es válido</AuthPanelHeading>
                <p role='alert' className='text-gray-500 dark:text-night-400'>
                  Los enlaces para restablecer la contraseña vencen en 60 minutos y solo pueden usarse una vez.
                </p>
              </div>
            </div>

            <AuthButtonLink to='/forgot-password' state={{ email }} icon={RotateCw}>
              Pedir un nuevo enlace
            </AuthButtonLink>
            <p className='mt-3.5 text-center text-sm text-gray-500 dark:text-night-400'>
              Te llevamos al paso 1 con tu correo ya escrito.
            </p>
          </motion.div>
        ) : (
          <motion.div key='form' {...fade}>
            <AuthPanelHeading focusOnMount={focusHeading}>Crea una nueva contraseña</AuthPanelHeading>
            {email && (
              <p className='text-gray-500 dark:text-night-400 mb-4'>
                Para <strong className='text-gray-900 dark:text-night-50'>{email}</strong>
              </p>
            )}

            <form onSubmit={handleSubmit} className='space-y-5' noValidate>
              {error && <AuthAlert tone='error'>{error}</AuthAlert>}

              <div>
                <AuthInput
                  label='Nueva contraseña'
                  icon={Lock}
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  autoComplete='new-password'
                  error={fieldErrors.password}
                  required
                />
                <PasswordChecklist password={password} />
              </div>

              <AuthInput
                label='Confirmar contraseña'
                icon={Lock}
                type='password'
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder='Repite la contraseña'
                autoComplete='new-password'
                error={fieldErrors.confirmation}
                required
              />

              <Button type='submit' variant='brand' size='xl' loading={loading} loadingText='Guardando...' className='w-full'>
                <KeyRound className='w-5 h-5' aria-hidden='true' />
                Guardar contraseña
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthStepperShell>
  );
};

export default ResetPassword;

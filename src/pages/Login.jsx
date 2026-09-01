import { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { LogIn, Mail, Lock, Info, AlertCircle } from "lucide-react";
import AuthShell from "../components/auth/AuthShell";
import AuthInput from "../components/auth/AuthInput";
import Button from "../components/ui/Button";
import { motionTokens, shakeVariants } from "../components/animations/variants";
import ContextSelectionModal from "../components/modals/ContextSelectionModal";
import { usePostLoginRedirect } from "../hooks/usePostLoginRedirect";
import { socialAuthAPI } from "../utils/api";

const SOCIAL_ERROR_MESSAGES = {
  unverified_email:
    "Tu cuenta de Google/Microsoft no tiene el email verificado. No podemos usarla para iniciar sesión.",
  admin_account:
    "Ese email pertenece a una cuenta de administrador. Iniciá sesión con tu usuario y contraseña de administrador.",
  default: "No pudimos completar el inicio de sesión. Volvé a intentarlo.",
};

const Login = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();
  const {
    completeLogin,
    showContextModal,
    pendingUser,
    contextLoading,
    handleContextSelect,
  } = usePostLoginRedirect();

  // Obtener datos desde state (para invitaciones)
  const prefilledEmail = location.state?.email;
  const invitationMessage = location.state?.message;

  const [email, setEmail] = useState(prefilledEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  // Si el email cambia en el state (ej. navegación desde invitación)
  useEffect(() => {
    if (prefilledEmail && email !== prefilledEmail) {
      setEmail(prefilledEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledEmail]);

  // Error de login social (?social_error=google&reason=unverified_email),
  // seteado por el redirect de SocialAuthController::callback. Se muestra
  // una vez y se limpia de la URL para no reaparecer en un refresh.
  useEffect(() => {
    const socialError = searchParams.get("social_error");
    if (socialError) {
      const reason = searchParams.get("reason");
      setError(
        SOCIAL_ERROR_MESSAGES[reason] ||
          SOCIAL_ERROR_MESSAGES[socialError] ||
          SOCIAL_ERROR_MESSAGES.default
      );
      setShakeKey((k) => k + 1);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userData = await login(email, password);
      completeLogin(userData);
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setError("Error al iniciar sesión. Verifica tus credenciales.");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = socialAuthAPI.redirectUrl(provider);
  };

  return (
    <AuthShell
      badge='Todo en un solo lugar'
      heading='Organiza tus proyectos con claridad'
      description='Gestiona equipos, tareas y tickets de forma simple, ordenada y sin complicaciones.'
      formHeader={
        <div className='mb-9'>
          <h2 className='text-3xl font-extrabold text-gray-900 dark:text-night-50 mb-2 tracking-tight'>
            Bienvenido de nuevo
          </h2>
          <p className='text-gray-500 dark:text-night-400 text-base'>
            Inicia sesión para continuar en tu espacio de trabajo.
          </p>
        </div>
      }
    >
      <AnimatePresence>
        {invitationMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: motionTokens.duration.base }}
            className='overflow-hidden'
          >
            <div className='mb-4 p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg flex items-start gap-2'>
              <Info className='w-5 h-5 text-brand-600 dark:text-brand-300 shrink-0 mt-0.5' />
              <p className='text-brand-700 dark:text-brand-300 text-sm'>{invitationMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className='space-y-3 mb-6'>
        <Button
          type='button'
          variant='outline'
          size='xl'
          className='w-full'
          onClick={() => handleSocialLogin("google")}
        >
          Continuar con Google
        </Button>
        <Button
          type='button'
          variant='outline'
          size='xl'
          className='w-full'
          onClick={() => handleSocialLogin("microsoft")}
        >
          Continuar con Microsoft
        </Button>
      </div>

      <div className='flex items-center gap-3 mb-6'>
        <div className='flex-1 h-px bg-gray-200 dark:bg-night-700' />
        <span className='text-sm text-gray-400 dark:text-night-500'>o</span>
        <div className='flex-1 h-px bg-gray-200 dark:bg-night-700' />
      </div>

      <motion.form
        key={shakeKey}
        variants={shakeVariants}
        initial='initial'
        animate={shakeKey > 0 ? "shake" : "initial"}
        onSubmit={handleSubmit}
        className='space-y-6'
        noValidate
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: motionTokens.duration.fast }}
              className='overflow-hidden'
            >
              <div
                role='alert'
                className='mb-1 p-3 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start gap-2'
              >
                <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        <div>
          <AuthInput
            label='Contraseña'
            icon={Lock}
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='••••••••'
            autoComplete='current-password'
            required
          />
          <div className='flex justify-end mt-2.5'>
            <a href='#' className='text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'>
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <label className='flex items-center gap-2.5 text-base text-gray-600 dark:text-night-300'>
          <input
            type='checkbox'
            className='w-[18px] h-[18px] rounded border-gray-300 dark:border-night-600 dark:bg-night-800 text-brand-600 focus:ring-brand-500'
          />
          Recordarme en este dispositivo
        </label>

        <Button
          type='submit'
          variant='brand'
          size='xl'
          loading={loading}
          loadingText='Iniciando sesión...'
          className='w-full'
        >
          <LogIn className='w-5 h-5' />
          Iniciar sesión
        </Button>

        <p className='text-center text-base text-gray-500 dark:text-night-400 pt-1'>
          ¿No tienes cuenta?{" "}
          <Link to='/register' className='font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'>
            Regístrate gratis
          </Link>
        </p>
      </motion.form>

      {/* Modal de selección de contexto */}
      <ContextSelectionModal
        isOpen={showContextModal}
        user={pendingUser}
        onSelect={handleContextSelect}
        loading={contextLoading}
      />
    </AuthShell>
  );
};

export default Login;

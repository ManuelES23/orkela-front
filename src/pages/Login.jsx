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

const getSocialErrorMessage = (key) =>
  key && Object.hasOwn(SOCIAL_ERROR_MESSAGES, key) ? SOCIAL_ERROR_MESSAGES[key] : null;

const GoogleIcon = (props) => (
  <svg viewBox='0 0 48 48' className='w-5 h-5' aria-hidden='true' {...props}>
    <path
      fill='#FFC107'
      d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
      c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
      c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'
    />
    <path
      fill='#FF3D00'
      d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039
      l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'
    />
    <path
      fill='#4CAF50'
      d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
      c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z'
    />
    <path
      fill='#1976D2'
      d='M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
      c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24
      C44,22.659,43.862,21.35,43.611,20.083z'
    />
  </svg>
);

const MicrosoftIcon = (props) => (
  <svg viewBox='0 0 21 21' className='w-5 h-5' aria-hidden='true' {...props}>
    <rect x='1' y='1' width='9' height='9' fill='#F25022' />
    <rect x='11' y='1' width='9' height='9' fill='#7FBA00' />
    <rect x='1' y='11' width='9' height='9' fill='#00A4EF' />
    <rect x='11' y='11' width='9' height='9' fill='#FFB900' />
  </svg>
);

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
        getSocialErrorMessage(reason) ||
          getSocialErrorMessage(socialError) ||
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
    if (location.state?.returnTo) {
      localStorage.setItem("socialReturnTo", location.state.returnTo);
    }
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

      <div className='flex items-center gap-3 my-6'>
        <div className='flex-1 h-px bg-gray-200 dark:bg-night-700' />
        <span className='text-sm text-gray-400 dark:text-night-500'>o</span>
        <div className='flex-1 h-px bg-gray-200 dark:bg-night-700' />
      </div>

      <div className='space-y-3'>
        <Button
          type='button'
          variant='outline'
          size='xl'
          className='w-full'
          onClick={() => handleSocialLogin("google")}
        >
          <GoogleIcon />
          Continuar con Google
        </Button>
        <Button
          type='button'
          variant='outline'
          size='xl'
          className='w-full'
          onClick={() => handleSocialLogin("microsoft")}
        >
          <MicrosoftIcon />
          Continuar con Microsoft
        </Button>
      </div>

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

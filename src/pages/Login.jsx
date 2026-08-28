import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { LogIn, Mail, Lock, Info, AlertCircle } from "lucide-react";
import AuthShell from "../components/auth/AuthShell";
import AuthInput from "../components/auth/AuthInput";
import Button from "../components/ui/Button";
import { motionTokens, shakeVariants } from "../components/animations/variants";
import ContextSelectionModal from "../components/modals/ContextSelectionModal";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, switchContext } = useAuth();

  // Obtener datos desde state (para invitaciones)
  const returnTo = location.state?.returnTo;
  const prefilledEmail = location.state?.email;
  const invitationMessage = location.state?.message;

  const [email, setEmail] = useState(prefilledEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [showContextModal, setShowContextModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Si el email cambia en el state (ej. navegación desde invitación)
  useEffect(() => {
    if (prefilledEmail && email !== prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const navigateToDestination = (userData) => {
    // Verificar si hay una invitación de equipo pendiente
    const pendingInvitation = localStorage.getItem("pendingTeamInvitation");
    if (pendingInvitation) {
      localStorage.removeItem("pendingTeamInvitation");
      navigate(`/accept-team-invitation/${pendingInvitation}`);
      return;
    }

    // Si hay URL de retorno (invitación), redirigir ahí
    if (returnTo) {
      navigate(returnTo);
    } else if (userData.isSystemAdmin) {
      navigate("/admin/users"); // Superadmin va a la gestión de usuarios
    } else {
      navigate("/dashboard"); // Usuario normal va al dashboard de la app
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userData = await login(email, password);

      // Si el usuario tiene múltiples contextos, mostrar el modal de selección
      if (userData.available_contexts?.length > 1) {
        setPendingUser(userData);
        setShowContextModal(true);
        setLoading(false);
        return;
      }

      // Si no tiene múltiples contextos, navegar directamente
      navigateToDestination(userData);
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setError("Error al iniciar sesión. Verifica tus credenciales.");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleContextSelect = async (contextId) => {
    if (!pendingUser) return;

    try {
      setContextLoading(true);

      // Si el contexto seleccionado es diferente al activo, cambiarlo
      if (contextId !== pendingUser.active_context) {
        await switchContext(contextId);
      }

      setShowContextModal(false);
      navigateToDestination(pendingUser);
    } catch (err) {
      console.error("Error selecting context:", err);
      // Aún así navegar, el contexto por defecto funcionará
      setShowContextModal(false);
      navigateToDestination(pendingUser);
    } finally {
      setContextLoading(false);
    }
  };

  return (
    <AuthShell
      badge='Todo en un solo lugar'
      heading='Organiza tus proyectos con claridad'
      description='Gestiona equipos, tareas y tickets de forma simple, ordenada y sin complicaciones.'
      formHeader={
        <div className='mb-9'>
          <h2 className='text-3xl font-extrabold text-gray-900 mb-2 tracking-tight'>
            Bienvenido de nuevo
          </h2>
          <p className='text-gray-500 text-base'>
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
            <div className='mb-4 p-3 bg-brand-50 border border-brand-200 rounded-lg flex items-start gap-2'>
              <Info className='w-5 h-5 text-brand-600 shrink-0 mt-0.5' />
              <p className='text-brand-700 text-sm'>{invitationMessage}</p>
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
                className='mb-1 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2'
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
            <a href='#' className='text-sm font-semibold text-brand-600 hover:text-brand-700'>
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <label className='flex items-center gap-2.5 text-base text-gray-600'>
          <input
            type='checkbox'
            className='w-[18px] h-[18px] rounded border-gray-300 text-brand-600 focus:ring-brand-500'
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

        <p className='text-center text-base text-gray-500 pt-1'>
          ¿No tienes cuenta?{" "}
          <Link to='/register' className='font-semibold text-brand-600 hover:text-brand-700'>
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

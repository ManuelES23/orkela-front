import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn, Mail, Lock, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";
import {
  FadeIn,
  ScaleIn,
  SlideInLeft,
} from "../components/animations/MotionComponents";
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
      setError("Error al iniciar sesión. Verifica tus credenciales.");
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
    <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4 relative overflow-hidden'>
      {/* Elementos decorativos animados */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className='absolute top-10 right-10 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70'
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className='absolute bottom-10 left-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70'
      />
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className='max-w-md w-full relative z-10'
      >
        {/* Logo y título */}
        <FadeIn delay={0.2} className='text-center mb-8'>
          <ScaleIn delay={0.3}>
            <div className='inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg'>
              <LogIn className='w-8 h-8 text-white' />
            </div>
          </ScaleIn>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className='text-3xl font-bold text-gray-900 mb-2'
          >
            Orkela Projects
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className='text-gray-600'
          >
            Gestiona tus proyectos de manera eficiente
          </motion.p>
        </FadeIn>

        {/* Formulario */}
        <SlideInLeft delay={0.6}>
          <div className='bg-white rounded-2xl shadow-xl p-8'>
            <h2 className='text-2xl font-semibold text-gray-900 mb-6'>
              Iniciar Sesión
            </h2>

            {/* Mensaje de invitación */}
            {invitationMessage && (
              <div className='mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-2'>
                <Info className='w-5 h-5 text-indigo-600 shrink-0 mt-0.5' />
                <p className='text-indigo-700 text-sm'>{invitationMessage}</p>
              </div>
            )}

            {error && (
              <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm'>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className='space-y-5'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Correo Electrónico
                </label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-400'
                    placeholder='tu@email.com'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Contraseña
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition'
                    placeholder='••••••••'
                    required
                  />
                </div>
              </div>

              <div className='flex items-center justify-between text-sm'>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    className='w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                  />
                  <span className='ml-2 text-gray-600'>Recordarme</span>
                </label>
                <a
                  href='#'
                  className='text-indigo-600 hover:text-indigo-700 font-medium'
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button
                type='submit'
                disabled={loading}
                className='w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 hover:shadow-lg'
              >
                {loading ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <LogIn className='w-5 h-5' />
                    Iniciar Sesión
                  </>
                )}
              </button>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className='mt-6 text-center'
            >
              <p className='text-gray-600'>
                ¿No tienes una cuenta?{" "}
                <Link
                  to='/register'
                  className='text-indigo-600 hover:text-indigo-700 font-semibold'
                >
                  Regístrate aquí
                </Link>
              </p>
            </motion.div>
          </div>
        </SlideInLeft>

        {/* Footer */}
        <FadeIn delay={0.9}>
          <p className='text-center text-gray-500 text-sm mt-8'>
            © 2025 Orkela Projects. Todos los derechos reservados.
          </p>
        </FadeIn>
      </motion.div>

      {/* Modal de selección de contexto */}
      <ContextSelectionModal
        isOpen={showContextModal}
        user={pendingUser}
        onSelect={handleContextSelect}
        loading={contextLoading}
      />
    </div>
  );
};

export default Login;

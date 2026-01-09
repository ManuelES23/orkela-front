import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Mail, Lock, User, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";
import {
  FadeIn,
  ScaleIn,
  SlideInLeft,
  SlideInRight,
} from "../components/animations/MotionComponents";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  // Obtener datos desde state (para invitaciones)
  const returnTo = location.state?.returnTo;
  const prefilledEmail = location.state?.email;
  const invitationMessage = location.state?.message;

  const [formData, setFormData] = useState({
    name: "",
    email: prefilledEmail || "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Si el email cambia en el state (ej. navegación desde invitación)
  useEffect(() => {
    if (prefilledEmail && formData.email !== prefilledEmail) {
      setFormData((prev) => ({ ...prev, email: prefilledEmail }));
    }
  }, [prefilledEmail]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      await register(formData.name, formData.email, formData.password);

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
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Error al crear la cuenta. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-100 via-white to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden'>
      {/* Elementos decorativos animados */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className='absolute top-20 left-20 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70'
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className='absolute bottom-20 right-20 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70'
      />

      <div className='max-w-md w-full relative z-10'>
        {/* Logo y título */}
        <FadeIn delay={0.2}>
          <div className='text-center mb-8'>
            <ScaleIn delay={0.3}>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4 shadow-lg'>
                <UserPlus className='w-8 h-8 text-white' />
              </div>
            </ScaleIn>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Crear Cuenta
            </h1>
            <p className='text-gray-600'>Únete a Orkela Projects hoy</p>
          </div>
        </FadeIn>

        {/* Formulario */}
        <ScaleIn delay={0.4}>
          <div className='bg-white rounded-2xl shadow-xl p-8'>
            <h2 className='text-2xl font-semibold text-gray-900 mb-6'>
              Registro
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
                  Nombre Completo
                </label>
                <div className='relative'>
                  <User className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='text'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                    className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition'
                    placeholder='Juan Pérez'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Correo Electrónico
                </label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='email'
                    name='email'
                    value={formData.email}
                    onChange={handleChange}
                    className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition'
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
                    name='password'
                    value={formData.password}
                    onChange={handleChange}
                    className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition'
                    placeholder='••••••••'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Confirmar Contraseña
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <input
                    type='password'
                    name='confirmPassword'
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition'
                    placeholder='••••••••'
                    required
                  />
                </div>
              </div>

              <div className='flex items-start'>
                <input
                  type='checkbox'
                  className='w-4 h-4 mt-1 text-purple-600 border-gray-300 rounded focus:ring-purple-500'
                  required
                />
                <span className='ml-2 text-sm text-gray-600'>
                  Acepto los{" "}
                  <a
                    href='#'
                    className='text-purple-600 hover:text-purple-700 font-medium'
                  >
                    términos y condiciones
                  </a>{" "}
                  y la{" "}
                  <a
                    href='#'
                    className='text-purple-600 hover:text-purple-700 font-medium'
                  >
                    política de privacidad
                  </a>
                </span>
              </div>

              <motion.button
                type='submit'
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className='w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg'
              >
                {loading ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <UserPlus className='w-5 h-5' />
                    Crear Cuenta
                  </>
                )}
              </motion.button>
            </form>

            <div className='mt-6 text-center'>
              <p className='text-gray-600'>
                ¿Ya tienes una cuenta?{" "}
                <Link
                  to='/login'
                  className='text-purple-600 hover:text-purple-700 font-semibold'
                >
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </ScaleIn>

        {/* Footer */}
        <FadeIn delay={0.6}>
          <p className='text-center text-gray-500 text-sm mt-8'>
            © 2025 Orkela Projects. Todos los derechos reservados.
          </p>
        </FadeIn>
      </div>
    </div>
  );
};

export default Register;

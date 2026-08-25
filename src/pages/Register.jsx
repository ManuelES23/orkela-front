import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Mail, Lock, User, Info, AlertCircle } from "lucide-react";
import AuthShell from "../components/auth/AuthShell";
import AuthInput from "../components/auth/AuthInput";
import Button from "../components/ui/Button";
import { motionTokens, shakeVariants } from "../components/animations/variants";

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  // Si el email cambia en el state (ej. navegación desde invitación)
  useEffect(() => {
    if (prefilledEmail && formData.email !== prefilledEmail) {
      setFormData((prev) => ({ ...prev, email: prefilledEmail }));
    }
  }, [prefilledEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar el error del campo en cuanto el usuario lo corrige
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const errors = {};
    if (formData.password.length < 6) {
      errors.password = "Debe tener al menos 6 caracteres";
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden";
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setShakeKey((k) => k + 1);
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
      console.error("Error al crear la cuenta:", err);
      setError("Error al crear la cuenta. Intenta de nuevo.");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge='Empieza en minutos'
      heading='Crea el espacio de tu equipo'
      description='Invita a tu equipo, organiza proyectos y da seguimiento a cada tarea desde un solo lugar.'
      formHeader={
        <div className='mb-9'>
          <h2 className='text-3xl font-extrabold text-gray-900 mb-2 tracking-tight'>Crear cuenta</h2>
          <p className='text-gray-500 text-base'>Únete a Orkela Projects hoy.</p>
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
          label='Nombre completo'
          icon={User}
          type='text'
          name='name'
          value={formData.name}
          onChange={handleChange}
          placeholder='Juan Pérez'
          autoComplete='name'
          required
        />

        <AuthInput
          label='Correo electrónico'
          icon={Mail}
          type='email'
          name='email'
          value={formData.email}
          onChange={handleChange}
          placeholder='tu@empresa.com'
          autoComplete='email'
          required
        />

        <AuthInput
          label='Contraseña'
          icon={Lock}
          type='password'
          name='password'
          value={formData.password}
          onChange={handleChange}
          placeholder='••••••••'
          autoComplete='new-password'
          error={fieldErrors.password}
          required
        />

        <AuthInput
          label='Confirmar contraseña'
          icon={Lock}
          type='password'
          name='confirmPassword'
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder='••••••••'
          autoComplete='new-password'
          error={fieldErrors.confirmPassword}
          required
        />

        <label className='flex items-start gap-2.5 text-base text-gray-600'>
          <input
            type='checkbox'
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className='w-[18px] h-[18px] mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500'
            required
          />
          <span>
            Acepto los{" "}
            <a href='#' className='font-semibold text-brand-600 hover:text-brand-700'>
              términos y condiciones
            </a>{" "}
            y la{" "}
            <a href='#' className='font-semibold text-brand-600 hover:text-brand-700'>
              política de privacidad
            </a>
          </span>
        </label>

        <Button
          type='submit'
          variant='brand'
          size='xl'
          loading={loading}
          loadingText='Creando cuenta...'
          className='w-full'
        >
          <UserPlus className='w-5 h-5' />
          Crear cuenta
        </Button>

        <p className='text-center text-base text-gray-500 pt-1'>
          ¿Ya tienes una cuenta?{" "}
          <Link to='/login' className='font-semibold text-brand-600 hover:text-brand-700'>
            Inicia sesión
          </Link>
        </p>
      </motion.form>
    </AuthShell>
  );
};

export default Register;

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Check, X, Loader2, User, ArrowRight } from "lucide-react";
import { organizationsAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import AuthStatusScreen, { AuthStatusCard } from "../components/auth/AuthStatusScreen";
import { statusIconVariants } from "../components/animations/variants";

const AcceptOrganizationInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, switchContext } = useAuth();

  const [status, setStatus] = useState("loading"); // loading, checking, redirecting, accepting, choose_context, error
  const [message, setMessage] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationId, setOrganizationId] = useState(null);
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [switchingContext, setSwitchingContext] = useState(false);
  const isProcessing = useRef(false);
  const hasAccepted = useRef(false);

  // Función para procesar la invitación
  const processInvitation = async (invitationToken) => {
    if (hasAccepted.current) return; // Evitar doble procesamiento
    hasAccepted.current = true;

    const tokenToUse = invitationToken || token;
    setStatus("accepting");

    try {
      const response = await organizationsAPI.acceptInvitation(tokenToUse);

      setOrganizationName(response.organization?.name || organizationName);
      setOrganizationId(response.organization?.id);
      setMessage(
        response.message || "Te has unido a la organización exitosamente"
      );

      // IMPORTANTE: Refrescar datos del usuario para que tenga la nueva organización
      try {
        await refreshUser();
      } catch (refreshErr) {
        console.error("Error refreshing user after invitation:", refreshErr);
      }

      // Mostrar pantalla de selección de contexto
      setStatus("choose_context");
    } catch (err) {
      console.error("Error accepting invitation:", err);
      setStatus("error");
      setMessage(err.message || "No se pudo aceptar la invitación");
      hasAccepted.current = false;
    }
  };

  // Manejar selección de contexto
  const handleContextSelection = async (contextType) => {
    setSwitchingContext(true);
    try {
      // Cambiar contexto
      await switchContext(contextType);

      // Navegar según el contexto elegido
      if (contextType === "organization") {
        navigate(`/organizations/${organizationId}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Error switching context:", err);
      // Si falla, ir al dashboard por defecto
      navigate("/dashboard");
    }
  };

  // Paso 1: Obtener info de la invitación (público, sin auth)
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        setStatus("checking");
        const info = await organizationsAPI.getInvitationInfo(token);
        setInvitationInfo(info);
        setOrganizationName(info.organization?.name || "la organización");

        // Si el usuario ya está autenticado, proceder a aceptar
        if (user) {
          await processInvitation(token);
        } else {
          // Redirigir según si el usuario existe o no
          setStatus("redirecting");

          if (info.user_exists) {
            // Usuario existe -> Login con email pre-llenado
            setTimeout(() => {
              navigate("/login", {
                state: {
                  returnTo: `/accept-organization-invitation/${token}`,
                  email: info.email,
                  message: `Inicia sesión para unirte a la organización "${info.organization.name}"`,
                },
              });
            }, 1500);
          } else {
            // Usuario no existe -> Register con email pre-llenado
            setTimeout(() => {
              navigate("/register", {
                state: {
                  returnTo: `/accept-organization-invitation/${token}`,
                  email: info.email,
                  message: `Crea tu cuenta para unirte a la organización "${info.organization.name}"`,
                },
              });
            }, 1500);
          }
        }
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "Error al procesar la invitación");
        isProcessing.current = false;
      }
    };

    if (token) {
      fetchInvitationInfo();
    }
  }, [token]);

  // Paso 2: Si el usuario se autentica después de cargar la página
  useEffect(() => {
    if (user && invitationInfo && status === "redirecting") {
      processInvitation(token);
    }
  }, [user, invitationInfo, status, token]);

  // Estado: Verificando invitación
  if (status === "checking" || status === "loading") {
    return (
      <AuthStatusScreen
        statusKey='checking'
        tone='loading'
        icon={Loader2}
        spin
        title='Verificando invitación...'
      >
        <p className='text-gray-500'>Por favor espera un momento</p>
      </AuthStatusScreen>
    );
  }

  // Estado: Redirigiendo a login/register
  if (status === "redirecting" && invitationInfo) {
    return (
      <AuthStatusScreen
        statusKey='redirecting'
        tone='info'
        icon={Building2}
        title='Invitación a organización'
      >
        <p className='text-gray-500 mb-2'>Has sido invitado a unirte a:</p>
        <p className='font-semibold text-brand-600 text-lg mb-2'>
          {invitationInfo.organization?.name}
        </p>
        {invitationInfo.role && (
          <p className='text-sm text-gray-500 mb-2'>
            Rol: <span className='font-medium capitalize'>{invitationInfo.role}</span>
          </p>
        )}
        <p className='text-gray-500 mb-4'>
          por <span className='font-medium'>{invitationInfo.invited_by?.name}</span>
        </p>

        <div className='flex items-center justify-center gap-2 text-brand-600 mb-4'>
          <Loader2 className='w-5 h-5 animate-spin' />
          <span>
            {invitationInfo.user_exists
              ? "Redirigiendo a iniciar sesión..."
              : "Redirigiendo a crear cuenta..."}
          </span>
        </div>

        <div className='bg-gray-50 rounded-lg p-3'>
          <p className='text-sm text-gray-600'>
            Email de la invitación: <span className='font-medium'>{invitationInfo.email}</span>
          </p>
        </div>
      </AuthStatusScreen>
    );
  }

  // Estado: Aceptando invitación (usuario autenticado)
  if (status === "accepting") {
    return (
      <AuthStatusScreen
        statusKey='accepting'
        tone='loading'
        icon={Loader2}
        spin
        title='Procesando invitación...'
      >
        <p className='text-gray-500'>
          Estamos agregándote a la organización, por favor espera un momento.
        </p>
      </AuthStatusScreen>
    );
  }

  // Estado: Éxito - Elegir contexto
  if (status === "choose_context") {
    return (
      <AuthStatusCard statusKey='choose_context' maxWidth='max-w-lg'>
        {/* Header de éxito */}
        <div className='mb-8'>
          <motion.div
            variants={statusIconVariants}
            initial='hidden'
            animate='visible'
            className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'
          >
            <Check className='w-8 h-8 text-green-600' />
          </motion.div>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            ¡Bienvenido a {organizationName}!
          </h2>
          <p className='text-gray-500'>{message}</p>
        </div>

        {/* Pregunta de contexto */}
        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            ¿En qué modo deseas continuar?
          </h3>
          <p className='text-sm text-gray-500'>
            Puedes cambiar entre modos en cualquier momento desde el menú
          </p>
        </div>

        {/* Opciones de contexto */}
        <div className='space-y-4 text-left'>
          {/* Opción: Organización */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleContextSelection("organization")}
            disabled={switchingContext}
            className='w-full p-4 border-2 border-brand-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
          >
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center group-hover:bg-brand-200 transition-colors'>
                <Building2 className='w-6 h-6 text-brand-600' />
              </div>
              <div className='flex-1'>
                <h4 className='font-semibold text-gray-900 mb-1'>Modo organización</h4>
                <p className='text-sm text-gray-500'>
                  Accede a los equipos, proyectos y recursos de{" "}
                  <span className='font-medium text-brand-600'>{organizationName}</span>
                </p>
              </div>
              <ArrowRight className='w-5 h-5 text-gray-400 group-hover:text-brand-600 transition-colors' />
            </div>
          </motion.button>

          {/* Opción: Personal */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleContextSelection("personal")}
            disabled={switchingContext}
            className='w-full p-4 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
          >
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors'>
                <User className='w-6 h-6 text-gray-600' />
              </div>
              <div className='flex-1'>
                <h4 className='font-semibold text-gray-900 mb-1'>Modo personal</h4>
                <p className='text-sm text-gray-500'>
                  Continúa con tus proyectos y equipos personales
                </p>
              </div>
              <ArrowRight className='w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors' />
            </div>
          </motion.button>
        </div>

        {/* Indicador de carga */}
        {switchingContext && (
          <div className='mt-6 flex items-center justify-center gap-2 text-brand-600'>
            <Loader2 className='w-5 h-5 animate-spin' />
            <span>Preparando tu espacio de trabajo...</span>
          </div>
        )}
      </AuthStatusCard>
    );
  }

  // Estado: Error
  if (status === "error") {
    return (
      <AuthStatusScreen
        statusKey='error'
        tone='error'
        icon={X}
        title='Error al procesar invitación'
      >
        <p className='text-gray-500 mb-6'>{message}</p>
        <button
          onClick={() => navigate("/organizations")}
          className='inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg font-semibold text-white bg-linear-to-r from-brand-600 to-accent-600 hover:brightness-105 transition cursor-pointer'
        >
          <Building2 className='w-5 h-5' />
          Ir a organizaciones
        </button>
      </AuthStatusScreen>
    );
  }

  return null;
};

export default AcceptOrganizationInvitation;

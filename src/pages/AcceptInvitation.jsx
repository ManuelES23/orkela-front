import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invitationsAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import AuthStatusScreen from "../components/auth/AuthStatusScreen";
import Button from "../components/ui/Button";

const AcceptInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState("loading"); // loading, checking, redirecting, accepting, success, error
  const [message, setMessage] = useState("");
  const [project, setProject] = useState(null);
  const [invitationInfo, setInvitationInfo] = useState(null);
  const isProcessing = useRef(false);

  const acceptInvitation = async () => {
    setStatus("accepting");
    try {
      const response = await invitationsAPI.acceptInvitation(token);
      setStatus("success");
      setMessage(response.message);
      setProject(response.project);

      // Redirigir al proyecto después de 3 segundos
      setTimeout(() => {
        navigate(`/projects/${response.project.id}`);
      }, 3000);
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Error al aceptar la invitación");
      isProcessing.current = false;
    }
  };

  // Paso 1: Obtener info de la invitación (público, sin auth)
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        setStatus("checking");
        const info = await invitationsAPI.getInfo(token);
        setInvitationInfo(info);

        // Si el usuario ya está autenticado, proceder a aceptar
        if (user) {
          await acceptInvitation();
        } else {
          // Redirigir según si el usuario existe o no
          setStatus("redirecting");

          if (info.user_exists) {
            // Usuario existe -> Login con email pre-llenado
            setTimeout(() => {
              navigate("/login", {
                state: {
                  returnTo: `/accept-invitation/${token}`,
                  email: info.email,
                  message: `Inicia sesión para unirte al proyecto "${info.project.name}"`,
                },
              });
            }, 1500);
          } else {
            // Usuario no existe -> Register con email pre-llenado
            setTimeout(() => {
              navigate("/register", {
                state: {
                  returnTo: `/accept-invitation/${token}`,
                  email: info.email,
                  message: `Crea tu cuenta para unirte al proyecto "${info.project.name}"`,
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

    fetchInvitationInfo();
  }, [token]);

  // Paso 2: Si el usuario se autentica después de cargar la página
  useEffect(() => {
    if (user && invitationInfo && status === "redirecting") {
      acceptInvitation();
    }
  }, [user, invitationInfo, status]);

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
      <AuthStatusScreen statusKey='redirecting' tone='info' icon={Mail} title='Invitación a proyecto'>
        <p className='text-gray-500 mb-2'>Has sido invitado a unirte al proyecto:</p>
        <p className='font-semibold text-brand-600 text-lg mb-4'>
          {invitationInfo.project?.name}
        </p>
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
        <p className='text-gray-500'>Uniéndote al proyecto</p>
      </AuthStatusScreen>
    );
  }

  // Estado: Éxito
  if (status === "success") {
    return (
      <AuthStatusScreen
        statusKey='success'
        tone='success'
        icon={CheckCircle}
        title='¡Invitación aceptada!'
      >
        <p className='text-gray-500 mb-6'>{message}</p>
        {project && (
          <div className='bg-gray-50 rounded-lg p-4 mb-4'>
            <p className='text-sm text-gray-600'>Te uniste al proyecto:</p>
            <p className='font-semibold text-gray-900 mt-1'>{project.name}</p>
          </div>
        )}
        <p className='text-sm text-gray-400'>Redirigiendo al proyecto en 3 segundos...</p>
      </AuthStatusScreen>
    );
  }

  // Estado: Error
  if (status === "error") {
    return (
      <AuthStatusScreen statusKey='error' tone='error' icon={XCircle} title='Error'>
        <p className='text-gray-500 mb-6'>{message}</p>
        <Button variant='brand' className='w-full' onClick={() => navigate("/dashboard")}>
          Ir al dashboard
        </Button>
      </AuthStatusScreen>
    );
  }

  return null;
};

export default AcceptInvitation;

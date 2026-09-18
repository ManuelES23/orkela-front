import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { teamInvitationsAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, XCircle, Loader2, Users } from "lucide-react";
import AuthStatusScreen from "../components/auth/AuthStatusScreen";
import Button from "../components/ui/Button";

const AcceptTeamInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("loading"); // loading, checking, redirecting, accepting, success, error
  const [message, setMessage] = useState("");
  const [teamName, setTeamName] = useState("");
  const [invitationInfo, setInvitationInfo] = useState(null);
  const isProcessing = useRef(false);
  // Timer de la redirección a login/register: se cancela si la sesión
  // resulta estar iniciada o si se desmonta la página.
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(redirectTimerRef.current);
  }, []);

  const processInvitation = async () => {
    setStatus("accepting");
    try {
      const response = await teamInvitationsAPI.acceptInvitation(token);
      setStatus("success");
      setMessage(response.message || "Te has unido al equipo exitosamente");
      setTeamName(response.team?.name || teamName);

      // Redirigir a la página de equipos después de 3 segundos
      setTimeout(() => {
        navigate("/teams");
      }, 3000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error.message ||
          "No se pudo aceptar la invitación. Verifica que el enlace sea válido y no haya expirado."
      );
      isProcessing.current = false;
    }
  };

  // Paso 1: Obtener info de la invitación (público, sin auth)
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      // Esperar a que AuthContext termine de verificar la sesión: antes de
      // eso user es null aunque el usuario sí esté logueado.
      if (authLoading) return;
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        setStatus("checking");
        const info = await teamInvitationsAPI.getInfo(token);
        setInvitationInfo(info);
        setTeamName(info.team?.name || "el equipo");

        // Si el usuario ya está autenticado, proceder a aceptar
        if (user) {
          await processInvitation();
        } else {
          // Redirigir según si el usuario existe o no
          setStatus("redirecting");

          if (info.user_exists) {
            // Usuario existe -> Login con email pre-llenado
            redirectTimerRef.current = setTimeout(() => {
              navigate("/login", {
                state: {
                  returnTo: `/accept-team-invitation/${token}`,
                  email: info.email,
                  message: `Inicia sesión para unirte al equipo "${info.team.name}"`,
                },
              });
            }, 1500);
          } else {
            // Usuario no existe -> Register con email pre-llenado
            redirectTimerRef.current = setTimeout(() => {
              navigate("/register", {
                state: {
                  returnTo: `/accept-team-invitation/${token}`,
                  email: info.email,
                  message: `Crea tu cuenta para unirte al equipo "${info.team.name}"`,
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
  }, [token, authLoading, user]);

  // Paso 2: Si el usuario se autentica después de cargar la página
  useEffect(() => {
    if (user && invitationInfo && status === "redirecting") {
      clearTimeout(redirectTimerRef.current);
      processInvitation();
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
        <p className='text-gray-500 dark:text-night-400'>Por favor espera un momento</p>
      </AuthStatusScreen>
    );
  }

  // Estado: Redirigiendo a login/register
  if (status === "redirecting" && invitationInfo) {
    return (
      <AuthStatusScreen statusKey='redirecting' tone='info' icon={Users} title='Invitación a equipo'>
        <p className='text-gray-500 dark:text-night-400 mb-2'>Has sido invitado a unirte al equipo:</p>
        <p className='font-semibold text-brand-600 dark:text-brand-400 text-lg mb-4'>{invitationInfo.team?.name}</p>
        <p className='text-gray-500 dark:text-night-400 mb-4'>
          por <span className='font-medium'>{invitationInfo.invited_by?.name}</span>
        </p>

        <div className='flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 mb-4'>
          <Loader2 className='w-5 h-5 animate-spin' />
          <span>
            {invitationInfo.user_exists
              ? "Redirigiendo a iniciar sesión..."
              : "Redirigiendo a crear cuenta..."}
          </span>
        </div>

        <div className='bg-gray-50 dark:bg-night-800 rounded-lg p-3'>
          <p className='text-sm text-gray-600 dark:text-night-400'>
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
        <p className='text-gray-500 dark:text-night-400'>Estamos agregándote al equipo, por favor espera un momento.</p>
      </AuthStatusScreen>
    );
  }

  // Estado: Éxito
  if (status === "success") {
    return (
      <AuthStatusScreen
        statusKey='success'
        tone='success'
        icon={CheckCircle2}
        title='¡Bienvenido al equipo!'
      >
        <p className='text-gray-500 dark:text-night-400 mb-4'>{message}</p>
        {teamName && (
          <div className='bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg p-4 mb-4'>
            <div className='flex items-center justify-center gap-2 text-brand-700 dark:text-brand-300'>
              <Users className='w-5 h-5' />
              <span className='font-medium'>{teamName}</span>
            </div>
          </div>
        )}
        <p className='text-sm text-gray-400 dark:text-night-500 mb-4'>
          Serás redirigido a la página de equipos en unos segundos...
        </p>
        <Button variant='brand' className='w-full' onClick={() => navigate("/teams")}>
          Ir a equipos ahora
        </Button>
      </AuthStatusScreen>
    );
  }

  // Estado: Error
  if (status === "error") {
    return (
      <AuthStatusScreen
        statusKey='error'
        tone='error'
        icon={XCircle}
        title='No se pudo aceptar la invitación'
      >
        <p className='text-gray-500 dark:text-night-400 mb-6'>{message}</p>
        <div className='flex gap-3 justify-center'>
          <Button variant='brand' onClick={() => navigate("/login")}>
            Iniciar sesión
          </Button>
          <Button variant='secondary' onClick={() => navigate("/teams")}>
            Ir a equipos
          </Button>
        </div>
      </AuthStatusScreen>
    );
  }

  return null;
};

export default AcceptTeamInvitation;

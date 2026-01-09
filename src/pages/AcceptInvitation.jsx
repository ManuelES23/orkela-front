import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invitationsAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  UserPlus,
  LogIn,
  AlertTriangle,
} from "lucide-react";

const AcceptInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState("loading"); // loading, checking, redirecting, accepting, success, error
  const [message, setMessage] = useState("");
  const [project, setProject] = useState(null);
  const [invitationInfo, setInvitationInfo] = useState(null);
  const isProcessing = useRef(false);

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
          setStatus("accepting");
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
      setStatus("accepting");
      acceptInvitation();
    }
  }, [user, invitationInfo, status]);

  const acceptInvitation = async () => {
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

  // Estado: Verificando invitación
  if (status === "checking" || status === "loading") {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100'>
        <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center'>
          <Loader2 className='w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Verificando invitación...
          </h2>
          <p className='text-gray-600'>Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  // Estado: Redirigiendo a login/register
  if (status === "redirecting" && invitationInfo) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100'>
        <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center'>
          <Mail className='w-16 h-16 text-indigo-600 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Invitación a Proyecto
          </h2>
          <p className='text-gray-600 mb-2'>
            Has sido invitado a unirte al proyecto:
          </p>
          <p className='font-semibold text-indigo-600 text-lg mb-4'>
            {invitationInfo.project?.name}
          </p>
          <p className='text-gray-600 mb-4'>
            por{" "}
            <span className='font-medium'>
              {invitationInfo.invited_by?.name}
            </span>
          </p>

          <div className='flex items-center justify-center gap-2 text-indigo-600 mb-4'>
            <Loader2 className='w-5 h-5 animate-spin' />
            <span>
              {invitationInfo.user_exists
                ? "Redirigiendo a iniciar sesión..."
                : "Redirigiendo a crear cuenta..."}
            </span>
          </div>

          <div className='bg-gray-50 rounded-lg p-3'>
            <p className='text-sm text-gray-600'>
              Email de la invitación:{" "}
              <span className='font-medium'>{invitationInfo.email}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado: Aceptando invitación (usuario autenticado)
  if (status === "accepting") {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center'>
          <Loader2 className='w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Procesando invitación...
          </h2>
          <p className='text-gray-600'>Uniéndote al proyecto</p>
        </div>
      </div>
    );
  }

  // Estado: Éxito
  if (status === "success") {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center'>
          <CheckCircle className='w-16 h-16 text-green-600 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            ¡Invitación Aceptada!
          </h2>
          <p className='text-gray-600 mb-6'>{message}</p>
          {project && (
            <div className='bg-gray-50 rounded-lg p-4 mb-4'>
              <p className='text-sm text-gray-600'>Te uniste al proyecto:</p>
              <p className='font-semibold text-gray-900 mt-1'>{project.name}</p>
            </div>
          )}
          <p className='text-sm text-gray-500'>
            Redirigiendo al proyecto en 3 segundos...
          </p>
        </div>
      </div>
    );
  }

  // Estado: Error
  if (status === "error") {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center'>
          <XCircle className='w-16 h-16 text-red-600 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>Error</h2>
          <p className='text-gray-600 mb-6'>{message}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className='w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition'
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AcceptInvitation;

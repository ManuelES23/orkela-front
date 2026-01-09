import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { teamInvitationsAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Users } from "lucide-react";

const AcceptTeamInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState("loading"); // loading, checking, redirecting, accepting, success, error
  const [message, setMessage] = useState("");
  const [teamName, setTeamName] = useState("");
  const [invitationInfo, setInvitationInfo] = useState(null);
  const isProcessing = useRef(false);

  // Paso 1: Obtener info de la invitación (público, sin auth)
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        setStatus("checking");
        const info = await teamInvitationsAPI.getInfo(token);
        setInvitationInfo(info);
        setTeamName(info.team?.name || "el equipo");

        // Si el usuario ya está autenticado, proceder a aceptar
        if (user) {
          setStatus("accepting");
          await processInvitation();
        } else {
          // Redirigir según si el usuario existe o no
          setStatus("redirecting");

          if (info.user_exists) {
            // Usuario existe -> Login con email pre-llenado
            setTimeout(() => {
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
            setTimeout(() => {
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
  }, [token]);

  // Paso 2: Si el usuario se autentica después de cargar la página
  useEffect(() => {
    if (user && invitationInfo && status === "redirecting") {
      setStatus("accepting");
      processInvitation();
    }
  }, [user, invitationInfo, status]);

  const processInvitation = async () => {
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

  // Estado: Verificando invitación
  if (status === "checking" || status === "loading") {
    return (
      <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4'>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center'
        >
          <Loader2 className='w-16 h-16 mx-auto text-indigo-600 animate-spin mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Verificando invitación...
          </h2>
          <p className='text-gray-600'>Por favor espera un momento</p>
        </motion.div>
      </div>
    );
  }

  // Estado: Redirigiendo a login/register
  if (status === "redirecting" && invitationInfo) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4'>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center'
        >
          <div className='w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6'>
            <Users className='w-12 h-12 text-indigo-600' />
          </div>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Invitación a Equipo
          </h2>
          <p className='text-gray-600 mb-2'>
            Has sido invitado a unirte al equipo:
          </p>
          <p className='font-semibold text-indigo-600 text-lg mb-4'>
            {invitationInfo.team?.name}
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
        </motion.div>
      </div>
    );
  }

  // Estado: Aceptando invitación (usuario autenticado)
  if (status === "accepting") {
    return (
      <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4'>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center'
        >
          <Loader2 className='w-16 h-16 mx-auto text-indigo-600 animate-spin mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Procesando invitación...
          </h2>
          <p className='text-gray-600'>
            Estamos agregándote al equipo, por favor espera un momento.
          </p>
        </motion.div>
      </div>
    );
  }

  // Estado: Éxito
  if (status === "success") {
    return (
      <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4'>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center'
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10 }}
          >
            <div className='w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <CheckCircle2 className='w-12 h-12 text-green-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              ¡Bienvenido al equipo!
            </h2>
            <p className='text-gray-600 mb-4'>{message}</p>
            {teamName && (
              <div className='bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4'>
                <div className='flex items-center justify-center gap-2 text-indigo-700'>
                  <Users className='w-5 h-5' />
                  <span className='font-medium'>{teamName}</span>
                </div>
              </div>
            )}
            <p className='text-sm text-gray-500'>
              Serás redirigido a la página de equipos en unos segundos...
            </p>
            <button
              onClick={() => navigate("/teams")}
              className='mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
            >
              Ir a Equipos ahora
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Estado: Error
  if (status === "error") {
    return (
      <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4'>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center'
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10 }}
          >
            <div className='w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <XCircle className='w-12 h-12 text-red-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              No se pudo aceptar la invitación
            </h2>
            <p className='text-gray-600 mb-6'>{message}</p>
            <div className='flex gap-3 justify-center'>
              <button
                onClick={() => navigate("/login")}
                className='px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => navigate("/teams")}
                className='px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
              >
                Ir a Equipos
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default AcceptTeamInvitation;

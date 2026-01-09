import { motion, AnimatePresence } from "framer-motion";
import { Building2, LogOut, User, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RemovedFromOrgModal = ({
  isOpen,
  organizationName,
  removerName,
  onClose,
}) => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleContinue = async () => {
    try {
      // Refrescar datos del usuario para obtener el estado actualizado (sin organización)
      await refreshUser();
      onClose();
      // Redirigir al dashboard en modo personal
      navigate("/dashboard");
    } catch (err) {
      console.error("Error refreshing user:", err);
      onClose();
      navigate("/dashboard");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - No se puede cerrar haciendo clic afuera */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-100'
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className='fixed inset-0 z-100 flex items-center justify-center p-4'
          >
            <div className='bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden'>
              {/* Header con icono de alerta */}
              <div className='bg-linear-to-br from-orange-500 to-red-500 p-6 text-center'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className='w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4'
                >
                  <Building2 className='w-10 h-10 text-white' />
                </motion.div>
                <h2 className='text-2xl font-bold text-white'>
                  Has sido removido
                </h2>
              </div>

              {/* Contenido */}
              <div className='p-6'>
                <div className='flex items-start gap-3 mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200'>
                  <AlertTriangle className='w-6 h-6 text-orange-500 shrink-0 mt-0.5' />
                  <div>
                    <p className='text-gray-700'>
                      <span className='font-semibold'>
                        {removerName || "Un administrador"}
                      </span>{" "}
                      te ha removido de la organización{" "}
                      <span className='font-semibold text-orange-600'>
                        "{organizationName || "la organización"}"
                      </span>
                    </p>
                    <p className='text-sm text-gray-500 mt-2'>
                      Ya no tienes acceso a los recursos de esta organización.
                    </p>
                  </div>
                </div>

                <div className='space-y-3'>
                  <p className='text-gray-600 text-center'>
                    Continuarás en{" "}
                    <span className='font-semibold'>modo personal</span>, donde
                    podrás:
                  </p>

                  <ul className='space-y-2 text-sm text-gray-600'>
                    <li className='flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 bg-indigo-500 rounded-full' />
                      Acceder a tus proyectos personales
                    </li>
                    <li className='flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 bg-indigo-500 rounded-full' />
                      Ver equipos donde colaboras
                    </li>
                    <li className='flex items-center gap-2'>
                      <div className='w-1.5 h-1.5 bg-indigo-500 rounded-full' />
                      Crear y gestionar tus propios recursos
                    </li>
                  </ul>
                </div>

                {/* Botón de continuar */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  className='w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200'
                >
                  <User className='w-5 h-5' />
                  Continuar en Modo Personal
                </motion.button>

                <p className='text-xs text-gray-400 text-center mt-4'>
                  Si crees que esto es un error, contacta al administrador de la
                  organización.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RemovedFromOrgModal;

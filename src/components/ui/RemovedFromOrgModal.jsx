import { motion } from "framer-motion";
import { Building2, User, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Modal from "./Modal";

const RemovedFromOrgModal = ({
  isOpen,
  organizationName,
  removerName,
  reason = "removed",
  onClose,
}) => {
  // Desactivar a un miembro equivale a expulsarlo: mismo modal, otro texto
  const deactivated = reason === "deactivated";
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleContinue}
      title={deactivated ? "Tu acceso fue desactivado" : "Has sido removido"}
      variant='alert'
      dismissible={false}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className='-order-1 w-20 h-20 bg-linear-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center'
      >
        <Building2 className='w-10 h-10 text-white' />
      </motion.div>

      <div className='w-full flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-200 dark:border-orange-800 text-left'>
        <AlertTriangle className='w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5' />
        <div>
          <p className='text-gray-700 dark:text-night-300'>
            <span className='font-semibold'>{removerName || "Un administrador"}</span>{" "}
            {deactivated
              ? "ha desactivado tu acceso a la organización"
              : "te ha removido de la organización"}{" "}
            <span className='font-semibold text-orange-600 dark:text-orange-400'>
              "{organizationName || "la organización"}"
            </span>
          </p>
          <p className='text-sm text-gray-500 dark:text-night-400 mt-2'>
            Ya no tienes acceso a los recursos de esta organización.
          </p>
        </div>
      </div>

      <div className='w-full space-y-3'>
        <p className='text-gray-600 dark:text-night-300 text-center'>
          Continuarás en <span className='font-semibold'>modo personal</span>, donde podrás:
        </p>

        <ul className='space-y-2 text-sm text-gray-600 dark:text-night-300 text-left'>
          <li className='flex items-center gap-2'>
            <div className='w-1.5 h-1.5 bg-brand-500 rounded-full' />
            Acceder a tus proyectos personales
          </li>
          <li className='flex items-center gap-2'>
            <div className='w-1.5 h-1.5 bg-brand-500 rounded-full' />
            Ver equipos donde colaboras
          </li>
          <li className='flex items-center gap-2'>
            <div className='w-1.5 h-1.5 bg-brand-500 rounded-full' />
            Crear y gestionar tus propios recursos
          </li>
        </ul>
      </div>

      <div className='grid w-full gap-2'>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          className='w-full flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-brand-600 to-brand-700 text-white rounded-xl font-semibold hover:from-brand-700 hover:to-brand-800 transition-all shadow-lg shadow-brand-200'
        >
          <User className='w-5 h-5' />
          Continuar en Modo Personal
        </motion.button>
      </div>

      <p className='text-xs text-gray-400 dark:text-night-500 text-center'>
        Si crees que esto es un error, contacta al administrador de la organización.
      </p>
    </Modal>
  );
};

export default RemovedFromOrgModal;

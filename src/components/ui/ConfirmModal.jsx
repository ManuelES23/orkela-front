import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar acción",
  message = "¿Estás seguro de que deseas continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "danger", // 'danger' | 'warning' | 'info'
  loading = false,
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: Trash2,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      buttonBg: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      buttonBg: "bg-yellow-600 hover:bg-yellow-700",
    },
    info: {
      icon: AlertTriangle,
      iconBg: "bg-brand-100",
      iconColor: "text-brand-600",
      buttonBg: "bg-brand-600 hover:bg-brand-700",
    },
  };

  const styles = typeStyles[type] || typeStyles.danger;
  const Icon = styles.icon;

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50'
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className='fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4'
          >
            <div className='bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden'>
              {/* Header */}
              <div className='p-6 pb-4'>
                <div className='flex items-start gap-4'>
                  {/* Icon */}
                  <div className={`p-3 rounded-full ${styles.iconBg}`}>
                    <Icon className={`w-6 h-6 ${styles.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className='flex-1'>
                    <h3 className='text-lg font-semibold text-gray-900 mb-1'>
                      {title}
                    </h3>
                    <p className='text-gray-600 text-sm'>{message}</p>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className='p-1 hover:bg-gray-100 rounded-full transition-colors'
                  >
                    <X className='w-5 h-5 text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className='px-6 py-4 bg-gray-50 flex gap-3 justify-end'>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className='px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50'
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className={`px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${styles.buttonBg}`}
                >
                  {loading ? (
                    <span className='flex items-center gap-2'>
                      <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                          fill='none'
                        />
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        />
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;

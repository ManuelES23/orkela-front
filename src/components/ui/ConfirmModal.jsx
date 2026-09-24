import { AlertTriangle, Trash2 } from "lucide-react";
import Modal from "./Modal";

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
  const typeStyles = {
    danger: {
      icon: Trash2,
      iconBg: "bg-red-100 dark:bg-red-950/40",
      iconColor: "text-red-600 dark:text-red-400",
      buttonBg: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-yellow-100 dark:bg-yellow-950/40",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      buttonBg: "bg-yellow-600 hover:bg-yellow-700",
    },
    info: {
      icon: AlertTriangle,
      iconBg: "bg-brand-100 dark:bg-brand-900/30",
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
    <Modal isOpen={isOpen} onClose={onClose} title={title} variant='alert'>
      <div className={`-order-1 p-3 rounded-full ${styles.iconBg}`}>
        <Icon className={`w-6 h-6 ${styles.iconColor}`} />
      </div>

      <p className='text-gray-600 dark:text-night-300 text-sm'>{message}</p>

      <div className='grid w-full gap-2'>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`w-full px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${styles.buttonBg}`}
        >
          {loading ? (
            <span className='flex items-center justify-center gap-2'>
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
        <button
          onClick={onClose}
          disabled={loading}
          className='w-full px-4 py-2 text-gray-700 dark:text-night-300 font-medium rounded-lg border border-gray-300 dark:border-night-600 hover:bg-gray-100 dark:hover:bg-night-800 transition-colors disabled:opacity-50'
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Pila de modales abiertos: Escape y Tab solo los atiende el de arriba
// (p. ej. un ConfirmModal abierto encima de un detalle).
const openModals = [];

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Foco inicial, Escape, focus trap y restauración del foco al cerrar
  useEffect(() => {
    if (!isOpen) return undefined;

    const token = {};
    openModals.push(token);
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusables = () => (dialog ? Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)) : []);

    (focusables()[0] ?? dialog)?.focus();

    const handleKeyDown = (event) => {
      if (openModals[openModals.length - 1] !== token) return;

      if (event.key === "Escape") {
        // Un control interno (p. ej. el menú de react-select) ya la usó
        if (event.defaultPrevented) return;
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openModals.splice(openModals.indexOf(token), 1);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-16 sm:pb-4'>
          {/* Backdrop animado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className='absolute inset-0 bg-linear-to-br from-gray-900/60 via-gray-900/50 to-brand-900/40 backdrop-blur-sm'
            onClick={onClose}
            aria-hidden='true'
          />

          {/* Diálogo */}
          <motion.div
            ref={dialogRef}
            role='dialog'
            aria-modal='true'
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              duration: 0.3,
            }}
            className={`relative bg-white dark:bg-night-900 rounded-t-2xl sm:rounded-2xl shadow-2xl ${sizes[size]} w-full max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col focus:outline-none`}
          >
            {/* Header con gradiente */}
            <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-night-700 bg-linear-to-r from-gray-50 to-white dark:from-night-800 dark:to-night-900'>
              <motion.h2
                id={titleId}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-night-50'
              >
                {title}
              </motion.h2>
              <motion.button
                type='button'
                aria-label='Cerrar'
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className='p-2 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
              >
                <X className='w-5 h-5 text-gray-500 dark:text-night-400' aria-hidden='true' />
              </motion.button>
            </div>

            {/* Body con animación de fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className='flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;

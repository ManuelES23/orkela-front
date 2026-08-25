import { X } from "lucide-react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
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
          />

          {/* Modal con animaciones avanzadas */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              duration: 0.3,
            }}
            className={`relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl ${sizes[size]} w-full max-h-[calc(100vh-5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col`}
          >
            {/* Header con gradiente */}
            <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white'>
              <motion.h2
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className='text-lg sm:text-xl font-semibold text-gray-900'
              >
                {title}
              </motion.h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className='p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-200'
              >
                <X className='w-5 h-5 text-gray-500' />
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

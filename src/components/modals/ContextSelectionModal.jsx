import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, User, ArrowRight, Loader2 } from "lucide-react";

/**
 * Modal para seleccionar el contexto inicial después del login
 * Se muestra solo si el usuario tiene múltiples contextos disponibles
 */
const ContextSelectionModal = ({ isOpen, onSelect, user, loading = false }) => {
  const [selectedContext, setSelectedContext] = useState(null);

  if (!isOpen || !user) return null;

  // Extraer datos del usuario
  const userName = user.name || "Usuario";
  const availableContexts = user.available_contexts || [];

  const handleSelect = (contextId) => {
    setSelectedContext(contextId);
  };

  const handleContinue = () => {
    if (selectedContext) {
      onSelect(selectedContext);
    }
  };

  // Icono según el tipo de contexto
  const getContextIcon = (type) => {
    switch (type) {
      case "organization":
        return Building2;
      case "personal":
        return User;
      default:
        return User;
    }
  };

  // Color según el tipo de contexto
  const getContextStyles = (type, isSelected) => {
    const baseStyles = "border-2 transition-all duration-200";

    if (type === "organization") {
      return isSelected
        ? `${baseStyles} border-accent-500 bg-accent-50 ring-2 ring-accent-200`
        : `${baseStyles} border-gray-200 hover:border-accent-300 hover:bg-accent-50/50`;
    }
    return isSelected
      ? `${baseStyles} border-brand-500 bg-brand-50 ring-2 ring-brand-200`
      : `${baseStyles} border-gray-200 hover:border-brand-300 hover:bg-brand-50/50`;
  };

  const getIconBgColor = (type) => {
    return type === "organization" ? "bg-accent-100" : "bg-brand-100";
  };

  const getIconColor = (type) => {
    return type === "organization" ? "text-accent-600" : "text-brand-600";
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
            <div className='bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden'>
              {/* Header */}
              <div className='p-6 pb-4 text-center border-b border-gray-100'>
                <div className='w-16 h-16 bg-gradient-to-br from-brand-500 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                  <User className='w-8 h-8 text-white' />
                </div>
                <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                  ¡Bienvenido, {userName}!
                </h2>
                <p className='text-gray-600'>
                  Selecciona el modo de trabajo con el que deseas comenzar
                </p>
              </div>

              {/* Content */}
              <div className='p-6 space-y-3'>
                {availableContexts.length === 0 ? (
                  <div className='text-center py-4 text-gray-500'>
                    <p>No hay contextos disponibles.</p>
                  </div>
                ) : (
                  availableContexts.map((ctx) => {
                    const Icon = getContextIcon(ctx.type);
                    const isSelected = selectedContext === ctx.id;

                    return (
                      <motion.button
                        key={ctx.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelect(ctx.id)}
                        className={`w-full p-4 rounded-xl text-left ${getContextStyles(
                          ctx.type,
                          isSelected
                        )}`}
                      >
                        <div className='flex items-center gap-4'>
                          <div
                            className={`w-12 h-12 rounded-xl ${getIconBgColor(
                              ctx.type
                            )} flex items-center justify-center`}
                          >
                            <Icon
                              className={`w-6 h-6 ${getIconColor(ctx.type)}`}
                            />
                          </div>
                          <div className='flex-1'>
                            <h3 className='font-semibold text-gray-900'>
                              {ctx.name}
                            </h3>
                            {ctx.description && (
                              <p className='text-sm text-gray-500'>
                                {ctx.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className='w-6 h-6 bg-green-500 rounded-full flex items-center justify-center'
                            >
                              <svg
                                className='w-4 h-4 text-white'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M5 13l4 4L19 7'
                                />
                              </svg>
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className='px-6 py-4 bg-gray-50 border-t border-gray-100'>
                <button
                  onClick={handleContinue}
                  disabled={!selectedContext || loading}
                  className='w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {loading ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Cargando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className='w-5 h-5' />
                    </>
                  )}
                </button>
                <p className='text-xs text-gray-500 text-center mt-3'>
                  Puedes cambiar de modo en cualquier momento desde el menú
                  lateral
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContextSelectionModal;

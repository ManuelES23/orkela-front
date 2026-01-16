import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  User,
  ChevronDown,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

const ContextSwitcher = ({ isCompact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const buttonRef = useRef(null);
  const {
    user,
    switchContext,
    switchingContext,
    hasMultipleContexts,
    getActiveContext,
  } = useAuth();
  const { success, error: showError } = useNotification();

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (isOpen && buttonRef.current && !isCompact) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top - 8, // Posicionar encima del botón con 8px de margen
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen, isCompact]);

  // Solo mostrar si el usuario tiene múltiples contextos
  if (!user || !hasMultipleContexts()) {
    return null;
  }

  const activeContext = getActiveContext();
  const availableContexts = user.available_contexts || [];

  const handleSwitchContext = async (contextId) => {
    if (contextId === user.active_context) {
      setIsOpen(false);
      return;
    }

    try {
      await switchContext(contextId);
      const newContext = availableContexts.find((ctx) => ctx.id === contextId);
      success(`Cambiaste al modo: ${newContext?.name || contextId}`);
      setIsOpen(false);
      // Recargar la página para refrescar todos los datos con el nuevo contexto
      window.location.reload();
    } catch (err) {
      showError(err.message || "Error al cambiar de contexto");
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
        return RefreshCw;
    }
  };

  // Color según el tipo de contexto
  const getContextColor = (type, isActive) => {
    if (type === "organization") {
      return isActive
        ? "bg-purple-100 text-purple-700 border-purple-200"
        : "hover:bg-purple-50 text-purple-600";
    }
    return isActive
      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
      : "hover:bg-indigo-50 text-indigo-600";
  };

  const ActiveIcon = getContextIcon(activeContext?.type);

  // Versión compacta para sidebar colapsado
  if (isCompact) {
    return (
      <div className='relative'>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={switchingContext}
          className={`p-2 rounded-lg transition-all duration-200 ${getContextColor(
            activeContext?.type,
            true
          )}`}
          title={`Modo: ${activeContext?.name}`}
        >
          {switchingContext ? (
            <Loader2 className='w-5 h-5 animate-spin' />
          ) : (
            <ActiveIcon className='w-5 h-5' />
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className='absolute left-full ml-2 bottom-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] z-50'
            >
              <div className='px-3 py-2 border-b border-gray-100'>
                <p className='text-xs text-gray-500 font-medium'>
                  Cambiar modo
                </p>
              </div>
              {availableContexts.map((ctx) => {
                const Icon = getContextIcon(ctx.type);
                const isActive = ctx.id === user.active_context;

                return (
                  <button
                    key={ctx.id}
                    onClick={() => handleSwitchContext(ctx.id)}
                    disabled={switchingContext}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-gray-50 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className='w-4 h-4' />
                    <span className='text-sm flex-1'>{ctx.name}</span>
                    {isActive && <Check className='w-4 h-4 text-green-500' />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Versión expandida para sidebar abierto
  return (
    <div className='relative'>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={switchingContext}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 border ${getContextColor(
          activeContext?.type,
          true
        )}`}
      >
        {switchingContext ? (
          <Loader2 className='w-5 h-5 animate-spin' />
        ) : (
          <ActiveIcon className='w-5 h-5' />
        )}
        <div className='flex-1 text-left'>
          <p className='text-xs text-gray-500'>Modo actual</p>
          <p className='text-sm font-medium truncate'>{activeContext?.name}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              transform: "translateY(-100%)",
            }}
            className='bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[200]'
          >
            <div className='px-3 py-2 border-b border-gray-100'>
              <p className='text-xs text-gray-500 font-medium'>
                Seleccionar modo de trabajo
              </p>
            </div>
            {availableContexts.map((ctx) => {
              const Icon = getContextIcon(ctx.type);
              const isActive = ctx.id === user.active_context;

              return (
                <button
                  key={ctx.id}
                  onClick={() => handleSwitchContext(ctx.id)}
                  disabled={switchingContext}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-all duration-200 ${
                    isActive
                      ? "bg-gray-50 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      ctx.type === "organization"
                        ? "bg-purple-100"
                        : "bg-indigo-100"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        ctx.type === "organization"
                          ? "text-purple-600"
                          : "text-indigo-600"
                      }`}
                    />
                  </div>
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>{ctx.name}</p>
                    {ctx.description && (
                      <p className='text-xs text-gray-500'>{ctx.description}</p>
                    )}
                  </div>
                  {isActive && (
                    <Check className='w-5 h-5 text-green-500 shrink-0' />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay para cerrar el menú al hacer clic fuera */}
      {isOpen && (
        <div
          className='fixed inset-0 z-[199]'
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ContextSwitcher;

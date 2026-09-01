import { useState, useRef } from "react";
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
import { getAssetUrl } from "../../utils/assetUrl";

const ContextSwitcher = ({ isCompact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const {
    user,
    switchContext,
    switchingContext,
    hasMultipleContexts,
    getActiveContext,
  } = useAuth();
  const { success, error: showError } = useNotification();

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
        ? "bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 border-accent-200 dark:border-accent-800"
        : "hover:bg-accent-50 dark:hover:bg-accent-900/20 text-accent-600 dark:hover:bg-accent-900/20 dark:text-accent-400";
    }
    return isActive
      ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800"
      : "hover:bg-brand-50 dark:hover:bg-brand-900/20 text-brand-600 dark:hover:bg-brand-900/20 dark:text-brand-400";
  };

  const ActiveIcon = getContextIcon(activeContext?.type);

  // Renderizar el ícono/logo de un contexto
  const renderContextIcon = (ctx, size = "w-5 h-5") => {
    // Si es organización y tiene logo, mostrar el logo
    if (ctx?.type === "organization" && ctx?.logo) {
      return (
        <img
          src={getAssetUrl(ctx.logo)}
          alt={ctx.name}
          className={`${size} rounded-full object-cover`}
        />
      );
    }
    // Si no hay logo, mostrar inicial para organización
    if (ctx?.type === "organization") {
      return (
        <div
          className={`${size} rounded-full bg-accent-600 flex items-center justify-center text-white font-semibold text-xs`}
        >
          {ctx?.name?.charAt(0).toUpperCase() || "O"}
        </div>
      );
    }
    // Para modo personal, mostrar ícono de usuario
    const Icon = getContextIcon(ctx?.type);
    return <Icon className={size} />;
  };

  // Versión compacta para sidebar colapsado
  if (isCompact) {
    return (
      <div className='relative'>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={switchingContext}
          className='flex items-center justify-center w-full py-3 rounded-lg text-gray-500 hover:bg-gray-50 dark:text-night-400 dark:hover:bg-night-800 transition-colors duration-200'
          title={`Modo: ${activeContext?.name}`}
        >
          {switchingContext ? (
            <Loader2 className='w-5 h-5 animate-spin' />
          ) : (
            renderContextIcon(activeContext, "w-5 h-5")
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className='absolute left-full ml-2 top-0 bg-white dark:bg-night-800 rounded-lg shadow-xl border border-gray-200 dark:border-night-700 py-1 min-w-[180px] z-50'
            >
              <div className='px-3 py-2 border-b border-gray-100 dark:border-night-700'>
                <p className='text-xs text-gray-500 dark:text-night-400 font-medium'>
                  Cambiar modo
                </p>
              </div>
              {availableContexts.map((ctx) => {
                const isActive = ctx.id === user.active_context;

                return (
                  <button
                    key={ctx.id}
                    onClick={() => handleSwitchContext(ctx.id)}
                    disabled={switchingContext}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-gray-50 text-gray-900 dark:bg-night-700 dark:text-night-50"
                        : "text-gray-700 hover:bg-gray-50 dark:text-night-300 dark:hover:bg-night-700"
                    }`}
                  >
                    {renderContextIcon(ctx, "w-4 h-4")}
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
          renderContextIcon(activeContext, "w-5 h-5")
        )}
        <div className='flex-1 text-left'>
          <p className='text-xs text-gray-500 dark:text-night-400'>Modo actual</p>
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
          <>
            {/* Overlay para cerrar el menú al hacer clic fuera */}
            <div
              className='fixed inset-0 z-[199]'
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className='absolute z-[200] bg-white dark:bg-night-800 rounded-lg shadow-xl border border-gray-200 dark:border-night-700 py-1 w-full top-full mt-2'
            >
              <div className='px-3 py-2 border-b border-gray-100 dark:border-night-700'>
                <p className='text-xs text-gray-500 dark:text-night-400 font-medium'>
                  Seleccionar modo de trabajo
                </p>
              </div>
              {availableContexts.map((ctx) => {
                const isActive = ctx.id === user.active_context;

                return (
                  <button
                    key={ctx.id}
                    onClick={() => handleSwitchContext(ctx.id)}
                    disabled={switchingContext}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? "bg-gray-50 text-gray-900 dark:bg-night-700 dark:text-night-50"
                        : "text-gray-700 hover:bg-gray-50 dark:text-night-300 dark:hover:bg-night-700"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        ctx.type === "organization"
                          ? "bg-accent-100 dark:bg-accent-900/30"
                          : "bg-brand-100 dark:bg-brand-900/30"
                      }`}
                    >
                      {renderContextIcon(ctx, "w-4 h-4")}
                    </div>
                    <div className='flex-1'>
                      <p className='text-sm font-medium'>{ctx.name}</p>
                      {ctx.description && (
                        <p className='text-xs text-gray-500 dark:text-night-400'>
                          {ctx.description}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <Check className='w-5 h-5 text-green-500 shrink-0' />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContextSwitcher;

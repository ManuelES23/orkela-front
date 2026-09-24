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

/**
 * Diálogo accesible con dos chromes (decisión de la puerta de diseño: mezcla B + C).
 *
 * - `variant="standard"` (C): cabecera con título y «Cerrar», cuerpo con scroll propio
 *   y, si se pasa `footer`, un pie de acciones fijo que nunca se va de la vista.
 *   En móvil ocupa toda la pantalla (`inset-0`, sin radios) en lugar de hoja inferior.
 * - `variant="alert"` (B): sin cabecera ni «Cerrar». Tarjeta estrecha (448px) centrada,
 *   con el título como `<h2>` real y visible dentro del cuerpo, todo centrado.
 *
 * Contrato del cuerpo en `variant="alert"` (los hijos son items directos del flex centrado):
 * - El icono superior lo pone el diálogo consumidor como hijo con `-order-1`, para que
 *   quede por encima del `<h2>` que renderiza este componente.
 * - El grupo de acciones también lo pone el consumidor, como último hijo y a ancho
 *   completo apilado: `<div className="grid w-full gap-2">` con botones `w-full`.
 *   `Modal` no puede saber cuántos botones ni qué etiquetas tiene cada alerta.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  variant = "standard",
  dismissible = true,
  footer = null,
}) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  // En una ref para no reiniciar el foco inicial ni la trampa de foco al cambiar.
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    dismissibleRef.current = dismissible;
  }, [dismissible]);

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
      // Teclas de otro overlay que no usa esta pila (ConfirmModal,
      // RemovedFromOrgModal) no son de este diálogo. Con el foco perdido
      // (target document/body) sí se atiende: Escape cierra y Tab lo recupera.
      const target = event.target;
      const focusLost = target === document || target === document.body || target === document.documentElement;
      if (!dialog || (!focusLost && !dialog.contains(target))) return;

      if (event.key === "Escape") {
        // Un control interno (p. ej. el menú de react-select) ya la usó
        if (event.defaultPrevented) return;
        // No descartable: Escape no cierra (la salida es un botón del cuerpo)
        if (!dismissibleRef.current) return;
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

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

  const isAlert = variant === "alert";

  // La alerta se queda centrada siempre (no es una hoja que se arrastra).
  // La estándar va a pantalla completa en móvil y a tarjeta centrada desde `sm`.
  const overlayClass = isAlert
    ? "fixed inset-0 z-50 flex items-center justify-center p-4"
    : "fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4";

  const dialogClass = isAlert
    ? "max-w-md rounded-2xl max-h-[90vh]"
    : `${sizes[size]} rounded-none sm:rounded-2xl h-full max-h-none sm:h-auto sm:max-h-[90vh]`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={overlayClass}>
          {/* Backdrop animado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className='absolute inset-0 bg-linear-to-br from-gray-900/60 via-gray-900/50 to-brand-900/40 backdrop-blur-sm'
            onClick={dismissible ? onClose : undefined}
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
            className={`relative bg-white dark:bg-night-900 shadow-2xl w-full overflow-hidden flex flex-col focus:outline-none ${dialogClass}`}
          >
            {/* Header con gradiente — sólo en la variante estándar.
                La alerta no tiene barra de cabecera, así que desaparece la
                contradicción del «Cerrar» en los diálogos no cerrables. */}
            {!isAlert && (
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
                {dismissible && (
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
                )}
              </div>
            )}

            {/* Body con animación de fade. `scroll-py-3` evita que un campo
                enfocado quede pegado al borde del pie fijo. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`flex-1 overflow-y-auto scroll-py-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 ${
                isAlert
                  ? "flex flex-col items-center text-center gap-4 px-6 pt-6 pb-5"
                  : "p-4 sm:p-6"
              }`}
            >
              {/* En la alerta el título es el `<h2>` visible y centrado del cuerpo,
                  y sigue siendo el destino de `aria-labelledby`. */}
              {isAlert && (
                <h2
                  id={titleId}
                  className='m-0 text-xl font-extrabold tracking-tight text-balance text-gray-900 dark:text-night-50'
                >
                  {title}
                </h2>
              )}
              {children}
            </motion.div>

            {/* Pie de acciones fijo (variante C): fuera del área con scroll,
                siempre visible, y respetando la barra inferior del móvil. */}
            {footer && (
              <div className='flex-none flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 dark:border-night-700 bg-gray-50 dark:bg-night-800 px-4 sm:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3'>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;

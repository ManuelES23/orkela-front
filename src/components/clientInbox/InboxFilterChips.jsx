import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

// Propuesta A: los chips reflujan antes de recortarse (nunca scroll horizontal),
// el del cliente va resaltado en marca porque llega desde la ficha del cliente,
// y «Limpiar filtros» es la píldora de trazo discontinuo.
const chipBaseClass =
  "inline-flex flex-none items-center gap-1 min-h-11 rounded-full border pr-1 pl-3 text-[12.5px] font-bold whitespace-nowrap";
const chipToneClass = {
  on: "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/25 dark:text-brand-200",
  off: "border-gray-200 bg-white text-gray-800 dark:border-night-700 dark:bg-night-900 dark:text-night-100",
};

const InboxFilterChips = ({ chips, onRemove, onClearAll }) => {
  const reduceMotion = useReducedMotion();
  if (!chips.length) return null;

  return (
    <div role='group' aria-label='Filtros activos' className='flex flex-wrap items-center gap-2'>
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.span
            key={chip.key}
            layout={!reduceMotion}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className={`${chipBaseClass} ${chip.key === "client" ? chipToneClass.on : chipToneClass.off}`}
          >
            {chip.label}
            <button
              type='button'
              onClick={() => onRemove(chip.key)}
              aria-label={`Quitar filtro ${chip.label}`}
              className='inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-night-800 dark:text-night-300 dark:hover:bg-red-950/40 dark:hover:text-red-400'
            >
              <X className='h-3.5 w-3.5' aria-hidden='true' />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      {chips.length > 1 && (
        <button
          type='button'
          onClick={onClearAll}
          className='inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full border border-dashed border-red-300 px-3 text-[12.5px] font-extrabold whitespace-nowrap text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30'
        >
          <X className='h-3.5 w-3.5' aria-hidden='true' />
          Limpiar filtros
        </button>
      )}
    </div>
  );
};

export default InboxFilterChips;

import { AlertTriangle, Inbox, RefreshCw, X } from "lucide-react";
import { FILTERED_EMPTY_MESSAGE, INBOX_EMPTY_MESSAGES } from "./inboxVocabulary";

// Propuesta A: estados dentro del panel de la lista, con el marco de trazo
// discontinuo y el azulejo de icono del mockup (nunca una pantalla aparte).
const frameClass =
  "grid justify-items-center gap-2.5 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center dark:border-night-700 dark:bg-night-900";
const tileClass = "grid h-9 w-9 place-items-center rounded-xl";

export const InboxError = ({ onRetry }) => (
  <div role='alert' className={frameClass}>
    <span className={`${tileClass} bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400`}>
      <AlertTriangle className='h-[18px] w-[18px]' aria-hidden='true' />
    </span>
    <p className='text-[13px] font-extrabold text-gray-900 dark:text-night-50'>No se pudieron cargar los tickets.</p>
    <button
      type='button'
      onClick={onRetry}
      className='mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 text-[13px] font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
    >
      <RefreshCw className='h-4 w-4' aria-hidden='true' />
      Reintentar
    </button>
  </div>
);

export const InboxEmpty = ({ tab, hasFilters, onClearFilters }) => (
  <div className={frameClass}>
    <span className={`${tileClass} bg-gray-100 text-gray-400 dark:bg-night-800 dark:text-night-400`}>
      <Inbox className='h-[18px] w-[18px]' aria-hidden='true' />
    </span>
    <p className='text-[13px] font-extrabold text-gray-900 dark:text-night-50'>{hasFilters ? FILTERED_EMPTY_MESSAGE : INBOX_EMPTY_MESSAGES[tab]}</p>
    {hasFilters && (
      <button
        type='button'
        onClick={onClearFilters}
        className='inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-red-300 px-3 text-[12.5px] font-extrabold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30'
      >
        <X className='h-3.5 w-3.5' aria-hidden='true' />
        Limpiar filtros
      </button>
    )}
  </div>
);

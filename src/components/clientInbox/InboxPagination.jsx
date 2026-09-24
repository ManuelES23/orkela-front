import { ChevronLeft, ChevronRight } from "lucide-react";

// Propuesta A: pie de la lista con el recuento a la izquierda y el grupo
// Anterior / «Página N de M» / Siguiente a la derecha (centrado en móvil).
const buttonClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-[12.5px] font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-night-600 dark:text-night-100 dark:hover:bg-night-800";

const InboxPagination = ({ meta, onPage }) => {
  if (!meta || meta.last_page <= 1) return null;
  const { current_page: current, last_page: last, from, to, total } = meta;
  const showRange = from != null && to != null && total != null;

  return (
    <nav
      aria-label='Paginación'
      className='flex flex-wrap items-center justify-center gap-3 border-t border-gray-200 pt-3 text-[12.5px] text-gray-500 sm:justify-between dark:border-night-700 dark:text-night-400'
    >
      {showRange && <span>{`Mostrando ${from}–${to} de ${total}`}</span>}
      <div className='flex items-center gap-2'>
        <button type='button' onClick={() => onPage(current - 1)} disabled={current <= 1} className={buttonClass}>
          <ChevronLeft className='h-3.5 w-3.5' aria-hidden='true' />
          Anterior
        </button>
        <span className='px-1 font-bold text-gray-800 dark:text-night-100'>
          Página {current} de {last}
        </span>
        <button type='button' onClick={() => onPage(current + 1)} disabled={current >= last} className={buttonClass}>
          Siguiente
          <ChevronRight className='h-3.5 w-3.5' aria-hidden='true' />
        </button>
      </div>
    </nav>
  );
};

export default InboxPagination;

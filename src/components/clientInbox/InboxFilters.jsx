import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { TICKET_PRIORITY, TICKET_TYPE } from "../../constants/tickets";

// Pausa antes de confirmar la búsqueda en la URL (no se exporta: el archivo
// solo exporta el componente, por react-refresh)
const SEARCH_DEBOUNCE_MS = 300;

// Propuesta A: columna de filtros facetados para el carril izquierdo. Cada
// faceta es un bloque separado por una línea, con su rótulo en versalitas
// (que además es el <label> del control) y el select a todo el ancho. La misma
// pila cabe tal cual en la hoja inferior del móvil.
const facetClass = "border-t border-gray-200 pt-3 dark:border-night-700";
const facetLabelClass = "block text-[10.5px] font-extrabold tracking-[0.07em] text-gray-400 uppercase dark:text-night-400";
const selectClass =
  "w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 text-[12.5px] font-bold text-gray-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-night-600 dark:bg-night-800 dark:text-night-50";

const InboxFilters = ({ filters, teams, teamsError, onRetryTeams, onChange }) => {
  const [draft, setDraft] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);

  // La URL cambió desde fuera (chip quitado, "Limpiar filtros"): el campo la sigue
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    setDraft(filters.q);
  }

  useEffect(() => {
    if (draft === filters.q) return undefined;
    const timer = setTimeout(() => onChange("q", draft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, filters.q, onChange]);

  return (
    <div className='space-y-3'>
      <div className='relative'>
        <label htmlFor='inbox-search' className='sr-only'>
          Buscar tickets
        </label>
        <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-night-400' aria-hidden='true' />
        <input
          id='inbox-search'
          type='search'
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder='Título, cliente o contacto'
          className='w-full min-h-11 rounded-xl border border-gray-200 bg-white pr-3 pl-9 text-[13.5px] font-medium text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-night-600 dark:bg-night-800 dark:text-night-50 dark:placeholder:text-night-400'
        />
      </div>

      <div className={facetClass}>
        <label htmlFor='inbox-priority' className={`${facetLabelClass} mb-2`}>
          Prioridad
        </label>
        <select id='inbox-priority' value={filters.priority} onChange={(event) => onChange("priority", event.target.value)} className={selectClass}>
          <option value=''>Todas</option>
          {Object.entries(TICKET_PRIORITY).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      <div className={facetClass}>
        <label htmlFor='inbox-type' className={`${facetLabelClass} mb-2`}>
          Tipo
        </label>
        <select id='inbox-type' value={filters.type} onChange={(event) => onChange("type", event.target.value)} className={selectClass}>
          <option value=''>Todos</option>
          {Object.entries(TICKET_TYPE).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      <div className={facetClass}>
        <label htmlFor='inbox-team' className={`${facetLabelClass} mb-2`}>
          Equipo
        </label>
        <select
          id='inbox-team'
          value={filters.team}
          disabled={teamsError}
          onChange={(event) => onChange("team", event.target.value)}
          className={selectClass}
        >
          <option value=''>Todos</option>
          {teams.map((team) => (
            <option key={team.id} value={String(team.id)}>
              {team.name}
            </option>
          ))}
        </select>

        {teamsError && (
          <p
            role='alert'
            className='mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
          >
            <AlertTriangle className='h-4 w-4 shrink-0' aria-hidden='true' />
            No se pudieron cargar los equipos.
            <button
              type='button'
              onClick={onRetryTeams}
              aria-label='Reintentar carga de equipos'
              className='inline-flex min-h-9 items-center gap-1.5 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
            >
              <RefreshCw className='h-3.5 w-3.5' aria-hidden='true' />
              Reintentar
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default InboxFilters;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import Layout from "../components/layout/Layout";
import LoadingSwap from "../components/ui/LoadingSwap";
import { SkeletonRows } from "../components/ui/Skeleton";
import TicketDetailModal from "../components/modals/TicketDetailModal";
import InboxTabs from "../components/clientInbox/InboxTabs";
import InboxFilters from "../components/clientInbox/InboxFilters";
import InboxFilterChips from "../components/clientInbox/InboxFilterChips";
import InboxTicketRow from "../components/clientInbox/InboxTicketRow";
import InboxPagination from "../components/clientInbox/InboxPagination";
import { InboxEmpty, InboxError } from "../components/clientInbox/InboxStates";
import { buildInboxChips } from "../components/clientInbox/inboxVocabulary";
import useClientInbox from "../hooks/useClientInbox";
import useTeamOptions from "../hooks/useTeamOptions";
import useOpenFromQuery from "../hooks/useOpenFromQuery";
import { ticketsAPI } from "../utils/api";
import { useNotification } from "../context/NotificationContext";

// Propuesta A, «Lista densa con panel lateral» (.a-bandeja del mockup):
// rejilla de 262 px + resto a partir de lg. El carril izquierdo es una sola
// tarjeta (aside.card.pad.a-rail) con las pestañas de estado en vertical y los
// filtros facetados debajo; a la derecha, la lista densa con su cabecera de
// chips y su pie de paginación. Por debajo de lg la rejilla se pliega a una
// columna: las pestañas pasan a carrusel horizontal (lo resuelve InboxTabs) y
// el mismo bloque de filtros se muestra como hoja inferior (.sheet) tras el
// botón «Filtros» con su contador.
//
// El bloque de filtros se monta UNA sola vez, nunca una copia para móvil y
// otra para escritorio: duplicarlo duplicaría los id y los label de sus
// controles (inbox-search, inbox-priority, inbox-type, inbox-team).
const railLabelClass =
  "mb-2 block text-[10.5px] font-extrabold tracking-[0.07em] text-gray-400 uppercase dark:text-night-400";
const cardClass = "rounded-2xl border border-gray-200 bg-white dark:border-night-700 dark:bg-night-900";
// Hoja inferior en móvil (.sheet + .grab) → bloque normal dentro del carril en lg.
// z-[101] y el velo en z-[100], como MobileMenu: BottomNav es `fixed bottom-0
// … z-50 md:hidden` con una barra opaca de 64 px, así que por debajo de md una
// hoja con menos z queda tapada justo donde está el selector «Equipo» — y el
// toque iría a la barra de navegación en vez de al filtro.
const sheetOpenClass =
  "fixed inset-x-0 bottom-0 z-[101] max-h-[82vh] overflow-y-auto rounded-t-[20px] border border-b-0 border-gray-200 bg-white px-4 pt-1 pb-5 shadow-[0_-12px_34px_-14px_rgba(20,15,32,0.35)] dark:border-night-700 dark:bg-night-900";
const sheetInRailClass =
  "lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none";

const ClientTicketsInbox = () => {
  const inbox = useClientInbox();
  const teamOptions = useTeamOptions();
  const { success, error: showError } = useNotification();
  const reduceMotion = useReducedMotion();
  const listTopRef = useRef(null);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  // Solo por debajo de lg: en lg el carril muestra los filtros siempre
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ?ticket=ID (enlace de notificación): abre el detalle y limpia el parámetro
  useOpenFromQuery("ticket", setSelectedTicket);

  const { reload, filters, setFilter, clearFilters, setTab, setPage } = inbox;

  const teamNameById = useMemo(
    () => Object.fromEntries(teamOptions.teams.map((team) => [String(team.id), team.name])),
    [teamOptions.teams]
  );
  const chips = buildInboxChips(filters, { teamNameById, clientName: inbox.meta.client?.name });

  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  // Escape cierra la hoja de filtros aunque el foco siga en el botón que la abrió
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeFilters();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen, closeFilters]);

  // Al pasar a lg los filtros ya se ven en el carril: dejar la hoja "abierta"
  // la haría reaparecer sola al volver a angostar la ventana.
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const wide = window.matchMedia?.("(min-width: 1024px)");
    if (!wide) return undefined;
    const sync = () => {
      if (wide.matches) closeFilters();
    };
    sync();
    wide.addEventListener?.("change", sync);
    return () => wide.removeEventListener?.("change", sync);
  }, [filtersOpen, closeFilters]);

  const handleAssign = useCallback(
    async (ticketId, teamId) => {
      setAssigningId(ticketId);
      try {
        await ticketsAPI.assignToTeam(ticketId, teamId);
        success("Ticket asignado al equipo");
        reload({ silent: true });
      } catch {
        showError("No se pudo asignar el ticket");
      } finally {
        setAssigningId(null);
      }
    },
    [reload, success, showError]
  );

  const handlePage = (page) => {
    setPage(page);
    listTopRef.current?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const hasPagination = (inbox.meta?.last_page ?? 1) > 1;

  return (
    <Layout title='Bandeja de Clientes' subtitle='Tickets creados desde el portal de clientes'>
      {/* .a-bandeja { grid-template-columns: 262px minmax(0,1fr); gap: 14px; align-items: stretch } */}
      <div className='grid items-stretch gap-3.5 lg:grid-cols-[262px_minmax(0,1fr)]'>
        {/* .a-rail { display: grid; gap: 12px } dentro de aside.card.pad, con
            .a-bandeja>.card{align-content:start}: la tarjeta ocupa el alto de
            la fila pero su contenido se apoya arriba. */}
        <aside
          aria-label='Navegación y filtros de la bandeja'
          className={`grid min-w-0 content-start gap-3 p-3.5 ${cardClass}`}
        >
          <div>
            <h2 className={railLabelClass}>Estado</h2>
            <InboxTabs value={filters.tab} counts={inbox.counts} onChange={setTab} />
          </div>

          {/* En móvil los filtros viven tras este botón con su contador */}
          <button
            type='button'
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls='inbox-facets'
            className='inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 text-[12.5px] font-bold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden dark:border-night-600 dark:text-night-100 dark:hover:bg-night-800'
          >
            <SlidersHorizontal className='h-4 w-4' aria-hidden='true' />
            Filtros
            {chips.length > 0 && (
              <span className='rounded-full bg-gradient-to-r from-brand-600 to-accent-600 px-1.5 py-0.5 text-[11px] font-extrabold text-white tabular-nums'>
                {chips.length}
              </span>
            )}
          </button>

          {/* .scrim: solo acompaña a la hoja inferior del móvil */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
                onClick={closeFilters}
                aria-hidden='true'
                className='fixed inset-0 z-[100] bg-night-950/45 lg:hidden'
              />
            )}
          </AnimatePresence>

          <div id='inbox-facets' className={`${filtersOpen ? sheetOpenClass : "hidden"} lg:block ${sheetInRailClass}`}>
            {/* .grab y la cabecera de la hoja no existen en el carril de lg */}
            <span
              className='mx-auto mb-2 block h-1 w-[42px] rounded-full bg-gray-200 lg:hidden dark:bg-night-700'
              aria-hidden='true'
            />
            <div className='mb-3 flex items-center justify-between gap-2 lg:hidden'>
              <h2 className='text-[15px] font-extrabold text-gray-900 dark:text-night-50'>Filtros</h2>
              <button
                type='button'
                onClick={closeFilters}
                aria-label='Cerrar filtros'
                className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-night-600 dark:text-night-300 dark:hover:bg-night-800'
              >
                <X className='h-4 w-4' aria-hidden='true' />
              </button>
            </div>

            <InboxFilters
              filters={filters}
              teams={teamOptions.teams}
              teamsError={teamOptions.error}
              onRetryTeams={teamOptions.retry}
              onChange={setFilter}
            />

            {/* .clr del carril: lleva el contador, así que su nombre accesible
                («Limpiar filtros (2)») nunca choca con el botón pelado de
                InboxEmpty ni con el de la fila de chips. */}
            {chips.length > 0 && (
              <button
                type='button'
                onClick={() => {
                  clearFilters();
                  closeFilters();
                }}
                className='mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-red-300 px-3 text-[12.5px] font-extrabold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30'
              >
                <X className='h-3.5 w-3.5' aria-hidden='true' />
                {`Limpiar filtros (${chips.length})`}
              </button>
            )}
          </div>
        </aside>

        {/* Lista: tarjeta con cabecera de chips, panel de la pestaña y pie de paginación */}
        <section className={`min-w-0 overflow-hidden ${cardClass}`}>
          {chips.length > 0 && (
            <div className='border-b border-gray-200 p-3.5 dark:border-night-700'>
              <InboxFilterChips chips={chips} onRemove={(key) => setFilter(key, "")} onClearAll={clearFilters} />
            </div>
          )}

          <div ref={listTopRef} id='inbox-panel' role='tabpanel' aria-labelledby={`inbox-tab-${filters.tab}`}>
            <LoadingSwap
              loading={inbox.loading}
              skeleton={
                <div className='p-3.5'>
                  <SkeletonRows count={6} />
                </div>
              }
            >
              {inbox.error ? (
                <div className='p-3.5'>
                  <InboxError onRetry={() => reload()} />
                </div>
              ) : inbox.tickets.length === 0 ? (
                <div className='p-3.5'>
                  <InboxEmpty tab={filters.tab} hasFilters={chips.length > 0} onClearFilters={clearFilters} />
                </div>
              ) : (
                // Las líneas entre filas las pone la lista: el border-b propio de
                // InboxTicketRow se anula al ser hijo único de su <li>.
                <ul aria-label='Tickets de clientes' className='divide-y divide-gray-100 dark:divide-night-800'>
                  <AnimatePresence initial={false} mode='popLayout'>
                    {inbox.tickets.map((ticket) => (
                      <motion.li
                        key={ticket.id}
                        layout={!reduceMotion}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                      >
                        <InboxTicketRow
                          ticket={ticket}
                          teams={teamOptions.teams}
                          onOpen={setSelectedTicket}
                          onAssign={handleAssign}
                          assigning={assigningId === ticket.id}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </LoadingSwap>
          </div>

          {!inbox.error && hasPagination && (
            <div className='px-3.5 pb-3.5'>
              <InboxPagination meta={inbox.meta} onPage={handlePage} />
            </div>
          )}
        </section>
      </div>

      <TicketDetailModal
        isOpen={Boolean(selectedTicket)}
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdate={() => reload({ silent: true })}
      />
    </Layout>
  );
};

export default ClientTicketsInbox;

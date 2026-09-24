import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Plus,
  Search,
  Send,
  Star,
  User,
  UserPlus,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import ClientModal from "../components/modals/ClientModal";
import ContactModal from "../components/modals/ContactModal";
import TicketDetailModal from "../components/modals/TicketDetailModal";
import LoadingSwap from "../components/ui/LoadingSwap";
import DetailPanel from "../components/ui/DetailPanel";
import InboxStatusBadge from "../components/clientInbox/InboxStatusBadge";
import { ClientListSkeleton, ClientDetailSkeleton } from "../components/clients/ClientsSkeleton";
import useClientsDirectory from "../hooks/useClientsDirectory";
import useDebouncedRefresh from "../hooks/useDebouncedRefresh";
import { clientsAPI, contactsAPI } from "../utils/api";
import { useNotification } from "../context/NotificationContext";
import { useMailResult } from "../hooks/useMailResult";

// Propuesta C, «Tabla con vista dividida» (.c-clientes del mockup:
// grid-template-columns: minmax(0,1.25fr) minmax(0,1fr); gap:14px;
// align-items:start): a la izquierda la tabla de clientes con columnas
// comparables y su «Cargar más» centrado debajo; a la derecha la ficha
// completa del cliente seleccionado.
//
// La «tabla» NO es un <table>: cada fila entera tiene que ser un solo
// <button> (así se navega a /clients/:id con un clic o con Enter, y así el
// nombre accesible de la fila es «Acme · Empresa · Activo · 3 tickets»), y un
// <button> que abarque varios <td> es anidamiento inválido. Se resuelve con la
// misma rejilla compartida entre la cabecera y las filas — mismas columnas
// alineadas, sin elemento de tabla — igual que la fila densa de la Bandeja
// (Task 9). Por debajo de md la rejilla pasa a una columna y cada fila se lee
// como tarjeta, tal como pide el mockup móvil: «La tabla se convierte en
// tarjetas: mismas columnas, orden vertical. Nunca hay scroll horizontal».
const TABLE_GRID = "grid-cols-1 md:grid-cols-[minmax(0,1fr)_5.5rem_7rem_6.5rem]";
// .dt th.plain: 10.5px, 800, tracking .06em, mayúsculas, color faint, 44px de alto
const HEAD_CELL = "flex min-h-11 items-center text-[10.5px] font-extrabold tracking-[0.06em] text-gray-400 uppercase dark:text-night-400";
const cardClass = "rounded-2xl border border-gray-200 bg-white dark:border-night-700 dark:bg-night-900";
// Tarjeta interior de la ficha (mockup: border 1px var(--line-2), radio 12px,
// 8–9px/11px de relleno y 56px de alto mínimo)
const INNER_CARD = "rounded-xl border border-gray-100 px-3 py-2 dark:border-night-800";

const typeLabel = (type) => (type === "company" ? "Empresa" : "Individual");
const ticketsLabel = (count) => `${count ?? 0} tickets`;

/** .pill.ok / .pill.arch: estado con color + icono + texto, nunca solo color. */
const StatusPill = ({ status }) =>
  status === "archived" ? (
    <span className='inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-gray-500 dark:border-night-700 dark:bg-night-800 dark:text-night-300'>
      Archivado
    </span>
  ) : (
    <span className='inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-green-700 dark:bg-green-950/40 dark:text-green-400'>
      <CheckCircle2 className='h-2.5 w-2.5 shrink-0' aria-hidden='true' />
      Activo
    </span>
  );

/** .pill.adm del contacto administrador de la cuenta. */
const AdminBadge = () => (
  <span className='inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'>
    <Star className='h-2.5 w-2.5 fill-current' aria-hidden='true' />
    Admin
  </span>
);

/** .av: iniciales del contacto (decorativo, el nombre va al lado en texto). */
const ContactAvatar = ({ name }) => (
  <span
    className='grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-[11px] font-extrabold text-gray-500 dark:bg-night-800 dark:text-night-300'
    aria-hidden='true'
  >
    {(name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase()}
  </span>
);

const ClientsManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { notifyClientMail } = useMailResult();
  const reduceMotion = useReducedMotion();

  const {
    clients,
    meta,
    loading,
    loadingMore,
    error: loadError,
    search,
    setSearch,
    hasMore,
    loadMore,
    upsertClient,
    reload,
  } = useClientsDirectory();

  const [selected, setSelected] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [archivingClient, setArchivingClient] = useState(false);
  // Id del contacto sobre el que hay una acción en vuelo (reenviar acceso,
  // archivar, promover) — deshabilita solo el botón de esa fila, no toda
  // la pantalla.
  const [actioningContactId, setActioningContactId] = useState(null);
  // Ticket reciente abierto en el detalle
  const [openTicket, setOpenTicket] = useState(null);

  const currentIdRef = useRef(id);
  useEffect(() => {
    currentIdRef.current = id;
  }, [id]);

  // silent: recarga en vivo, sin aviso si falla (lo que se ve sigue siendo válido)
  const refreshSelected = useCallback(
    async (targetId, { silent = false } = {}) => {
      try {
        const updated = await clientsAPI.getById(targetId);
        if (String(targetId) === currentIdRef.current) setSelected(updated);
      } catch {
        if (!silent && String(targetId) === currentIdRef.current) {
          showError("No se pudo actualizar el detalle del cliente.");
        }
      }
    },
    [showError]
  );

  // organization.sync 'client' / 'client_ticket': la ficha abierta se refresca
  // (la lista la recarga useClientsDirectory)
  useDebouncedRefresh(["clients"], () => {
    if (currentIdRef.current) refreshSelected(currentIdRef.current, { silent: true });
  });

  const handleLoadMore = async () => {
    try {
      await loadMore();
    } catch {
      showError("No se pudieron cargar más clientes");
    }
  };

  useEffect(() => {
    if (!id) {
      setSelected(null);
      setSelectedLoading(false);
      return;
    }
    let cancelled = false;
    setSelectedLoading(true);
    clientsAPI
      .getById(id)
      .then((client) => {
        if (!cancelled) setSelected(client);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      })
      .finally(() => {
        if (!cancelled) setSelectedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleToggleArchiveClient = async () => {
    if (!selected) return;
    const targetId = selected.id;
    const archiving = selected.status === "active";
    setArchivingClient(true);
    try {
      if (archiving) {
        await clientsAPI.archive(targetId);
        success("Cliente archivado");
      } else {
        await clientsAPI.update(targetId, { status: "active" });
        success("Cliente reactivado");
      }
      upsertClient({ id: targetId, status: archiving ? "archived" : "active" });
      refreshSelected(targetId);
    } catch {
      showError("No se pudo actualizar el estado del cliente");
    } finally {
      setArchivingClient(false);
    }
  };

  const handleClientSaved = (saved) => {
    const wasEditing = Boolean(editingClient);
    setIsClientModalOpen(false);
    setEditingClient(null);
    if (saved?.id) upsertClient(saved);
    // Alta: abrir el recién creado; edición: refrescar la ficha abierta
    if (!wasEditing && saved?.id) {
      navigate(`/clients/${saved.id}`);
      return;
    }
    if (selected) refreshSelected(selected.id);
  };

  const handleContactSaved = () => {
    setIsContactModalOpen(false);
    setEditingContact(null);
    if (selected) refreshSelected(selected.id);
  };

  const handleResendAccess = async (contactId) => {
    setActioningContactId(contactId);
    try {
      const result = await contactsAPI.resendAccess(contactId);
      notifyClientMail(result, "Enlace de acceso reenviado");
    } catch {
      showError("No se pudo reenviar el acceso");
    } finally {
      setActioningContactId(null);
    }
  };

  const handleToggleArchiveContact = async (contact) => {
    setActioningContactId(contact.id);
    try {
      if (contact.status === "active") {
        await contactsAPI.archive(contact.id);
        success("Contacto archivado");
      } else {
        await contactsAPI.update(contact.id, { status: "active" });
        success("Contacto reactivado");
      }
      if (selected) refreshSelected(selected.id);
    } catch {
      showError("No se pudo actualizar el estado del contacto");
    } finally {
      setActioningContactId(null);
    }
  };

  const handlePromote = async (contactId) => {
    setActioningContactId(contactId);
    try {
      await contactsAPI.promote(contactId);
      success("Contacto promovido a admin");
      if (selected) refreshSelected(selected.id);
    } catch {
      showError("No se pudo promover al contacto");
    } finally {
      setActioningContactId(null);
    }
  };

  // «38 clientes · 6 cargados» del mockup: el total lo manda el servidor y
  // «cargados» solo aparece mientras falten páginas por traer.
  const total = meta.total ?? 0;
  const countLabel = `${total === 1 ? "1 cliente" : `${total} clientes`}${
    clients.length < total ? ` · ${clients.length} cargados` : ""
  }`;

  return (
    <Layout title='Clientes' subtitle='Empresas e individuos con acceso al portal de soporte'>
      {/* .ph de la propuesta C: título + recuento a la izquierda, buscador de
          ~320px y «Nuevo cliente» a la derecha. */}
      <div className='mb-3.5 flex flex-wrap items-center gap-3'>
        <div className='min-w-0 flex-1'>
          <h2 className='text-[15px] font-extrabold text-gray-900 dark:text-night-50'>Clientes</h2>
          <p className='mt-0.5 text-[12px] font-bold text-gray-400 dark:text-night-400' role='status' aria-live='polite'>
            {countLabel}
          </p>
        </div>

        {/* .srch: la búsqueda es del servidor (cliente, contacto o correo) */}
        <div className='relative order-last w-full sm:order-none sm:w-auto sm:flex-[0_1_320px]'>
          <label htmlFor='clients-search' className='sr-only'>
            Buscar clientes
          </label>
          <Search
            className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-night-500'
            aria-hidden='true'
          />
          <input
            id='clients-search'
            type='search'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Cliente, contacto o correo'
            className='min-h-11 w-full rounded-xl border border-gray-200 pr-3 pl-9 text-[13px] focus:ring-2 focus:ring-brand-500 focus:outline-none dark:border-night-600 dark:bg-night-800 dark:text-night-50 dark:placeholder-night-500'
          />
        </div>

        <button
          type='button'
          onClick={() => {
            setEditingClient(null);
            setIsClientModalOpen(true);
          }}
          className='inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[13px] font-extrabold text-white transition-colors hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none'
        >
          <Plus className='h-4 w-4' aria-hidden='true' />
          Nuevo cliente
        </button>
      </div>

      {/* .c-clientes { grid-template-columns: minmax(0,1.25fr) minmax(0,1fr);
          gap: 14px; align-items: start } — por debajo de lg, una sola columna:
          con :id se ve solo la ficha y sin :id solo la tabla. */}
      <div className='grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]'>
        <section
          aria-label='Directorio de clientes'
          className={`${id ? "hidden lg:grid" : "grid"} min-w-0 content-start gap-3`}
        >
          {/* .tw: la tabla vive dentro de una tarjeta con las esquinas recortadas */}
          <div className={`overflow-hidden ${cardClass}`}>
            {/* Cabecera de columnas: texto plano, no botones — ordenar no entra
                en esta tarea y una cabecera pulsable que no ordena nada sería
                mentira. Comparte rejilla y relleno con las filas para que las
                columnas queden alineadas. */}
            <div
              className={`hidden border-b border-b-gray-200 border-l-[3px] border-l-transparent bg-gray-50 px-3 md:grid md:gap-x-3 dark:border-b-night-700 dark:bg-night-800/60 ${TABLE_GRID}`}
            >
              <span className={HEAD_CELL}>Cliente</span>
              <span className={HEAD_CELL}>Tipo</span>
              <span className={HEAD_CELL}>Estado</span>
              <span className={`${HEAD_CELL} md:justify-end`}>Tickets</span>
            </div>

            <LoadingSwap loading={loading} skeleton={<ClientListSkeleton />}>
              {loadError ? (
                <div role='alert' className='space-y-3 p-6 text-center text-sm text-gray-500 dark:text-night-400'>
                  <p>No se pudieron cargar los clientes.</p>
                  <button
                    type='button'
                    onClick={() => reload()}
                    className='inline-flex min-h-11 items-center rounded-xl bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none'
                  >
                    Reintentar
                  </button>
                </div>
              ) : clients.length === 0 ? (
                <div className='p-6 text-center text-sm text-gray-500 dark:text-night-400'>
                  {search.trim()
                    ? "Ningún cliente coincide con la búsqueda."
                    : "Aún no hay clientes. Da de alta el primero con el botón +."}
                </div>
              ) : (
                <AnimatePresence initial={false} mode='popLayout'>
                  {clients.map((c) => {
                    const isCurrent = Number(id) === c.id;
                    const TypeIcon = c.type === "company" ? Building2 : User;
                    return (
                      <motion.button
                        key={c.id}
                        type='button'
                        layout={!reduceMotion}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        onClick={() => navigate(`/clients/${c.id}`)}
                        aria-current={isCurrent ? "page" : undefined}
                        // tr[aria-selected=true] del mockup: relleno de marca y
                        // un filete de 3px a la izquierda (inset 3px 0 0
                        // var(--brand)); las no seleccionadas reservan ese
                        // filete en transparente para no descuadrar.
                        className={`block w-full border-b border-b-gray-100 border-l-[3px] px-3 py-2.5 text-left transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:border-b-night-800 ${
                          isCurrent
                            ? "border-l-brand-600 bg-brand-50 dark:border-l-brand-500 dark:bg-brand-900/20"
                            : "border-l-transparent hover:bg-gray-50 dark:hover:bg-night-800/60"
                        } ${c.status === "archived" ? "opacity-60" : ""}`}
                      >
                        <span className={`grid items-center gap-x-3 gap-y-1 md:gap-y-0 ${TABLE_GRID}`}>
                          {/* Cliente (.dt td.b) */}
                          <span className='flex min-w-0 items-center gap-1.5'>
                            <TypeIcon
                              className='h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-night-500'
                              aria-hidden='true'
                            />
                            <span
                              className={`truncate text-[13px] font-extrabold ${
                                isCurrent ? "text-brand-700 dark:text-brand-300" : "text-gray-900 dark:text-night-50"
                              }`}
                            >
                              {c.name}
                            </span>
                          </span>
                          {/* Tipo (.mu) */}
                          <span className='truncate text-[12px] text-gray-500 dark:text-night-400'>
                            {typeLabel(c.type)}
                          </span>
                          {/* Estado (.pill) */}
                          <span className='flex min-w-0'>
                            <StatusPill status={c.status} />
                          </span>
                          {/* Tickets (.mu.nowrap, alineado a la derecha). El
                              espacio explícito importa: JSX se come el salto de
                              línea entre el <span> del número y la palabra, y
                              la fila tiene que leerse «3 tickets». */}
                          <span className='flex items-center gap-1 text-[12px] whitespace-nowrap text-gray-500 md:justify-end dark:text-night-400'>
                            <span className='font-extrabold text-gray-700 tabular-nums dark:text-night-200'>
                              {c.tickets_count ?? 0}
                            </span>{" "}
                            tickets
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              )}
            </LoadingSwap>
          </div>

          {/* Pie de la tabla del mockup: «Cargar más» centrado (min 200px) con
              «6 de 38 clientes» debajo. */}
          {!loadError && hasMore && clients.length > 0 && (
            <div className='grid justify-items-center gap-1.5'>
              <button
                type='button'
                onClick={handleLoadMore}
                disabled={loadingMore}
                aria-label='Cargar más clientes'
                className='inline-flex min-h-11 min-w-[200px] items-center justify-center rounded-xl border border-gray-200 px-4 text-[12.5px] font-extrabold text-brand-600 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:opacity-50 dark:border-night-600 dark:text-brand-400 dark:hover:bg-night-800'
              >
                {loadingMore ? "Cargando…" : "Cargar más"}
              </button>
              <span className='text-[11.5px] font-bold text-gray-400 dark:text-night-400'>
                {`${clients.length} de ${total} clientes`}
              </span>
            </div>
          )}
        </section>

        {/* aside.card.pad: la ficha del cliente seleccionado. Por debajo de lg
            ocupa la pantalla entera y se vuelve con «Volver a clientes». */}
        <section
          aria-label='Ficha del cliente'
          className={`${id ? "block" : "hidden lg:block"} min-w-0 p-4 md:p-5 ${cardClass}`}
        >
          {id && (
            <Link
              to='/clients'
              className='mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-600 lg:hidden dark:text-brand-400'
            >
              <ArrowLeft className='h-4 w-4' aria-hidden='true' />
              Volver a clientes
            </Link>
          )}

          <LoadingSwap loading={selectedLoading} skeleton={<ClientDetailSkeleton />}>
            {!selected ? (
              <div className='grid min-h-[220px] place-items-center text-sm text-gray-400 dark:text-night-500'>
                Selecciona un cliente para ver su detalle
              </div>
            ) : (
              <DetailPanel panelKey={selected.id}>
                {/* Cabecera: nombre + pastilla de estado, «Empresa · N tickets»
                    debajo y las acciones a la derecha. */}
                <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h2 className='text-[19px] font-extrabold text-gray-900 dark:text-night-50'>{selected.name}</h2>
                      <StatusPill status={selected.status} />
                    </div>
                    <p className='mt-1 text-[12.5px] text-gray-500 dark:text-night-400'>
                      {`${typeLabel(selected.type)} · ${ticketsLabel(selected.tickets_count)}`}
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setEditingClient(selected);
                        setIsClientModalOpen(true);
                      }}
                      className='inline-flex min-h-11 items-center rounded-xl border border-gray-200 px-3 text-[12.5px] font-extrabold text-gray-800 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:border-night-600 dark:text-night-100 dark:hover:bg-night-800'
                    >
                      Editar
                    </button>
                    <button
                      type='button'
                      onClick={handleToggleArchiveClient}
                      disabled={archivingClient}
                      className='inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-[12.5px] font-extrabold text-gray-800 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-night-600 dark:text-night-100 dark:hover:bg-night-800'
                    >
                      {selected.status === "active" ? (
                        <>
                          <Archive className='h-3.5 w-3.5' aria-hidden='true' />
                          Archivar
                        </>
                      ) : (
                        <>
                          <ArchiveRestore className='h-3.5 w-3.5' aria-hidden='true' />
                          Reactivar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {selected.notes && (
                  <p className='mb-5 rounded-xl bg-gray-50 p-3 text-[12.5px] text-gray-600 dark:bg-night-800 dark:text-night-300'>
                    {selected.notes}
                  </p>
                )}

                <div className='mb-2 flex items-center justify-between gap-2'>
                  <h3 className='text-[13.5px] font-extrabold text-gray-800 dark:text-night-100'>Contactos</h3>
                  <button
                    type='button'
                    onClick={() => {
                      setEditingContact(null);
                      setIsContactModalOpen(true);
                    }}
                    disabled={selected.status !== "active"}
                    title={selected.status !== "active" ? "Reactiva el cliente para agregar contactos" : undefined}
                    className='inline-flex min-h-11 items-center gap-1 text-[12.5px] font-extrabold text-brand-600 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300'
                  >
                    <UserPlus className='h-3.5 w-3.5' aria-hidden='true' />
                    Agregar contacto
                  </button>
                </div>
                <div className='mb-5 grid gap-2'>
                  {(selected.contacts || []).map((contact) => (
                    <div
                      key={contact.id}
                      className={`flex min-h-14 flex-wrap items-center justify-between gap-2 ${INNER_CARD} ${
                        contact.status === "archived" ? "opacity-60" : ""
                      }`}
                    >
                      <div className='flex min-w-0 items-center gap-2.5'>
                        <ContactAvatar name={contact.name} />
                        <div className='min-w-0'>
                          <p className='flex items-center gap-1.5 truncate text-[13px] font-extrabold text-gray-900 dark:text-night-50'>
                            <span className='truncate'>{contact.name}</span>
                            {contact.is_admin && <AdminBadge />}
                          </p>
                          <p className='truncate text-[11.5px] text-gray-500 dark:text-night-400'>{contact.email}</p>
                        </div>
                      </div>
                      <div className='flex shrink-0 items-center gap-1'>
                        {!contact.is_admin && contact.status === "active" && (
                          <button
                            type='button'
                            onClick={() => handlePromote(contact.id)}
                            disabled={actioningContactId === contact.id}
                            className='px-1.5 text-[11.5px] font-extrabold text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400'
                          >
                            Hacer admin
                          </button>
                        )}
                        <button
                          type='button'
                          onClick={() => {
                            setEditingContact(contact);
                            setIsContactModalOpen(true);
                          }}
                          className='px-1.5 text-[11.5px] font-extrabold text-gray-500 hover:text-gray-700 dark:text-night-400 dark:hover:text-night-200'
                        >
                          Editar
                        </button>
                        <button
                          type='button'
                          onClick={() => handleResendAccess(contact.id)}
                          disabled={
                            actioningContactId === contact.id ||
                            contact.status !== "active" ||
                            selected.status !== "active"
                          }
                          aria-label='Reenviar acceso'
                          title={selected.status !== "active" ? "Reactiva el cliente para reenviar el acceso" : undefined}
                          className='p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-night-500 dark:hover:text-night-200'
                        >
                          <Send className='h-3.5 w-3.5' aria-hidden='true' />
                        </button>
                        <button
                          type='button'
                          onClick={() => handleToggleArchiveContact(contact)}
                          disabled={actioningContactId === contact.id}
                          aria-label={contact.status === "active" ? "Archivar contacto" : "Reactivar contacto"}
                          className='p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40 dark:text-night-500 dark:hover:text-night-200'
                        >
                          {contact.status === "active" ? (
                            <Archive className='h-3.5 w-3.5' aria-hidden='true' />
                          ) : (
                            <ArchiveRestore className='h-3.5 w-3.5' aria-hidden='true' />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='mb-2 flex items-center justify-between gap-2'>
                  <h3 className='text-[13.5px] font-extrabold text-gray-800 dark:text-night-100'>Tickets recientes</h3>
                  <Link
                    to={`/client-tickets?client=${selected.id}&tab=todos`}
                    className='inline-flex min-h-11 items-center gap-1 text-[12.5px] font-extrabold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
                  >
                    Ver todos
                    <ChevronRight className='h-3.5 w-3.5' aria-hidden='true' />
                  </Link>
                </div>
                {(selected.tickets || []).length === 0 ? (
                  <p className='text-[12.5px] text-gray-400 dark:text-night-500'>Este cliente aún no tiene tickets.</p>
                ) : (
                  <div className='grid gap-2'>
                    {selected.tickets.slice(0, 5).map((t) => (
                      // La fila entera abre el modal: es el atajo que ya traía
                      // la fase 1 y el nombre accesible del botón es el título.
                      <button
                        key={t.id}
                        type='button'
                        onClick={() => setOpenTicket(t)}
                        className={`block w-full min-h-14 text-left transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:hover:bg-night-800/60 ${INNER_CARD}`}
                      >
                        <span className='block truncate text-[13px] font-extrabold text-gray-900 dark:text-night-50'>
                          {t.title}
                        </span>
                        <span className='mt-1 flex flex-wrap items-center gap-2'>
                          <InboxStatusBadge status={t.status} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </DetailPanel>
            )}
          </LoadingSwap>
        </section>
      </div>

      <ClientModal
        isOpen={isClientModalOpen}
        client={editingClient}
        onClose={() => setIsClientModalOpen(false)}
        onSaved={handleClientSaved}
      />
      <ContactModal
        isOpen={isContactModalOpen}
        client={selected}
        contact={editingContact}
        onClose={() => setIsContactModalOpen(false)}
        onSaved={handleContactSaved}
      />
      <TicketDetailModal
        isOpen={Boolean(openTicket)}
        onClose={() => setOpenTicket(null)}
        ticket={openTicket}
        onUpdate={() => selected && refreshSelected(selected.id)}
      />
    </Layout>
  );
};

export default ClientsManagement;

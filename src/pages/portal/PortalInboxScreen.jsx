import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import PortalLayout from "../../components/portal/PortalLayout";
import PortalInbox from "../../components/portal/PortalInbox";
import PortalThread from "../../components/portal/PortalThread";
import PortalNewTicketModal from "../../components/portal/PortalNewTicketModal";
import PortalTicketDetailsPanel from "../../components/portal/PortalTicketDetailsPanel";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { portalAPI, getPortalToken } from "../../utils/portalApi";
import { getPortalEcho, disconnectPortalEcho, updatePortalEchoAuth } from "../../utils/echo";
import { applyTicketNotification } from "../../utils/portalTicketNotifications";
import { mergeComments, mergeTicketDetail } from "../../utils/portalComments";
import { modalBackdropVariants, slideVariants } from "../../components/animations/variants";

const PortalInboxScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  // Error del detalle, separado de la carga: "not_found" (404) o "failed".
  const [detailError, setDetailError] = useState(null);
  // Se incrementa con "Reintentar" para volver a pedir el mismo ticket.
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactId, setContactId] = useState(null);
  const [isClientAdmin, setIsClientAdmin] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsCloseButtonRef = useRef(null);
  const detailsTriggerRef = useRef(null);

  const selectedId = id ? Number(id) : null;

  // El drawer de detalles es por-ticket — cambiar de ticket no debe dejar
  // el panel de uno abierto sobre la conversación del siguiente.
  useEffect(() => {
    setDetailsOpen(false);
  }, [selectedId]);

  const openDetails = () => {
    // Guarda qué tenía el foco (el botón "i" del hilo) para devolvérselo al
    // cerrar — sin esto, cerrar el drawer deja el foco del teclado en el
    // vacío.
    detailsTriggerRef.current = document.activeElement;
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    detailsTriggerRef.current?.focus?.();
  };

  // Semántica mínima de diálogo modal para el drawer: foco al abrir, Escape
  // para cerrar. No implementa un focus-trap completo (Tab cíclico dentro
  // del panel) — el panel es de solo lectura y corto, así que perder el
  // foco hacia el resto de la página vía Tab es una degradación aceptable,
  // no una trampa de teclado.
  useEffect(() => {
    if (!detailsOpen) return;

    detailsCloseButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeDetails();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsOpen]);

  // Ref con el ticket seleccionado "actual" — necesario porque las promesas
  // en vuelo (fetch de ticket, envío de comentario) capturan el valor de
  // `selectedId` del momento en que arrancaron, y para cuando resuelven el
  // usuario puede haber cambiado de ticket. Leer `selectedIdRef.current` en
  // el callback de resolución, en vez del `selectedId` cerrado en la
  // promesa, es lo que permite detectar ese cambio.
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // El listener del canal vive mientras dure el canal (no se recrea por
  // contacto): lee el id del contacto desde un ref.
  const contactIdRef = useRef(null);
  useEffect(() => {
    contactIdRef.current = contactId;
  }, [contactId]);

  // Extraído para poder reintentar desde el botón de error sin duplicar
  // lógica. Lee `selectedIdRef.current` (no `selectedId` cerrado) porque
  // también se invoca desde el mount effect antes de que exista un render
  // posterior que capture el valor correcto.
  const loadMe = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    portalAPI
      .me()
      .then((data) => {
        setContactId(data.contact.id);
        setIsClientAdmin(Boolean(data.contact.is_admin));
        setClientId(data.contact.client?.id ?? null);
        setTickets(data.tickets);
        setOrganization(data.organization);
        setLoading(false);
        if (!selectedIdRef.current && data.tickets.length > 0) {
          navigate(`/portal/tickets/${data.tickets[0].id}`, { replace: true });
        }
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    loadMe();
    // Solo debe correr al montar — la selección se maneja aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDetailError(null);
    if (!selectedId) {
      setSelectedTicket(null);
      return;
    }
    // Guarda contra la carrera de "cambiar de ticket rápido": si el usuario
    // selecciona A y luego B antes de que la respuesta de A llegue, la
    // resolución de A ya no debe pisar el ticket B que se está mostrando.
    let cancelled = false;
    portalAPI
      .getTicket(selectedId)
      .then((ticket) => {
        if (!cancelled) setSelectedTicket(ticket);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err?.status === 404 ? "not_found" : "failed");
      });
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, has_unread: false } : t))
    );
    return () => {
      cancelled = true;
    };
  }, [selectedId, detailAttempt]);

  // Canal en vivo: el admin del Cliente escucha el canal del Cliente (ve
  // los tickets de sus colegas, B3); el resto, el propio. El evento llega a
  // ambos canales, así que se escucha uno solo para no duplicar.
  const channelName = contactId
    ? isClientAdmin && clientId
      ? `client-portal-client.${clientId}`
      : `client-portal.${contactId}`
    : null;

  // Solo depende del canal (B10): antes se abandonaba y volvía a suscribir
  // en cada clic de ticket, perdiendo eventos en el intervalo.
  useEffect(() => {
    if (!channelName) return;

    const token = getPortalToken();
    const echo = getPortalEcho(token);
    // La instancia de Echo es un singleton: si se creó con otra sesión (se
    // canjeó otro enlace en esta pestaña), se le pasa la actual. La
    // renovación deslizante no cambia el token, solo su vencimiento.
    updatePortalEchoAuth(token);
    const channel = echo.private(channelName);

    // Recarga el ticket abierto sin pisar comentarios ya añadidos por el POST.
    const refreshSelected = (ticketId) => {
      portalAPI
        .getTicket(ticketId)
        .then((fresh) => {
          if (selectedIdRef.current !== ticketId) return;
          setSelectedTicket((prev) => mergeTicketDetail(prev, fresh));
        })
        .catch(() => {});
    };

    channel.listen(".client-notification", (payload) => {
      // Contacto o Cliente archivado: el backend ya borró la sesión. Se
      // cierra aquí sin esperar al próximo 401. El admin escucha el canal del
      // Cliente y recibe también las revocaciones de sus colegas.
      if (payload.type === "session_revoked") {
        if (payload.data?.contact_id === contactIdRef.current) {
          window.dispatchEvent(new CustomEvent("portal:unauthorized"));
        }
        return;
      }

      const ticketId = payload.data?.ticket_id;
      if (!ticketId) return;

      if (payload.type === "status_changed" || payload.type === "ticket_assigned") {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? applyTicketNotification(t, payload) : t))
        );
        if (ticketId === selectedIdRef.current) {
          refreshSelected(ticketId);
        }
      }

      if (payload.type === "comment_added") {
        if (ticketId === selectedIdRef.current) {
          refreshSelected(ticketId);
        } else {
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, has_unread: true } : t))
          );
        }
      }
    });

    return () => {
      echo.leave(channelName);
    };
  }, [channelName]);

  useEffect(() => {
    return () => disconnectPortalEcho();
  }, []);

  const handleSendComment = async (content) => {
    // Captura a qué ticket se manda este comentario — si el usuario cambia
    // de ticket antes de que la petición resuelva, no debe terminar
    // apareciendo en el hilo que quedó visible.
    const targetId = selectedId;
    setSending(true);
    try {
      const comment = await portalAPI.addComment(targetId, content);
      if (selectedIdRef.current === targetId) {
        setSelectedTicket((prev) =>
          prev && prev.id === targetId
            ? { ...prev, comments: mergeComments(prev.comments, [comment]) }
            : prev
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleCreateTicket = async (ticketData) => {
    const ticket = await portalAPI.createTicket(ticketData);
    setTickets((prev) => [ticket, ...prev]);
    setIsModalOpen(false);
    navigate(`/portal/tickets/${ticket.id}`);
  };

  if (loading) {
    return (
      <PortalLayout organization={organization}>
        <LoadingScreen message='Cargando tus tickets...' fullScreen={false} className='flex-1' />
      </PortalLayout>
    );
  }

  if (loadError) {
    return (
      <PortalLayout organization={organization}>
        <div className='flex-1 flex items-center justify-center p-6'>
          <div className='text-center'>
            <p className='text-gray-900 dark:text-night-50 font-semibold mb-2'>
              No pudimos cargar tus tickets
            </p>
            <p className='text-gray-500 dark:text-night-400 text-sm max-w-sm mb-4'>
              Ocurrió un problema al conectar con el servidor. Intenta de
              nuevo.
            </p>
            <button
              onClick={loadMe}
              className='px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors'
            >
              Reintentar
            </button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout organization={organization}>
      <div className='flex-1 flex min-h-0'>
        <div
          className={`w-full md:w-80 border-r border-gray-200 dark:border-night-700 shrink-0 ${
            selectedId ? "hidden md:block" : "block"
          }`}
        >
          <PortalInbox
            tickets={tickets}
            selectedId={selectedId}
            onSelect={(ticketId) => navigate(`/portal/tickets/${ticketId}`)}
            onNewTicket={() => setIsModalOpen(true)}
          />
        </div>
        <div className={`flex-1 min-w-0 ${selectedId ? "flex" : "hidden md:flex"}`}>
          <PortalThread
            key={selectedId}
            ticketId={selectedId}
            ticket={selectedTicket?.id === selectedId ? selectedTicket : null}
            error={detailError}
            onRetry={() => setDetailAttempt((n) => n + 1)}
            onBack={() => navigate("/portal/dashboard")}
            onSendComment={handleSendComment}
            sending={sending}
            onShowDetails={openDetails}
          />
        </div>
        {selectedId && !detailError && (
          <div className='hidden lg:block w-72 border-l border-gray-200 dark:border-night-700 shrink-0 overflow-y-auto'>
            <PortalTicketDetailsPanel
              ticket={selectedTicket?.id === selectedId ? selectedTicket : null}
            />
          </div>
        )}
      </div>
      <PortalNewTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateTicket}
      />
      {/*
        AnimatePresence's direct child must itself be a motion component with
        an `exit` — that's how it gets told the exit finished and it's safe
        to unmount. An earlier version wrapped the backdrop+panel motion.divs
        in a plain <div>: the nested exits visually finished (opacity 0,
        translated off-screen — confirmed live) but AnimatePresence never
        unmounted the plain wrapper, so the full-screen backdrop stayed in
        the DOM and kept swallowing clicks on the thread underneath long
        after the drawer looked closed. Mirrors PortalNewTicketModal.jsx's
        already-working shape: outer motion.div *is* the backdrop, panel
        nests inside it as its own motion.div.
      */}
      <AnimatePresence>
        {detailsOpen && selectedTicket?.id === selectedId && (
          <motion.div
            variants={modalBackdropVariants}
            initial='hidden'
            animate='visible'
            exit='hidden'
            className='fixed inset-0 z-50 bg-black/40 lg:hidden'
            onClick={closeDetails}
          >
            <motion.div
              variants={slideVariants.right}
              initial='initial'
              animate='animate'
              exit='exit'
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              role='dialog'
              aria-modal='true'
              aria-label='Detalles del ticket'
              onClick={(event) => event.stopPropagation()}
              className='absolute right-0 top-0 h-full w-full max-w-xs bg-white dark:bg-night-900 shadow-xl overflow-y-auto'
            >
              <div className='flex items-center justify-end p-3 border-b border-gray-100 dark:border-night-700'>
                <button
                  ref={detailsCloseButtonRef}
                  onClick={closeDetails}
                  aria-label='Cerrar detalles'
                  className='text-gray-400 hover:text-gray-600 dark:text-night-500 dark:hover:text-night-300 transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <PortalTicketDetailsPanel ticket={selectedTicket} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalLayout>
  );
};

export default PortalInboxScreen;

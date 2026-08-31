import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PortalLayout from "../../components/portal/PortalLayout";
import PortalInbox from "../../components/portal/PortalInbox";
import PortalThread from "../../components/portal/PortalThread";
import PortalNewTicketModal from "../../components/portal/PortalNewTicketModal";
import { portalAPI, getPortalToken } from "../../utils/portalApi";
import { getPortalEcho, disconnectPortalEcho } from "../../utils/echo";

const PortalInboxScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [clientId, setClientId] = useState(null);

  const selectedId = id ? Number(id) : null;

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
        setClientId(data.client.id);
        setTickets(data.tickets);
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
      .catch(() => {
        if (!cancelled) setSelectedTicket(null);
      });
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, has_unread: false } : t))
    );
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!clientId) return;

    const echo = getPortalEcho(getPortalToken());
    const channel = echo.private(`client-portal.${clientId}`);

    channel.listen(".client-notification", (payload) => {
      const ticketId = payload.data?.ticket_id;
      if (!ticketId) return;

      if (payload.type === "status_changed" || payload.type === "ticket_assigned") {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: payload.data?.new_status || t.status } : t
          )
        );
        if (ticketId === selectedIdRef.current) {
          portalAPI.getTicket(ticketId).then(setSelectedTicket).catch(() => {});
        }
      }

      if (payload.type === "comment_added") {
        if (ticketId === selectedIdRef.current) {
          portalAPI.getTicket(ticketId).then(setSelectedTicket).catch(() => {});
        } else {
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, has_unread: true } : t))
          );
        }
      }
    });

    return () => {
      echo.leave(`client-portal.${clientId}`);
    };
  }, [clientId, selectedId]);

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
        setSelectedTicket((prev) => ({
          ...prev,
          comments: [...(prev.comments || []), comment],
        }));
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
      <PortalLayout>
        <div className='flex-1 flex items-center justify-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600'></div>
        </div>
      </PortalLayout>
    );
  }

  if (loadError) {
    return (
      <PortalLayout>
        <div className='flex-1 flex items-center justify-center p-6'>
          <div className='text-center'>
            <p className='text-gray-900 font-semibold mb-2'>
              No pudimos cargar tus tickets
            </p>
            <p className='text-gray-500 text-sm max-w-sm mb-4'>
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
    <PortalLayout>
      <div className='flex-1 flex min-h-0'>
        <div
          className={`w-full md:w-80 border-r border-gray-200 shrink-0 ${
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
            ticket={selectedTicket}
            onBack={() => navigate("/portal/dashboard")}
            onSendComment={handleSendComment}
            sending={sending}
          />
        </div>
      </div>
      <PortalNewTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateTicket}
      />
    </PortalLayout>
  );
};

export default PortalInboxScreen;

import { useState, useEffect } from "react";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [clientId, setClientId] = useState(null);

  const selectedId = id ? Number(id) : null;

  useEffect(() => {
    portalAPI.me().then((data) => {
      setClientId(data.client.id);
      setTickets(data.tickets);
      setLoading(false);
      if (!selectedId && data.tickets.length > 0) {
        navigate(`/portal/tickets/${data.tickets[0].id}`, { replace: true });
      }
    });
    // Solo debe correr al montar — la selección se maneja aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTicket(null);
      return;
    }
    portalAPI.getTicket(selectedId).then(setSelectedTicket);
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, has_unread: false } : t))
    );
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
        if (ticketId === selectedId) {
          portalAPI.getTicket(ticketId).then(setSelectedTicket);
        }
      }

      if (payload.type === "comment_added") {
        if (ticketId === selectedId) {
          portalAPI.getTicket(ticketId).then(setSelectedTicket);
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
    setSending(true);
    try {
      const comment = await portalAPI.addComment(selectedId, content);
      setSelectedTicket((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), comment],
      }));
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

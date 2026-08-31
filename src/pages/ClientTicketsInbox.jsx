import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Select from "react-select";
import Layout from "../components/layout/Layout";
import { ticketsAPI, teamsAPI } from "../utils/api";
import { useNotification } from "../context/NotificationContext";
import { Inbox } from "lucide-react";

const statusBadgeColor = {
  open: "bg-blue-50 text-blue-600",
  in_progress: "bg-brand-50 text-brand-600",
  pending: "bg-yellow-50 text-yellow-600",
  resolved: "bg-green-50 text-green-600",
  closed: "bg-gray-100 text-gray-600",
};

const statusLabels = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const ClientTicketsInbox = () => {
  const [searchParams] = useSearchParams();
  const clientFilter = searchParams.get("client");
  const { success, error: showError } = useNotification();

  const [tickets, setTickets] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  // Bump para forzar un recarga tras asignar, sin depender del closure de
  // loadTickets capturado en el momento del click (que podría tener un
  // valor obsoleto de onlyUnassigned si el filtro cambió mientras la
  // asignación estaba en curso — ver handleAssign).
  const [reloadKey, setReloadKey] = useState(0);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ticketsAPI.getClientInbox(
        onlyUnassigned ? { unassigned: true } : {}
      );
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }, [onlyUnassigned]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets, reloadKey]);

  useEffect(() => {
    teamsAPI.getAll().then(setTeams);
  }, []);

  const visibleTickets = clientFilter
    ? tickets.filter((t) => String(t.client_id) === clientFilter)
    : tickets;

  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));

  const handleAssign = async (ticketId, teamId) => {
    setAssigningId(ticketId);
    try {
      await ticketsAPI.assignToTeam(ticketId, teamId);
      success("Ticket asignado al equipo");
      // No llamamos a loadTickets() directamente: ese closure quedó fijado
      // en el render del click y podría usar un onlyUnassigned obsoleto si
      // el usuario cambió el filtro mientras la petición estaba en vuelo.
      // Incrementar reloadKey dispara el efecto con el loadTickets vigente.
      setReloadKey((key) => key + 1);
    } catch {
      showError("No se pudo asignar el ticket");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Layout title='Bandeja de Clientes' subtitle='Tickets creados desde el portal de clientes'>
      <div className='bg-white rounded-2xl border border-gray-200 p-4'>
        <div className='flex items-center justify-between mb-4'>
          <label className='flex items-center gap-2 text-sm text-gray-600'>
            <input
              type='checkbox'
              checked={onlyUnassigned}
              onChange={(e) => setOnlyUnassigned(e.target.checked)}
              className='rounded border-gray-300 text-brand-600 focus:ring-brand-500'
            />
            Solo sin asignar
          </label>
        </div>

        {!loading && visibleTickets.length === 0 ? (
          <div className='py-12 text-center text-gray-400'>
            <Inbox className='w-8 h-8 mx-auto mb-2' aria-hidden='true' />
            <p className='text-sm'>No hay tickets de clientes {onlyUnassigned ? "sin asignar" : "todavía"}.</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {visibleTickets.map((ticket) => (
              <div key={ticket.id} className='py-3 flex items-center justify-between gap-4'>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-medium text-gray-900 truncate'>
                    {ticket.client?.company_name || ticket.client?.name} · {ticket.title}
                  </p>
                  <div className='flex items-center gap-2 mt-1'>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadgeColor[ticket.status]}`}
                    >
                      {statusLabels[ticket.status] || ticket.status}
                    </span>
                    {ticket.team && (
                      <span className='text-xs text-gray-400'>→ {ticket.team.name}</span>
                    )}
                  </div>
                </div>
                {!ticket.team_id && (
                  <div className='w-52 shrink-0'>
                    <Select
                      options={teamOptions}
                      isLoading={assigningId === ticket.id}
                      isDisabled={assigningId === ticket.id}
                      placeholder='Asignar a equipo...'
                      onChange={(selected) => selected && handleAssign(ticket.id, selected.value)}
                      classNamePrefix='react-select'
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientTicketsInbox;

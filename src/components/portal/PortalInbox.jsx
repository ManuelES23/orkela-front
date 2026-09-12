import { useMemo, useState } from "react";
import {
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MessageSquare,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import Avatar from "./PortalAvatar";

const typeIcons = {
  request: MessageSquare,
  bug: Bug,
  question: HelpCircle,
  feature: Lightbulb,
  support: Headphones,
  other: MoreHorizontal,
};

const statusDotColor = {
  open: "bg-blue-500",
  in_progress: "bg-brand-600",
  pending: "bg-yellow-500",
  resolved: "bg-green-500",
  closed: "bg-gray-400",
};

const statusLabels = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

// Orden fijo — no alfabético — para que el flujo de un ticket (abierto →
// en proceso → pendiente → resuelto/cerrado) se lea de izquierda a derecha.
const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En proceso" },
  { value: "pending", label: "Pendiente" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
];

const PortalInbox = ({ tickets, selectedId, onSelect, onNewTicket }) => {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTickets = useMemo(
    () =>
      statusFilter === "all"
        ? tickets
        : tickets.filter((ticket) => ticket.status === statusFilter),
    [tickets, statusFilter]
  );

  return (
    <div className='flex flex-col h-full'>
      <div className='p-4 border-b border-gray-200 flex items-center justify-between shrink-0'>
        <h1 className='font-bold text-gray-900'>Mis tickets</h1>
        <button
          onClick={onNewTicket}
          aria-label='Nuevo ticket'
          className='w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors'
        >
          <Plus className='w-5 h-5' />
        </button>
      </div>
      <div
        className='flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-200 overflow-x-auto shrink-0'
        role='tablist'
        aria-label='Filtrar tickets por estado'
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            role='tab'
            aria-selected={statusFilter === filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              statusFilter === filter.value
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className='flex-1 overflow-y-auto'>
        {filteredTickets.length === 0 ? (
          <div className='p-6 text-center text-gray-500 text-sm'>
            {tickets.length === 0
              ? "Aún no tienes tickets. Crea el primero con el botón de arriba."
              : "Ningún ticket coincide con este filtro."}
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const Icon = typeIcons[ticket.type] || MessageSquare;
            const isSelected = ticket.id === selectedId;
            return (
              <button
                key={ticket.id}
                onClick={() => onSelect(ticket.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 flex items-start gap-3 transition-colors ${
                  isSelected ? "bg-brand-50" : "hover:bg-gray-50"
                }`}
              >
                <Icon
                  aria-hidden='true'
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isSelected ? "text-brand-600" : "text-gray-400"
                  }`}
                />
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span
                      className={`text-sm font-medium truncate ${
                        isSelected ? "text-brand-700" : "text-gray-900"
                      }`}
                    >
                      {ticket.title}
                    </span>
                    {ticket.has_unread && (
                      <span
                        aria-label='Actualización nueva'
                        className='w-2 h-2 rounded-full bg-brand-600 shrink-0'
                      />
                    )}
                  </div>
                  <div className='flex items-center gap-1.5 mt-1'>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        statusDotColor[ticket.status]
                      }`}
                      aria-hidden='true'
                    />
                    <span className='text-xs text-gray-500'>
                      {statusLabels[ticket.status] || ticket.status}
                    </span>
                    {ticket.assigned_agent && (
                      <Avatar
                        name={ticket.assigned_agent.name}
                        size='sm'
                        className='ml-auto'
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PortalInbox;

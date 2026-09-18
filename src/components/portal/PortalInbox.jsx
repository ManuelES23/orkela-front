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
import { STATUS_DOT_COLOR, STATUS_LABELS, STATUS_FILTERS } from "./ticketVocabulary";

const typeIcons = {
  request: MessageSquare,
  bug: Bug,
  question: HelpCircle,
  feature: Lightbulb,
  support: Headphones,
  other: MoreHorizontal,
};

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
      <div className='p-4 border-b border-gray-200 dark:border-night-700 flex items-center justify-between shrink-0'>
        <h1 className='font-bold text-gray-900 dark:text-night-50'>Mis tickets</h1>
        <button
          onClick={onNewTicket}
          aria-label='Nuevo ticket'
          className='w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors'
        >
          <Plus className='w-5 h-5' />
        </button>
      </div>
      <div
        className='flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-200 dark:border-night-700 overflow-x-auto shrink-0'
        role='group'
        aria-label='Filtrar tickets por estado'
      >
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            aria-pressed={statusFilter === filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              statusFilter === filter.value
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-night-800 dark:text-night-400 dark:hover:bg-night-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className='flex-1 overflow-y-auto'>
        {filteredTickets.length === 0 ? (
          <div className='p-6 text-center text-gray-500 dark:text-night-400 text-sm'>
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
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-night-700 flex items-start gap-3 transition-colors ${
                  isSelected ? "bg-brand-50 dark:bg-brand-900/20" : "hover:bg-gray-50 dark:hover:bg-night-800"
                }`}
              >
                <Icon
                  aria-hidden='true'
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isSelected ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-night-500"
                  }`}
                />
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span
                      className={`text-sm font-medium truncate ${
                        isSelected ? "text-brand-700 dark:text-brand-300" : "text-gray-900 dark:text-night-50"
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
                        STATUS_DOT_COLOR[ticket.status]
                      }`}
                      aria-hidden='true'
                    />
                    <span className='text-xs text-gray-500 dark:text-night-400'>
                      {STATUS_LABELS[ticket.status] || ticket.status}
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

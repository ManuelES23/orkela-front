import {
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MessageSquare,
  MoreHorizontal,
  Plus,
} from "lucide-react";

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

const PortalInbox = ({ tickets, selectedId, onSelect, onNewTicket }) => {
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
      <div className='flex-1 overflow-y-auto'>
        {tickets.length === 0 ? (
          <div className='p-6 text-center text-gray-500 text-sm'>
            Aún no tienes tickets. Crea el primero con el botón de arriba.
          </div>
        ) : (
          tickets.map((ticket) => {
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

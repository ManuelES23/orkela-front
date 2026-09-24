import { ChevronDown, ChevronsUp, ChevronUp, Clock, MessageSquare, Minus, User, Users } from "lucide-react";
import { TICKET_PRIORITY, TICKET_TYPE } from "../../constants/tickets";
import { formatDistanceToNow } from "../../utils/dateUtils";
import InboxStatusBadge from "./InboxStatusBadge";

// Flecha de tendencia por prioridad: la prioridad nunca depende solo del color
// (urgente = doble flecha arriba), igual que el estado lleva su icono.
const PRIORITY_TREND_ICON = {
  urgent: ChevronsUp,
  high: ChevronUp,
  medium: Minus,
  low: ChevronDown,
};

// Propuesta A: fila densa de ~1,5 líneas, estilo cliente de correo. Primera
// línea: azulejo de tipo + cliente · contacto · título + antigüedad a la
// derecha. Segunda línea: todo el metadato en insignias. El título es el botón
// que abre el ticket; el clic en el resto de la fila es un atajo de ratón. El
// selector de equipo no propaga el clic.
const InboxTicketRow = ({ ticket, teams, onOpen, onAssign, assigning = false }) => {
  const priority = TICKET_PRIORITY[ticket.priority];
  const type = TICKET_TYPE[ticket.type];
  const TypeIcon = type?.icon;
  const TrendIcon = PRIORITY_TREND_ICON[ticket.priority];
  const canRoute = !ticket.team_id && ticket.can_route !== false;
  const selectId = `inbox-assign-${ticket.id}`;
  const who = [ticket.client?.name, ticket.contact?.name].filter(Boolean).join(" · ");
  const lastActivityAt = ticket.last_client_comment_at || ticket.created_at;

  return (
    <div
      className={`flex min-h-14 cursor-pointer flex-wrap items-start gap-x-3 gap-y-2 border-b px-3 py-2.5 transition-colors last:border-b-0 ${
        ticket.has_unread_client_reply
          ? "border-brand-100 bg-brand-50/60 hover:bg-brand-50 dark:border-night-800 dark:bg-brand-900/15 dark:hover:bg-brand-900/25"
          : "border-gray-100 hover:bg-gray-50 dark:border-night-800 dark:hover:bg-night-800/60"
      }`}
      onClick={() => onOpen(ticket)}
    >
      <span
        className='mt-0.5 grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border border-gray-100 bg-gray-50 dark:border-night-700 dark:bg-night-800'
        aria-hidden='true'
      >
        {TypeIcon && <TypeIcon className={`h-[17px] w-[17px] ${type.iconClass}`} />}
      </span>

      <div className='grid min-w-0 flex-1 gap-1'>
        <div className='flex min-w-0 items-center gap-2 text-[13.5px]'>
          {who && (
            <>
              <span className='flex-none font-extrabold whitespace-nowrap text-gray-900 dark:text-night-50'>{who}</span>
              <span className='flex-none font-bold text-gray-300 dark:text-night-600' aria-hidden='true'>
                ·
              </span>
            </>
          )}
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              onOpen(ticket);
            }}
            className='min-w-0 truncate rounded text-left font-semibold text-gray-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-night-100'
          >
            {ticket.title}
          </button>
          <span className='ml-auto flex-none pl-2 text-[11.5px] whitespace-nowrap text-gray-400 dark:text-night-400' aria-hidden='true'>
            {formatDistanceToNow(lastActivityAt)}
          </span>
        </div>

        <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-gray-500 dark:text-night-400'>
          <InboxStatusBadge status={ticket.status} />
          {priority && (
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-[3px] text-[11px] font-extrabold whitespace-nowrap ${priority.badgeClass}`}>
              {TrendIcon && <TrendIcon className='h-3 w-3 shrink-0' aria-hidden='true' />}
              <span className='sr-only'>Prioridad: </span>
              <span>{priority.label}</span>
            </span>
          )}
          {type && (
            <span className='inline-flex items-center gap-1 font-bold whitespace-nowrap'>
              {TypeIcon && <TypeIcon className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />}
              {type.label}
            </span>
          )}
          <span className='inline-flex items-center gap-1 whitespace-nowrap'>
            <Users className='h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-night-500' aria-hidden='true' />
            {ticket.team ? `Equipo: ${ticket.team.name}` : "Sin equipo"}
          </span>
          <span className='inline-flex items-center gap-1 whitespace-nowrap'>
            <User className='h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-night-500' aria-hidden='true' />
            {ticket.assigned_user ? `Agente: ${ticket.assigned_user.name}` : "Sin agente"}
          </span>
          <span className='inline-flex items-center gap-1 whitespace-nowrap'>
            <MessageSquare className='h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-night-500' aria-hidden='true' />
            <span className='sr-only'>Comentarios:</span>
            <span className='tabular-nums'>{ticket.comments_count ?? 0}</span>
          </span>
          <span className='inline-flex items-center gap-1'>
            <Clock className='h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-night-500' aria-hidden='true' />
            {ticket.last_client_comment_at
              ? `Último mensaje del cliente ${formatDistanceToNow(ticket.last_client_comment_at)}`
              : `Creado ${formatDistanceToNow(ticket.created_at)}`}
          </span>
          {ticket.has_unread_client_reply && (
            <span className='inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-[3px] text-[11.5px] font-extrabold whitespace-nowrap text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200'>
              <span className='h-[7px] w-[7px] shrink-0 rounded-full bg-current' aria-hidden='true' />
              Respuesta nueva del cliente
            </span>
          )}
        </div>
      </div>

      {canRoute && (
        <div className='basis-full md:w-48 md:flex-none md:basis-auto' onClick={(event) => event.stopPropagation()}>
          <label htmlFor={selectId} className='sr-only'>
            {`Asignar equipo a ${ticket.title}`}
          </label>
          <select
            id={selectId}
            value=''
            disabled={assigning || teams.length === 0}
            onChange={(event) => event.target.value && onAssign(ticket.id, Number(event.target.value))}
            className='w-full min-h-10 rounded-xl border border-brand-200 bg-brand-50 px-2.5 text-[12.5px] font-bold text-brand-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-brand-800 dark:bg-brand-900/25 dark:text-brand-200'
          >
            <option value=''>{assigning ? "Asignando…" : "Asignar a equipo…"}</option>
            {teams.map((team) => (
              <option key={team.id} value={String(team.id)}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default InboxTicketRow;

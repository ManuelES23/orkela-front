import { TICKET_STATUS } from "../../constants/tickets";

// Estado con color + texto + icono (nunca solo color). Propuesta A: insignia
// redonda con borde del color del estado (badgeClass trae el color del borde,
// así que aquí se añade la clase `border`).
const InboxStatusBadge = ({ status }) => {
  const config = TICKET_STATUS[status];
  if (!config) return <span className='text-[11.5px] font-extrabold'>{status}</span>;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] leading-tight font-extrabold whitespace-nowrap ${config.badgeClass}`}
    >
      {Icon && <Icon className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />}
      {config.label}
    </span>
  );
};

export default InboxStatusBadge;

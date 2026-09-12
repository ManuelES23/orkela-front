import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../animations/variants";
import Avatar from "./PortalAvatar";

// No reutiliza formatDateTime de dateUtils.js: ese helper pasa por
// parseLocalDate, que trunca la hora a medianoche a propósito (está pensado
// para fechas de vencimiento sin hora, no para timestamps de eventos). Un
// timeline de "creado hace 3h / tomado hace 1h" necesita la hora real.
const formatTimelineDate = (isoString) =>
  new Date(isoString).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Mismo vocabulario que PortalNewTicketModal.jsx (typeOptions/priorityOptions)
// — el ticket debe leerse igual en el portal que al crearlo.
const typeLabels = {
  request: "Solicitud",
  bug: "Reportar un problema",
  feature: "Pedir una función nueva",
  question: "Pregunta",
  support: "Soporte",
  other: "Otro",
};

const priorityLabels = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

// Construye la línea de tiempo solo con los pasos que realmente ocurrieron —
// un ticket recién creado no debe mostrar "Resuelto" ni "Cerrado" vacíos.
const buildTimeline = (ticket) => {
  const steps = [{ label: "Creado", at: ticket.created_at }];

  if (ticket.taken_at) {
    steps.push({
      label: ticket.assigned_agent
        ? `Tomado por ${ticket.assigned_agent.name}`
        : "Tomado",
      at: ticket.taken_at,
    });
  }
  if (ticket.resolved_at) {
    steps.push({ label: "Resuelto", at: ticket.resolved_at });
  }
  if (ticket.closed_at) {
    steps.push({ label: "Cerrado", at: ticket.closed_at });
  }

  return steps;
};

const PortalTicketDetailsPanel = ({ ticket }) => {
  if (!ticket) return null;

  const timeline = buildTimeline(ticket);

  return (
    <motion.div
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      className='p-5 space-y-6'
    >
      <motion.h2
        variants={itemVariants}
        className='text-xs font-bold uppercase tracking-wide text-gray-400'
      >
        Detalles del ticket
      </motion.h2>

      {ticket.created_by && (
        <motion.div variants={itemVariants}>
          <p className='text-xs text-gray-400 mb-1.5'>Creado por</p>
          <div className='flex items-center gap-2'>
            <Avatar name={ticket.created_by.name} size='sm' />
            <span className='text-sm font-semibold text-gray-900'>
              {ticket.created_by.name}
            </span>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <p className='text-xs text-gray-400 mb-1.5'>Atendido por</p>
        {ticket.assigned_agent ? (
          <div className='flex items-center gap-2'>
            <Avatar name={ticket.assigned_agent.name} size='sm' />
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-gray-900 truncate'>
                {ticket.assigned_agent.name}
              </p>
              {ticket.team && (
                <p className='text-xs text-gray-500 truncate'>
                  {ticket.team.name}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className='text-sm text-gray-500'>Aún sin asignar</p>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className='grid grid-cols-2 gap-4'>
        <div>
          <p className='text-xs text-gray-400 mb-1'>Tipo</p>
          <p className='text-sm font-medium text-gray-900'>
            {typeLabels[ticket.type] || ticket.type}
          </p>
        </div>
        <div>
          <p className='text-xs text-gray-400 mb-1'>Prioridad</p>
          <p className='text-sm font-medium text-gray-900'>
            {priorityLabels[ticket.priority] || ticket.priority}
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <p className='text-xs text-gray-400 mb-3'>Línea de tiempo</p>
        <ol className='relative border-l border-gray-200 ml-1 space-y-4'>
          {timeline.map((step, index) => (
            <li key={index} className='pl-4 relative'>
              <span className='absolute -left-[4.5px] top-1 w-2 h-2 rounded-full bg-brand-600' />
              <p className='text-sm font-medium text-gray-900'>{step.label}</p>
              <p className='text-xs text-gray-400'>{formatTimelineDate(step.at)}</p>
            </li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
};

export default PortalTicketDetailsPanel;

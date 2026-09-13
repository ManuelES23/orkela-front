import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../animations/variants";
import { formatDateTime } from "../../utils/dateUtils";
import { TYPE_LABELS, PRIORITY_LABELS } from "./ticketVocabulary";
import Avatar from "./PortalAvatar";
import LoadingSwap from "../ui/LoadingSwap";
import DetailPanel from "../ui/DetailPanel";
import { PortalPanelSkeleton } from "./PortalSkeletons";

// Construye la línea de tiempo solo con los pasos que realmente ocurrieron —
// un ticket recién creado no debe mostrar "Resuelto" ni "Cerrado" vacíos.
// Se ordena por fecha (no por el orden en que se agregan los pasos): un
// ticket reabierto y vuelto a cerrar puede dejar un resolved_at más nuevo
// que su closed_at anterior, y el timeline debe reflejar eso, no el orden
// "feliz" open→taken→resolved→closed.
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

  return steps.sort((a, b) => new Date(a.at) - new Date(b.at));
};

const PortalTicketDetailsPanel = ({ ticket }) => {
  return (
    <LoadingSwap loading={!ticket} skeleton={<PortalPanelSkeleton />}>
      {ticket && <DetailPanel panelKey={ticket.id}>{renderDetails(ticket)}</DetailPanel>}
    </LoadingSwap>
  );
};

const renderDetails = (ticket) => {
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
            <Avatar name={ticket.created_by.name} size='sm' decorative />
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
            <Avatar name={ticket.assigned_agent.name} size='sm' decorative />
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
        ) : ticket.team ? (
          // Ticket ya enrutado al equipo pero aún sin tomar por nadie — el
          // estado más común para un ticket recién asignado (es literalmente
          // lo que el backend le notifica al cliente: "asignado a un equipo
          // de soporte"). No debe leerse como "sin asignar".
          <p className='text-sm text-gray-700'>
            <span className='font-semibold'>{ticket.team.name}</span>
            <span className='text-gray-400'> · aún sin agente asignado</span>
          </p>
        ) : (
          <p className='text-sm text-gray-500'>Aún sin asignar</p>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className='grid grid-cols-2 gap-4'>
        <div>
          <p className='text-xs text-gray-400 mb-1'>Tipo</p>
          <p className='text-sm font-medium text-gray-900'>
            {TYPE_LABELS[ticket.type] || ticket.type}
          </p>
        </div>
        <div>
          <p className='text-xs text-gray-400 mb-1'>Prioridad</p>
          <p className='text-sm font-medium text-gray-900'>
            {PRIORITY_LABELS[ticket.priority] || ticket.priority}
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
              <p className='text-xs text-gray-400'>{formatDateTime(step.at)}</p>
            </li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
};

export default PortalTicketDetailsPanel;

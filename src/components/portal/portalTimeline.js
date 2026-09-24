import { STATUS_LABELS } from "./ticketVocabulary";

const statusLabel = (status) => STATUS_LABELS[status] || status;

// Texto de cada evento público. Los nombres ya vienen resueltos del
// backend (PortalTimeline): aquí nunca se deduce el agente del estado
// actual del ticket, que era lo que atribuía "Tomado por" a quien no era.
export const describeEvent = (event) => {
  switch (event.type) {
    case "created":
      return event.actor_name ? `Creado por ${event.actor_name}` : "Creado";
    case "routed_to_team":
      return event.team_name ? `Enviado al equipo ${event.team_name}` : "Enviado a un equipo de soporte";
    case "taken":
      return event.agent_name ? `Tomado por ${event.agent_name}` : "Tomado por un agente";
    case "assigned":
      return event.agent_name ? `Asignado a ${event.agent_name}` : "Asignado a un agente";
    case "returned_to_inbox":
      return "Devuelto a la cola del equipo";
    case "status_changed":
      return event.from_status
        ? `${statusLabel(event.from_status)} → ${statusLabel(event.to_status)}`
        : `Estado: ${statusLabel(event.to_status)}`;
    case "reopened_by_client":
      return event.actor_name ? `Reabierto por ${event.actor_name}` : "Reabierto";
    case "resolution_confirmed":
      return event.actor_name ? `Solución confirmada por ${event.actor_name}` : "Solución confirmada";
    default:
      return null;
  }
};

// Tickets anteriores al historial de eventos: solo fechas, sin nombres (el
// portal ya no recibe taken_at).
const legacyTimeline = (ticket) => {
  const steps = [{ key: "created", label: "Creado", at: ticket.created_at }];
  if (ticket.resolved_at) steps.push({ key: "resolved", label: "Resuelto", at: ticket.resolved_at });
  if (ticket.closed_at) steps.push({ key: "closed", label: "Cerrado", at: ticket.closed_at });
  return steps.sort((a, b) => new Date(a.at) - new Date(b.at));
};

export const buildPortalTimeline = (ticket) => {
  const events = Array.isArray(ticket?.events) ? ticket.events : [];
  if (events.length === 0) return legacyTimeline(ticket);

  const steps = events
    .map((event) => ({ key: `e-${event.id}`, label: describeEvent(event), at: event.created_at, type: event.type }))
    .filter((step) => step.label);

  if (!steps.some((step) => step.type === "created")) {
    steps.unshift({ key: "created", label: "Creado", at: ticket.created_at, type: "created" });
  }

  return steps;
};

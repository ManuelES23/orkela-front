// Estados en los que responder reabre el ticket (lo hace el backend).
export const REOPENS_ON_REPLY = ["resolved", "closed"];

// Qué significa cada estado para el cliente, en una frase.
export const statusHelp = (ticket) => {
  if (!ticket) return null;

  switch (ticket.status) {
    case "open":
      if (ticket.assigned_agent) return "Un agente ya tiene tu ticket y te responderá por aquí.";
      if (ticket.team) return `Sin asignar: está en la cola de ${ticket.team.name} y lo tomará el próximo agente disponible.`;
      return "Sin asignar: lo revisará el equipo y lo enviará a la persona adecuada.";
    case "in_progress":
      return "En progreso: un agente está trabajando en tu ticket.";
    case "pending":
      return "Pendiente: esperamos tu respuesta para continuar.";
    case "resolved":
      return "Marcamos este ticket como resuelto. ¿Se solucionó tu problema?";
    case "closed":
      return "Este ticket está cerrado. Si respondes, se reabrirá.";
    default:
      return null;
  }
};

// Los eventos `.client-notification` de tipo `status_changed`/`ticket_assigned`
// traen en `payload.data` solo los campos que cambiaron — nunca la forma
// completa del ticket. Mezclar a ciegas con `{ ...ticket, ...payload.data }`
// pisaría campos con las llaves auxiliares del payload (ticket_id,
// ticket_title) o los perdería si el evento no las trajera. Esta función
// solo aplica los campos de fila de lista que el backend explícitamente
// manda, dejando el resto del ticket intacto.
export const applyTicketNotification = (ticket, payload) => {
  const data = payload?.data || {};
  const next = { ...ticket };

  if (data.new_status !== undefined) {
    next.status = data.new_status;
  }
  if (Object.prototype.hasOwnProperty.call(data, "assigned_agent")) {
    next.assigned_agent = data.assigned_agent;
  }
  if (Object.prototype.hasOwnProperty.call(data, "team")) {
    next.team = data.team;
  }

  return next;
};

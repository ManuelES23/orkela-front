import { TICKET_PRIORITY, TICKET_TYPE } from "../../constants/tickets";

export const INBOX_TAB_LABELS = {
  sin_asignar: "Sin asignar",
  abiertos: "Abiertos",
  esperando_cliente: "Esperando cliente",
  resueltos: "Resueltos",
  todos: "Todos",
};

export const INBOX_EMPTY_MESSAGES = {
  sin_asignar: "No hay tickets sin asignar.",
  abiertos: "No hay tickets abiertos.",
  esperando_cliente: "Ningún ticket está esperando al cliente.",
  resueltos: "No hay tickets resueltos.",
  todos: "Aún no hay tickets de clientes.",
};

export const FILTERED_EMPTY_MESSAGE = "Ningún ticket coincide con los filtros.";

// Un chip por filtro activo; el cliente llega desde ?client= (ficha del cliente)
export const buildInboxChips = (filters, { teamNameById = {}, clientName = null } = {}) => {
  const chips = [];
  const q = (filters.q || "").trim();

  if (filters.client) chips.push({ key: "client", label: `Cliente: ${clientName || `#${filters.client}`}` });
  if (q) chips.push({ key: "q", label: `Búsqueda: ${q}` });
  if (filters.priority) {
    chips.push({ key: "priority", label: `Prioridad: ${TICKET_PRIORITY[filters.priority]?.label || filters.priority}` });
  }
  if (filters.type) chips.push({ key: "type", label: `Tipo: ${TICKET_TYPE[filters.type]?.label || filters.type}` });
  if (filters.team) chips.push({ key: "team", label: `Equipo: ${teamNameById[filters.team] || `#${filters.team}`}` });

  return chips;
};

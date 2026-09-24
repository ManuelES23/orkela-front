// Vocabulario de ticket del portal de clientes. Los valores salen de
// src/constants/tickets.js — la única fuente para staff y portal — y este
// módulo solo conserva los nombres que ya importan PortalInbox, PortalThread,
// PortalTicketDetailsPanel y PortalNewTicketModal.
import { TICKET_STATUS, TICKET_PRIORITY, TICKET_TYPE } from "../../constants/tickets";

const mapValues = (source, pick) =>
  Object.fromEntries(Object.entries(source).map(([key, value]) => [key, pick(value)]));

// Orden fijo — no alfabético — para que el filtro se lea de izquierda a
// derecha en el mismo orden que recorre un ticket (abierto → en progreso →
// pendiente → resuelto/cerrado).
const STATUS_ORDER = ["open", "in_progress", "pending", "resolved", "closed"];

export const STATUS_LABELS = Object.fromEntries(
  STATUS_ORDER.map((status) => [status, TICKET_STATUS[status].label])
);

export const STATUS_DOT_COLOR = mapValues(TICKET_STATUS, (cfg) => cfg.dotClass);

export const STATUS_BADGE_COLOR = mapValues(TICKET_STATUS, (cfg) => cfg.badgeClass);

export const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  ...STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] })),
];

// El cliente ve "Reportar un problema" donde el staff ve "Bug": portalLabel
// cuando existe, si no la etiqueta del staff.
export const TYPE_LABELS = mapValues(TICKET_TYPE, (cfg) => cfg.portalLabel ?? cfg.label);

export const PRIORITY_LABELS = mapValues(TICKET_PRIORITY, (cfg) => cfg.label);

// Vocabulario único de ticket para todo el portal de clientes — antes vivía
// duplicado en PortalInbox.jsx y PortalThread.jsx, y llegaron a divergir
// ("En proceso" vs "En progreso" para el mismo estado). Una sola fuente de
// verdad evita que eso vuelva a pasar.
export const STATUS_LABELS = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export const STATUS_DOT_COLOR = {
  open: "bg-blue-500",
  in_progress: "bg-brand-600",
  pending: "bg-yellow-500",
  resolved: "bg-green-500",
  closed: "bg-gray-400",
};

export const STATUS_BADGE_COLOR = {
  open: "bg-blue-50 text-blue-600",
  in_progress: "bg-brand-50 text-brand-600",
  pending: "bg-yellow-50 text-yellow-600",
  resolved: "bg-green-50 text-green-600",
  closed: "bg-gray-100 text-gray-600",
};

// Orden fijo — no alfabético — para que el filtro se lea de izquierda a
// derecha en el mismo orden que recorre un ticket (abierto → en progreso →
// pendiente → resuelto/cerrado).
export const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

// Mismo vocabulario que PortalNewTicketModal.jsx (typeOptions/priorityOptions)
// — el ticket debe leerse igual en el portal que al crearlo.
export const TYPE_LABELS = {
  request: "Solicitud",
  bug: "Reportar un problema",
  feature: "Pedir una función nueva",
  question: "Pregunta",
  support: "Soporte",
  other: "Otro",
};

export const PRIORITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

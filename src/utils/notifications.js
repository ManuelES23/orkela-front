// Utilidades puras del historial de notificaciones: normalización (API y
// broadcast comparten forma), categoría, destino al hacer clic, claves de
// refresco en tiempo real, agrupación por día y textos.

export const NOTIFICATION_CATEGORIES = [
  { value: "tasks", label: "Tareas" },
  { value: "projects", label: "Proyectos" },
  { value: "tickets", label: "Tickets" },
  { value: "teams", label: "Equipos" },
  { value: "invitations", label: "Invitaciones" },
  { value: "organization", label: "Organización" },
];

// Mismo criterio que UserNotification::categoryFor en el backend (el
// broadcast ya la trae, esto cubre payloads viejos).
export const categoryFor = (type = "") => {
  if (type.includes("_invitation_")) return "invitations";
  if (type.startsWith("task_") || type.startsWith("checklist_")) return "tasks";
  if (type.startsWith("project_")) return "projects";
  if (type.startsWith("ticket_")) return "tickets";
  if (type.startsWith("team_")) return "teams";
  if (type.startsWith("organization_")) return "organization";
  return "other";
};

export const normalizeNotification = (raw) => {
  const createdAt = raw.created_at || raw.timestamp;
  return {
    id: raw.id,
    type: raw.type,
    category: raw.category || categoryFor(raw.type),
    title: raw.title,
    message: raw.message,
    data: raw.data || {},
    read: Boolean(raw.read_at ?? raw.read),
    createdAt: createdAt ? new Date(createdAt) : new Date(),
  };
};

const INVITATION_ACCEPT_PATHS = {
  project: "/accept-invitation",
  team: "/accept-team-invitation",
  organization: "/accept-organization-invitation",
};

const RESOURCE_LIST_PATHS = {
  project: "/projects",
  team: "/teams",
  organization: "/organizations",
};

// Ruta a la que lleva el clic en una notificación (null: solo se marca leída).
export const notificationTarget = ({ type = "", data = {} } = {}) => {
  const d = data || {};

  if (type.includes("_invitation_")) {
    const resource = type.split("_invitation_")[0];
    if (type.endsWith("_received") && d.invitation_token) {
      return `${INVITATION_ACCEPT_PATHS[resource]}/${d.invitation_token}`;
    }
    return RESOURCE_LIST_PATHS[d.type || resource] || null;
  }

  switch (categoryFor(type)) {
    case "tasks":
      if (d.task_id) return `/tasks?task=${d.task_id}`;
      return d.project_id ? `/projects/${d.project_id}` : "/tasks";
    case "projects":
      if (type === "project_deleted") return "/projects";
      return d.project_id ? `/projects/${d.project_id}` : "/projects";
    case "tickets":
      return d.ticket_id ? `/tickets?ticket=${d.ticket_id}` : "/tickets";
    case "teams":
      if (type === "team_deleted") return "/teams";
      return d.team_id ? `/teams/${d.team_id}` : "/teams";
    case "organization":
      // Quien fue removido ya no tiene acceso a la organización
      if (d.action === "removed_from_organization") return null;
      return d.organization_id ? `/organizations/${d.organization_id}` : "/organizations";
    default:
      return null;
  }
};

// Claves de registerRefresh que deben recargarse al llegar una notificación
// (o una señal silenciosa). Fase B puede reutilizarla para los eventos sync.
export const refreshKeysFor = ({ type = "", data = {} } = {}) => {
  const d = data || {};
  const keys = new Set();

  if (type.includes("_invitation_")) {
    if (type.endsWith("_received")) keys.add("invitations");
    if (type.endsWith("_accepted")) ["projects", "teams", "organizations"].forEach((k) => keys.add(k));
  } else {
    switch (categoryFor(type)) {
      case "tasks":
        // Los avisos de tarea también cambian progreso/conteo del proyecto
        keys.add("tasks");
        keys.add("projects");
        break;
      case "projects":
        keys.add("projects");
        // Borrar tareas o tocar el checklist llega como señal del proyecto
        keys.add("tasks");
        break;
      case "tickets":
        keys.add("tickets");
        if (d.ticket_id) keys.add(`ticketDetail-${d.ticket_id}`);
        break;
      case "teams":
        keys.add("teams");
        if (type === "team_deleted" || type === "team_created") keys.add("organizations");
        if (type === "team_member_joined") keys.add("projects");
        break;
      case "organization":
        keys.add("organizations");
        break;
      default:
        break;
    }
  }

  // El Dashboard resume tareas, proyectos y equipos
  if (/^(task|checklist|project|team)_/.test(type)) keys.add("dashboard");

  // Modal de detalle de tarea abierto (TaskDetailModal)
  if (d.task_id) keys.add(`task-detail-${d.task_id}`);

  return [...keys];
};

const SUCCESS_TYPES = new Set([
  "task_completed",
  "checklist_item_completed",
  "ticket_resolved",
  "project_invitation_accepted",
  "team_invitation_accepted",
  "organization_invitation_accepted",
  "team_invitation_sent",
  "project_invitation_sent",
]);

const WARNING_TYPES = new Set([
  "project_deleted",
  "task_due_soon",
  "task_overdue",
  "team_deleted",
  "project_invitation_declined",
  "team_invitation_declined",
  "organization_invitation_declined",
  "organization_member_removed",
  "organization_plan_downgraded",
]);

export const toastKindFor = (type) => {
  if (SUCCESS_TYPES.has(type)) return "success";
  if (WARNING_TYPES.has(type)) return "warning";
  return "info";
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Agrupa (manteniendo el orden recibido) en Hoy, Ayer y fecha.
export const groupByDay = (items, now = new Date()) => {
  const today = startOfDay(now).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const groups = [];
  const byKey = new Map();

  items.forEach((item) => {
    const day = startOfDay(item.createdAt).getTime();
    let label;
    if (day === today) label = "Hoy";
    else if (day === yesterday) label = "Ayer";
    else {
      label = capitalize(
        item.createdAt.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          ...(item.createdAt.getFullYear() !== now.getFullYear() && { year: "numeric" }),
        })
      );
    }

    if (!byKey.has(day)) {
      const group = { key: String(day), label, items: [] };
      byKey.set(day, group);
      groups.push(group);
    }
    byKey.get(day).items.push(item);
  });

  return groups;
};

export const retentionLabel = (days) =>
  !days ? "Se guardan siempre" : `Se guardan ${days} días`;

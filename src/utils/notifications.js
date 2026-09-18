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
      if (type === "project_deleted" || type === "project_access_revoked") return "/projects";
      return d.project_id ? `/projects/${d.project_id}` : "/projects";
    case "tickets": {
      // org: OrganizationRoute cambia a ese workspace si el usuario está en
      // modo personal o en otra organización
      if (!d.ticket_id) return "/tickets";
      const org = d.organization_id ? `&org=${d.organization_id}` : "";
      return `/tickets?ticket=${d.ticket_id}${org}`;
    }
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
// (o una señal silenciosa por user.{id}). Los *.sync de proyecto/equipo los
// manejan las propias pantallas (useResourceSync).
export const refreshKeysFor = ({ type = "", data = {} } = {}) => {
  const d = data || {};
  const keys = new Set();

  if (type.includes("_invitation_")) {
    // Recibida o cancelada: la lista del invitado cambia
    if (type.endsWith("_received") || type.endsWith("_cancelled")) keys.add("invitations");
    // Rechazada: las invitaciones pendientes de la organización cambian
    if (type.endsWith("_declined")) keys.add("organizations");
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
        // Perder acceso o un cambio del proyecto también afecta a Tareas
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

// Claves de registerRefresh para un organization.sync (canal
// organization.{id}): { entity, action, ...ids }.
export const organizationSyncKeysFor = (payload = {}) => {
  const keys = new Set();

  switch (payload.entity) {
    case "client_ticket":
      // Bandeja de Clientes, y el buzón del equipo si ya tiene uno
      keys.add("clientTickets");
      keys.add("tickets");
      break;
    case "team":
      ["teams", "organizations", "dashboard"].forEach((k) => keys.add(k));
      break;
    case "member":
      ["organizations", "teams"].forEach((k) => keys.add(k));
      break;
    case "invitation":
    case "organization":
    default:
      keys.add("organizations");
      break;
  }

  if (payload.ticket_id) keys.add(`ticketDetail-${payload.ticket_id}`);

  return [...keys];
};

// ¿Cambian mi usuario/permisos (rol, dueño, datos de la organización del
// selector de contexto)? Entonces hay que volver a pedir /user.
export const organizationSyncAffectsUser = (payload = {}, user) => {
  if (payload.entity === "organization") return true;
  if (payload.entity !== "member" || !user?.id) return false;
  return [payload.member_id, payload.previous_owner_id].some((id) => Number(id) === Number(user.id));
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
  "organization_member_deactivated",
  "project_access_revoked",
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

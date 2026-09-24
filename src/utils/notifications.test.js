import { describe, it, expect } from "vitest";
import {
  normalizeNotification,
  notificationTarget,
  notificationNotice,
  refreshKeysFor,
  toastKindFor,
  groupByDay,
  retentionLabel,
  categoryFor,
  organizationSyncKeysFor,
  organizationSyncAffectsUser,
} from "./notifications";

describe("normalizeNotification", () => {
  it("convierte la respuesta de la API", () => {
    const n = normalizeNotification({
      id: 5,
      type: "task_created",
      category: "tasks",
      title: "t",
      message: "m",
      data: { task_id: 1 },
      read_at: null,
      created_at: "2026-09-18T10:00:00+00:00",
    });
    expect(n).toMatchObject({ id: 5, type: "task_created", category: "tasks", read: false });
    expect(n.createdAt).toBeInstanceOf(Date);
  });

  it("acepta el payload del broadcast (timestamp, sin categoría)", () => {
    const n = normalizeNotification({
      id: 9,
      type: "ticket_taken",
      title: "t",
      message: "m",
      timestamp: "2026-09-18T10:00:00+00:00",
    });
    expect(n.category).toBe("tickets");
    expect(n.read).toBe(false);
    expect(n.data).toEqual({});
  });
});

describe("categoryFor", () => {
  it("separa las invitaciones del resto", () => {
    expect(categoryFor("team_invitation_received")).toBe("invitations");
    expect(categoryFor("team_member_joined")).toBe("teams");
    expect(categoryFor("checklist_item_completed")).toBe("tasks");
    expect(categoryFor("organization_role_updated")).toBe("organization");
  });
});

describe("notificationTarget", () => {
  const t = (type, data = {}) => notificationTarget({ type, data });
  const task = { task_id: 3, project_id: 2, organization_id: 7 };
  const ticket = { ticket_id: 8, organization_id: 7 };

  // Todos los tipos que el backend guarda (NotificationService), con el
  // payload que envía hoy: [tipo, data, destino]
  it.each([
    // Tareas y subtareas: detalle de la tarea en el workspace de su proyecto
    ["task_created", task, "/tasks?task=3&org=7"],
    ["task_updated", task, "/tasks?task=3&org=7"],
    ["task_status_changed", task, "/tasks?task=3&org=7"],
    ["task_completed", task, "/tasks?task=3&org=7"],
    ["task_assigned", task, "/tasks?task=3&org=7"],
    ["task_due_soon", task, "/tasks?task=3&org=7"],
    ["task_overdue", task, "/tasks?task=3&org=7"],
    ["checklist_item_completed", { ...task, checklist_item_id: 5 }, "/tasks?task=3&org=7"],
    ["checklist_item_updated", { ...task, checklist_item_id: 5 }, "/tasks?task=3&org=7"],
    ["task_assigned", { task_id: 3, project_id: 2, organization_id: null }, "/tasks?task=3"],
    // Proyectos
    ["project_created", { project_id: 2, organization_id: 7 }, "/projects/2?org=7"],
    ["project_updated", { project_id: 2, organization_id: 7 }, "/projects/2?org=7"],
    ["project_collaborator_joined", { project_id: 2, organization_id: null }, "/projects/2"],
    ["project_deleted", { project_id: 2, organization_id: 7, project_name: "x" }, "/projects?org=7"],
    ["project_access_revoked", { project_id: 2, organization_id: null }, "/projects"],
    // Equipos
    ["team_member_joined", { team_id: 4, organization_id: 7 }, "/teams/4?org=7"],
    ["team_deleted", { team_id: 4, organization_id: 7 }, "/teams?org=7"],
    // Tickets: el modal del ticket en su organización
    ["ticket_created", ticket, "/tickets?ticket=8&org=7"],
    ["ticket_taken", ticket, "/tickets?ticket=8&org=7"],
    ["ticket_assigned", ticket, "/tickets?ticket=8&org=7"],
    ["ticket_status_changed", ticket, "/tickets?ticket=8&org=7"],
    ["ticket_resolved", ticket, "/tickets?ticket=8&org=7"],
    ["ticket_returned_to_inbox", ticket, "/tickets?ticket=8&org=7"],
    ["ticket_comment_added", { ...ticket, comment_id: 1 }, "/tickets?ticket=8&org=7"],
    // Organización
    ["organization_member_left", { organization_id: 6 }, "/organizations/6"],
    ["organization_role_updated", { organization_id: 6 }, "/organizations/6"],
    ["organization_plan_downgraded", { organization_id: 6 }, "/organizations/6"],
    ["organization_member_removed", { organization_id: 6, action: "removed_from_organization" }, null],
    ["organization_member_deactivated", { organization_id: 6, action: "removed_from_organization" }, null],
    // Invitaciones recibidas: la página para aceptarlas
    ["project_invitation_received", { invitation_token: "a", project_id: 2 }, "/accept-invitation/a"],
    ["team_invitation_received", { invitation_token: "b", team_id: 4 }, "/accept-team-invitation/b"],
    ["organization_invitation_received", { invitation_token: "c" }, "/accept-organization-invitation/c"],
    ["team_invitation_received", {}, "/dashboard?invitations=open"],
    // Enviadas, aceptadas o rechazadas: el recurso
    ["project_invitation_sent", { project_id: 2, organization_id: 7 }, "/projects/2?org=7"],
    ["team_invitation_sent", { team_id: 4, organization_id: 7 }, "/teams/4?org=7"],
    ["project_invitation_accepted", { type: "project", project_id: 2, organization_id: 7 }, "/projects/2?org=7"],
    ["team_invitation_accepted", { type: "team", team_id: 4, organization_id: 7 }, "/teams/4?org=7"],
    ["organization_invitation_accepted", { type: "organization", organization_id: 6 }, "/organizations/6"],
    ["project_invitation_declined", { type: "project", project_id: 2, organization_id: null }, "/projects/2"],
    ["team_invitation_declined", { type: "team", team_id: 4, organization_id: 7 }, "/teams/4?org=7"],
    ["organization_invitation_declined", { type: "organization", organization_id: 6 }, "/organizations/6"],
    // Señal silenciosa (no se guarda) y tipos desconocidos
    ["organization_invitation_cancelled", { invitation_id: 1, organization_id: 6 }, null],
    ["algo_desconocido", {}, null],
  ])("%s → %s", (type, data, expected) => {
    expect(t(type, data)).toBe(expected);
  });

  it("avisos guardados antes de llevar ids: el listado del recurso", () => {
    expect(t("task_assigned", { project_id: 2 })).toBe("/projects/2");
    expect(t("task_assigned", {})).toBe("/tasks");
    expect(t("project_updated", {})).toBe("/projects");
    expect(t("ticket_comment_added", { ticket_id: 8 })).toBe("/tickets?ticket=8");
    expect(t("team_member_joined", {})).toBe("/teams");
    expect(t("project_invitation_accepted", { type: "project" })).toBe("/projects");
    expect(t("team_invitation_declined", { type: "team" })).toBe("/teams");
    expect(t("organization_invitation_accepted", { type: "organization" })).toBe("/organizations");
  });
});

describe("notificationNotice", () => {
  it("avisa cuando el recurso ya no existe o se perdió el acceso", () => {
    expect(notificationNotice({ type: "project_deleted", data: { project_name: "Web" } })).toBe(
      'El proyecto "Web" ya no existe'
    );
    expect(notificationNotice({ type: "team_deleted", data: {} })).toBe("El equipo ya no existe");
    expect(notificationNotice({ type: "project_access_revoked", data: { project_name: "Web" } })).toBe(
      'Ya no tienes acceso al proyecto "Web"'
    );
    expect(notificationNotice({ type: "task_assigned", data: { task_id: 1 } })).toBeNull();
  });
});

describe("refreshKeysFor", () => {
  it("las tareas refrescan tareas, proyectos, dashboard y el detalle abierto", () => {
    expect(refreshKeysFor({ type: "task_created", data: { task_id: 7 } })).toEqual(
      expect.arrayContaining(["tasks", "projects", "dashboard", "task-detail-7"])
    );
  });

  it("los tickets refrescan la lista y el detalle abierto", () => {
    expect(refreshKeysFor({ type: "ticket_taken", data: { ticket_id: 2 } })).toEqual(
      expect.arrayContaining(["tickets", "ticketDetail-2"])
    );
  });

  it("una señal silenciosa del proyecto refresca proyectos y tareas", () => {
    expect(refreshKeysFor({ type: "project_updated", silent: true, data: { project_id: 1 } })).toEqual(
      expect.arrayContaining(["projects", "tasks", "dashboard"])
    );
  });
});

describe("toastKindFor", () => {
  it("elige el tono del aviso", () => {
    expect(toastKindFor("task_completed")).toBe("success");
    expect(toastKindFor("task_overdue")).toBe("warning");
    expect(toastKindFor("organization_plan_downgraded")).toBe("warning");
    expect(toastKindFor("task_created")).toBe("info");
  });
});

describe("groupByDay", () => {
  it("agrupa en Hoy, Ayer y fecha", () => {
    const now = new Date(2026, 8, 18, 12, 0);
    const groups = groupByDay(
      [
        { id: 1, createdAt: new Date(2026, 8, 18, 9, 0) },
        { id: 2, createdAt: new Date(2026, 8, 17, 23, 0) },
        { id: 3, createdAt: new Date(2026, 8, 10, 8, 0) },
        { id: 4, createdAt: new Date(2026, 8, 10, 7, 0) },
      ],
      now
    );
    expect(groups.map((g) => g.label.toLowerCase())).toEqual([
      "hoy",
      "ayer",
      expect.stringContaining("10 de septiembre"),
    ]);
    expect(groups[2].items.map((i) => i.id)).toEqual([3, 4]);
  });

  it("'Ayer' respeta el cambio de horario (domingo de 25 horas)", () => {
    const previousTz = process.env.TZ;
    process.env.TZ = "Europe/Madrid";
    try {
      const now = new Date(2026, 9, 26, 10, 0); // lunes tras el cambio de octubre
      const groups = groupByDay([{ id: 1, createdAt: new Date(2026, 9, 25, 12, 0) }], now);
      expect(groups[0].label).toBe("Ayer");
    } finally {
      process.env.TZ = previousTz;
    }
  });
});

describe("retentionLabel", () => {
  it("describe el plazo vigente", () => {
    expect(retentionLabel(30)).toBe("Se guardan 30 días");
    expect(retentionLabel(0)).toBe("Se guardan siempre");
  });
});

describe("fase B: accesos perdidos, workspace y organización", () => {
  const t = (type, data = {}) => notificationTarget({ type, data });

  it("el enlace de un ticket lleva la organización para cambiar de workspace", () => {
    expect(t("ticket_created", { ticket_id: 8, organization_id: 3 })).toBe("/tickets?ticket=8&org=3");
  });

  it("perder un proyecto o ser desactivado no abre el recurso", () => {
    expect(t("project_access_revoked", { project_id: 2 })).toBe("/projects");
    expect(
      t("organization_member_deactivated", { organization_id: 6, action: "removed_from_organization" })
    ).toBeNull();
  });

  it("una invitación cancelada refresca las invitaciones", () => {
    expect(refreshKeysFor({ type: "organization_invitation_cancelled", silent: true, data: {} })).toContain(
      "invitations"
    );
  });

  it("organization.sync se traduce en claves de refresco", () => {
    expect(organizationSyncKeysFor({ entity: "client_ticket", action: "created", ticket_id: 4 })).toEqual(
      expect.arrayContaining(["clientTickets", "ticketDetail-4"])
    );
    expect(organizationSyncKeysFor({ entity: "team", action: "created", team_id: 1 })).toEqual(
      expect.arrayContaining(["teams", "organizations", "dashboard"])
    );
    expect(organizationSyncKeysFor({ entity: "member", action: "role_updated", member_id: 2 })).toContain(
      "organizations"
    );
    expect(organizationSyncKeysFor({ entity: "invitation", action: "cancelled" })).toContain("organizations");
  });

  it("organization.sync de clientes y de tickets de cliente refresca la pantalla Clientes", () => {
    expect(organizationSyncKeysFor({ entity: "client", action: "updated", client_id: 3 })).toEqual(["clients"]);
    expect(organizationSyncKeysFor({ entity: "client_ticket", action: "comment_added", ticket_id: 4, client_id: 3 })).toEqual(
      expect.arrayContaining(["clientTickets", "tickets", "clients", "ticketDetail-4"])
    );
  });

  it("organization.sync pide refrescar el usuario si me afecta o cambia la organización", () => {
    const me = { id: 2 };
    expect(organizationSyncAffectsUser({ entity: "member", action: "role_updated", member_id: 2 }, me)).toBe(true);
    expect(organizationSyncAffectsUser({ entity: "member", action: "role_updated", member_id: 5 }, me)).toBe(false);
    expect(
      organizationSyncAffectsUser({ entity: "member", action: "owner_changed", member_id: 9, previous_owner_id: 2 }, me)
    ).toBe(true);
    expect(organizationSyncAffectsUser({ entity: "organization", action: "updated" }, me)).toBe(true);
  });
});

describe("fase 2: tickets de cliente", () => {
  const t = (type, data = {}) => notificationTarget({ type, data });
  const noTeam = { ticket_id: 8, organization_id: 7, team_id: null };
  const withTeam = { ticket_id: 8, organization_id: 7, team_id: 4 };

  it.each([
    ["ticket_client_created", noTeam, "/client-tickets?ticket=8&org=7"],
    ["ticket_comment_added", { ...noTeam, comment_id: 1 }, "/client-tickets?ticket=8&org=7"],
    ["ticket_client_reopened", noTeam, "/client-tickets?ticket=8&org=7"],
    ["ticket_routed_to_team", withTeam, "/tickets?ticket=8&org=7"],
    ["ticket_client_reopened", withTeam, "/tickets?ticket=8&org=7"],
    ["ticket_comment_added", { ...withTeam, comment_id: 1 }, "/tickets?ticket=8&org=7"],
  ])("%s → %s", (type, data, expected) => {
    expect(t(type, data)).toBe(expected);
  });

  it("sin la clave team_id (avisos viejos o internos) sigue abriendo Tickets", () => {
    expect(t("ticket_comment_added", { ticket_id: 8 })).toBe("/tickets?ticket=8");
    expect(t("ticket_created", { ticket_id: 8, organization_id: 3, team_id: 2 })).toBe("/tickets?ticket=8&org=3");
  });

  it("sin ticket_id va al listado que corresponda", () => {
    expect(t("ticket_client_created", { organization_id: 7, team_id: null })).toBe("/client-tickets?org=7");
  });

  it("un aviso de ticket sin equipo también refresca la Bandeja de Clientes", () => {
    expect(refreshKeysFor({ type: "ticket_client_created", data: { ticket_id: 3, team_id: null } })).toEqual(
      expect.arrayContaining(["tickets", "clientTickets", "ticketDetail-3"])
    );
    expect(refreshKeysFor({ type: "ticket_routed_to_team", data: { ticket_id: 3, team_id: 4 } })).not.toContain(
      "clientTickets"
    );
  });

  it("la reapertura por el cliente se avisa como advertencia", () => {
    expect(toastKindFor("ticket_client_reopened")).toBe("warning");
    expect(toastKindFor("ticket_client_created")).toBe("info");
  });
});

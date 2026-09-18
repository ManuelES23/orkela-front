import { describe, it, expect } from "vitest";
import {
  normalizeNotification,
  notificationTarget,
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

  it("lleva cada notificación a su recurso", () => {
    expect(t("task_assigned", { task_id: 3, project_id: 2 })).toBe("/tasks?task=3");
    expect(t("checklist_item_completed", { task_id: 3 })).toBe("/tasks?task=3");
    expect(t("project_updated", { project_id: 2 })).toBe("/projects/2");
    expect(t("project_deleted", { project_name: "x" })).toBe("/projects");
    expect(t("ticket_comment_added", { ticket_id: 8 })).toBe("/tickets?ticket=8");
    expect(t("team_member_joined", { team_id: 4 })).toBe("/teams/4");
    expect(t("team_deleted", {})).toBe("/teams");
    expect(t("organization_role_updated", { organization_id: 6 })).toBe("/organizations/6");
  });

  it("las invitaciones recibidas abren la página para aceptarlas", () => {
    expect(t("project_invitation_received", { invitation_token: "a" })).toBe("/accept-invitation/a");
    expect(t("team_invitation_received", { invitation_token: "b" })).toBe("/accept-team-invitation/b");
    expect(t("organization_invitation_received", { invitation_token: "c" })).toBe(
      "/accept-organization-invitation/c"
    );
  });

  it("las invitaciones aceptadas o rechazadas llevan al listado", () => {
    expect(t("project_invitation_accepted", { type: "project" })).toBe("/projects");
    expect(t("team_invitation_declined", { type: "team" })).toBe("/teams");
    expect(t("organization_invitation_accepted", { type: "organization" })).toBe("/organizations");
  });

  it("sin destino cuando ya no hay acceso", () => {
    expect(t("organization_member_removed", { organization_id: 6, action: "removed_from_organization" })).toBeNull();
    expect(t("algo_desconocido")).toBeNull();
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

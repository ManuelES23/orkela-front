import { describe, it, expect } from "vitest";
import { buildThreadMessages, formatMessageTime } from "./threadMessages";

const ticket = {
  id: 7,
  description: "El panel no carga",
  created_at: "2026-09-18T09:00:00Z",
  creator: { id: 55, name: "Ana" },
  comments: [
    { id: 4, content: "Yo también", created_at: "2026-09-18T09:12:00Z", contact_id: 60, contact: { id: 60, name: "Carlos" }, user: null },
    { id: 3, content: "Chrome", created_at: "2026-09-18T09:12:00Z", contact_id: 55, contact: { id: 55, name: "Ana" }, user: null },
    { id: 2, content: "¿Navegador?", created_at: "2026-09-18T09:10:00Z", contact_id: null, contact: null, user: { name: "Beto" } },
  ],
};

describe("buildThreadMessages", () => {
  it("abre con la descripción como mensaje del creador y ordena por fecha e id", () => {
    const messages = buildThreadMessages(ticket, 55);
    expect(messages.map((m) => m.key)).toEqual(["description", "c-2", "c-3", "c-4"]);
    expect(messages[0]).toMatchObject({ content: "El panel no carga", own: true, authorName: null, status: "sent" });
  });

  it("atribuye staff, colegas y mensajes propios", () => {
    const [, staff, own, colleague] = buildThreadMessages(ticket, 55);
    expect(staff).toMatchObject({ own: false, fromStaff: true, authorName: "Beto" });
    expect(own).toMatchObject({ own: true, fromStaff: false, authorName: null });
    expect(colleague).toMatchObject({ own: false, fromStaff: false, authorName: "Carlos" });
  });

  it("el admin que ve el ticket de un colega ve la descripción con el nombre del creador", () => {
    const [opening] = buildThreadMessages(ticket, 99);
    expect(opening).toMatchObject({ own: false, authorName: "Ana" });
  });

  it("sin creator (respuesta antigua) la descripción cuenta como propia", () => {
    const [opening] = buildThreadMessages({ ...ticket, creator: null }, 55);
    expect(opening.own).toBe(true);
  });

  it("devuelve lista vacía sin ticket", () => {
    expect(buildThreadMessages(null, 55)).toEqual([]);
  });

  it("un comentario repetido (POST + evento en vivo) sale una sola vez", () => {
    const dup = { ...ticket, comments: [...ticket.comments, { ...ticket.comments[0] }] };
    expect(buildThreadMessages(dup, 55).filter((m) => m.key === "c-4")).toHaveLength(1);
  });
});

describe("formatMessageTime", () => {
  const now = new Date(2026, 8, 18, 20, 0);

  it("solo la hora si es de hoy", () => {
    expect(formatMessageTime(new Date(2026, 8, 18, 14, 5), now)).toBe("14:05");
  });

  it("día y hora si es de otro día", () => {
    const text = formatMessageTime(new Date(2026, 8, 17, 14, 5), now);
    expect(text).toContain("14:05");
    expect(text).toMatch(/17/);
  });

  it("cadena vacía si la fecha es inválida", () => {
    expect(formatMessageTime("no-es-fecha", now)).toBe("");
  });
});

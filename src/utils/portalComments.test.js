import { describe, it, expect } from "vitest";
import { mergeComments, mergeTicketDetail } from "./portalComments";

const c = (id, created_at, content = `c${id}`) => ({ id, created_at, content });

describe("mergeComments", () => {
  it("no duplica un comentario que llega dos veces", () => {
    const merged = mergeComments([c(1, "2026-01-01T10:00:00Z")], [c(1, "2026-01-01T10:00:00Z")]);
    expect(merged).toHaveLength(1);
  });

  it("ordena por fecha y luego por id", () => {
    const merged = mergeComments(
      [c(3, "2026-01-01T10:00:00Z"), c(1, "2026-01-01T09:00:00Z")],
      [c(2, "2026-01-01T10:00:00Z")]
    );
    expect(merged.map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("tolera listas vacías o nulas", () => {
    expect(mergeComments(null, undefined)).toEqual([]);
  });
});

describe("mergeTicketDetail", () => {
  it("conserva un comentario local que una respuesta más vieja aún no traía", () => {
    const prev = { id: 7, comments: [c(1, "2026-01-01T09:00:00Z"), c(2, "2026-01-01T10:00:00Z")] };
    const fresh = { id: 7, status: "in_progress", comments: [c(1, "2026-01-01T09:00:00Z")] };

    const merged = mergeTicketDetail(prev, fresh);

    expect(merged.status).toBe("in_progress");
    expect(merged.comments.map((x) => x.id)).toEqual([1, 2]);
  });

  it("con otro ticket devuelve el nuevo tal cual", () => {
    const fresh = { id: 8, comments: [] };
    expect(mergeTicketDetail({ id: 7, comments: [c(1, "2026-01-01T09:00:00Z")] }, fresh)).toBe(fresh);
  });
});

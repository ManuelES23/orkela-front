import { describe, it, expect } from "vitest";
import { splitLinks } from "./linkify";

describe("splitLinks", () => {
  it("separa el enlace y deja fuera la puntuación final", () => {
    expect(splitLinks("Mira https://acme.com/x?y=1.")).toEqual([
      { type: "text", value: "Mira " },
      { type: "link", value: "https://acme.com/x?y=1", href: "https://acme.com/x?y=1" },
      { type: "text", value: "." },
    ]);
  });

  it("completa www. con https://", () => {
    expect(splitLinks("www.acme.com")).toEqual([
      { type: "link", value: "www.acme.com", href: "https://www.acme.com" },
    ]);
  });

  it("no convierte esquemas peligrosos", () => {
    expect(splitLinks("javascript:alert(1)")).toEqual([{ type: "text", value: "javascript:alert(1)" }]);
  });

  it("respeta paréntesis alrededor del enlace", () => {
    expect(splitLinks("(ver https://a.io)")).toEqual([
      { type: "text", value: "(ver " },
      { type: "link", value: "https://a.io", href: "https://a.io" },
      { type: "text", value: ")" },
    ]);
  });

  it("devuelve lista vacía para texto vacío", () => {
    expect(splitLinks("")).toEqual([]);
  });
});

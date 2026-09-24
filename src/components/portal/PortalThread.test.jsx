import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import PortalThread from "./PortalThread";

const baseTicket = {
  id: 7,
  title: "No carga el panel",
  status: "in_progress",
  description: "El panel no carga desde ayer",
  created_at: "2026-09-18T09:00:00Z",
  creator: { id: 55, name: "Ana" },
  assigned_agent: null,
  team: null,
  events: [],
  comments: [
    { id: 2, content: "¿Qué navegador usas?", created_at: "2026-09-18T09:10:00Z", contact_id: null, user: { name: "Beto Soporte" }, contact: null },
    { id: 3, content: "Chrome", created_at: "2026-09-18T09:12:00Z", contact_id: 55, user: null, contact: { id: 55, name: "Ana" } },
    { id: 4, content: "Yo también lo veo", created_at: "2026-09-18T09:12:00Z", contact_id: 60, user: null, contact: { id: 60, name: "Carlos" } },
  ],
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const threadProps = (overrides = {}) => ({
  ticketId: 7,
  ticket: baseTicket,
  contactId: 55,
  onBack: vi.fn(),
  onSendComment: vi.fn().mockResolvedValue({ id: 99 }),
  ...overrides,
});

const typeAndSend = (text) => {
  const input = screen.getByLabelText("Tu respuesta");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
  return input;
};

// jsdom no calcula layout: se simulan las medidas del contenedor del hilo.
const fakeScrollBox = (element, { scrollHeight, clientHeight, scrollTop }) => {
  const box = { top: scrollTop };
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: clientHeight });
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => box.top,
    set: (value) => {
      box.top = value;
    },
  });
  return box;
};

const staffReply = { id: 5, content: "Ya lo revisamos", created_at: "2026-09-18T09:20:00Z", contact_id: null, user: { name: "Beto Soporte" }, contact: null };

beforeEach(() => sessionStorage.clear());

describe("PortalThread", () => {
  it("expone el hilo como región viva y atribuye cada mensaje", () => {
    render(<PortalThread {...threadProps()} />);
    const log = screen.getByRole("log", { name: "Conversación del ticket" });
    expect(log).toHaveAttribute("aria-live", "polite");

    const bubbles = log.querySelectorAll("[data-own]");
    expect(bubbles).toHaveLength(4);
    expect(bubbles[0]).toHaveAttribute("data-own", "true");
    expect(within(bubbles[0]).getByText("El panel no carga desde ayer")).toBeInTheDocument();
    expect(within(bubbles[1]).getByText(/Beto Soporte/)).toBeInTheDocument();
    expect(bubbles[2]).toHaveAttribute("data-own", "true");
    expect(bubbles[3]).toHaveAttribute("data-own", "false");
    expect(within(bubbles[3]).getByText("Carlos")).toBeInTheDocument();
  });

  it("muestra 'Enviando…' hasta que el servidor responde, sin perder el foco", async () => {
    const pending = deferred();
    render(<PortalThread {...threadProps({ onSendComment: vi.fn(() => pending.promise) })} />);
    const input = screen.getByLabelText("Tu respuesta");
    input.focus();

    typeAndSend("Sigue fallando");

    expect(screen.getByText("Sigue fallando")).toBeInTheDocument();
    expect(screen.getByText("Enviando…")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();

    await act(async () => {
      pending.resolve({ id: 10 });
    });
    expect(screen.queryByText("Enviando…")).not.toBeInTheDocument();
  });

  it("si falla, ofrece reintentar ese mensaje", async () => {
    const onSendComment = vi.fn().mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce({ id: 11 });
    render(<PortalThread {...threadProps({ onSendComment })} />);

    await act(async () => {
      typeAndSend("Hola de nuevo");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("No se envió");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    });
    expect(onSendComment).toHaveBeenCalledTimes(2);
    expect(onSendComment).toHaveBeenLastCalledWith("Hola de nuevo");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no mueve el scroll si el usuario leía más arriba y avisa de mensajes nuevos", () => {
    const { rerender } = render(<PortalThread {...threadProps()} />);
    const log = screen.getByRole("log");
    const box = fakeScrollBox(log, { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 });
    fireEvent.scroll(log);

    rerender(<PortalThread {...threadProps({ ticket: { ...baseTicket, comments: [...baseTicket.comments, staffReply] } })} />);

    expect(box.top).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: /Nuevos mensajes/ }));
    expect(box.top).toBe(1000);
    expect(screen.queryByRole("button", { name: /Nuevos mensajes/ })).not.toBeInTheDocument();
  });

  it("si el usuario estaba al final, baja solo con el mensaje nuevo", () => {
    const { rerender } = render(<PortalThread {...threadProps()} />);
    const log = screen.getByRole("log");
    const box = fakeScrollBox(log, { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });
    fireEvent.scroll(log);

    rerender(<PortalThread {...threadProps({ ticket: { ...baseTicket, comments: [...baseTicket.comments, staffReply] } })} />);

    expect(box.top).toBe(1000);
    expect(screen.queryByRole("button", { name: /Nuevos mensajes/ })).not.toBeInTheDocument();
  });

  it("mantiene el estado de error de la fase 3 con Reintentar", () => {
    const onRetry = vi.fn();
    render(<PortalThread {...threadProps({ ticket: null, error: "failed", onRetry })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar la conversación");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("un 404 no ofrece Reintentar y permite volver a la lista", () => {
    const onBack = vi.fn();
    render(<PortalThread {...threadProps({ ticket: null, error: "not_found", onBack })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No encontramos este ticket");
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver a mis tickets" }));
    expect(onBack).toHaveBeenCalled();
  });
});

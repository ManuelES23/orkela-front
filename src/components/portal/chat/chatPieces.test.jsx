import { describe, it, expect, vi } from "vitest";
import { useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PortalMessageBubble from "./PortalMessageBubble";
import PortalComposer, { MESSAGE_MAX } from "./PortalComposer";

const message = {
  key: "c-1", id: 1, content: "Mira https://ayuda.acme.com\nsegunda línea", created_at: "2026-09-18T09:10:00Z",
  own: false, fromStaff: true, authorName: "Beto", status: "sent",
};

describe("PortalMessageBubble", () => {
  it("muestra autor, hora, saltos de línea y enlaces seguros", () => {
    const { container } = render(<PortalMessageBubble message={message} />);
    expect(container.firstChild).toHaveAttribute("data-own", "false");
    expect(screen.getByText(/Beto/)).toBeInTheDocument();
    expect(container.querySelector("time")).toHaveAttribute("dateTime", "2026-09-18T09:10:00Z");
    expect(container.querySelector(".whitespace-pre-wrap")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "https://ayuda.acme.com" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("en error ofrece reintentar", () => {
    const onRetry = vi.fn();
    render(<PortalMessageBubble message={{ ...message, own: true, authorName: null, status: "failed" }} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se envió");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("mientras envía lo indica", () => {
    render(<PortalMessageBubble message={{ ...message, own: true, authorName: null, status: "sending" }} />);
    expect(screen.getByText("Enviando…")).toBeInTheDocument();
  });
});

const ComposerHarness = ({ onSubmit, hint = null }) => {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
  return (
    <PortalComposer
      value={value}
      onChange={setValue}
      onSubmit={(text) => {
        onSubmit(text);
        setValue("");
      }}
      inputRef={inputRef}
      hint={hint}
    />
  );
};

describe("PortalComposer", () => {
  it("Enter envía el texto recortado, Shift+Enter no, y conserva el foco", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);
    const input = screen.getByLabelText("Tu respuesta");
    input.focus();

    fireEvent.change(input, { target: { value: "  Hola  " } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("Hola");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(input).not.toBeDisabled();
  });

  it("no envía texto vacío", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByLabelText("Tu respuesta"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("limita a 5000 caracteres y enlaza el aviso", () => {
    render(<ComposerHarness onSubmit={vi.fn()} hint='Si respondes, el ticket se reabrirá.' />);
    const input = screen.getByLabelText("Tu respuesta");
    expect(MESSAGE_MAX).toBe(5000);
    expect(input).toHaveAttribute("maxLength", "5000");
    expect(input).toHaveAccessibleDescription("Si respondes, el ticket se reabrirá.");
  });
});

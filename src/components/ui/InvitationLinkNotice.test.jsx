import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InvitationLinkModal, { InvitationLinkNotice } from "./InvitationLinkNotice";

const LINK = "https://app.orkela.com/accept-organization-invitation/tok-123";

describe("InvitationLinkNotice", () => {
  let writeText;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  it("muestra el aviso y el enlace para compartir", () => {
    render(<InvitationLinkNotice items={[{ email: "ana@acme.com", link: LINK }]} />);

    expect(screen.getByText("Invitación creada, pero no se pudo enviar el correo")).toBeInTheDocument();
    expect(screen.getByText("ana@acme.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue(LINK)).toBeInTheDocument();
  });

  it("copia el enlace al portapapeles y confirma con 'Copiado'", async () => {
    render(<InvitationLinkNotice items={[{ link: LINK }]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copiar enlace/ }));
    });

    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(screen.getByRole("button", { name: /Copiado/ })).toBeInTheDocument();
  });

  it("si el portapapeles falla no rompe y deja el enlace seleccionable", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<InvitationLinkNotice items={[{ link: LINK }]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copiar enlace/ }));
    });

    expect(screen.getByRole("button", { name: /Copiar enlace/ })).toBeInTheDocument();
    expect(screen.queryByText("Copiado")).not.toBeInTheDocument();
  });

  it("muestra un botón de copia por cada invitación", () => {
    render(
      <InvitationLinkNotice
        items={[
          { email: "a@x.com", link: `${LINK}-a` },
          { email: "b@x.com", link: `${LINK}-b` },
        ]}
      />
    );

    expect(screen.getAllByRole("button", { name: /Copiar enlace/ })).toHaveLength(2);
  });

  it("el modal no se muestra sin enlaces y se cierra con 'Entendido'", () => {
    const onClose = vi.fn();
    const { rerender } = render(<InvitationLinkModal items={[]} onClose={onClose} />);
    expect(screen.queryByText("Correo no enviado")).not.toBeInTheDocument();

    rerender(<InvitationLinkModal items={[{ link: LINK }]} onClose={onClose} />);
    expect(screen.getByText("Correo no enviado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(onClose).toHaveBeenCalled();
  });
});

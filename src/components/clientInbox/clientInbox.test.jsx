import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { TICKET_STATUS, TICKET_PRIORITY, TICKET_TYPE } from "../../constants/tickets";
import { buildInboxChips } from "./inboxVocabulary";
import InboxStatusBadge from "./InboxStatusBadge";
import InboxTabs from "./InboxTabs";
import InboxFilterChips from "./InboxFilterChips";
import InboxFilters from "./InboxFilters";
import InboxTicketRow from "./InboxTicketRow";
import { InboxEmpty, InboxError } from "./InboxStates";
import InboxPagination from "./InboxPagination";

const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();

const baseTicket = {
  id: 1,
  title: "Acceso VPN",
  status: "pending",
  priority: "urgent",
  type: "support",
  client: { id: 7, name: "Acme" },
  contact: { id: 3, name: "Ana Torres" },
  team_id: 4,
  team: { id: 4, name: "Soporte" },
  assigned_user: { id: 2, name: "Laura" },
  comments_count: 2,
  last_client_comment_at: minutesAgo(5),
  has_unread_client_reply: true,
  created_at: minutesAgo(60),
  can_route: true,
};

describe("buildInboxChips", () => {
  it("genera un chip legible por filtro activo, incluido el cliente", () => {
    expect(
      buildInboxChips(
        { q: " vpn ", priority: "high", type: "bug", team: "4", client: "7" },
        { teamNameById: { 4: "Soporte" }, clientName: "Acme" }
      )
    ).toEqual([
      { key: "client", label: "Cliente: Acme" },
      { key: "q", label: "Búsqueda: vpn" },
      { key: "priority", label: `Prioridad: ${TICKET_PRIORITY.high.label}` },
      { key: "type", label: `Tipo: ${TICKET_TYPE.bug.label}` },
      { key: "team", label: "Equipo: Soporte" },
    ]);
  });

  it("sin nombres conocidos usa el id y omite búsquedas en blanco", () => {
    expect(buildInboxChips({ q: "  ", priority: "", type: "", team: "9", client: "5" })).toEqual([
      { key: "client", label: "Cliente: #5" },
      { key: "team", label: "Equipo: #9" },
    ]);
  });
});

describe("InboxStatusBadge", () => {
  it("muestra texto e icono decorativo", () => {
    render(<InboxStatusBadge status='pending' />);
    const badge = screen.getByText(TICKET_STATUS.pending.label);
    expect(badge.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("InboxTabs", () => {
  it("marca la activa, muestra contadores y se mueve con clic y flechas", () => {
    const onChange = vi.fn();
    render(
      <InboxTabs
        value='abiertos'
        counts={{ sin_asignar: 4, abiertos: 2, esperando_cliente: 1, resueltos: 0, todos: 7 }}
        onChange={onChange}
      />
    );

    const active = screen.getByRole("tab", { name: /Abiertos/ });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).toHaveAttribute("tabindex", "0");
    expect(within(active).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /Sin asignar/ })).getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Sin asignar/ })).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(active, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("esperando_cliente");
    fireEvent.keyDown(active, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("sin_asignar");
    fireEvent.click(screen.getByRole("tab", { name: /Todos/ }));
    expect(onChange).toHaveBeenLastCalledWith("todos");
  });
});

describe("InboxFilterChips", () => {
  it("quita un chip y limpia todos", () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    render(
      <InboxFilterChips
        chips={[
          { key: "client", label: "Cliente: Acme" },
          { key: "q", label: "Búsqueda: vpn" },
        ]}
        onRemove={onRemove}
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByText("Cliente: Acme")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtro Cliente: Acme" }));
    expect(onRemove).toHaveBeenCalledWith("client");
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onClearAll).toHaveBeenCalled();
  });

  it("no pinta nada sin chips y no ofrece 'Limpiar filtros' con uno solo", () => {
    const { container, rerender } = render(<InboxFilterChips chips={[]} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<InboxFilterChips chips={[{ key: "q", label: "Búsqueda: vpn" }]} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });
});

describe("InboxFilters", () => {
  it("confirma la búsqueda tras una pausa, cambia selects y avisa si fallan los equipos", async () => {
    const onChange = vi.fn();
    const onRetryTeams = vi.fn();
    render(
      <InboxFilters
        filters={{ q: "", priority: "", type: "", team: "" }}
        teams={[]}
        teamsError
        onRetryTeams={onRetryTeams}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar tickets" }), { target: { value: "vpn" } });
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("q", "vpn"));

    fireEvent.change(screen.getByLabelText("Prioridad"), { target: { value: "high" } });
    expect(onChange).toHaveBeenCalledWith("priority", "high");
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "bug" } });
    expect(onChange).toHaveBeenCalledWith("type", "bug");

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los equipos.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar carga de equipos" }));
    expect(onRetryTeams).toHaveBeenCalled();
  });

  it("al quitar el chip de búsqueda el campo se vacía", () => {
    const props = { teams: [{ id: 4, name: "Soporte" }], teamsError: false, onRetryTeams: vi.fn(), onChange: vi.fn() };
    const { rerender } = render(<InboxFilters {...props} filters={{ q: "vpn", priority: "", type: "", team: "" }} />);
    expect(screen.getByRole("searchbox", { name: "Buscar tickets" })).toHaveValue("vpn");

    rerender(<InboxFilters {...props} filters={{ q: "", priority: "", type: "", team: "" }} />);
    expect(screen.getByRole("searchbox", { name: "Buscar tickets" })).toHaveValue("");
    expect(within(screen.getByLabelText("Equipo")).getByRole("option", { name: "Soporte" })).toBeInTheDocument();
  });

  it("aplica la búsqueda pendiente si el bloque se desmonta antes de la pausa", () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <InboxFilters filters={{ q: "", priority: "", type: "", team: "" }} teams={[]} teamsError={false} onRetryTeams={vi.fn()} onChange={onChange} />,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar tickets" }), { target: { value: "vpn" } });
    expect(onChange).not.toHaveBeenCalled();

    unmount();
    expect(onChange).toHaveBeenCalledWith("q", "vpn");
  });

  it("no dispara onChange al desmontar si no hay búsqueda pendiente", () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <InboxFilters filters={{ q: "vpn", priority: "", type: "", team: "" }} teams={[]} teamsError={false} onRetryTeams={vi.fn()} onChange={onChange} />,
    );
    unmount();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("InboxTicketRow", () => {
  it("muestra todo el contenido de la fila", () => {
    render(<InboxTicketRow ticket={baseTicket} teams={[]} onOpen={vi.fn()} onAssign={vi.fn()} />);

    expect(screen.getByText("Acme · Ana Torres")).toBeInTheDocument();
    expect(screen.getByText(TICKET_STATUS.pending.label)).toBeInTheDocument();
    expect(screen.getByText(TICKET_PRIORITY.urgent.label)).toBeInTheDocument();
    expect(screen.getByText("Equipo: Soporte")).toBeInTheDocument();
    expect(screen.getByText("Agente: Laura")).toBeInTheDocument();
    expect(screen.getByText(/Comentarios:/).parentElement).toHaveTextContent("2");
    expect(screen.getByText("Último mensaje del cliente hace 5 minutos")).toBeInTheDocument();
    expect(screen.getByText("Respuesta nueva del cliente")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Asignar equipo a/)).not.toBeInTheDocument();
  });

  it("sin equipo ni agente lo dice, ofrece asignar y sin mensajes muestra la creación", () => {
    const onAssign = vi.fn();
    const onOpen = vi.fn();
    render(
      <InboxTicketRow
        ticket={{
          ...baseTicket,
          team_id: null,
          team: null,
          assigned_user: null,
          last_client_comment_at: null,
          has_unread_client_reply: false,
        }}
        teams={[{ id: 4, name: "Soporte" }]}
        onOpen={onOpen}
        onAssign={onAssign}
      />
    );

    expect(screen.getByText("Sin equipo")).toBeInTheDocument();
    expect(screen.getByText("Sin agente")).toBeInTheDocument();
    expect(screen.getByText("Creado hace 1 hora")).toBeInTheDocument();
    expect(screen.queryByText("Respuesta nueva del cliente")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Asignar equipo a Acceso VPN"), { target: { value: "4" } });
    expect(onAssign).toHaveBeenCalledWith(1, 4);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("el título es un botón que abre el ticket", () => {
    const onOpen = vi.fn();
    render(<InboxTicketRow ticket={baseTicket} teams={[]} onOpen={onOpen} onAssign={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Acceso VPN" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(baseTicket);
  });

  it("sin permiso de enrutar no ofrece asignar", () => {
    render(
      <InboxTicketRow ticket={{ ...baseTicket, team_id: null, team: null, can_route: false }} teams={[{ id: 4, name: "Soporte" }]} onOpen={vi.fn()} onAssign={vi.fn()} />
    );
    expect(screen.queryByLabelText(/Asignar equipo a/)).not.toBeInTheDocument();
  });
});

describe("InboxStates e InboxPagination", () => {
  it("error anunciado con Reintentar", () => {
    const onRetry = vi.fn();
    render(<InboxError onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los tickets.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("vacío por pestaña y por filtros", () => {
    const onClearFilters = vi.fn();
    const { rerender } = render(<InboxEmpty tab='esperando_cliente' hasFilters={false} onClearFilters={onClearFilters} />);
    expect(screen.getByText("Ningún ticket está esperando al cliente.")).toBeInTheDocument();

    rerender(<InboxEmpty tab='abiertos' hasFilters onClearFilters={onClearFilters} />);
    expect(screen.getByText("Ningún ticket coincide con los filtros.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("paginación Anterior/Siguiente y nada con una sola página", () => {
    const onPage = vi.fn();
    const { container, rerender } = render(<InboxPagination meta={{ current_page: 1, last_page: 1 }} onPage={onPage} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<InboxPagination meta={{ current_page: 2, last_page: 3 }} onPage={onPage} />);
    expect(screen.getByRole("navigation", { name: "Paginación" })).toHaveTextContent("Página 2 de 3");
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPage).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPage).toHaveBeenLastCalledWith(3);

    rerender(<InboxPagination meta={{ current_page: 3, last_page: 3 }} onPage={onPage} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });
});

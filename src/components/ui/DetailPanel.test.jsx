import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DetailPanel from "./DetailPanel";

describe("DetailPanel", () => {
  it("muestra su contenido", () => {
    render(
      <DetailPanel panelKey='1'>
        <p>detalle del cliente</p>
      </DetailPanel>
    );

    expect(screen.getByText("detalle del cliente")).toBeInTheDocument();
  });

  it("sigue mostrando el contenido nuevo al cambiar de panelKey", () => {
    const { rerender } = render(
      <DetailPanel panelKey='1'>
        <p>cliente A</p>
      </DetailPanel>
    );
    expect(screen.getByText("cliente A")).toBeInTheDocument();

    rerender(
      <DetailPanel panelKey='2'>
        <p>cliente B</p>
      </DetailPanel>
    );

    expect(screen.getByText("cliente B")).toBeInTheDocument();
  });
});

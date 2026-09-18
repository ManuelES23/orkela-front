import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import useOpenFromQuery from "./useOpenFromQuery";

const Probe = ({ onOpen }) => {
  useOpenFromQuery("task", onOpen);
  const location = useLocation();
  return <p>busqueda:[{location.search}]</p>;
};

describe("useOpenFromQuery", () => {
  it("abre el recurso del parámetro y lo quita de la URL", () => {
    const onOpen = vi.fn();
    render(
      <MemoryRouter initialEntries={["/tasks?task=12&x=1"]}>
        <Probe onOpen={onOpen} />
      </MemoryRouter>
    );

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith({ id: 12 });
    expect(screen.getByText("busqueda:[?x=1]")).toBeInTheDocument();
  });

  it("también consume la organización del enlace", () => {
    const onOpen = vi.fn();
    render(
      <MemoryRouter initialEntries={["/tasks?task=12&org=4"]}>
        <Probe onOpen={onOpen} />
      </MemoryRouter>
    );

    expect(onOpen).toHaveBeenCalledWith({ id: 12 });
    expect(screen.getByText("busqueda:[]")).toBeInTheDocument();
  });

  it("ignora valores inválidos", () => {
    const onOpen = vi.fn();
    render(
      <MemoryRouter initialEntries={["/tasks?task=abc"]}>
        <Probe onOpen={onOpen} />
      </MemoryRouter>
    );

    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByText("busqueda:[]")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import LoadingSwap from "./LoadingSwap";

const Skeleton = () => <p>esqueleto</p>;
const Content = () => <p>contenido</p>;

describe("LoadingSwap", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("una respuesta rápida nunca muestra el esqueleto", () => {
    const { rerender } = render(
      <LoadingSwap loading skeleton={<Skeleton />}>
        <Content />
      </LoadingSwap>
    );

    act(() => vi.advanceTimersByTime(90));
    rerender(
      <LoadingSwap loading={false} skeleton={<Skeleton />}>
        <Content />
      </LoadingSwap>
    );
    act(() => vi.advanceTimersByTime(500));

    expect(screen.queryByText("esqueleto")).not.toBeInTheDocument();
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("una respuesta lenta muestra el esqueleto y luego el contenido", () => {
    const { rerender } = render(
      <LoadingSwap loading skeleton={<Skeleton />}>
        <Content />
      </LoadingSwap>
    );

    // Pasado el retardo anti-parpadeo (140ms): ya debería verse el esqueleto.
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByText("esqueleto")).toBeInTheDocument();

    rerender(
      <LoadingSwap loading={false} skeleton={<Skeleton />}>
        <Content />
      </LoadingSwap>
    );
    // Recién se mostró: todavía no pasó el mínimo de permanencia (400ms).
    expect(screen.getByText("esqueleto")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("sin loading muestra el contenido de entrada", () => {
    render(
      <LoadingSwap loading={false} skeleton={<Skeleton />}>
        <Content />
      </LoadingSwap>
    );

    expect(screen.getByText("contenido")).toBeInTheDocument();
  });
});

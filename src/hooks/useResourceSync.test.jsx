import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import useResourceSync from "./useResourceSync";

const listeners = {};
const unsubscribe = vi.fn();
const subscribeChannel = vi.fn((name, event, fn) => {
  listeners[`${name}|${event}`] = fn;
  return unsubscribe;
});

vi.mock("../context/RealtimeContext", () => ({
  useRealtime: () => ({ subscribeChannel, channelEpoch: 1 }),
}));

const Screen = ({ ids, onSync, debounce }) => {
  useResourceSync("project", ids, onSync, { debounce });
  return null;
};

describe("useResourceSync", () => {
  beforeEach(() => {
    subscribeChannel.mockClear();
    unsubscribe.mockClear();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
  });

  it("se suscribe a cada recurso sin repetir y entrega el payload", () => {
    const onSync = vi.fn();
    render(<Screen ids={[3, 1, 3, null]} onSync={onSync} />);

    expect(subscribeChannel.mock.calls.map(([name, event]) => `${name}|${event}`)).toEqual([
      "project.1|project.sync",
      "project.3|project.sync",
    ]);
    listeners["project.3|project.sync"]({ project_id: 3, action: "updated" });
    expect(onSync).toHaveBeenCalledWith({ project_id: 3, action: "updated" });
  });

  it("no se vuelve a suscribir si llegan los mismos ids y se da de baja al desmontar", () => {
    const { rerender, unmount } = render(<Screen ids={[1, 2]} onSync={vi.fn()} />);
    rerender(<Screen ids={[2, 1]} onSync={vi.fn()} />);
    expect(subscribeChannel).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("agrupa ráfagas cuando se pide debounce", () => {
    vi.useFakeTimers();
    const onSync = vi.fn();
    render(<Screen ids={[1]} onSync={onSync} debounce={200} />);

    listeners["project.1|project.sync"]({ n: 1 });
    listeners["project.1|project.sync"]({ n: 2 });
    act(() => vi.advanceTimersByTime(250));

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(onSync).toHaveBeenCalledWith({ n: 2 });
    vi.useRealTimers();
  });

  it("sin ids no se suscribe", () => {
    render(<Screen ids={[]} onSync={vi.fn()} />);
    expect(subscribeChannel).not.toHaveBeenCalled();
  });
});

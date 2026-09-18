import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import useDebouncedRefresh from "./useDebouncedRefresh";

const registered = {};
const offs = [];
const registerRefresh = vi.fn((key, cb) => {
  registered[key] = cb;
  const off = vi.fn(() => delete registered[key]);
  offs.push(off);
  return off;
});

vi.mock("../context/RealtimeContext", () => ({
  useRealtime: () => ({ registerRefresh }),
}));

const Screen = ({ onRefresh }) => {
  useDebouncedRefresh(["projects", "projectList"], onRefresh, 500);
  return null;
};

describe("useDebouncedRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    registerRefresh.mockClear();
    offs.length = 0;
    Object.keys(registered).forEach((k) => delete registered[k]);
  });

  afterEach(() => vi.useRealTimers());

  it("agrupa una ráfaga de señales de varias claves en una sola recarga", () => {
    const onRefresh = vi.fn();
    render(<Screen onRefresh={onRefresh} />);

    act(() => {
      registered.projects();
      registered.projectList();
      registered.projectList();
    });
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(500));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("se da de baja y no recarga tras desmontar", () => {
    const onRefresh = vi.fn();
    const { unmount } = render(<Screen onRefresh={onRefresh} />);
    const projects = registered.projects;

    act(() => projects());
    unmount();
    act(() => vi.advanceTimersByTime(500));

    expect(offs.every((off) => off.mock.calls.length === 1)).toBe(true);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});

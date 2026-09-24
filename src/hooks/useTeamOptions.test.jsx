import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import useTeamOptions from "./useTeamOptions";
import { ticketsAPI } from "../utils/api";

vi.mock("../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  ticketsAPI: { getClientInboxTeams: vi.fn() },
}));

describe("useTeamOptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("carga los equipos y permite reintentar tras un fallo", async () => {
    ticketsAPI.getClientInboxTeams
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValue([{ id: 4, name: "Soporte" }]);
    const { result } = renderHook(() => useTeamOptions());

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.teams).toEqual([]);

    await act(async () => result.current.retry());
    expect(result.current.error).toBe(false);
    expect(result.current.teams).toEqual([{ id: 4, name: "Soporte" }]);
  });
});

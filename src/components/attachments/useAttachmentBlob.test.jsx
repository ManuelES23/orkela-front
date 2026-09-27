import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAttachmentBlob } from "./useAttachmentBlob";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { getBlob: vi.fn(), upload: vi.fn(), remove: vi.fn() },
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const blob = () => new Blob(["x"], { type: "image/png" });

describe("useAttachmentBlob", () => {
  let counter;
  let createSpy;
  let revokeSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    counter = 0;
    createSpy = vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:mock-${++counter}`);
    revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it("descarga una vez y comparte el URL entre consumidores del mismo id", async () => {
    attachmentsAPI.getBlob.mockResolvedValue(blob());

    const a = renderHook(() => useAttachmentBlob("staff", 101));
    const b = renderHook(() => useAttachmentBlob("staff", 101));

    await waitFor(() => expect(a.result.current.status).toBe("ready"));
    await waitFor(() => expect(b.result.current.status).toBe("ready"));
    expect(attachmentsAPI.getBlob).toHaveBeenCalledTimes(1);
    expect(a.result.current.url).toBe(b.result.current.url);

    // Un consumidor suelta: el URL sigue vivo para el otro.
    a.unmount();
    expect(revokeSpy).not.toHaveBeenCalled();

    b.unmount();
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(a.result.current.url);
  });

  it("cada descarga distinta obtiene su propio URL", async () => {
    attachmentsAPI.getBlob.mockResolvedValue(blob());

    const a = renderHook(() => useAttachmentBlob("staff", 111));
    const b = renderHook(() => useAttachmentBlob("staff", 112));

    await waitFor(() => expect(a.result.current.status).toBe("ready"));
    await waitFor(() => expect(b.result.current.status).toBe("ready"));
    expect(a.result.current.url).not.toBe(b.result.current.url);

    a.unmount();
    b.unmount();
  });

  it("revoca el URL si se suelta antes de que termine la descarga", async () => {
    const pending = deferred();
    attachmentsAPI.getBlob.mockReturnValue(pending.promise);

    const view = renderHook(() => useAttachmentBlob("staff", 121));
    expect(view.result.current.status).toBe("loading");
    view.unmount();

    await act(async () => {
      pending.resolve(blob());
      await pending.promise;
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:mock-1");

    // La entrada huérfana no queda en caché: un nuevo consumidor vuelve a descargar.
    attachmentsAPI.getBlob.mockResolvedValue(blob());
    const again = renderHook(() => useAttachmentBlob("staff", 121));
    await waitFor(() => expect(again.result.current.status).toBe("ready"));
    expect(attachmentsAPI.getBlob).toHaveBeenCalledTimes(2);
    again.unmount();
  });

  it("un remontaje inmediato (StrictMode) reutiliza la descarga y no filtra URLs", async () => {
    attachmentsAPI.getBlob.mockResolvedValue(blob());

    const view = renderHook(() => useAttachmentBlob("staff", 131), { wrapper: StrictMode });
    await waitFor(() => expect(view.result.current.status).toBe("ready"));

    expect(attachmentsAPI.getBlob).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).not.toHaveBeenCalled();

    view.unmount();
    expect(revokeSpy).toHaveBeenCalledTimes(1);
  });

  it("el cleanup de un consumidor viejo no toca la entrada creada por un reintento", async () => {
    const first = deferred();
    attachmentsAPI.getBlob.mockReturnValueOnce(first.promise);

    // A y B comparten la entrada E1, que falla.
    const a = renderHook(() => useAttachmentBlob("staff", 141));
    const b = renderHook(() => useAttachmentBlob("staff", 141));

    attachmentsAPI.getBlob.mockResolvedValueOnce(blob());
    await act(async () => {
      first.reject(new Error("fallo"));
      await first.promise.catch(() => {});
    });
    await waitFor(() => expect(b.result.current.status).toBe("error"));

    // B reintenta y crea E2; luego A se desmonta (release de E1, no de E2).
    act(() => b.result.current.retry());
    await waitFor(() => expect(b.result.current.status).toBe("ready"));
    const url = b.result.current.url;

    a.unmount();
    expect(revokeSpy).not.toHaveBeenCalled();
    expect(b.result.current.url).toBe(url);

    b.unmount();
    expect(revokeSpy).toHaveBeenCalledWith(url);
  });

  it("no descarga mientras está deshabilitado", () => {
    const view = renderHook(() => useAttachmentBlob("staff", 151, { enabled: false }));

    expect(view.result.current).toMatchObject({ url: null, status: "idle" });
    expect(attachmentsAPI.getBlob).not.toHaveBeenCalled();
    view.unmount();
  });
});

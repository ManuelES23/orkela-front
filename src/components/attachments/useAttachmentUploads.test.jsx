import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAttachmentUploads } from "./useAttachmentUploads";
import { attachmentsAPI } from "../../utils/attachmentsApi";

vi.mock("../../utils/attachmentsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  attachmentsAPI: { upload: vi.fn(), remove: vi.fn().mockResolvedValue(undefined), getBlob: vi.fn() },
}));

const png = (name = "a.png") => new File([new Uint8Array(4)], name, { type: "image/png" });

describe("useAttachmentUploads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sube, informa progreso y expone los ids listos", async () => {
    let progress;
    attachmentsAPI.upload.mockImplementation((scope, file, opts) => {
      progress = opts.onProgress;
      return new Promise((resolve) => setTimeout(() => resolve({ id: 9, name: file.name, mime: "image/png", size: 4 }), 0));
    });
    const { result } = renderHook(() => useAttachmentUploads({ scope: "staff" }));

    act(() => result.current.addFiles([png()]));
    expect(result.current.isUploading).toBe(true);
    act(() => progress(40));
    expect(result.current.items[0].progress).toBe(40);

    await waitFor(() => expect(result.current.ids).toEqual([9]));
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploaded).toEqual([{ id: 9, name: "a.png", mime: "image/png", size: 4 }]);
    expect(attachmentsAPI.upload).toHaveBeenCalledWith("staff", expect.any(File), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("marca el error, permite reintentar y no sube archivos inválidos", async () => {
    attachmentsAPI.upload.mockRejectedValueOnce(new Error("La imagen supera los 5 MB.")).mockResolvedValueOnce({ id: 3, name: "a.png", mime: "image/png", size: 4 });
    const { result } = renderHook(() => useAttachmentUploads({ scope: "portal" }));

    act(() => result.current.addFiles([png(), new File(["x"], "b.heic", { type: "image/heic" })]));
    await waitFor(() => expect(result.current.items[0].status).toBe("error"));
    expect(result.current.items[1]).toMatchObject({ status: "error", error: "Formato no admitido. Usa JPG, PNG, WebP o GIF." });
    expect(result.current.hasErrors).toBe(true);
    expect(attachmentsAPI.upload).toHaveBeenCalledTimes(1);

    act(() => result.current.retry(result.current.items[0].key));
    await waitFor(() => expect(result.current.ids).toEqual([3]));
  });

  it("reintentar solo actúa sobre un item con error", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 5, name: "a.png", mime: "image/png", size: 4 });
    const { result } = renderHook(() => useAttachmentUploads({ scope: "staff" }));

    act(() => result.current.addFiles([png()]));
    const key = result.current.items[0].key;
    // Subiendo: no relanza
    act(() => result.current.retry(key));
    expect(attachmentsAPI.upload).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(result.current.items[0].status).toBe("done"));
    // Hecha: no la vuelve a subir ni pisa su estado
    act(() => result.current.retry(key));
    expect(attachmentsAPI.upload).toHaveBeenCalledTimes(1);
    expect(result.current.items[0]).toMatchObject({ status: "done", id: 5 });
  });

  it("respeta el máximo y avisa", () => {
    attachmentsAPI.upload.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAttachmentUploads({ scope: "staff", max: 2 }));

    act(() => result.current.addFiles([png("1.png"), png("2.png"), png("3.png")]));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.notice).toBe("Máximo 2 imágenes.");
  });

  it("quitar una imagen subida la borra del servidor; reset no", async () => {
    attachmentsAPI.upload.mockResolvedValueOnce({ id: 1, name: "a.png", mime: "image/png", size: 4 }).mockResolvedValueOnce({ id: 2, name: "b.png", mime: "image/png", size: 4 });
    const { result } = renderHook(() => useAttachmentUploads({ scope: "staff" }));
    act(() => result.current.addFiles([png("a.png"), png("b.png")]));
    await waitFor(() => expect(result.current.ids).toEqual([1, 2]));

    act(() => result.current.remove(result.current.items[0].key));
    expect(attachmentsAPI.remove).toHaveBeenCalledWith("staff", 1);
    expect(result.current.ids).toEqual([2]);

    act(() => result.current.reset());
    expect(result.current.items).toEqual([]);
    expect(attachmentsAPI.remove).toHaveBeenCalledTimes(1);
  });

  it("al desmontar sin enviar descarta los pendientes", async () => {
    attachmentsAPI.upload.mockResolvedValue({ id: 5, name: "a.png", mime: "image/png", size: 4 });
    const { result, unmount } = renderHook(() => useAttachmentUploads({ scope: "portal" }));
    act(() => result.current.addFiles([png()]));
    await waitFor(() => expect(result.current.ids).toEqual([5]));

    unmount();

    expect(attachmentsAPI.remove).toHaveBeenCalledWith("portal", 5);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { attachmentsAPI, validateImageFile, AttachmentError, ATTACHMENT_LIMITS } from "./attachmentsApi";

class FakeXHR {
  static last = null;
  constructor() {
    this.headers = {};
    this.upload = {};
    FakeXHR.last = this;
  }
  open(method, url) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name, value) {
    this.headers[name] = value;
  }
  send(body) {
    this.body = body;
  }
  abort() {
    this.onabort?.();
  }
  respond(status, json) {
    this.status = status;
    this.responseText = JSON.stringify(json);
    this.onload?.();
  }
}

const png = (size = 10) => new File([new Uint8Array(size)], "captura.png", { type: "image/png" });

describe("attachmentsApi", () => {
  beforeEach(() => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    localStorage.setItem("token", "staff-token");
    localStorage.setItem("orkela_portal_token", "portal-token");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("valida tipo y peso en el cliente", () => {
    expect(validateImageFile(png())).toBeNull();
    expect(validateImageFile(new File(["x"], "a.heic", { type: "image/heic" }))).toBe("Formato no admitido. Usa JPG, PNG, WebP o GIF.");
    const big = png();
    Object.defineProperty(big, "size", { value: ATTACHMENT_LIMITS.maxBytes + 1 });
    expect(validateImageFile(big)).toBe("La imagen supera los 5 MB.");
  });

  it("sube con el token del panel e informa el progreso", async () => {
    const onProgress = vi.fn();
    const promise = attachmentsAPI.upload("staff", png(), { onProgress });
    const xhr = FakeXHR.last;

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toMatch(/\/attachments$/);
    expect(xhr.headers.Authorization).toBe("Bearer staff-token");
    xhr.upload.onprogress({ lengthComputable: true, loaded: 5, total: 10 });
    expect(onProgress).toHaveBeenCalledWith(50);

    xhr.respond(201, { id: 7, name: "captura.png", mime: "image/png", size: 10 });
    await expect(promise).resolves.toEqual({ id: 7, name: "captura.png", mime: "image/png", size: 10 });
  });

  it("el portal usa su ruta y su token", () => {
    attachmentsAPI.upload("portal", png());
    expect(FakeXHR.last.url).toMatch(/\/portal\/attachments$/);
    expect(FakeXHR.last.headers.Authorization).toBe("Bearer portal-token");
  });

  it("traduce errores del servidor a mensajes para el usuario", async () => {
    const quota = attachmentsAPI.upload("staff", png());
    FakeXHR.last.respond(403, { code: "plan_limit_reached", message: "La organización alcanzó el límite de almacenamiento de su plan." });
    await expect(quota).rejects.toMatchObject({ code: "plan_limit_reached", message: "La organización alcanzó el límite de almacenamiento de su plan." });

    const invalid = attachmentsAPI.upload("staff", png());
    FakeXHR.last.respond(422, { message: "x", errors: { file: ["La imagen supera los 5 MB."] } });
    await expect(invalid).rejects.toMatchObject({ status: 422, message: "La imagen supera los 5 MB." });
  });

  it("cancelar aborta la subida", async () => {
    const controller = new AbortController();
    const promise = attachmentsAPI.upload("staff", png(), { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: "aborted" });
    await expect(promise).rejects.toBeInstanceOf(AttachmentError);
  });

  it("descarga como blob con el token y borra", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, blob: () => Promise.resolve(blob) })
      .mockResolvedValueOnce({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(attachmentsAPI.getBlob("portal", 3, { download: true })).resolves.toBe(blob);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/portal\/attachments\/3\?download=1$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer portal-token");

    await attachmentsAPI.remove("staff", 3);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/attachments\/3$/);
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });
});

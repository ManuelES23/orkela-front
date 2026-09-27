import { AUTH_EXPIRED_EVENT } from "./api";
import { getPortalToken } from "./portalApi";

const API_URL = import.meta.env.VITE_API_URL || "http://orkela.localhost/api";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const ATTACHMENT_LIMITS = {
  maxFiles: 5,
  maxBytes: 5 * 1024 * 1024,
  types: TYPES,
  accept: TYPES.join(","),
};

export class AttachmentError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = "AttachmentError";
    this.status = status;
    this.data = data;
    this.code = data.code || null;
  }
}

// Panel y portal comparten API pero no sesión: cada uno con su ruta y su token.
const SCOPES = {
  staff: {
    prefix: "/attachments",
    token: () => localStorage.getItem("token"),
    unauthorized: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    },
  },
  portal: {
    prefix: "/portal/attachments",
    token: getPortalToken,
    unauthorized: () => window.dispatchEvent(new CustomEvent("portal:unauthorized")),
  },
};

export const validateImageFile = (file) => {
  if (!TYPES.includes(file.type)) return "Formato no admitido. Usa JPG, PNG, WebP o GIF.";
  if (file.size > ATTACHMENT_LIMITS.maxBytes) return "La imagen supera los 5 MB.";
  return null;
};

const errorMessage = (status, data) => {
  if (status === 429) return "Demasiadas subidas seguidas. Espera un momento y reintenta.";
  if (status === 422) return data.errors?.file?.[0] ?? data.message ?? "La imagen no es válida.";
  return data.message || "No se pudo subir la imagen.";
};

const authHeaders = (scope) => {
  const token = SCOPES[scope].token();
  return {
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// XMLHttpRequest y no fetch: fetch no informa el progreso de subida.
const upload = (scope, file, { onProgress, signal } = {}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${SCOPES[scope].prefix}`);
    Object.entries(authHeaders(scope)).forEach(([name, value]) => xhr.setRequestHeader(name, value));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }
      if (xhr.status === 401) SCOPES[scope].unauthorized();
      reject(new AttachmentError(errorMessage(xhr.status, data), xhr.status, data));
    };
    xhr.onerror = () => reject(new AttachmentError("No se pudo conectar. Reintenta.", 0));
    xhr.onabort = () => reject(new AttachmentError("Subida cancelada.", 0, { code: "aborted" }));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });

const getBlob = async (scope, id, { download = false } = {}) => {
  const query = download ? "?download=1" : "";
  const response = await fetch(`${API_URL}${SCOPES[scope].prefix}/${id}${query}`, { headers: authHeaders(scope) });
  if (!response.ok) {
    if (response.status === 401) SCOPES[scope].unauthorized();
    throw new AttachmentError("No se pudo cargar la imagen.", response.status);
  }
  return response.blob();
};

const remove = async (scope, id) => {
  const response = await fetch(`${API_URL}${SCOPES[scope].prefix}/${id}`, {
    method: "DELETE",
    headers: authHeaders(scope),
  });
  if (!response.ok) {
    if (response.status === 401) SCOPES[scope].unauthorized();
    throw new AttachmentError("No se pudo eliminar la imagen.", response.status);
  }
};

export const attachmentsAPI = { upload, getBlob, remove };

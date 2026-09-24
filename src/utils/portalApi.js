import { parseApiResponse } from "./httpResponse";

const API_URL = import.meta.env.VITE_API_URL || "http://orkela.localhost/api";

const PORTAL_TOKEN_KEY = "orkela_portal_token";
const PORTAL_ORG_SLUG_KEY = "orkela_portal_org_slug";

export class PortalAPIError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = "PortalAPIError";
    this.status = status;
    this.data = data;
  }
}

export const getPortalToken = () => localStorage.getItem(PORTAL_TOKEN_KEY);
export const setPortalToken = (token) =>
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
export const clearPortalToken = () =>
  localStorage.removeItem(PORTAL_TOKEN_KEY);

export const getPortalOrgSlug = () => localStorage.getItem(PORTAL_ORG_SLUG_KEY);
export const setPortalOrgSlug = (slug) =>
  localStorage.setItem(PORTAL_ORG_SLUG_KEY, slug);

// Helper de peticiones del portal: manda el token del portal, nunca la
// sesión interna de Sanctum. Un 401 dispara un evento global que
// PortalLayout escucha para decidir a dónde redirigir.
const portalRequest = async (endpoint, options = {}) => {
  const token = getPortalToken();

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const { ok, data, message } = await parseApiResponse(response);

  if (!ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("portal:unauthorized"));
    }
    throw new PortalAPIError(message, response.status, data);
  }

  return data;
};

export const portalAPI = {
  getOrgInfo: async (orgSlug) => {
    return await portalRequest(`/portal/${orgSlug}`);
  },

  requestAccess: async (orgSlug, email) => {
    return await portalRequest(`/portal/${orgSlug}/request-access`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Canjea el enlace mágico (un solo uso) por una sesión del portal.
  exchangeAccess: async (linkToken) => {
    return await portalRequest("/portal/access/exchange", {
      method: "POST",
      body: JSON.stringify({ token: linkToken }),
    });
  },

  logout: async () => {
    return await portalRequest("/portal/logout", { method: "POST" });
  },

  me: async () => {
    return await portalRequest("/portal/me");
  },

  createTicket: async (ticketData) => {
    return await portalRequest("/portal/tickets", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
  },

  getTicket: async (id) => {
    return await portalRequest(`/portal/tickets/${id}`);
  },

  addComment: async (id, content) => {
    return await portalRequest(`/portal/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  // "Confirmar solución": cierra un ticket resuelto. Devuelve el detalle.
  confirmResolution: async (id) => {
    return await portalRequest(`/portal/tickets/${id}/confirm-resolution`, { method: "POST" });
  },

  // "Sigue sin funcionar": reabre un ticket resuelto o cerrado.
  reopenTicket: async (id) => {
    return await portalRequest(`/portal/tickets/${id}/reopen`, { method: "POST" });
  },
};

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
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("portal:unauthorized"));
    }
    throw new PortalAPIError(
      data.message || "Error en la petición",
      response.status,
      data
    );
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
};

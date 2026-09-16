const API_URL = import.meta.env.VITE_API_URL || "http://orkela.localhost/api";

// Clase de error personalizada para errores de API con información adicional
export class APIError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
    this.errorCode = data.error || null;
    this.requiredContext = data.required_context || null;
    this.code = data.code || null;
    this.retryAfter = data.retryAfter ?? null;
  }
}

// Se emite en window cuando la API responde 401 con un token guardado
// (vencido o revocado); AuthContext lo escucha para cerrar la sesión.
export const AUTH_EXPIRED_EVENT = "orkela:auth-expired";

// Función helper para hacer peticiones
export const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      const retryAfter = Number(response.headers.get("Retry-After")) || null;

      if (response.status === 401 && token) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }

      // Crear error con información adicional
      throw new APIError(
        data.message || "Error en la petición",
        response.status,
        { ...data, retryAfter }
      );
    }

    return data;
  } catch (error) {
    // Re-throw APIError directamente
    if (error instanceof APIError) {
      throw error;
    }
    console.error("API Error:", error);
    throw error;
  }
};

// Función helper para peticiones públicas (sin token)
const publicRequest = async (endpoint, options = {}) => {
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error en la petición");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  // Ya no inicia sesión: el backend responde 202 y envía el correo de confirmación.
  register: async (name, email, password, password_confirmation) => {
    return await request("/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, password_confirmation }),
    });
  },

  login: async (email, password, remember = false) => {
    const data = await request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  },

  verifyEmail: async ({ id, hash, expires, signature }) => {
    const data = await request("/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ id, hash, expires, signature }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  },

  resendVerification: async (email) => {
    return await request("/auth/email/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  forgotPassword: async (email) => {
    return await request("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async ({ token, email, password, password_confirmation }) => {
    return await request("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, email, password, password_confirmation }),
    });
  },

  logout: async () => {
    try {
      await request("/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },

  getUser: async () => {
    return await request("/user");
  },

  switchContext: async (context) => {
    return await request("/switch-context", {
      method: "POST",
      body: JSON.stringify({ context }),
    });
  },
};

// Profile API
export const profileAPI = {
  get: async () => {
    return await request("/profile");
  },

  update: async (profileData) => {
    return await request("/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  uploadAvatar: async (file) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch(`${API_URL}/profile/avatar`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al subir el avatar");
    }
    return data;
  },

  deleteAvatar: async () => {
    return await request("/profile/avatar", {
      method: "DELETE",
    });
  },

  changePassword: async (
    currentPassword,
    newPassword,
    newPasswordConfirmation
  ) => {
    return await request("/profile/password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      }),
    });
  },

  createPassword: async (password, passwordConfirmation) => {
    return await request("/profile/password/create", {
      method: "POST",
      body: JSON.stringify({
        password,
        password_confirmation: passwordConfirmation,
      }),
    });
  },
};

// Projects API
export const projectsAPI = {
  getAll: async () => {
    return await request("/projects");
  },

  getById: async (id) => {
    return await request(`/projects/${id}`);
  },

  create: async (projectData) => {
    return await request("/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    });
  },

  update: async (id, projectData) => {
    return await request(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(projectData),
    });
  },

  delete: async (id) => {
    return await request(`/projects/${id}`, {
      method: "DELETE",
    });
  },

  removeCollaborator: async (projectId, userId) => {
    return await request(`/projects/${projectId}/collaborators/${userId}`, {
      method: "DELETE",
    });
  },

  getCollaboratorStats: async (projectId, collaboratorId) => {
    return await request(
      `/projects/${projectId}/collaborators/${collaboratorId}/stats`
    );
  },
};

// Tasks API
export const tasksAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.project_id) params.append("project_id", filters.project_id);
    if (filters.status) params.append("status", filters.status);

    const query = params.toString();
    return await request(`/tasks${query ? `?${query}` : ""}`);
  },

  getById: async (id) => {
    return await request(`/tasks/${id}`);
  },

  create: async (taskData) => {
    return await request("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
  },

  update: async (id, taskData) => {
    return await request(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(taskData),
    });
  },

  delete: async (id) => {
    return await request(`/tasks/${id}`, {
      method: "DELETE",
    });
  },

  getProjectMembers: async (projectId) => {
    return await request(`/projects/${projectId}/members`);
  },
};

// Checklist Items API
export const checklistAPI = {
  getAll: async (taskId) => {
    return await request(`/tasks/${taskId}/checklist`);
  },

  create: async (taskId, text) => {
    return await request(`/tasks/${taskId}/checklist`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  update: async (taskId, itemId, data) => {
    return await request(`/tasks/${taskId}/checklist/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  toggle: async (taskId, itemId) => {
    return await request(`/tasks/${taskId}/checklist/${itemId}/toggle`, {
      method: "POST",
    });
  },

  delete: async (taskId, itemId) => {
    return await request(`/tasks/${taskId}/checklist/${itemId}`, {
      method: "DELETE",
    });
  },

  reorder: async (taskId, items) => {
    return await request(`/tasks/${taskId}/checklist/reorder`, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },
};

// Project Tags API
export const projectTagsAPI = {
  // Obtener colores disponibles (globales)
  getAvailableColors: async () => {
    return await request("/tags/colors");
  },

  // Obtener tags de un proyecto
  getAll: async (projectId) => {
    return await request(`/projects/${projectId}/tags`);
  },

  // Crear o actualizar un tag (upsert por color)
  create: async (projectId, tagData) => {
    return await request(`/projects/${projectId}/tags`, {
      method: "POST",
      body: JSON.stringify(tagData),
    });
  },

  // Actualizar un tag existente
  update: async (projectId, tagId, tagData) => {
    return await request(`/projects/${projectId}/tags/${tagId}`, {
      method: "PUT",
      body: JSON.stringify(tagData),
    });
  },

  // Eliminar un tag
  delete: async (projectId, tagId) => {
    return await request(`/projects/${projectId}/tags/${tagId}`, {
      method: "DELETE",
    });
  },

  // Inicializar tags por defecto para un proyecto
  initializeDefaults: async (projectId) => {
    return await request(`/projects/${projectId}/tags/initialize`, {
      method: "POST",
    });
  },
};

// My Collaborators API (usuarios reales que han colaborado conmigo)
export const myCollaboratorsAPI = {
  getAll: async () => {
    return await request("/my-collaborators");
  },

  getById: async (id) => {
    return await request(`/my-collaborators/${id}`);
  },
};

// Invitations API
export const invitationsAPI = {
  // Obtener info de invitación (público, sin auth) - para saber si el usuario existe
  getInfo: async (token) => {
    return await publicRequest(`/invitations/${token}/info`);
  },

  sendInvitation: async (projectId, email) => {
    return await request(`/projects/${projectId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  acceptInvitation: async (token) => {
    return await request(`/invitations/${token}/accept`, {
      method: "POST",
    });
  },

  getPreviousCollaborators: async () => {
    return await request("/collaborators");
  },
};

// Teams API
export const teamsAPI = {
  getAll: async () => {
    return await request("/teams");
  },

  getById: async (id) => {
    return await request(`/teams/${id}`);
  },

  create: async (teamData) => {
    return await request("/teams", {
      method: "POST",
      body: JSON.stringify(teamData),
    });
  },

  update: async (id, teamData) => {
    return await request(`/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(teamData),
    });
  },

  delete: async (id) => {
    return await request(`/teams/${id}`, {
      method: "DELETE",
    });
  },

  getMembers: async (teamId) => {
    return await request(`/teams/${teamId}/members`);
  },

  getAvailableMembers: async (teamId = null) => {
    if (teamId) {
      return await request(`/teams/${teamId}/available-members`);
    }
    return await request("/teams-available-members");
  },

  getTickets: async (teamId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.filter) params.append("filter", filters.filter);
    if (filters.status) params.append("status", filters.status);
    const query = params.toString();
    return await request(`/teams/${teamId}/tickets${query ? `?${query}` : ""}`);
  },

  getProjects: async (teamId) => {
    return await request(`/teams/${teamId}/projects`);
  },

  getStats: async (teamId) => {
    return await request(`/teams/${teamId}/stats`);
  },

  getMemberStats: async (teamId, memberId) => {
    return await request(`/teams/${teamId}/members/${memberId}/stats`);
  },
};

// Team Invitations API
export const teamInvitationsAPI = {
  // Obtener info de invitación (público, sin auth) - para saber si el usuario existe
  getInfo: async (token) => {
    return await publicRequest(`/team-invitations/${token}/info`);
  },

  sendInvitation: async (teamId, email) => {
    return await request(`/teams/${teamId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  acceptInvitation: async (token) => {
    return await request(`/team-invitations/${token}/accept`, {
      method: "POST",
    });
  },

  getPreviousCollaborators: async () => {
    return await request("/team-collaborators");
  },
};

// Tickets API
export const ticketsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.priority) params.append("priority", filters.priority);
    if (filters.type) params.append("type", filters.type);
    if (filters.team_id) params.append("team_id", filters.team_id);
    if (filters.filter) params.append("filter", filters.filter);

    const query = params.toString();
    return await request(`/tickets${query ? `?${query}` : ""}`);
  },

  getById: async (id) => {
    return await request(`/tickets/${id}`);
  },

  create: async (ticketData) => {
    return await request("/tickets", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
  },

  update: async (id, ticketData) => {
    return await request(`/tickets/${id}`, {
      method: "PUT",
      body: JSON.stringify(ticketData),
    });
  },

  delete: async (id) => {
    return await request(`/tickets/${id}`, {
      method: "DELETE",
    });
  },

  getStats: async () => {
    return await request("/tickets-stats");
  },

  addComment: async (ticketId, content, isInternal = false) => {
    return await request(`/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, is_internal: isInternal }),
    });
  },

  getComments: async (ticketId) => {
    return await request(`/tickets/${ticketId}/comments`);
  },

  // Nuevos métodos para el buzón de equipo
  takeTicket: async (ticketId) => {
    return await request(`/tickets/${ticketId}/take`, {
      method: "POST",
    });
  },

  assignTicket: async (ticketId, assignedTo) => {
    return await request(`/tickets/${ticketId}/assign`, {
      method: "POST",
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
  },

  returnToInbox: async (ticketId) => {
    return await request(`/tickets/${ticketId}/return-to-inbox`, {
      method: "POST",
    });
  },

  getClientInbox: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.unassigned) params.append("unassigned", "1");
    if (filters.client_id) params.append("client_id", filters.client_id);

    const query = params.toString();
    return await request(`/client-tickets${query ? `?${query}` : ""}`);
  },

  assignToTeam: async (id, teamId) => {
    return await request(`/tickets/${id}/assign-team`, {
      method: "POST",
      body: JSON.stringify({ team_id: teamId }),
    });
  },
};

// Organizations API
export const organizationsAPI = {
  getAll: async () => {
    return await request("/organizations");
  },

  getById: async (id) => {
    return await request(`/organizations/${id}`);
  },

  create: async (orgData) => {
    return await request("/organizations", {
      method: "POST",
      body: JSON.stringify(orgData),
    });
  },

  update: async (id, orgData) => {
    return await request(`/organizations/${id}`, {
      method: "PUT",
      body: JSON.stringify(orgData),
    });
  },

  delete: async (id) => {
    return await request(`/organizations/${id}`, {
      method: "DELETE",
    });
  },

  // Owner Management (SystemAdmins only)
  assignOwner: async (orgId, ownerId) => {
    return await request(`/organizations/${orgId}/assign-owner`, {
      method: "POST",
      body: JSON.stringify({ owner_id: ownerId }),
    });
  },

  changeOwner: async (orgId, newOwnerId) => {
    return await request(`/organizations/${orgId}/change-owner`, {
      method: "POST",
      body: JSON.stringify({ new_owner_id: newOwnerId }),
    });
  },

  // Members
  getMembers: async (orgId) => {
    return await request(`/organizations/${orgId}/members`);
  },

  getMemberStats: async (orgId, memberId) => {
    return await request(`/organizations/${orgId}/members/${memberId}/stats`);
  },

  updateMember: async (orgId, userId, memberData) => {
    return await request(`/organizations/${orgId}/members/${userId}`, {
      method: "PUT",
      body: JSON.stringify(memberData),
    });
  },

  removeMember: async (orgId, userId) => {
    return await request(`/organizations/${orgId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  // Invitations
  sendInvitation: async (orgId, invitationData) => {
    return await request(`/organizations/${orgId}/invite`, {
      method: "POST",
      body: JSON.stringify(invitationData),
    });
  },

  getPendingInvitations: async (orgId) => {
    return await request(`/organizations/${orgId}/invitations`);
  },

  cancelInvitation: async (orgId, invitationId) => {
    return await request(
      `/organizations/${orgId}/invitations/${invitationId}`,
      {
        method: "DELETE",
      }
    );
  },

  // Obtener info de invitación (público, sin auth) - para saber si el usuario existe
  getInvitationInfo: async (token) => {
    return await publicRequest(`/organization-invitations/${token}/info`);
  },

  acceptInvitation: async (token) => {
    return await request(`/organization-invitations/${token}/accept`, {
      method: "POST",
    });
  },

  // Organization Resources
  getTeams: async (orgId) => {
    return await request(`/organizations/${orgId}/teams`);
  },

  getProjects: async (orgId) => {
    return await request(`/organizations/${orgId}/projects`);
  },

  getTickets: async (orgId) => {
    return await request(`/organizations/${orgId}/tickets`);
  },

  getStats: async (orgId) => {
    return await request(`/organizations/${orgId}/stats`);
  },

  // Mail Configuration (owner only)
  getMailConfig: async (orgId) => {
    return await request(`/organizations/${orgId}/mail-config`);
  },

  updateMailConfig: async (orgId, mailData) => {
    return await request(`/organizations/${orgId}/mail-config`, {
      method: "PUT",
      body: JSON.stringify(mailData),
    });
  },

  testMailConfig: async (orgId, testEmail) => {
    return await request(`/organizations/${orgId}/mail-config/test`, {
      method: "POST",
      body: JSON.stringify({ test_email: testEmail }),
    });
  },

  // Logo management
  uploadLogo: async (orgId, file) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("logo", file);

    const response = await fetch(`${API_URL}/organizations/${orgId}/logo`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al subir el logo");
    }
    return data;
  },

  deleteLogo: async (orgId) => {
    return await request(`/organizations/${orgId}/logo`, {
      method: "DELETE",
    });
  },
};

// My Invitations API (invitaciones pendientes del usuario)
export const myInvitationsAPI = {
  getAll: async () => {
    return await request("/my-invitations");
  },

  accept: async (type, token) => {
    return await request("/my-invitations/accept", {
      method: "POST",
      body: JSON.stringify({ type, token }),
    });
  },

  decline: async (type, token) => {
    return await request("/my-invitations/decline", {
      method: "POST",
      body: JSON.stringify({ type, token }),
    });
  },
};

// Plans API (de cara al usuario — catálogo personal + selector self-service)
export const plansAPI = {
  getPersonalCatalog: async () => {
    return await request("/plans/personal-catalog");
  },

  switchMyPlan: async (planId) => {
    return await request("/me/plan", {
      method: "PATCH",
      body: JSON.stringify({ plan_id: planId }),
    });
  },
};

// Clients API
export const clientsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);

    const query = params.toString();
    return await request(`/clients${query ? `?${query}` : ""}`);
  },

  getById: async (id) => {
    return await request(`/clients/${id}`);
  },

  create: async (clientData) => {
    return await request("/clients", {
      method: "POST",
      body: JSON.stringify(clientData),
    });
  },

  update: async (id, clientData) => {
    return await request(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(clientData),
    });
  },

  archive: async (id) => {
    return await request(`/clients/${id}`, {
      method: "DELETE",
    });
  },
};

export const contactsAPI = {
  create: async (clientId, contactData) => {
    return await request(`/clients/${clientId}/contacts`, {
      method: "POST",
      body: JSON.stringify(contactData),
    });
  },

  update: async (id, contactData) => {
    return await request(`/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(contactData),
    });
  },

  archive: async (id) => {
    return await request(`/contacts/${id}`, {
      method: "DELETE",
    });
  },

  resendAccess: async (id) => {
    return await request(`/contacts/${id}/resend-access`, {
      method: "POST",
    });
  },

  promote: async (id) => {
    return await request(`/contacts/${id}/promote`, {
      method: "POST",
    });
  },
};

// Nonce de la pestaña que inicia el login social. El backend lo guarda junto
// al ticket y exige el mismo valor al canjearlo: un ticket ajeno (alguien que
// manda su propio /auth/callback?ticket=…) no trae el nonce de esta pestaña.
const SOCIAL_NONCE_KEY = "orkela_social_nonce";

const newSocialNonce = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const getSocialNonce = () => sessionStorage.getItem(SOCIAL_NONCE_KEY);

// Social Auth API (login con Google/Microsoft)
export const socialAuthAPI = {
  redirectUrl: (provider) => {
    const nonce = newSocialNonce();
    sessionStorage.setItem(SOCIAL_NONCE_KEY, nonce);
    return `${API_URL}/auth/social/${provider}/redirect?nonce=${nonce}`;
  },

  exchange: async (ticket) => {
    const data = await publicRequest("/auth/social/exchange", {
      method: "POST",
      body: JSON.stringify({ ticket, nonce: getSocialNonce() }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
      sessionStorage.removeItem(SOCIAL_NONCE_KEY);
    }

    return data;
  },

  confirm: async (ticket) => {
    const data = await publicRequest("/auth/social/confirm", {
      method: "POST",
      body: JSON.stringify({ ticket, nonce: getSocialNonce() }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
      sessionStorage.removeItem(SOCIAL_NONCE_KEY);
    }

    return data;
  },

  // Vincular desde Configuración: la URL de inicio incluye una intención de
  // un solo uso atada a esta sesión y al nonce de la pestaña.
  linkIntent: async (provider) => {
    const nonce = newSocialNonce();
    sessionStorage.setItem(SOCIAL_NONCE_KEY, nonce);
    const data = await request(`/auth/social/link-intent/${provider}`, {
      method: "POST",
      body: JSON.stringify({ nonce }),
    });
    return data.redirect_url;
  },

  // El backend quema el ticket en cualquier intento: el nonce tampoco sirve después.
  link: async (ticket) => {
    try {
      return await request("/auth/social/link", {
        method: "POST",
        body: JSON.stringify({ ticket, nonce: getSocialNonce() }),
      });
    } finally {
      sessionStorage.removeItem(SOCIAL_NONCE_KEY);
    }
  },

  // Desde el login: el correo ya tiene cuenta y se confirma con su contraseña.
  linkWithPassword: async (ticket, password) => {
    // Si la contraseña es incorrecta el nonce se conserva para reintentar.
    const data = await request("/auth/social/link-with-password", {
      method: "POST",
      body: JSON.stringify({ ticket, nonce: getSocialNonce(), password }),
    });
    sessionStorage.removeItem(SOCIAL_NONCE_KEY);

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  },

  identities: () => request("/auth/social/identities"),

  unlink: (provider) =>
    request(`/auth/social/identities/${provider}`, { method: "DELETE" }),
};

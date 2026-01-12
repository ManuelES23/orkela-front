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
  }
}

// Función helper para hacer peticiones
const request = async (endpoint, options = {}) => {
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
      // Crear error con información adicional
      throw new APIError(
        data.message || "Error en la petición",
        response.status,
        data
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
  register: async (name, email, password, password_confirmation) => {
    const data = await request("/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, password_confirmation }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  },

  login: async (email, password) => {
    const data = await request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
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

// Team Members API
export const teamMembersAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);

    const query = params.toString();
    return await request(`/team-members${query ? `?${query}` : ""}`);
  },

  getById: async (id) => {
    return await request(`/team-members/${id}`);
  },

  create: async (memberData) => {
    return await request("/team-members", {
      method: "POST",
      body: JSON.stringify(memberData),
    });
  },

  update: async (id, memberData) => {
    return await request(`/team-members/${id}`, {
      method: "PUT",
      body: JSON.stringify(memberData),
    });
  },

  delete: async (id) => {
    return await request(`/team-members/${id}`, {
      method: "DELETE",
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

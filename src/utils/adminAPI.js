const API_URL = import.meta.env.VITE_API_URL || "http://orkela.localhost/api";

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
      throw new Error(data.message || "Error en la petición");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// Admin Users API
export const adminUsersAPI = {
  getAll: async () => {
    return await request("/admin/users", {
      method: "GET",
    });
  },

  create: async (userData) => {
    return await request("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  update: async (id, userData) => {
    return await request(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  delete: async (id) => {
    return await request(`/admin/users/${id}`, {
      method: "DELETE",
    });
  },

  toggleStatus: async (id) => {
    return await request(`/admin/users/${id}/toggle-status`, {
      method: "POST",
    });
  },
};

// Admin Organizations API
export const adminOrganizationsAPI = {
  getAll: async () => {
    return await request("/admin/organizations", {
      method: "GET",
    });
  },

  getById: async (id) => {
    return await request(`/admin/organizations/${id}`, {
      method: "GET",
    });
  },

  create: async (orgData) => {
    return await request("/admin/organizations", {
      method: "POST",
      body: JSON.stringify(orgData),
    });
  },

  update: async (id, orgData) => {
    return await request(`/admin/organizations/${id}`, {
      method: "PUT",
      body: JSON.stringify(orgData),
    });
  },

  delete: async (id) => {
    return await request(`/admin/organizations/${id}`, {
      method: "DELETE",
    });
  },

  toggleStatus: async (id) => {
    return await request(`/admin/organizations/${id}/toggle-status`, {
      method: "POST",
    });
  },

  getMembers: async (id) => {
    return await request(`/admin/organizations/${id}/members`, {
      method: "GET",
    });
  },

  getStats: async (id) => {
    return await request(`/admin/organizations/${id}/stats`, {
      method: "GET",
    });
  },
};

// Admin Plans API — catálogo de planes
export const adminPlansAPI = {
  getAll: async (scope) => {
    const query = scope ? `?scope=${scope}` : "";
    return await request(`/admin/plans${query}`, {
      method: "GET",
    });
  },

  create: async (planData) => {
    return await request("/admin/plans", {
      method: "POST",
      body: JSON.stringify(planData),
    });
  },

  update: async (id, planData) => {
    return await request(`/admin/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(planData),
    });
  },

  delete: async (id) => {
    return await request(`/admin/plans/${id}`, {
      method: "DELETE",
    });
  },
};

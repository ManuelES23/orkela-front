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

const settingsAPI = {
  // Obtener configuración de email
  getMailConfig: async () => {
    return await request("/admin/settings/mail");
  },

  // Actualizar configuración de email
  updateMailConfig: async (config) => {
    return await request("/admin/settings/mail", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },

  // Enviar email de prueba
  sendTestEmail: async (email) => {
    return await request("/admin/settings/mail/test", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};

export default settingsAPI;

import Echo from "laravel-echo";
import Pusher from "pusher-js";

// Hacer Pusher disponible globalmente para Laravel Echo
window.Pusher = Pusher;

// Variable para almacenar la instancia de Echo
let echoInstance = null;

// Función para crear/obtener la instancia de Echo
export const getEcho = () => {
  if (!echoInstance) {
    const token = localStorage.getItem("token");

    echoInstance = new Echo({
      broadcaster: "reverb",
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
      wsPort: parseInt(import.meta.env.VITE_REVERB_PORT) || 6001,
      wssPort: parseInt(import.meta.env.VITE_REVERB_PORT) || 6001,
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "http") === "https",
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${
        import.meta.env.VITE_API_URL || "http://orkela.localhost/api"
      }/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
      },
    });
  }
  return echoInstance;
};

// Función para actualizar el token de autenticación
export const updateEchoAuth = (token) => {
  if (echoInstance) {
    echoInstance.connector.options.auth.headers.Authorization = `Bearer ${token}`;
  }
};

// Id del socket de esta pestaña: la API lo recibe en X-Socket-ID y no le
// reenvía las señales *.sync que provocó ella misma (su vista ya se
// actualizó con la respuesta).
export const currentSocketId = () => {
  try {
    return echoInstance?.socketId?.() || null;
  } catch {
    return null;
  }
};

// Función para desconectar Echo
export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};

// Instancia de Echo separada para el portal de clientes — autentica con
// el token del portal, no con la sesión de Sanctum del staff interno.
let portalEchoInstance = null;

export const getPortalEcho = (token) => {
  if (!portalEchoInstance) {
    portalEchoInstance = new Echo({
      broadcaster: "reverb",
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
      wsPort: parseInt(import.meta.env.VITE_REVERB_PORT) || 6001,
      wssPort: parseInt(import.meta.env.VITE_REVERB_PORT) || 6001,
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "http") === "https",
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${
        import.meta.env.VITE_API_URL || "http://orkela.localhost/api"
      }/portal/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
      },
    });
  }
  return portalEchoInstance;
};

// Pone la sesión actual en la instancia ya creada (p. ej. tras canjear otro
// enlace en la misma pestaña). La renovación deslizante de la sesión no
// cambia el token: solo extiende su vencimiento en el servidor.
export const updatePortalEchoAuth = (token) => {
  if (portalEchoInstance) {
    portalEchoInstance.connector.options.auth.headers.Authorization = `Bearer ${token}`;
  }
};

export const disconnectPortalEcho = () => {
  if (portalEchoInstance) {
    portalEchoInstance.disconnect();
    portalEchoInstance = null;
  }
};

// Para compatibilidad con imports existentes
export default {
  get instance() {
    return getEcho();
  },
};

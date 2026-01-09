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

// Función para desconectar Echo
export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};

// Para compatibilidad con imports existentes
export default {
  get instance() {
    return getEcho();
  },
};

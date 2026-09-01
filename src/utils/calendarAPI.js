import { request } from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://orkela.localhost/api";

export const calendarAPI = {
  // Lista las conexiones de calendario del usuario autenticado.
  listConnections: () => request("/calendar/connections"),

  // Pide un ticket de un solo uso y devuelve la URL a la que hay que
  // navegar (window.location.href) para iniciar el flujo OAuth completo.
  requestConnectTicket: async (provider) => {
    const data = await request(`/calendar/connect-ticket/${provider}`, {
      method: "POST",
    });
    return data.redirect_url;
  },

  disconnect: (provider) =>
    request(`/calendar/connections/${provider}`, { method: "DELETE" }),
};

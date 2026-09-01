import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, Loader2, AlertTriangle } from "lucide-react";
import { calendarAPI } from "../../utils/calendarAPI";
import { useNotification } from "../../context/NotificationContext";

// Los dos proveedores soportados. El ícono es genérico (Calendar) — no hay
// logos de marca en el set de lucide-react — y se distingue cada uno por su
// color de acento y el nombre a la derecha.
const PROVIDERS = [
  {
    key: "google",
    label: "Google Calendar",
    connectLabel: "Conectar Google",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "microsoft",
    label: "Microsoft Outlook",
    connectLabel: "Conectar Microsoft",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
];

// Normaliza la respuesta de calendarAPI.listConnections() (un arreglo plano
// con una entrada por conexión existente — así serializa el
// CalendarConnection::get() del backend) a un mapa provider -> conexión,
// para poder mirar el estado de cada proveedor sin importar si tiene fila o no.
const toConnectionMap = (data) => {
  const list = Array.isArray(data) ? data : [];
  const map = {};
  list.forEach((conn) => {
    if (conn?.provider) {
      map[conn.provider] = conn;
    }
  });
  return map;
};

// El backend usa "active" para una conexión vigente; lo traducimos a
// "connected" (la etiqueta interna que usa el resto del componente).
// Cualquier valor no reconocido se trata como "not_connected" para no
// dejar una fila sin texto ni botón si el backend agrega un estado nuevo.
const toDisplayStatus = (rawStatus) => {
  if (rawStatus === "active") return "connected";
  if (rawStatus === "needs_reauth") return "needs_reauth";
  return "not_connected";
};

const CalendarIntegrationsSection = () => {
  const { success, error: showError } = useNotification();
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  // Provider sobre el que hay una acción (conectar/reconectar/desconectar) en curso.
  const [actioningProvider, setActioningProvider] = useState(null);

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await calendarAPI.listConnections();
      setConnections(toConnectionMap(data));
    } catch (err) {
      showError("No se pudieron cargar las integraciones de calendario");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Usado tanto para "Conectar" (not_connected) como para "Reconectar"
  // (needs_reauth): en ambos casos se pide un ticket nuevo y se navega de
  // verdad a la URL de OAuth (no es una ruta SPA).
  const handleConnect = async (provider) => {
    try {
      setActioningProvider(provider);
      const redirectUrl = await calendarAPI.requestConnectTicket(provider);
      window.location.href = redirectUrl;
    } catch (err) {
      showError(err.message || "No se pudo iniciar la conexión");
      setActioningProvider(null);
    }
  };

  const handleDisconnect = async (provider) => {
    try {
      setActioningProvider(provider);
      await calendarAPI.disconnect(provider);
      setConnections((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      success("Calendario desconectado correctamente");
    } catch (err) {
      showError(err.message || "No se pudo desconectar el calendario");
    } finally {
      setActioningProvider(null);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600'></div>
      </div>
    );
  }

  return (
    <div className='bg-white dark:bg-night-900 rounded-2xl border border-gray-100 dark:border-night-700 shadow-sm p-6'>
      <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-night-500 mb-4'>
        Integraciones de calendario
      </h3>
      <div>
        {PROVIDERS.map((provider, index) => {
          const conn = connections[provider.key];
          const status = toDisplayStatus(conn?.status);
          const isLastRow = index === PROVIDERS.length - 1;
          const isActioning = actioningProvider === provider.key;

          return (
            <motion.div
              key={provider.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-4 py-4 ${
                isLastRow ? "" : "border-b border-gray-100 dark:border-night-700"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${provider.iconBg}`}
              >
                <Calendar className={`w-5 h-5 ${provider.iconColor}`} />
              </div>

              <div className='flex-1 min-w-0'>
                <p className='font-medium text-gray-900 dark:text-night-50'>
                  {provider.label}
                </p>
                {status === "connected" && (
                  <p className='text-sm text-gray-500 dark:text-night-400 truncate'>
                    Conectado
                    {conn?.provider_account_email
                      ? ` · ${conn.provider_account_email}`
                      : ""}
                  </p>
                )}
                {status === "needs_reauth" && (
                  <p className='flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400'>
                    <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
                    Necesita reconexión
                  </p>
                )}
                {status === "not_connected" && (
                  <p className='text-sm text-gray-500 dark:text-night-400'>
                    No conectado
                  </p>
                )}
              </div>

              {status === "connected" && (
                <button
                  type='button'
                  disabled={isActioning}
                  onClick={() => handleDisconnect(provider.key)}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-night-700 text-gray-700 dark:text-night-300 rounded-lg hover:bg-gray-50 dark:hover:bg-night-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0'
                >
                  {isActioning ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    "Desconectar"
                  )}
                </button>
              )}

              {status === "needs_reauth" && (
                <button
                  type='button'
                  disabled={isActioning}
                  onClick={() => handleConnect(provider.key)}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0'
                >
                  {isActioning ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    "Reconectar"
                  )}
                </button>
              )}

              {status === "not_connected" && (
                <button
                  type='button'
                  disabled={isActioning}
                  onClick={() => handleConnect(provider.key)}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0'
                >
                  {isActioning ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    provider.connectLabel
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarIntegrationsSection;

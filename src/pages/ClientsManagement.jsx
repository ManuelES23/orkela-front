import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ClientModal from "../components/modals/ClientModal";
import { clientsAPI } from "../utils/api";
import { useNotification } from "../context/NotificationContext";
import { Plus, Search, Send, Archive, ArchiveRestore } from "lucide-react";

const statusBadgeColor = {
  open: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
  in_progress: "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300",
  pending: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400",
  resolved: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400",
  closed: "bg-gray-100 dark:bg-night-800 text-gray-600 dark:text-night-300",
};

const statusLabels = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const ClientsManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [resending, setResending] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Ref con el `id` de la URL "actual" — necesario porque las promesas en
  // vuelo (getById tras archivar/guardar) capturan el `id` del render en el
  // que arrancaron, y para cuando resuelven el usuario puede haber navegado
  // a otro cliente. Leer `currentIdRef.current` en el callback de
  // resolución, en vez del `id` cerrado en la promesa, es lo que permite
  // detectar ese cambio (mismo patrón que `selectedIdRef` en
  // PortalInboxScreen.jsx).
  const currentIdRef = useRef(id);
  useEffect(() => {
    currentIdRef.current = id;
  }, [id]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await clientsAPI.getAll();
      setClients(data);
      if (!id && data.length > 0) {
        navigate(`/clients/${data[0].id}`, { replace: true });
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadClients();
    // Solo al montar — seleccionar el primero es responsabilidad del efecto de arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) {
      setSelected(null);
      return;
    }
    // Guarda contra la carrera de "cambiar de cliente rápido": si el usuario
    // selecciona A y luego B antes de que la respuesta de A llegue, la
    // resolución de A ya no debe pisar el cliente B que se está mostrando.
    let cancelled = false;
    clientsAPI
      .getById(id)
      .then((client) => {
        if (!cancelled) setSelected(client);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const filteredClients = clients.filter((c) =>
    `${c.name} ${c.company_name || ""} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleResendAccess = async () => {
    if (!selected) return;
    setResending(true);
    try {
      await clientsAPI.resendAccess(selected.id);
      success("Enlace de acceso reenviado");
    } catch {
      showError("No se pudo reenviar el acceso");
    } finally {
      setResending(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!selected) return;
    // Captura el cliente sobre el que se actúa — si el usuario navega a otro
    // cliente antes de que esta cadena de awaits resuelva, el `getById` de
    // abajo no debe pisar el `selected` que ya corresponde a otro cliente.
    const targetId = selected.id;
    setArchiving(true);
    try {
      if (selected.status === "active") {
        await clientsAPI.archive(targetId);
        success("Cliente archivado");
      } else {
        await clientsAPI.update(targetId, { status: "active" });
        success("Cliente reactivado");
      }
      const updated = await clientsAPI.getById(targetId);
      if (String(targetId) === currentIdRef.current) {
        setSelected(updated);
      }
      loadClients();
    } catch {
      showError("No se pudo actualizar el estado del cliente");
    } finally {
      setArchiving(false);
    }
  };

  const handleSaved = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    loadClients();
    if (selected) {
      // Mismo resguardo que en handleToggleArchive: si el usuario cambia de
      // cliente justo cuando se cierra el modal, esta respuesta ya no debe
      // pisar el `selected` actual.
      const targetId = selected.id;
      clientsAPI.getById(targetId).then((updated) => {
        if (String(targetId) === currentIdRef.current) {
          setSelected(updated);
        }
      });
    }
  };

  return (
    <Layout title='Clientes' subtitle='Empresas y contactos con acceso al portal de soporte'>
      <div className='bg-white dark:bg-night-900 rounded-2xl border border-gray-200 dark:border-night-700 flex h-[calc(100vh-220px)] min-h-[420px] overflow-hidden'>
        <div className='w-full md:w-80 border-r border-gray-200 dark:border-night-700 shrink-0 flex flex-col'>
          <div className='p-4 border-b border-gray-200 dark:border-night-700 space-y-3'>
            <div className='flex items-center justify-between'>
              <h2 className='font-bold text-gray-900 dark:text-night-50'>Clientes</h2>
              <button
                onClick={() => {
                  setEditingClient(null);
                  setIsModalOpen(true);
                }}
                aria-label='Nuevo cliente'
                className='w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors'
              >
                <Plus className='w-5 h-5' />
              </button>
            </div>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-night-500' aria-hidden='true' />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Buscar cliente...'
                className='w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-night-600 dark:bg-night-800 dark:text-night-50 dark:placeholder-night-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
          </div>
          <div className='flex-1 overflow-y-auto'>
            {!loading && loadError ? (
              <div className='p-6 text-center text-gray-500 dark:text-night-400 text-sm'>
                No se pudieron cargar los clientes.
              </div>
            ) : !loading && filteredClients.length === 0 ? (
              <div className='p-6 text-center text-gray-500 dark:text-night-400 text-sm'>
                {clients.length === 0
                  ? "Aún no hay clientes. Da de alta el primero con el botón +."
                  : "Ningún cliente coincide con la búsqueda."}
              </div>
            ) : (
              filteredClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-night-800 transition-colors ${
                    Number(id) === c.id ? "bg-brand-50 dark:bg-brand-900/20" : "hover:bg-gray-50 dark:hover:bg-night-800"
                  } ${c.status === "archived" ? "opacity-60" : ""}`}
                >
                  <p
                    className={`text-sm font-medium truncate ${
                      Number(id) === c.id ? "text-brand-700 dark:text-brand-300" : "text-gray-900 dark:text-night-50"
                    }`}
                  >
                    {c.company_name || c.name}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-night-400 truncate'>
                    {c.status === "archived" ? "Archivado" : `${c.tickets_count ?? 0} tickets`}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className='flex-1 min-w-0 p-6 overflow-y-auto'>
          {!selected ? (
            <div className='h-full flex items-center justify-center text-gray-400 dark:text-night-500 text-sm'>
              Selecciona un cliente para ver su detalle
            </div>
          ) : (
            <div>
              <div className='flex items-start justify-between mb-6'>
                <div>
                  <h2 className='text-xl font-bold text-gray-900 dark:text-night-50'>{selected.company_name || selected.name}</h2>
                  <p className='text-gray-500 dark:text-night-400 text-sm mt-0.5'>{selected.name} · {selected.email}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingClient(selected);
                    setIsModalOpen(true);
                  }}
                  className='text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
                >
                  Editar
                </button>
              </div>

              <div className='flex flex-wrap gap-2 mb-6'>
                <button
                  onClick={handleResendAccess}
                  disabled={resending || selected.status !== "active"}
                  className='inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 dark:border-night-600 rounded-lg hover:bg-gray-50 dark:hover:bg-night-800 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Send className='w-3.5 h-3.5' />
                  Reenviar acceso
                </button>
                <button
                  onClick={handleToggleArchive}
                  disabled={archiving}
                  className='inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 dark:border-night-600 rounded-lg hover:bg-gray-50 dark:hover:bg-night-800 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {selected.status === "active" ? (
                    <>
                      <Archive className='w-3.5 h-3.5' />
                      Archivar
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className='w-3.5 h-3.5' />
                      Reactivar
                    </>
                  )}
                </button>
              </div>

              {selected.notes && (
                <p className='text-sm text-gray-600 dark:text-night-300 bg-gray-50 dark:bg-night-800 rounded-lg p-3 mb-6'>{selected.notes}</p>
              )}

              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-night-300'>Tickets recientes</h3>
                <a
                  href={`/client-tickets?client=${selected.id}`}
                  className='text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium'
                >
                  Ver todos
                </a>
              </div>
              {(selected.tickets || []).length === 0 ? (
                <p className='text-sm text-gray-400 dark:text-night-500'>Este cliente aún no tiene tickets.</p>
              ) : (
                <div className='space-y-2'>
                  {selected.tickets.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className='flex items-center justify-between px-3 py-2 border border-gray-100 dark:border-night-800 rounded-lg'
                    >
                      <span className='text-sm text-gray-700 dark:text-night-300 truncate'>{t.title}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusBadgeColor[t.status]}`}
                      >
                        {statusLabels[t.status] || t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        client={editingClient}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />
    </Layout>
  );
};

export default ClientsManagement;

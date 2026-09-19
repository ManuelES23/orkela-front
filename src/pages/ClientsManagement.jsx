import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/layout/Layout";
import ClientModal from "../components/modals/ClientModal";
import ContactModal from "../components/modals/ContactModal";
import LoadingSwap from "../components/ui/LoadingSwap";
import DetailPanel from "../components/ui/DetailPanel";
import { ClientListSkeleton, ClientDetailSkeleton } from "../components/clients/ClientsSkeleton";
import { clientsAPI, contactsAPI } from "../utils/api";
import { useNotification } from "../context/NotificationContext";
import { useMailResult } from "../hooks/useMailResult";
import { Plus, Search, Send, Archive, ArchiveRestore, Star, UserPlus, Building2, User } from "lucide-react";
import { TICKET_STATUS } from "../constants/tickets";

const AdminBadge = () => (
  <span className='inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-full px-1.5 py-0.5 shrink-0'>
    <Star className='w-2.5 h-2.5 fill-current' aria-hidden='true' />
    Admin
  </span>
);

const ClientsManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { notifyClientMail } = useMailResult();

  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [archivingClient, setArchivingClient] = useState(false);
  // Id del contacto sobre el que hay una acción en vuelo (reenviar acceso,
  // archivar, promover) — deshabilita solo el botón de esa fila, no toda
  // la pantalla.
  const [actioningContactId, setActioningContactId] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSelected = useCallback((targetId) => {
    clientsAPI.getById(targetId).then((updated) => {
      if (String(targetId) === currentIdRef.current) {
        setSelected(updated);
      }
    });
  }, []);

  useEffect(() => {
    if (!id) {
      setSelected(null);
      setSelectedLoading(false);
      return;
    }
    let cancelled = false;
    setSelectedLoading(true);
    clientsAPI
      .getById(id)
      .then((client) => {
        if (!cancelled) setSelected(client);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      })
      .finally(() => {
        if (!cancelled) setSelectedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const filteredClients = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleToggleArchiveClient = async () => {
    if (!selected) return;
    const targetId = selected.id;
    setArchivingClient(true);
    try {
      if (selected.status === "active") {
        await clientsAPI.archive(targetId);
        success("Cliente archivado");
      } else {
        await clientsAPI.update(targetId, { status: "active" });
        success("Cliente reactivado");
      }
      refreshSelected(targetId);
      loadClients();
    } catch {
      showError("No se pudo actualizar el estado del cliente");
    } finally {
      setArchivingClient(false);
    }
  };

  const handleClientSaved = () => {
    setIsClientModalOpen(false);
    setEditingClient(null);
    loadClients();
    if (selected) refreshSelected(selected.id);
    // Alta de cliente nuevo: el modal no tenía `selected` — navegar al
    // recién creado para verlo de inmediato.
  };

  const handleContactSaved = () => {
    setIsContactModalOpen(false);
    setEditingContact(null);
    if (selected) refreshSelected(selected.id);
  };

  const handleResendAccess = async (contactId) => {
    setActioningContactId(contactId);
    try {
      const result = await contactsAPI.resendAccess(contactId);
      notifyClientMail(result, "Enlace de acceso reenviado");
    } catch {
      showError("No se pudo reenviar el acceso");
    } finally {
      setActioningContactId(null);
    }
  };

  const handleToggleArchiveContact = async (contact) => {
    setActioningContactId(contact.id);
    try {
      if (contact.status === "active") {
        await contactsAPI.archive(contact.id);
        success("Contacto archivado");
      } else {
        await contactsAPI.update(contact.id, { status: "active" });
        success("Contacto reactivado");
      }
      if (selected) refreshSelected(selected.id);
    } catch {
      showError("No se pudo actualizar el estado del contacto");
    } finally {
      setActioningContactId(null);
    }
  };

  const handlePromote = async (contactId) => {
    setActioningContactId(contactId);
    try {
      await contactsAPI.promote(contactId);
      success("Contacto promovido a admin");
      if (selected) refreshSelected(selected.id);
    } catch {
      showError("No se pudo promover al contacto");
    } finally {
      setActioningContactId(null);
    }
  };

  return (
    <Layout title='Clientes' subtitle='Empresas e individuos con acceso al portal de soporte'>
      <div className='bg-white dark:bg-night-900 rounded-2xl border border-gray-200 dark:border-night-700 flex h-[calc(100vh-220px)] min-h-[420px] overflow-hidden'>
        <div className='w-full md:w-80 border-r border-gray-200 dark:border-night-700 shrink-0 flex flex-col'>
          <div className='p-4 border-b border-gray-200 dark:border-night-700 space-y-3'>
            <div className='flex items-center justify-between'>
              <h2 className='font-bold text-gray-900 dark:text-night-50'>Clientes</h2>
              <button
                onClick={() => {
                  setEditingClient(null);
                  setIsClientModalOpen(true);
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
            <LoadingSwap loading={loading} skeleton={<ClientListSkeleton />}>
              {loadError ? (
                <div className='p-6 text-center text-gray-500 dark:text-night-400 text-sm'>
                  No se pudieron cargar los clientes.
                </div>
              ) : filteredClients.length === 0 ? (
                <div className='p-6 text-center text-gray-500 dark:text-night-400 text-sm'>
                  {clients.length === 0
                    ? "Aún no hay clientes. Da de alta el primero con el botón +."
                    : "Ningún cliente coincide con la búsqueda."}
                </div>
              ) : (
                <AnimatePresence mode='popLayout'>
                  {filteredClients.map((c) => (
                    <motion.button
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-night-800 transition-colors ${
                        Number(id) === c.id ? "bg-brand-50 dark:bg-brand-900/20" : "hover:bg-gray-50 dark:hover:bg-night-800"
                      } ${c.status === "archived" ? "opacity-60" : ""}`}
                    >
                      <p
                        className={`text-sm font-medium truncate flex items-center gap-1.5 ${
                          Number(id) === c.id ? "text-brand-700 dark:text-brand-300" : "text-gray-900 dark:text-night-50"
                        }`}
                      >
                        {c.type === "company" ? (
                          <Building2 className='w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-night-500' aria-hidden='true' />
                        ) : (
                          <User className='w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-night-500' aria-hidden='true' />
                        )}
                        <span className='truncate'>{c.name}</span>
                      </p>
                      <p className='text-xs text-gray-500 dark:text-night-400 truncate'>
                        {c.status === "archived" ? "Archivado" : `${c.tickets_count ?? 0} tickets`}
                      </p>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </LoadingSwap>
          </div>
        </div>

        <div className='flex-1 min-w-0 p-6 overflow-y-auto'>
          <LoadingSwap loading={selectedLoading} skeleton={<ClientDetailSkeleton />}>
          {!selected ? (
            <div className='h-full flex items-center justify-center text-gray-400 dark:text-night-500 text-sm'>
              Selecciona un cliente para ver su detalle
            </div>
          ) : (
            <DetailPanel panelKey={selected.id}>
              <div className='flex items-start justify-between mb-6'>
                <div>
                  <h2 className='text-xl font-bold text-gray-900 dark:text-night-50'>{selected.name}</h2>
                  <p className='text-gray-500 dark:text-night-400 text-sm mt-0.5'>
                    {selected.type === "company" ? "Empresa" : "Individual"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingClient(selected);
                    setIsClientModalOpen(true);
                  }}
                  className='text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
                >
                  Editar
                </button>
              </div>

              <div className='flex flex-wrap gap-2 mb-6'>
                <button
                  onClick={handleToggleArchiveClient}
                  disabled={archivingClient}
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
                <h3 className='text-sm font-semibold text-gray-700 dark:text-night-300'>Contactos</h3>
                <button
                  onClick={() => {
                    setEditingContact(null);
                    setIsContactModalOpen(true);
                  }}
                  disabled={selected.status !== "active"}
                  title={selected.status !== "active" ? "Reactiva el cliente para agregar contactos" : undefined}
                  className='inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-brand-600 dark:disabled:hover:text-brand-400'
                >
                  <UserPlus className='w-3.5 h-3.5' />
                  Agregar contacto
                </button>
              </div>
              <div className='space-y-2 mb-6'>
                {(selected.contacts || []).map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 border border-gray-100 dark:border-night-800 rounded-lg ${
                      contact.status === "archived" ? "opacity-60" : ""
                    }`}
                  >
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-gray-900 dark:text-night-50 flex items-center gap-1.5 truncate'>
                        <span className='truncate'>{contact.name}</span>
                        {contact.is_admin && <AdminBadge />}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-night-400 truncate'>{contact.email}</p>
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      {!contact.is_admin && contact.status === "active" && (
                        <button
                          onClick={() => handlePromote(contact.id)}
                          disabled={actioningContactId === contact.id}
                          className='text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50 px-1.5'
                        >
                          Hacer admin
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingContact(contact);
                          setIsContactModalOpen(true);
                        }}
                        className='text-xs font-semibold text-gray-500 dark:text-night-400 hover:text-gray-700 dark:hover:text-night-200 px-1.5'
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleResendAccess(contact.id)}
                        disabled={actioningContactId === contact.id || contact.status !== "active" || selected.status !== "active"}
                        aria-label='Reenviar acceso'
                        title={selected.status !== "active" ? "Reactiva el cliente para reenviar el acceso" : undefined}
                        className='text-gray-400 dark:text-night-500 hover:text-gray-600 dark:hover:text-night-200 disabled:opacity-40 disabled:cursor-not-allowed p-1'
                      >
                        <Send className='w-3.5 h-3.5' />
                      </button>
                      <button
                        onClick={() => handleToggleArchiveContact(contact)}
                        disabled={actioningContactId === contact.id}
                        aria-label={contact.status === "active" ? "Archivar contacto" : "Reactivar contacto"}
                        className='text-gray-400 dark:text-night-500 hover:text-gray-600 dark:hover:text-night-200 disabled:opacity-40 p-1'
                      >
                        {contact.status === "active" ? (
                          <Archive className='w-3.5 h-3.5' />
                        ) : (
                          <ArchiveRestore className='w-3.5 h-3.5' />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

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
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 border ${TICKET_STATUS[t.status]?.badgeClass ?? ""}`}
                      >
                        {TICKET_STATUS[t.status]?.label || t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </DetailPanel>
          )}
          </LoadingSwap>
        </div>
      </div>

      <ClientModal
        isOpen={isClientModalOpen}
        client={editingClient}
        onClose={() => setIsClientModalOpen(false)}
        onSaved={handleClientSaved}
      />
      <ContactModal
        isOpen={isContactModalOpen}
        client={selected}
        contact={editingContact}
        onClose={() => setIsContactModalOpen(false)}
        onSaved={handleContactSaved}
      />
    </Layout>
  );
};

export default ClientsManagement;

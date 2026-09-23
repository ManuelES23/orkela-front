import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Info, Send } from "lucide-react";
import { motionTokens } from "../animations/variants";
import { STATUS_LABELS, STATUS_BADGE_COLOR } from "./ticketVocabulary";
import LoadingSwap from "../ui/LoadingSwap";
import { Skeleton } from "../ui/Skeleton";
import { PortalThreadSkeleton } from "./PortalSkeletons";

const DRAFT_KEY_PREFIX = "orkela_portal_draft_";

// Asume que el padre (PortalInboxScreen) monta este componente con
// `key={selectedTicketId}` — así React lo remonta por completo en cada
// cambio de ticket en vez de tener que sincronizar el borrador entre
// tickets vía efectos, evitando una carrera entre "restaurar borrador
// del ticket nuevo" y "persistir borrador" que podía escribir texto del
// ticket anterior en la sessionStorage del ticket nuevo por un instante.
const PortalThread = ({
  ticketId,
  ticket,
  error = null,
  onRetry,
  onBack,
  onSendComment,
  sending,
  onShowDetails,
}) => {
  // Restaura el borrador de este ticket si había uno guardado — cubre el
  // caso de que el token haya expirado a medio escribir: PortalLayout
  // redirige (desmontando este componente) antes de que el envío pueda
  // completarse, así que el borrador debe sobrevivir en sessionStorage,
  // no solo en el estado local de React. Inicializador perezoso: solo se
  // ejecuta al montar (ver nota de `key` arriba), no en cada cambio de prop.
  // Se indexa por `ticketId` (conocido de forma síncrona desde la URL), no
  // por `ticket?.id` — `ticket` llega `null` mientras el fetch está en
  // vuelo, y usar su id encadenaría el borrador al ticket anterior por un
  // ciclo de render.
  const [draft, setDraft] = useState(() => {
    if (!ticketId) return "";
    return sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${ticketId}`) || "";
  });
  const [sendError, setSendError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!ticketId) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketId, ticket?.comments?.length]);

  useEffect(() => {
    if (!ticketId) return;
    if (draft) {
      sessionStorage.setItem(`${DRAFT_KEY_PREFIX}${ticketId}`, draft);
    } else {
      sessionStorage.removeItem(`${DRAFT_KEY_PREFIX}${ticketId}`);
    }
  }, [draft, ticketId]);

  if (!ticketId) {
    return (
      <div className='hidden md:flex flex-1 items-center justify-center text-gray-400 dark:text-night-500 text-sm'>
        Selecciona un ticket para ver la conversación
      </div>
    );
  }

  // Error al cargar el detalle: sin esto `ticket` quedaba en null y el
  // LoadingSwap mostraba el esqueleto para siempre.
  if (error) {
    const notFound = error === "not_found";
    return (
      <div className='flex-1 flex items-center justify-center p-6 text-center'>
        <div role='alert'>
          <p className='text-gray-900 dark:text-night-50 font-semibold mb-2'>
            {notFound ? "No encontramos este ticket" : "No pudimos cargar la conversación"}
          </p>
          <p className='text-gray-500 dark:text-night-400 text-sm max-w-sm mb-4'>
            {notFound
              ? "Puede que el enlace sea antiguo o que ya no tengas acceso a este ticket."
              : "Ocurrió un problema al conectar con el servidor. Intenta de nuevo."}
          </p>
          <div className='flex items-center justify-center gap-3'>
            {!notFound && (
              <button
                type='button'
                onClick={onRetry}
                className='px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors'
              >
                Reintentar
              </button>
            )}
            <button
              type='button'
              onClick={onBack}
              className='px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-brand-600 dark:text-night-300 dark:hover:text-brand-400 transition-colors'
            >
              Volver a mis tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSendError(null);
    try {
      await onSendComment(draft);
      setDraft("");
    } catch {
      setSendError("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    }
  };

  return (
    <div className='flex-1 flex flex-col min-w-0 h-full'>
      <div className='p-4 border-b border-gray-200 dark:border-night-700 flex items-center gap-3 shrink-0'>
        <button
          onClick={onBack}
          aria-label='Volver a mis tickets'
          className='md:hidden text-gray-500 dark:text-night-400'
        >
          <ArrowLeft className='w-5 h-5' />
        </button>
        <LoadingSwap loading={!ticket} className='min-w-0 flex-1' skeleton={<Skeleton className='h-4 w-1/2' />}>
          {ticket && <p className='font-semibold text-gray-900 dark:text-night-50 truncate'>{ticket.title}</p>}
        </LoadingSwap>
        {ticket && (
          <motion.span
            key={ticket.status}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: motionTokens.duration.fast }}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_BADGE_COLOR[ticket.status]}`}
          >
            {STATUS_LABELS[ticket.status] || ticket.status}
          </motion.span>
        )}
        {onShowDetails && ticket && (
          <button
            onClick={onShowDetails}
            aria-label='Ver detalles del ticket'
            className='lg:hidden text-gray-400 hover:text-brand-600 dark:text-night-500 dark:hover:text-brand-400 transition-colors shrink-0'
          >
            <Info className='w-5 h-5' />
          </button>
        )}
      </div>

      <LoadingSwap loading={!ticket} className='flex-1 flex flex-col min-w-0' skeleton={<PortalThreadSkeleton />}>
        {ticket && (
          <>
            <div className='flex-1 overflow-y-auto p-4 space-y-3'>
              <div className='max-w-[80%] bg-gray-100 dark:bg-night-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-700 dark:text-night-300'>
                {ticket.description}
              </div>
              {(ticket.comments || []).map((comment) => {
                const isClient = Boolean(comment.contact_id);
                return (
                  <div key={comment.id} className={`max-w-[80%] ${isClient ? "ml-auto" : ""}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        isClient
                          ? "bg-brand-600 text-white rounded-tr-sm"
                          : "bg-gray-100 text-gray-700 dark:bg-night-800 dark:text-night-300 rounded-tl-sm"
                      }`}
                    >
                      {comment.content}
                    </div>
                    {!isClient && comment.user?.name && (
                      <p className='text-xs text-gray-400 dark:text-night-500 mt-1 px-1'>{comment.user.name}</p>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className='p-4 border-t border-gray-200 dark:border-night-700 shrink-0'>
              {sendError && <p className='text-xs text-red-600 dark:text-red-400 mb-2'>{sendError}</p>}
              <div className='flex items-center gap-2'>
                <input
                  type='text'
                  value={draft}
                  maxLength={5000}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder='Escribe una respuesta...'
                  disabled={sending}
                  className='flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-night-700 dark:bg-night-900 dark:text-night-50 dark:placeholder:text-night-500'
                />
                <button
                  type='submit'
                  disabled={sending || !draft.trim()}
                  aria-label='Enviar'
                  className='w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 transition-colors'
                >
                  <Send className='w-4.5 h-4.5' />
                </button>
              </div>
            </form>
          </>
        )}
      </LoadingSwap>
    </div>
  );
};

export default PortalThread;

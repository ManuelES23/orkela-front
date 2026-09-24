import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, Info } from "lucide-react";
import { motionTokens } from "../animations/variants";
import { STATUS_LABELS, STATUS_BADGE_COLOR } from "./ticketVocabulary";
import { Skeleton } from "../ui/Skeleton";
import { PortalThreadSkeleton } from "./PortalSkeletons";
import PortalMessageBubble from "./chat/PortalMessageBubble";
import PortalComposer from "./chat/PortalComposer";
import { buildThreadMessages } from "./chat/threadMessages";
import { useStickToBottom } from "./chat/useStickToBottom";
import PortalTicketStatusBar from "./PortalTicketStatusBar";
import { REOPENS_ON_REPLY } from "./portalStatusHelp";

const DRAFT_KEY_PREFIX = "orkela_portal_draft_";

let tempSequence = 0;
const nextTempId = () => {
  tempSequence += 1;
  return `tmp-${Date.now()}-${tempSequence}`;
};

// El padre (PortalInboxScreen) monta este componente con `key={ticketId}`:
// cambiar de ticket lo remonta entero, así que el borrador y la bandeja de
// salida (mensajes enviándose) son siempre de un solo ticket.
const PortalThread = ({
  ticketId,
  ticket,
  contactId,
  error = null,
  onRetry,
  onBack,
  onSendComment,
  onShowDetails,
  onConfirmResolution,
  onReopen,
}) => {
  // El borrador sobrevive en sessionStorage por si la sesión vence a medio
  // escribir y PortalLayout redirige (desmontando el hilo).
  const [draft, setDraft] = useState(() => {
    if (!ticketId) return "";
    return sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${ticketId}`) || "";
  });
  // Mensajes enviados por este contacto que aún no confirmó el servidor.
  const [outbox, setOutbox] = useState([]);
  const composerRef = useRef(null);

  useEffect(() => {
    if (!ticketId) return;
    if (draft) {
      sessionStorage.setItem(`${DRAFT_KEY_PREFIX}${ticketId}`, draft);
    } else {
      sessionStorage.removeItem(`${DRAFT_KEY_PREFIX}${ticketId}`);
    }
  }, [draft, ticketId]);

  const messages = useMemo(
    () => [
      ...buildThreadMessages(ticket, contactId),
      ...outbox.map((item) => ({
        key: item.tempId,
        id: null,
        content: item.content,
        created_at: item.created_at,
        own: true,
        fromStaff: false,
        authorName: null,
        status: item.status,
      })),
    ],
    [ticket, contactId, outbox]
  );

  const { containerRef, handleScroll, hasNewBelow, scrollToBottom } = useStickToBottom(messages.length);

  const deliver = useCallback(
    async (item) => {
      setOutbox((prev) => prev.map((m) => (m.tempId === item.tempId ? { ...m, status: "sending" } : m)));
      try {
        await onSendComment(item.content);
        setOutbox((prev) => prev.filter((m) => m.tempId !== item.tempId));
      } catch {
        setOutbox((prev) => prev.map((m) => (m.tempId === item.tempId ? { ...m, status: "failed" } : m)));
      }
    },
    [onSendComment]
  );

  const handleSubmit = (content) => {
    const item = { tempId: nextTempId(), content, status: "sending", created_at: new Date().toISOString() };
    setOutbox((prev) => [...prev, item]);
    setDraft("");
    // El propio mensaje siempre se ve, aunque el usuario hubiera subido.
    scrollToBottom();
    deliver(item);
  };

  const retry = (tempId) => {
    const item = outbox.find((m) => m.tempId === tempId);
    if (item) deliver(item);
  };

  // Tras "Sigue sin funcionar", el foco va al compositor para contar qué falla.
  const handleReopen = async () => {
    await onReopen();
    composerRef.current?.focus();
  };

  if (!ticketId) {
    return (
      <div className='hidden md:flex flex-1 items-center justify-center text-gray-400 dark:text-night-500 text-sm'>
        Selecciona un ticket para ver la conversación
      </div>
    );
  }

  // Estado de error de la fase 3 (mismos textos y botones): sin esto
  // `ticket` quedaba en null y se veía el esqueleto para siempre.
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

  return (
    <div className='flex-1 flex flex-col min-w-0 min-h-0 h-full'>
      <div className='p-4 border-b border-gray-200 dark:border-night-700 flex items-center gap-3 shrink-0'>
        <button
          type='button'
          onClick={onBack}
          aria-label='Volver a mis tickets'
          className='md:hidden text-gray-500 dark:text-night-400'
        >
          <ArrowLeft className='w-5 h-5' />
        </button>
        <div className='min-w-0 flex-1'>
          {ticket ? (
            <h2 className='font-semibold text-gray-900 dark:text-night-50 truncate'>{ticket.title}</h2>
          ) : (
            <Skeleton className='h-4 w-1/2' />
          )}
        </div>
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
            type='button'
            onClick={onShowDetails}
            aria-label='Ver detalles del ticket'
            className='lg:hidden text-gray-400 hover:text-brand-600 dark:text-night-500 dark:hover:text-brand-400 transition-colors shrink-0'
          >
            <Info className='w-5 h-5' />
          </button>
        )}
      </div>

      {!ticket ? (
        <PortalThreadSkeleton />
      ) : (
        <>
          <PortalTicketStatusBar
            ticket={ticket}
            onConfirmResolution={onConfirmResolution}
            onReopen={handleReopen}
          />
          <div className='relative flex-1 min-h-0'>
            <div
              ref={containerRef}
              onScroll={handleScroll}
              role='log'
              aria-live='polite'
              aria-relevant='additions'
              aria-label='Conversación del ticket'
              tabIndex={0}
              className='h-full overflow-y-auto p-4 space-y-3 focus:outline-none'
            >
              {messages.map((message) => (
                <PortalMessageBubble
                  key={message.key}
                  message={message}
                  onRetry={message.status === "failed" ? () => retry(message.key) : undefined}
                />
              ))}
            </div>
            {hasNewBelow && (
              <button
                type='button'
                onClick={scrollToBottom}
                className='absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-600 text-white text-xs font-semibold shadow-lg hover:bg-brand-700 transition-colors'
              >
                <ArrowDown className='w-3.5 h-3.5' aria-hidden='true' />
                Nuevos mensajes
              </button>
            )}
          </div>
          <PortalComposer
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            inputRef={composerRef}
            hint={REOPENS_ON_REPLY.includes(ticket.status) ? "Si respondes, el ticket se reabrirá." : null}
          />
        </>
      )}
    </div>
  );
};

export default PortalThread;

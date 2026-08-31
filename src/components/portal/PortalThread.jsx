import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { motionTokens } from "../animations/variants";

const statusLabels = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const statusBadgeColor = {
  open: "bg-blue-50 text-blue-600",
  in_progress: "bg-brand-50 text-brand-600",
  pending: "bg-yellow-50 text-yellow-600",
  resolved: "bg-green-50 text-green-600",
  closed: "bg-gray-100 text-gray-600",
};

const DRAFT_KEY_PREFIX = "orkela_portal_draft_";

const PortalThread = ({ ticket, onBack, onSendComment, sending }) => {
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.comments?.length]);

  // Restaura el borrador de este ticket si había uno guardado — cubre el
  // caso de que el token haya expirado a medio escribir: PortalLayout
  // redirige (desmontando este componente) antes de que el envío pueda
  // completarse, así que el borrador debe sobrevivir en sessionStorage,
  // no solo en el estado local de React.
  useEffect(() => {
    if (!ticket) return;
    const saved = sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${ticket.id}`);
    setDraft(saved || "");
  }, [ticket?.id]);

  useEffect(() => {
    if (!ticket) return;
    if (draft) {
      sessionStorage.setItem(`${DRAFT_KEY_PREFIX}${ticket.id}`, draft);
    } else {
      sessionStorage.removeItem(`${DRAFT_KEY_PREFIX}${ticket.id}`);
    }
  }, [draft, ticket?.id]);

  if (!ticket) {
    return (
      <div className='hidden md:flex flex-1 items-center justify-center text-gray-400 text-sm'>
        Selecciona un ticket para ver la conversación
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
      <div className='p-4 border-b border-gray-200 flex items-center gap-3 shrink-0'>
        <button
          onClick={onBack}
          aria-label='Volver a mis tickets'
          className='md:hidden text-gray-500'
        >
          <ArrowLeft className='w-5 h-5' />
        </button>
        <div className='min-w-0 flex-1'>
          <p className='font-semibold text-gray-900 truncate'>{ticket.title}</p>
        </div>
        <motion.span
          key={ticket.status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: motionTokens.duration.fast }}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusBadgeColor[ticket.status]}`}
        >
          {statusLabels[ticket.status] || ticket.status}
        </motion.span>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-3'>
        <div className='max-w-[80%] bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-700'>
          {ticket.description}
        </div>
        {(ticket.comments || []).map((comment) => {
          const isClient = Boolean(comment.client_id);
          return (
            <div key={comment.id} className={`max-w-[80%] ${isClient ? "ml-auto" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  isClient
                    ? "bg-brand-600 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-700 rounded-tl-sm"
                }`}
              >
                {comment.content}
              </div>
              {!isClient && comment.user?.name && (
                <p className='text-xs text-gray-400 mt-1 px-1'>{comment.user.name}</p>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className='p-4 border-t border-gray-200 shrink-0'>
        {sendError && <p className='text-xs text-red-600 mb-2'>{sendError}</p>}
        <div className='flex items-center gap-2'>
          <input
            type='text'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='Escribe una respuesta...'
            disabled={sending}
            className='flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60'
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
    </div>
  );
};

export default PortalThread;

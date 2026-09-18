import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Link2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

export const INVITE_MAIL_FAILED_MESSAGE =
  "Invitación creada, pero no se pudo enviar el correo";

/**
 * Una fila con el enlace de invitación y el botón "Copiar enlace".
 * El feedback "Copiado" dura unos segundos; si el portapapeles no está
 * disponible (http sin permisos) el input queda seleccionado para copiarlo a mano.
 */
const CopyLinkRow = ({ email, link }) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.select();
    }
  };

  return (
    <div className='space-y-1.5'>
      {email && (
        <p className='text-xs font-medium text-gray-600 dark:text-night-300 truncate'>
          {email}
        </p>
      )}
      <div className='flex flex-col sm:flex-row gap-2'>
        <div className='flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-night-700 bg-gray-50 dark:bg-night-800'>
          <Link2 className='w-4 h-4 shrink-0 text-gray-400 dark:text-night-500' />
          <input
            ref={inputRef}
            type='text'
            readOnly
            value={link}
            aria-label={email ? `Enlace de invitación para ${email}` : "Enlace de invitación"}
            onFocus={(e) => e.target.select()}
            className='flex-1 min-w-0 bg-transparent text-sm text-gray-800 dark:text-night-100 outline-none truncate'
          />
        </div>
        <Button
          type='button'
          size='sm'
          variant={copied ? "secondary" : "primary"}
          onClick={handleCopy}
          className='shrink-0'
        >
          {copied ? (
            <>
              <Check className='w-4 h-4' />
              Copiado
            </>
          ) : (
            <>
              <Copy className='w-4 h-4' />
              Copiar enlace
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

/**
 * Aviso de "la invitación se creó pero el correo no salió", con el enlace de
 * aceptación para que quien invitó lo comparta a mano.
 *
 * @param {{ items: Array<{ email?: string, link: string }> }} props
 */
export const InvitationLinkNotice = ({ items }) => (
  <div
    role='alert'
    className='rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3'
  >
    <div className='flex items-start gap-3'>
      <div className='p-2 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0'>
        <AlertTriangle className='w-5 h-5 text-amber-600 dark:text-amber-400' />
      </div>
      <div className='min-w-0'>
        <p className='font-semibold text-sm text-amber-800 dark:text-amber-300'>
          {INVITE_MAIL_FAILED_MESSAGE}
        </p>
        <p className='text-sm text-amber-700/90 dark:text-amber-200/80 mt-0.5'>
          {items.length > 1
            ? "Comparte estos enlaces con las personas invitadas para que acepten la invitación."
            : "Comparte este enlace con la persona invitada para que acepte la invitación."}
        </p>
      </div>
    </div>
    <div className='space-y-3'>
      {items.map((item) => (
        <CopyLinkRow key={item.link} email={item.email} link={item.link} />
      ))}
    </div>
  </div>
);

/**
 * Modal que envuelve el aviso. Lo monta NotificationProvider para que siga
 * visible aunque el formulario que invitó se cierre.
 */
const InvitationLinkModal = ({ items, onClose }) => (
  <Modal
    isOpen={items.length > 0}
    onClose={onClose}
    title='Correo no enviado'
    size='sm'
  >
    <div className='space-y-4'>
      <InvitationLinkNotice items={items} />
      <div className='flex justify-end'>
        <Button type='button' variant='secondary' onClick={onClose}>
          Entendido
        </Button>
      </div>
    </div>
  </Modal>
);

export default InvitationLinkModal;

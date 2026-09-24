import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import Button from "../ui/Button";
import { statusHelp } from "./portalStatusHelp";

const PortalTicketStatusBar = ({ ticket, onConfirmResolution, onReopen }) => {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const help = statusHelp(ticket);

  if (!help) return null;

  const run = async (kind, action, failMessage) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch {
      setError(failMessage);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className='px-4 py-3 border-b border-gray-200 dark:border-night-700 bg-gray-50 dark:bg-night-900/60 shrink-0'>
      <p className='text-sm text-gray-600 dark:text-night-300'>{help}</p>
      {ticket.status === "resolved" && (
        <div className='mt-2 flex flex-wrap gap-2'>
          <Button
            type='button'
            size='sm'
            variant='primary'
            loading={busy === "confirm"}
            loadingText='Confirmando...'
            disabled={busy !== null}
            onClick={() => run("confirm", onConfirmResolution, "No pudimos confirmar la solución. Intenta de nuevo.")}
          >
            <CheckCircle2 className='w-4 h-4' aria-hidden='true' />
            Confirmar solución
          </Button>
          <Button
            type='button'
            size='sm'
            variant='secondary'
            loading={busy === "reopen"}
            loadingText='Reabriendo...'
            disabled={busy !== null}
            onClick={() => run("reopen", onReopen, "No pudimos reabrir el ticket. Intenta de nuevo.")}
          >
            <RotateCcw className='w-4 h-4' aria-hidden='true' />
            Sigue sin funcionar
          </Button>
        </div>
      )}
      {error && (
        <p role='alert' className='mt-2 text-sm text-red-600 dark:text-red-400'>
          {error}
        </p>
      )}
    </div>
  );
};

export default PortalTicketStatusBar;

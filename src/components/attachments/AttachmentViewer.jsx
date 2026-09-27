import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import ConfirmModal from "../ui/ConfirmModal";
import { useAttachmentBlob } from "./useAttachmentBlob";
import { attachmentsAPI } from "../../utils/attachmentsApi";

const iconButton =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-night-300 dark:hover:bg-night-800";

const AttachmentViewer = ({ scope, attachments, index, isOpen, onClose, onIndexChange, onDelete }) => {
  const current = attachments[index];
  const { url, status } = useAttachmentBlob(scope, current?.id, { enabled: isOpen && Boolean(current) });
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Id del adjunto cuya descarga falló: el aviso se apaga solo al cambiar de imagen.
  const [downloadFailedId, setDownloadFailedId] = useState(null);
  const count = attachments.length;

  const go = (step) => onIndexChange((index + step + count) % count);

  useEffect(() => {
    // Con la confirmación de borrado abierta, las flechas no cambian de imagen.
    if (!isOpen || count < 2 || confirming) return undefined;
    const handleKey = (event) => {
      if (event.key === "ArrowRight") onIndexChange((index + 1) % count);
      if (event.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, confirming, index, count, onIndexChange]);

  const download = async () => {
    setDownloadFailedId(null);
    try {
      const blob = await attachmentsAPI.getBlob(scope, current.id, { download: true });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = current.name;
      link.click();
      // Diferido: revocarla en el mismo instante puede cortar la descarga en algunos navegadores.
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch {
      setDownloadFailedId(current.id);
    }
  };

  const openConfirm = () => {
    setDeleteError("");
    setConfirming(true);
  };

  const closeConfirm = () => {
    setDeleteError("");
    setConfirming(false);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(current);
      setConfirming(false);
    } catch {
      // La confirmación sigue abierta para poder reintentar.
      setDeleteError("No se pudo eliminar la imagen. Reintenta.");
    } finally {
      setDeleting(false);
    }
  };

  if (!current) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size='xl' title={current.name}>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between gap-2'>
            <span className='text-sm text-gray-500 dark:text-night-400'>{count > 1 ? `${index + 1} de ${count}` : " "}</span>
            <div className='flex gap-1'>
              <button type='button' onClick={download} aria-label={`Descargar ${current.name}`} className={iconButton}>
                <Download className='h-5 w-5' aria-hidden='true' />
              </button>
              {onDelete && (
                <button type='button' onClick={openConfirm} aria-label={`Eliminar ${current.name}`} className={`${iconButton} text-red-600 dark:text-red-400`}>
                  <Trash2 className='h-5 w-5' aria-hidden='true' />
                </button>
              )}
            </div>
          </div>
          {downloadFailedId === current.id && (
            <p role='alert' className='text-sm font-medium text-red-600 dark:text-red-400'>
              No se pudo descargar la imagen.
            </p>
          )}
          <div className='relative flex min-h-64 items-center justify-center rounded-lg bg-gray-900/95'>
            {url ? (
              <img src={url} alt={current.name} className='max-h-[70vh] w-auto object-contain' />
            ) : (
              <p className='text-sm text-gray-300'>{status === "error" ? "No se pudo cargar la imagen." : "Cargando…"}</p>
            )}
            {count > 1 && (
              <>
                <button type='button' onClick={() => go(-1)} aria-label='Imagen anterior' className='absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'>
                  <ChevronLeft className='h-6 w-6' aria-hidden='true' />
                </button>
                <button type='button' onClick={() => go(1)} aria-label='Imagen siguiente' className='absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'>
                  <ChevronRight className='h-6 w-6' aria-hidden='true' />
                </button>
              </>
            )}
          </div>
        </div>
      </Modal>
      {onDelete && (
        <ConfirmModal
          isOpen={confirming}
          onClose={closeConfirm}
          onConfirm={confirmDelete}
          loading={deleting}
          title='Eliminar imagen'
          message={
            <>
              {`Se eliminará "${current.name}" para todos. No se puede deshacer.`}
              {deleteError && (
                <span role='alert' className='mt-2 block font-medium text-red-600 dark:text-red-400'>
                  {deleteError}
                </span>
              )}
            </>
          }
          confirmText='Eliminar'
        />
      )}
    </>
  );
};

export default AttachmentViewer;

import { useState } from "react";
import AttachmentThumb from "./AttachmentThumb";
import AttachmentViewer from "./AttachmentViewer";

const cellClass =
  "relative block overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-night-900";

/**
 * Imágenes ya enviadas en mosaico (propuesta C): 1 ancha, 2 lado a lado,
 * 3+ con la primera en grande y "+N" en la tercera. Toda celda abre el visor.
 * La lista la posee el padre: tras un borrado correcto la quita de `attachments`.
 */
const AttachmentGallery = ({ scope, attachments = [], onDelete, className = "" }) => {
  const [viewerIndex, setViewerIndex] = useState(null);
  const total = attachments.length;

  // Si se borró la última imagen, se cierra el visor (ajuste de estado durante el render).
  if (total === 0) {
    if (viewerIndex !== null) setViewerIndex(null);
    return null;
  }

  const visible = attachments.slice(0, 3);
  const hidden = total - visible.length;

  const layout =
    total === 1
      ? "grid-cols-1"
      : total === 2
        ? "grid-cols-2"
        : "grid-cols-[2fr_1fr] grid-rows-2";

  const cellShape = (index) => {
    if (total === 1) return "aspect-video max-h-72";
    if (total === 2) return "aspect-square";
    return index === 0 ? "row-span-2 h-full min-h-40" : "aspect-square";
  };

  return (
    <div className={`grid max-w-sm gap-1 ${layout} ${className}`}>
      {visible.map((attachment, index) => {
        const overflow = index === 2 && hidden > 0;
        const label = `Ver imagen ${index + 1} de ${total}: ${attachment.name}${overflow ? ` (y ${hidden} más)` : ""}`;
        return (
          <button key={attachment.id} type='button' onClick={() => setViewerIndex(index)} aria-label={label} className={`${cellClass} ${cellShape(index)}`}>
            <AttachmentThumb scope={scope} attachment={attachment} className='h-full w-full' />
            {overflow && (
              <span className='absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white' aria-hidden='true'>
                +{hidden}
              </span>
            )}
          </button>
        );
      })}
      <AttachmentViewer
        scope={scope}
        attachments={attachments}
        index={Math.min(viewerIndex ?? 0, total - 1)}
        isOpen={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
        onDelete={onDelete}
      />
    </div>
  );
};

export default AttachmentGallery;

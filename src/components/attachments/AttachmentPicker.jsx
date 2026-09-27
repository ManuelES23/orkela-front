import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ImagePlus, Loader2, Paperclip, RefreshCw, X } from "lucide-react";
import { ATTACHMENT_LIMITS } from "../../utils/attachmentsApi";

const formatSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const imagesOnly = (files) => Array.from(files ?? []).filter((file) => file.type?.startsWith("image/"));

// Los helpers viven junto al componente por contrato (los consumen Tasks 14-16); recargar el módulo entero en HMR es aceptable.
/**
 * Para el onPaste del textarea: solo intercepta si el portapapeles trae imágenes.
 * Con `{ disabled: true }` no hace nada (el consumidor no debería adjuntarlo si está deshabilitado).
 */
// eslint-disable-next-line react-refresh/only-export-components
export const pasteHandler = (uploads, { disabled = false } = {}) => (event) => {
  if (disabled) return;
  const files = imagesOnly(event.clipboardData?.files);
  if (files.length === 0) return;
  event.preventDefault();
  uploads.addFiles(files);
};

/** Convierte un contenedor en zona de soltar. Solo reacciona a arrastres de archivos. */
// eslint-disable-next-line react-refresh/only-export-components
export const dropHandlers = (uploads, setDragging) => ({
  onDragEnter: (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    setDragging(true);
  },
  onDragOver: (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
  },
  onDragLeave: (event) => {
    if (event.currentTarget?.contains?.(event.relatedTarget)) return;
    setDragging(false);
  },
  onDrop: (event) => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) uploads.addFiles(files);
  },
});

const HiddenInput = ({ inputRef, uploads, disabled }) => (
  <input
    ref={inputRef}
    type='file'
    accept={ATTACHMENT_LIMITS.accept}
    multiple
    disabled={disabled}
    aria-label='Adjuntar imágenes'
    aria-hidden='true'
    className='sr-only'
    tabIndex={-1}
    onChange={(event) => {
      uploads.addFiles(Array.from(event.target.files ?? []));
      event.target.value = "";
    }}
  />
);

export const AttachButton = ({ uploads, disabled = false, className = "" }) => {
  const inputRef = useRef(null);
  return (
    <>
      <HiddenInput inputRef={inputRef} uploads={uploads} disabled={disabled} />
      <button
        type='button'
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label='Adjuntar imágenes'
        title='Adjuntar imágenes (también puedes pegar o arrastrar)'
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-night-700 dark:text-night-400 dark:hover:bg-night-800 ${className}`}
      >
        <Paperclip className='h-5 w-5' aria-hidden='true' />
      </button>
    </>
  );
};

const RemoveButton = ({ item, uploads }) => (
  <button
    type='button'
    onClick={() => uploads.remove(item.key)}
    aria-label={`Quitar ${item.name}`}
    className='inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-night-600 dark:bg-night-900 dark:text-night-300'
  >
    <X className='h-3.5 w-3.5' aria-hidden='true' />
  </button>
);

const RetryButton = ({ item, uploads }) =>
  item.invalid ? null : (
    <button
      type='button'
      onClick={() => uploads.retry(item.key)}
      aria-label={`Reintentar ${item.name}`}
      className='inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-night-900/90 dark:text-red-400'
    >
      <RefreshCw className='h-3.5 w-3.5' aria-hidden='true' />
    </button>
  );

const Progress = ({ item, className = "" }) => (
  <div
    role='progressbar'
    aria-label={`Subiendo ${item.name}`}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={item.progress}
    className={`h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-night-700 ${className}`}
  >
    <div className='h-full bg-brand-600 transition-[width] duration-200' style={{ width: `${item.progress}%` }} />
  </div>
);

// Errores y avisos en una región viva: se anuncian sin mover el foco.
// El nodo aria-live es siempre el mismo (solo cambia su contenido) para que los anuncios funcionen.
const Messages = ({ uploads }) => {
  const errors = uploads.items.filter((item) => item.status === "error");
  const empty = !uploads.notice && errors.length === 0;
  return (
    <div aria-live='polite' className={empty ? "sr-only" : "mt-2 space-y-1 text-xs text-red-600 dark:text-red-400"}>
      {uploads.notice && <p className='text-amber-700 dark:text-amber-400'>{uploads.notice}</p>}
      {errors.map((item) => (
        <p key={item.key} className='flex items-center gap-1'>
          <AlertTriangle className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
          {`${item.name}: ${item.error}`}
        </p>
      ))}
    </div>
  );
};

const InlineStrip = ({ uploads }) => {
  const reduceMotion = useReducedMotion();
  // Misma estructura con o sin miniaturas: la región viva no se remonta y las salidas animan.
  return (
    <div>
      <ul className='flex flex-wrap gap-3 pb-1 empty:hidden' aria-label='Imágenes para enviar'>
        <AnimatePresence initial={false}>
          {uploads.items.map((item) => (
            <motion.li
              key={item.key}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className={`relative h-16 w-16 rounded-lg border ${item.status === "error" ? "border-red-300 dark:border-red-800" : "border-gray-200 dark:border-night-700"}`}
            >
              <img src={item.previewUrl} alt={item.name} className={`h-full w-full rounded-lg object-cover ${item.status === "error" ? "opacity-40" : ""}`} />
              {item.status === "uploading" && (
                <div className='absolute inset-x-1.5 bottom-1.5'>
                  <Progress item={item} />
                </div>
              )}
              {item.status === "error" && (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <RetryButton item={item} uploads={uploads} />
                </div>
              )}
              <div className='absolute -right-2 -top-2'>
                <RemoveButton item={item} uploads={uploads} />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <Messages uploads={uploads} />
    </div>
  );
};

const Dropzone = ({ uploads, disabled }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  return (
    <div>
      <div
        {...(disabled ? {} : dropHandlers(uploads, setDragging))}
        className={`rounded-lg border border-dashed px-4 py-3 text-center text-sm transition-colors ${dragging ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-gray-300 dark:border-night-600"}`}
      >
        <HiddenInput inputRef={inputRef} uploads={uploads} disabled={disabled} />
        <ImagePlus className='mx-auto mb-1 h-5 w-5 text-gray-400 dark:text-night-500' aria-hidden='true' />
        <span className='text-gray-600 dark:text-night-300'>
          Arrastra, pega o{" "}
          <button type='button' disabled={disabled} onClick={() => inputRef.current?.click()} className='font-semibold text-brand-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-400'>
            elige imágenes
          </button>
        </span>
        <span className='block text-xs text-gray-400 dark:text-night-500'>Hasta {ATTACHMENT_LIMITS.maxFiles} · JPG, PNG, WebP o GIF · {ATTACHMENT_LIMITS.maxBytes / (1024 * 1024)} MB cada una</span>
      </div>
      {uploads.items.length > 0 && (
        <ul className='mt-2 space-y-2' aria-label='Imágenes para enviar'>
          {uploads.items.map((item) => (
            <li key={item.key} className='flex items-center gap-3 text-sm'>
              <img src={item.previewUrl} alt='' className='h-10 w-10 shrink-0 rounded-md object-cover' />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-gray-800 dark:text-night-100' title={item.name}>
                  {item.name}
                </p>
                <p className='text-xs text-gray-500 dark:text-night-400'>
                  <span>{formatSize(item.size)}</span>
                  {item.status === "uploading" && <span> · {item.progress}%</span>}
                </p>
                {item.status === "uploading" && <Progress item={item} className='mt-1' />}
              </div>
              {item.status === "uploading" && <Loader2 className='h-4 w-4 animate-spin text-gray-400' aria-hidden='true' />}
              {item.status === "error" && <RetryButton item={item} uploads={uploads} />}
              <RemoveButton item={item} uploads={uploads} />
            </li>
          ))}
        </ul>
      )}
      <Messages uploads={uploads} />
    </div>
  );
};

/**
 * Imágenes pendientes antes de enviar. `inline` (propuesta A) va dentro de un
 * compositor de conversación; `dropzone` (propuesta B) en formularios.
 */
const AttachmentPicker = ({ uploads, variant = "inline", disabled = false }) =>
  variant === "dropzone" ? <Dropzone uploads={uploads} disabled={disabled} /> : <InlineStrip uploads={uploads} />;

export default AttachmentPicker;

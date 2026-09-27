import { useEffect, useRef, useState } from "react";
import { ImageOff, RefreshCw } from "lucide-react";
import { useAttachmentBlob } from "./useAttachmentBlob";

// Carga diferida: descarga la imagen solo cuando entra en pantalla.
const useInView = (ref) => {
  const [inView, setInView] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (inView || !ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { rootMargin: "200px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [inView, ref]);
  return inView;
};

const AttachmentThumb = ({ scope, attachment, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref);
  const { url, status, retry } = useAttachmentBlob(scope, attachment.id, { enabled: inView });

  return (
    <div ref={ref} className={`relative overflow-hidden bg-gray-100 dark:bg-night-800 ${className}`}>
      {url && <img src={url} alt={attachment.name} className='h-full w-full object-cover' draggable={false} />}
      {status === "error" && (
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 dark:text-night-400'>
          <ImageOff className='h-5 w-5' aria-hidden='true' />
          <span
            role='button'
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              retry();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                retry();
              }
            }}
            className='inline-flex items-center gap-1 underline'
          >
            <RefreshCw className='h-3 w-3' aria-hidden='true' />
            Reintentar
          </span>
        </div>
      )}
      {status !== "ready" && status !== "error" && <div className='absolute inset-0 bg-gray-200 dark:bg-night-700 motion-safe:animate-pulse' aria-hidden='true' />}
    </div>
  );
};

export default AttachmentThumb;

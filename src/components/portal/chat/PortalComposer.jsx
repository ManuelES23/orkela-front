import { useId, useLayoutEffect } from "react";
import { Send } from "lucide-react";

export const MESSAGE_MAX = 5000;
const COUNTER_FROM = 4500;
const MAX_HEIGHT_PX = 160;

// El textarea nunca se deshabilita mientras se envía: deshabilitarlo le
// quitaba el foco y obligaba a volver a hacer clic para seguir escribiendo.
const PortalComposer = ({ value, onChange, onSubmit, inputRef, hint = null }) => {
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const trimmed = value.trim();

  // Autoajuste: crece con el contenido hasta MAX_HEIGHT_PX y luego hace scroll.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [value, inputRef]);

  const submit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className='p-3 sm:p-4 border-t border-gray-200 dark:border-night-700 bg-white dark:bg-night-950 shrink-0'
    >
      {hint && (
        <p id={hintId} className='text-xs text-amber-700 dark:text-amber-400 mb-2'>
          {hint}
        </p>
      )}
      <label htmlFor={inputId} className='sr-only'>
        Tu respuesta
      </label>
      <div className='flex items-end gap-2'>
        <textarea
          id={inputId}
          ref={inputRef}
          rows={1}
          value={value}
          maxLength={MESSAGE_MAX}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-describedby={hint ? hintId : undefined}
          placeholder='Escribe una respuesta… (Shift+Enter para un salto de línea)'
          className='flex-1 resize-none px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-night-700 dark:bg-night-900 dark:text-night-50 dark:placeholder:text-night-500'
        />
        <button
          type='submit'
          disabled={!trimmed}
          aria-label='Enviar'
          className='w-10 h-10 shrink-0 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 transition-colors'
        >
          <Send className='w-4.5 h-4.5' aria-hidden='true' />
        </button>
      </div>
      {value.length >= COUNTER_FROM && (
        <p className='text-xs text-right mt-1 text-gray-400 dark:text-night-500' aria-live='polite'>
          {value.length}/{MESSAGE_MAX}
        </p>
      )}
    </form>
  );
};

export default PortalComposer;

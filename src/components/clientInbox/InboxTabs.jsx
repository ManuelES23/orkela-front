import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { INBOX_TABS } from "../../hooks/useClientInbox";
import { INBOX_TAB_LABELS } from "./inboxVocabulary";

// Propuesta A: pestañas de estado en vertical dentro del carril izquierdo
// (lg+), con barra de acento a la izquierda de la activa. Por debajo de lg el
// carril se pliega y las pestañas pasan a carrusel horizontal (móvil), con las
// mismas flechas ←/→ del teclado.
const InboxTabs = ({ value, counts, onChange }) => {
  const tabRefs = useRef({});
  const reduceMotion = useReducedMotion();

  const handleKeyDown = (event) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const index = INBOX_TABS.indexOf(value);
    const next = INBOX_TABS[(index + delta + INBOX_TABS.length) % INBOX_TABS.length];
    onChange(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      role='tablist'
      aria-label='Estado de los tickets'
      onKeyDown={handleKeyDown}
      className='flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0'
    >
      {INBOX_TABS.map((tab) => {
        const selected = tab === value;
        return (
          <button
            key={tab}
            ref={(element) => {
              tabRefs.current[tab] = element;
            }}
            type='button'
            role='tab'
            id={`inbox-tab-${tab}`}
            aria-selected={selected}
            aria-controls='inbox-panel'
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            className={`relative inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-[13px] font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:w-full lg:justify-between ${
              selected
                ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/25 dark:text-brand-200"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-night-700 dark:bg-night-900 dark:text-night-300 dark:hover:bg-night-800"
            }`}
          >
            <span className='truncate'>{INBOX_TAB_LABELS[tab]}</span>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums ${
                selected
                  ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white"
                  : "border border-gray-200 bg-gray-100 text-gray-500 dark:border-night-700 dark:bg-night-800 dark:text-night-300"
              }`}
            >
              {counts?.[tab] ?? 0}
            </span>
            {selected && (
              <motion.span
                layoutId='inbox-tab-indicator'
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35 }}
                className='absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gradient-to-r from-brand-600 to-accent-600 lg:inset-x-auto lg:top-2 lg:bottom-2 lg:left-0 lg:h-auto lg:w-[3px] lg:bg-gradient-to-b'
                aria-hidden='true'
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default InboxTabs;

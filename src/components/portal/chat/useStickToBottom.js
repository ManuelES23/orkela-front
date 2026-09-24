import { useCallback, useLayoutEffect, useRef, useState } from "react";

const BOTTOM_THRESHOLD_PX = 48;

/**
 * Auto-scroll "pegajoso": si el usuario está al final del hilo, cada mensaje
 * nuevo lo lleva al final; si subió a leer, no se le mueve y se avisa con
 * `hasNewBelow`. Salto instantáneo (sin scroll suave): con animación, los
 * eventos de scroll intermedios marcarían "no está al final" por error.
 */
export const useStickToBottom = (itemCount) => {
  const containerRef = useRef(null);
  const atBottomRef = useRef(true);
  const prevCountRef = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [seenCount, setSeenCount] = useState(0);

  const jumpToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX;
    // Mientras está al final, o justo al dejarlo, ya vio todo lo que había.
    if (atBottom || atBottomRef.current) setSeenCount(itemCount);
    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, [itemCount]);

  const scrollToBottom = useCallback(() => {
    atBottomRef.current = true;
    setIsAtBottom(true);
    setSeenCount(itemCount);
    jumpToBottom();
  }, [itemCount, jumpToBottom]);

  useLayoutEffect(() => {
    const grew = itemCount > prevCountRef.current;
    prevCountRef.current = itemCount;
    if (grew && atBottomRef.current) jumpToBottom();
  }, [itemCount, jumpToBottom]);

  return {
    containerRef,
    handleScroll,
    hasNewBelow: !isAtBottom && itemCount > seenCount,
    scrollToBottom,
  };
};

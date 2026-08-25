import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Número que, cuando cambia mientras el componente ya está montado, cuenta
 * suavemente hacia el nuevo valor en vez de saltar de golpe. En el montaje
 * (o si el componente se remonta) muestra el valor correcto de inmediato,
 * sin animar desde cero — así nunca se queda "pegado" en 0 si el padre se
 * remonta antes de que una animación termine. Respeta prefers-reduced-motion
 * mostrando el valor final directo, sin pasar por el estado animado.
 *
 * Nota: implementado con un bucle requestAnimationFrame propio en vez de
 * framer-motion's useSpring — en esta combinación de React 19 (StrictMode)
 * + framer-motion 12 el spring nunca llegaba a reflejar el valor final.
 */
const AnimatedNumber = ({ value = 0, suffix = "", className = "" }) => {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prevValueRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      prevValueRef.current = value;
      return undefined;
    }
    if (prevValueRef.current === value) {
      return undefined;
    }

    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    const duration = 600;
    const start = performance.now();
    const easeOutQuad = (t) => t * (2 - t);

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      setDisplay(Math.round(from + (to - from) * easeOutQuad(t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, prefersReducedMotion]);

  const shown = prefersReducedMotion ? value : display;

  return (
    <span className={className}>
      {shown}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;

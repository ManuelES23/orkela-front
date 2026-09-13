import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "../animations/variants";

// No mostrar el esqueleto si la respuesta llega antes de este tiempo: la
// mayoría de estos fetches son chicos y responden en menos de esto, así que
// mostrarlo siempre solo generaría un parpadeo.
const SHOW_SKELETON_DELAY_MS = 140;
// Si el esqueleto llegó a aparecer, no sacarlo antes de este tiempo para que
// tampoco parpadee al desaparecer.
const MIN_SKELETON_VISIBLE_MS = 400;

/**
 * Decide una sola vez cuándo mostrar un esqueleto de carga, en vez de que
 * cada pantalla lo resuelva por su cuenta. Mientras `loading` está prendido
 * pero no pasó SHOW_SKELETON_DELAY_MS, sigue mostrando `children` (el
 * contenido anterior, o nada si es la primera carga) — recién ahí cambia al
 * esqueleto, con un cross-fade entre uno y otro.
 */
const LoadingSwap = ({ loading, skeleton, children, className = "" }) => {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const shownAtRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!loading) {
      // El esqueleto nunca llegó a mostrarse (respuesta rápida): no hay
      // nada que revertir, `showSkeleton` ya vale `false`.
      if (!shownAtRef.current) {
        return undefined;
      }

      const remaining = Math.max(MIN_SKELETON_VISIBLE_MS - (Date.now() - shownAtRef.current), 0);
      const timeoutId = setTimeout(() => {
        setShowSkeleton(false);
        shownAtRef.current = null;
      }, remaining);
      return () => clearTimeout(timeoutId);
    }

    const timeoutId = setTimeout(() => {
      shownAtRef.current = Date.now();
      setShowSkeleton(true);
    }, SHOW_SKELETON_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [loading]);

  if (prefersReducedMotion) {
    return <div className={className}>{showSkeleton ? skeleton : children}</div>;
  }

  // Grid con ambos hijos en la misma celda (col/row-start-1): el que entra
  // y el que sale quedan superpuestos mientras cruzan, y el contenedor
  // toma la altura del más alto de los dos en vez de sumarlas — sin eso,
  // dos bloques normales apilados provocarían un salto de layout durante
  // la transición.
  return (
    <div className={`grid ${className}`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={showSkeleton ? "skeleton" : "content"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.duration.base }}
          className='col-start-1 row-start-1'
        >
          {showSkeleton ? skeleton : children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LoadingSwap;

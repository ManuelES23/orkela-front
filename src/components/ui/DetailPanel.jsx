import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "../animations/variants";

/**
 * Entrada consistente para "el detalle de algo que acaba de aparecer":
 * panel de cliente seleccionado, contenido de un modal de ticket, panel del
 * portal. Antes cada uno tenía su propia animación (o ninguna); esto les da
 * la misma: 18px + fade, 0.3s. `panelKey` debe cambiar cuando cambia QUÉ se
 * muestra (el id del registro) para que la entrada se repita en vez de
 * quedarse quieta al pasar de un registro a otro.
 */
const DetailPanel = ({ panelKey, className = "", children }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key={panelKey}
      initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default DetailPanel;

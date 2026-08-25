import { useEffect } from "react";
import { motion, useSpring, useTransform, useReducedMotion } from "framer-motion";

/**
 * Número que cuenta hacia su valor final con un spring en vez de aparecer
 * de golpe. Respeta prefers-reduced-motion mostrando el valor final directo.
 */
const AnimatedNumber = ({ value = 0, suffix = "", className = "" }) => {
  const prefersReducedMotion = useReducedMotion();
  const spring = useSpring(prefersReducedMotion ? value : 0, {
    stiffness: 90,
    damping: 20,
  });
  const display = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  if (prefersReducedMotion) {
    return (
      <span className={className}>
        {value}
        {suffix}
      </span>
    );
  }

  return <motion.span className={className}>{display}</motion.span>;
};

export default AnimatedNumber;

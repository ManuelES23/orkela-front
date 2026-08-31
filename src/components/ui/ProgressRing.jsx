import { motion, useReducedMotion } from "framer-motion";
import { motionTokens } from "../animations/variants";

/**
 * Anillo de progreso circular animado (SVG). El trazo se anima con
 * framer-motion vía strokeDashoffset; respeta prefers-reduced-motion
 * saltando directo al valor final.
 */
const ProgressRing = ({
  percentage = 0,
  size = 44,
  strokeWidth = 4,
  color = "var(--color-brand-600)",
  // Traslúcido en vez de un hex plano: se lee bien tanto sobre tarjetas
  // blancas (claro) como sobre tarjetas night-900 (oscuro) sin necesitar
  // dos valores distintos.
  trackColor = "color-mix(in srgb, var(--color-brand-500) 15%, transparent)",
  className = "",
}) => {
  const prefersReducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 -rotate-90 ${className}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill='none'
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: prefersReducedMotion ? offset : circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={motionTokens.springSoft}
      />
    </svg>
  );
};

export default ProgressRing;

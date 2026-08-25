// Tokens de motion compartidos: una sola fuente de verdad para duraciones/easing
// en vez de repetir "type: spring, stiffness: 300..." en cada archivo.
export const motionTokens = {
  ease: [0.16, 1, 0.3, 1], // --ease-brand
  duration: { fast: 0.15, base: 0.3, slow: 0.5 },
  springSoft: { type: "spring", stiffness: 260, damping: 22 },
  springSnappy: { type: "spring", stiffness: 400, damping: 20 },
};

// Variantes de página para transiciones
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
    },
  },
};

// Variantes de contenedor con stagger
export const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Variantes de items
export const itemVariants = {
  hidden: {
    y: 20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

// Variantes de card
export const cardVariants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  hover: {
    y: -8,
    boxShadow:
      "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

// Variantes de botón
export const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.95,
  },
};

// Variantes de modal
export const modalBackdropVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
};

export const modalContentVariants = {
  hidden: {
    scale: 0.9,
    opacity: 0,
    y: 20,
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    y: 20,
    transition: {
      duration: 0.2,
    },
  },
};

// Variantes de slide lateral
export const slideVariants = {
  left: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
  },
  right: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
  },
  up: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 },
  },
  down: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -100, opacity: 0 },
  },
};

// Animación de progreso
export const progressVariants = {
  initial: {
    width: 0,
  },
  animate: (progress) => ({
    width: `${progress}%`,
    transition: {
      duration: 1,
      ease: "easeOut",
    },
  }),
};

// "Shake" horizontal para feedback de error de validación (ej. formularios de auth)
export const shakeVariants = {
  initial: { x: 0 },
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.45, ease: motionTokens.ease },
  },
};

// Badge/ícono circular de estado (loading, éxito, error) para pantallas tipo AuthStatusScreen
export const statusIconVariants = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: motionTokens.springSoft,
  },
};

import { motion } from "framer-motion";

// Contenedor para animar listas de elementos con stagger
export const StaggerContainer = ({ children, className = "", delay = 0 }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Item individual con animación
export const StaggerItem = ({ children, className = "" }) => {
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
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

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
};

// Animación de fade in
export const FadeIn = ({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration, type: "spring" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animación de escala
export const ScaleIn = ({ children, delay = 0, className = "" }) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        delay,
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animación de slide desde la izquierda
export const SlideInLeft = ({ children, delay = 0, className = "" }) => {
  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        delay,
        type: "spring",
        stiffness: 300,
        damping: 24,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animación de slide desde la derecha
export const SlideInRight = ({ children, delay = 0, className = "" }) => {
  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        delay,
        type: "spring",
        stiffness: 300,
        damping: 24,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Hover con elevación
export const HoverLift = ({ children, className = "" }) => {
  return (
    <motion.div
      whileHover={{
        y: -8,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animación de pulso
export const Pulse = ({ children, className = "" }) => {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animación de rotación en hover
export const RotateOnHover = ({ children, className = "" }) => {
  return (
    <motion.div
      whileHover={{ rotate: 360 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

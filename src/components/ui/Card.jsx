import { motion } from "framer-motion";

const Card = ({ children, className = "", hover = false }) => {
  return (
    <motion.div
      whileHover={
        hover
          ? {
              y: -8,
              boxShadow:
                "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
            }
          : {}
      }
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}
    >
      {children}
    </motion.div>
  );
};

const CardHeader = ({ children, className = "" }) => {
  return (
    <div className={`p-6 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
};

const CardBody = ({ children, className = "" }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

const CardFooter = ({ children, className = "" }) => {
  return (
    <div
      className={`px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl ${className}`}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;

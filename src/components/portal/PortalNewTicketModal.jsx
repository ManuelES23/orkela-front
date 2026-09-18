import { useId, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Ticket,
  Type as TypeIcon,
  FileText,
  Flag,
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import Button from "../ui/Button";
import { motionTokens } from "../animations/variants";

// Mismo vocabulario de tipo que src/pages/Tickets.jsx (typeConfig), para que
// el ticket se vea igual una vez que aterriza en la bandeja interna.
const typeOptions = [
  { value: "bug", label: "Reportar un problema", icon: Bug, color: "text-red-500" },
  { value: "feature", label: "Pedir una función nueva", icon: Lightbulb, color: "text-yellow-500" },
  { value: "question", label: "Pregunta", icon: HelpCircle, color: "text-accent-500" },
  { value: "support", label: "Soporte", icon: Headphones, color: "text-green-500" },
  { value: "other", label: "Otro", icon: MoreHorizontal, color: "text-gray-500 dark:text-night-400" },
];

// Mismo vocabulario de prioridad que src/pages/Tickets.jsx (priorityFlagColor)
const priorityOptions = [
  { value: "low", label: "Baja", color: "text-gray-400 dark:text-night-500" },
  { value: "medium", label: "Media", color: "text-yellow-500" },
  { value: "high", label: "Alta", color: "text-orange-500" },
  { value: "urgent", label: "Urgente", color: "text-red-500" },
];

const DESCRIPTION_MAX = 2000;

const fieldsContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

const fieldItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: motionTokens.springSoft },
};

// Select con ícono dinámico (refleja la opción elegida) en vez de un <select>
// nativo pelón — mismo lenguaje visual que Field en ClientModal.jsx.
const IconSelect = ({ icon: Icon, iconClassName, label, id, options, value, onChange }) => (
  <motion.div variants={fieldItem}>
    <label htmlFor={id} className='block text-sm font-semibold text-gray-700 dark:text-night-300 mb-1.5'>
      {label}
    </label>
    <div className='relative'>
      <Icon
        aria-hidden='true'
        className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${iconClassName || "text-gray-400 dark:text-night-500"}`}
      />
      <select
        id={id}
        value={value}
        onChange={onChange}
        className='w-full pl-10 pr-9 py-2.5 border border-gray-200 dark:border-night-700 rounded-lg outline-none appearance-none transition-all duration-150 hover:border-gray-300 dark:hover:border-night-600 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/30 dark:text-night-50'
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-night-500' />
    </div>
  </motion.div>
);

const PortalNewTicketModal = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const formId = useId();

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setType("bug");
      setPriority("medium");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim() || !description.trim()) {
      setError("Completa el título y la descripción.");
      return;
    }

    setLoading(true);
    try {
      await onCreate({ title, description, type, priority });
      setTitle("");
      setDescription("");
      setType("bug");
      setPriority("medium");
    } catch {
      setError("No se pudo crear el ticket. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const selectedType = typeOptions.find((opt) => opt.value === type) || typeOptions[0];
  const selectedPriority = priorityOptions.find((opt) => opt.value === priority) || priorityOptions[1];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
          className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50'
          onClick={loading ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={motionTokens.springSoft}
            onClick={(e) => e.stopPropagation()}
            className='bg-white dark:bg-night-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto'
          >
            <div className='flex items-center gap-3 mb-5'>
              <span className='shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-brand-50 to-accent-50 dark:from-brand-900/30 dark:to-accent-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center'>
                <Ticket className='w-5 h-5' />
              </span>
              <div className='flex-1 min-w-0'>
                <h2 className='text-xl font-bold text-gray-900 dark:text-night-50 truncate'>Nuevo ticket</h2>
                <p className='text-sm text-gray-400 dark:text-night-500'>Cuéntanos qué necesitas y te contactaremos</p>
              </div>
              <motion.button
                type='button'
                onClick={onClose}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label='Cerrar'
                className='shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:text-night-500 dark:hover:text-night-300 dark:hover:bg-night-800 rounded-lg p-1.5'
              >
                <X className='w-5 h-5' />
              </motion.button>
            </div>

            <AnimatePresence initial={false}>
              {error && (
                <motion.p
                  role='alert'
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
                  className='overflow-hidden text-sm text-red-700 bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded-lg px-3.5 py-2.5'
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.form
              variants={fieldsContainer}
              initial='hidden'
              animate='visible'
              onSubmit={handleSubmit}
              className='space-y-4'
              noValidate
            >
              <motion.div variants={fieldItem}>
                <label htmlFor={`${formId}-title`} className='block text-sm font-semibold text-gray-700 dark:text-night-300 mb-1.5'>
                  Título
                </label>
                <div className='relative'>
                  <TypeIcon aria-hidden='true' className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 dark:text-night-500' />
                  <input
                    id={`${formId}-title`}
                    type='text'
                    required
                    maxLength={255}
                    placeholder='Ej. No puedo acceder a mi cuenta'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className='w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-lg outline-none transition-all duration-150 hover:border-gray-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-night-700 dark:hover:border-night-600 dark:focus:ring-brand-900/30 dark:bg-night-900 dark:text-night-50 dark:placeholder:text-night-500'
                  />
                </div>
              </motion.div>

              <motion.div variants={fieldItem}>
                <div className='flex items-center justify-between mb-1.5'>
                  <label htmlFor={`${formId}-description`} className='block text-sm font-semibold text-gray-700 dark:text-night-300'>
                    Descripción
                  </label>
                  <span className='text-xs text-gray-400 dark:text-night-500'>
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>
                <div className='relative'>
                  <FileText aria-hidden='true' className='absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400 dark:text-night-500' />
                  <textarea
                    id={`${formId}-description`}
                    required
                    rows={4}
                    maxLength={DESCRIPTION_MAX}
                    placeholder='Describe el problema o la solicitud con el mayor detalle posible...'
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className='w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-lg outline-none transition-all duration-150 hover:border-gray-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-night-700 dark:hover:border-night-600 dark:focus:ring-brand-900/30 dark:bg-night-900 dark:text-night-50 dark:placeholder:text-night-500'
                  />
                </div>
              </motion.div>

              <div className='grid grid-cols-2 gap-3'>
                <IconSelect
                  icon={selectedType.icon}
                  iconClassName={selectedType.color}
                  label='Tipo'
                  id={`${formId}-type`}
                  options={typeOptions}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />
                <IconSelect
                  icon={Flag}
                  iconClassName={selectedPriority.color}
                  label='Prioridad'
                  id={`${formId}-priority`}
                  options={priorityOptions}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>

              <motion.div variants={fieldItem}>
                <Button
                  type='submit'
                  variant='brand'
                  size='lg'
                  loading={loading}
                  loadingText='Creando...'
                  className='w-full'
                >
                  Crear ticket
                </Button>
              </motion.div>
            </motion.form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PortalNewTicketModal;

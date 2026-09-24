import { useId, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type as TypeIcon,
  FileText,
  Flag,
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MoreHorizontal,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { motionTokens } from "../animations/variants";

// Mismo vocabulario de tipo que ticketVocabulary.js (TYPE_LABELS), para que
// el ticket se lea igual al crearlo y una vez creado.
const typeOptions = [
  { value: "request", label: "Solicitud", icon: MessageSquare, color: "text-brand-500" },
  { value: "bug", label: "Reportar un problema", icon: Bug, color: "text-red-500" },
  { value: "feature", label: "Pedir una función nueva", icon: Lightbulb, color: "text-yellow-500" },
  { value: "question", label: "Pregunta", icon: HelpCircle, color: "text-accent-500" },
  { value: "support", label: "Soporte", icon: Headphones, color: "text-green-500" },
  { value: "other", label: "Otro", icon: MoreHorizontal, color: "text-gray-500 dark:text-night-400" },
];

const priorityOptions = [
  { value: "low", label: "Baja", color: "text-gray-400 dark:text-night-500" },
  { value: "medium", label: "Media", color: "text-yellow-500" },
  { value: "high", label: "Alta", color: "text-orange-500" },
  { value: "urgent", label: "Urgente", color: "text-red-500" },
];

// Igual que el límite del backend (`description` max:5000).
export const DESCRIPTION_MAX = 5000;

const fieldsContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

const fieldItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: motionTokens.springSoft },
};

const inputClass =
  "w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-lg outline-none transition-all duration-150 hover:border-gray-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-night-700 dark:hover:border-night-600 dark:focus:ring-brand-900/30 dark:bg-night-900 dark:text-night-50 dark:placeholder:text-night-500";

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
        className='w-full pl-10 pr-9 py-2.5 border border-gray-200 dark:border-night-700 rounded-lg outline-none appearance-none transition-all duration-150 hover:border-gray-300 dark:hover:border-night-600 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/30 dark:bg-night-900 dark:text-night-50'
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden='true'
        className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-night-500'
      />
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

  // Mientras se crea no se puede cerrar (ni con Escape ni con el fondo).
  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Completa el título y la descripción.");
      return;
    }

    setLoading(true);
    try {
      await onCreate({ title, description, type, priority });
    } catch {
      setError("No se pudo crear el ticket. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const selectedType = typeOptions.find((opt) => opt.value === type) || typeOptions[0];
  const selectedPriority = priorityOptions.find((opt) => opt.value === priority) || priorityOptions[1];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Nuevo ticket' size='sm'>
      <p className='text-sm text-gray-500 dark:text-night-400 mb-4'>
        Cuéntanos qué necesitas y te contactaremos.
      </p>

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
              className={inputClass}
            />
          </div>
        </motion.div>

        <motion.div variants={fieldItem}>
          <div className='flex items-center justify-between mb-1.5'>
            <label htmlFor={`${formId}-description`} className='block text-sm font-semibold text-gray-700 dark:text-night-300'>
              Descripción
            </label>
            <span className='text-xs text-gray-400 dark:text-night-500' aria-hidden='true'>
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
              className={inputClass}
            />
          </div>
        </motion.div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
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
          <Button type='submit' variant='brand' size='lg' loading={loading} loadingText='Creando...' className='w-full'>
            Crear ticket
          </Button>
        </motion.div>
      </motion.form>
    </Modal>
  );
};

export default PortalNewTicketModal;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { motionTokens } from "../animations/variants";

const typeOptions = [
  { value: "bug", label: "Reportar un problema" },
  { value: "feature", label: "Pedir una función nueva" },
  { value: "question", label: "Pregunta" },
  { value: "support", label: "Soporte" },
  { value: "other", label: "Otro" },
];

const priorityOptions = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const PortalNewTicketModal = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
            onClick={(e) => e.stopPropagation()}
            className='bg-white rounded-2xl w-full max-w-lg p-6'
          >
            <div className='flex items-center justify-between mb-5'>
              <h2 className='text-xl font-bold text-gray-900'>Nuevo ticket</h2>
              <button onClick={onClose} aria-label='Cerrar' className='text-gray-400 hover:text-gray-600'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4' noValidate>
              {error && <p className='text-sm text-red-600'>{error}</p>}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Título</label>
                <input
                  type='text'
                  required
                  maxLength={255}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Descripción</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PortalNewTicketModal;

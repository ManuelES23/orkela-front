import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { motionTokens } from "../animations/variants";
import { clientsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";

const emptyForm = { name: "", company_name: "", email: "", phone: "", notes: "" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ClientModal = ({ isOpen, client, onClose, onSaved }) => {
  const { success, error: showError } = useNotification();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  // Se resetea cada vez que el modal se abre (no solo cuando cambia `client`),
  // así editar el cliente A, cerrar y luego editar el cliente B no arrastra
  // datos del formulario anterior.
  useEffect(() => {
    if (isOpen) {
      setForm(
        client
          ? {
              name: client.name || "",
              company_name: client.company_name || "",
              email: client.email || "",
              phone: client.phone || "",
              notes: client.notes || "",
            }
          : emptyForm
      );
      setFieldError(null);
    }
  }, [isOpen, client]);

  const validate = () => {
    if (!form.name.trim()) {
      return "El nombre del contacto es obligatorio.";
    }
    if (!form.email.trim()) {
      return "El correo es obligatorio.";
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      return "Ingresa un correo válido.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setFieldError(null);
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        company_name: form.company_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
      };
      const saved = client
        ? await clientsAPI.update(client.id, payload)
        : await clientsAPI.create(payload);
      success(client ? "Cliente actualizado" : "Cliente creado");
      onSaved(saved);
    } catch (err) {
      if (err.status === 422) {
        setFieldError(err.data?.message || "Ya existe un cliente con este correo");
      } else {
        showError("No se pudo guardar el cliente");
      }
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
              <h2 className='text-xl font-bold text-gray-900'>
                {client ? "Editar cliente" : "Nuevo cliente"}
              </h2>
              <button onClick={onClose} aria-label='Cerrar' className='text-gray-400 hover:text-gray-600'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4' noValidate>
              {fieldError && <p className='text-sm text-red-600'>{fieldError}</p>}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Nombre del contacto</label>
                <input
                  type='text'
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Empresa</label>
                <input
                  type='text'
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Correo</label>
                <input
                  type='email'
                  required
                  disabled={Boolean(client)}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400'
                />
                {client && (
                  <p className='mt-1 text-xs text-gray-400'>El correo no se puede modificar.</p>
                )}
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Teléfono</label>
                <input
                  type='tel'
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Notas</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <Button
                type='submit'
                variant='primary'
                size='lg'
                loading={loading}
                loadingText='Guardando...'
                className='w-full'
              >
                {client ? "Guardar cambios" : "Crear cliente"}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClientModal;

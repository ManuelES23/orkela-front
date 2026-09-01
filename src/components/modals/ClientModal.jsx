import { useId, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Contact, User, Building2, Mail, Phone, FileText } from "lucide-react";
import Button from "../ui/Button";
import { motionTokens } from "../animations/variants";
import { clientsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";

const emptyForm = { name: "", company_name: "", email: "", phone: "", notes: "" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Stagger de los campos al abrir el modal: mismo lenguaje que containerVariants/
// itemVariants (src/components/animations/variants.js) pero con timings propios
// para que el fade+desplazamiento sea sutil dentro de un panel pequeño.
const fieldsContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

const fieldItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: motionTokens.springSoft },
};

// Input reutilizable dentro del modal: ícono a la izquierda, label enlazado
// por id, placeholder y error inline animado (mismo patrón que AuthInput.jsx).
const Field = ({ icon: Icon, label, id, error, helper, textarea, ...props }) => {
  const Tag = textarea ? "textarea" : "input";
  return (
    <motion.div variants={fieldItem}>
      <label htmlFor={id} className='block text-sm font-semibold text-gray-700 mb-1.5'>
        {label}
      </label>
      <div className='relative'>
        {Icon && (
          <Icon
            aria-hidden='true'
            className={`absolute left-3.5 ${textarea ? "top-3" : "top-1/2 -translate-y-1/2"} w-4.5 h-4.5 text-gray-400`}
          />
        )}
        <Tag
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
          className={`w-full py-2.5 pr-3.5 border rounded-lg outline-none transition-all duration-150 ${
            Icon ? "pl-10" : "pl-3.5"
          } ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
              : "border-gray-200 hover:border-gray-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          } disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:border-gray-200`}
          {...props}
        />
      </div>
      {helper && !error && (
        <p id={`${id}-helper`} className='mt-1 text-xs text-gray-400'>
          {helper}
        </p>
      )}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${id}-error`}
            role='alert'
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
            className='text-xs text-red-600 overflow-hidden'
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ClientModal = ({ isOpen, client, onClose, onSaved }) => {
  const { success, error: showError } = useNotification();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const formId = useId();

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
            className='bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto'
          >
            <div className='flex items-center gap-3 mb-5'>
              <span className='shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-brand-50 to-accent-50 text-brand-600 flex items-center justify-center'>
                <Contact className='w-5 h-5' />
              </span>
              <div className='flex-1 min-w-0'>
                <h2 className='text-xl font-bold text-gray-900 truncate'>
                  {client ? "Editar cliente" : "Nuevo cliente"}
                </h2>
                <p className='text-sm text-gray-400'>
                  {client ? "Actualiza los datos de contacto" : "Registra un nuevo cliente externo"}
                </p>
              </div>
              <motion.button
                type='button'
                onClick={onClose}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label='Cerrar'
                className='shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg p-1.5'
              >
                <X className='w-5 h-5' />
              </motion.button>
            </div>

            <AnimatePresence initial={false}>
              {fieldError && (
                <motion.p
                  role='alert'
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
                  className='overflow-hidden text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5'
                >
                  {fieldError}
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
              <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide'>Contacto</p>
              <Field
                icon={User}
                label='Nombre del contacto'
                id={`${formId}-name`}
                type='text'
                required
                placeholder='Ej. Ana Torres'
                autoComplete='name'
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Field
                icon={Mail}
                label='Correo'
                id={`${formId}-email`}
                type='email'
                required
                disabled={Boolean(client)}
                placeholder='ana@empresa.com'
                autoComplete='email'
                helper={client ? "El correo no se puede modificar." : undefined}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Field
                icon={Phone}
                label='Teléfono'
                id={`${formId}-phone`}
                type='tel'
                placeholder='+52 55 1234 5678'
                autoComplete='tel'
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />

              <div className='border-t border-gray-100 pt-4'>
                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4'>
                  Empresa y notas
                </p>
                <div className='space-y-4'>
                  <Field
                    icon={Building2}
                    label='Empresa'
                    id={`${formId}-company`}
                    type='text'
                    placeholder='Ej. Comercializadora del Norte S.A.'
                    autoComplete='organization'
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                  <Field
                    icon={FileText}
                    label='Notas'
                    id={`${formId}-notes`}
                    textarea
                    rows={3}
                    placeholder='Contexto interno sobre este cliente (opcional)'
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <motion.div variants={fieldItem}>
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
              </motion.div>
            </motion.form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClientModal;

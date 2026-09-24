import { useId, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, User, Mail, Phone, FileText, Users } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { motionTokens } from "../animations/variants";
import { clientsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";
import { useMailResult } from "../../hooks/useMailResult";

const emptyForm = {
  name: "",
  type: "company",
  notes: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldsContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

const fieldItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: motionTokens.springSoft },
};

const Field = ({ icon: Icon, label, id, error, helper, textarea, ...props }) => {
  const Tag = textarea ? "textarea" : "input";
  return (
    <motion.div variants={fieldItem}>
      <label htmlFor={id} className='block text-sm font-semibold text-gray-700 dark:text-night-300 mb-1.5'>
        {label}
      </label>
      <div className='relative'>
        {Icon && (
          <Icon
            aria-hidden='true'
            className={`absolute left-3.5 ${textarea ? "top-3" : "top-1/2 -translate-y-1/2"} w-4.5 h-4.5 text-gray-400 dark:text-night-500`}
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
              ? "border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-950/40"
              : "border-gray-200 dark:border-night-700 hover:border-gray-300 dark:hover:border-night-600 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/30"
          } disabled:bg-gray-50 dark:disabled:bg-night-800 disabled:text-gray-400 dark:disabled:text-night-500 disabled:hover:border-gray-200 dark:disabled:hover:border-night-700`}
          {...props}
        />
      </div>
      {helper && !error && (
        <p id={`${id}-helper`} className='mt-1 text-xs text-gray-400 dark:text-night-500'>
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
            className='text-xs text-red-600 dark:text-red-400 overflow-hidden'
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TypeToggle = ({ value, onChange }) => (
  <motion.div variants={fieldItem}>
    <label className='block text-sm font-semibold text-gray-700 dark:text-night-300 mb-1.5'>Tipo de cliente</label>
    <div className='grid grid-cols-2 gap-2'>
      {[
        { value: "company", label: "Empresa", icon: Building2 },
        { value: "individual", label: "Individual", icon: User },
      ].map((opt) => (
        <button
          key={opt.value}
          type='button'
          onClick={() => onChange(opt.value)}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
            value === opt.value
              ? "border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300"
              : "border-gray-200 dark:border-night-700 text-gray-500 dark:text-night-400 hover:border-gray-300 dark:hover:border-night-600"
          }`}
        >
          <opt.icon className='w-4 h-4' aria-hidden='true' />
          {opt.label}
        </button>
      ))}
    </div>
  </motion.div>
);

const ClientModal = ({ isOpen, client, onClose, onSaved }) => {
  const { error: showError } = useNotification();
  const { notifyClientMail } = useMailResult();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const formId = useId();

  useEffect(() => {
    if (isOpen) {
      setForm(
        client
          ? {
              name: client.name || "",
              type: client.type || "company",
              notes: client.notes || "",
              contactName: "",
              contactEmail: "",
              contactPhone: "",
            }
          : emptyForm
      );
      setFieldError(null);
    }
  }, [isOpen, client]);

  const validate = () => {
    if (!form.name.trim()) {
      return client ? "El nombre del cliente es obligatorio." : "El nombre es obligatorio.";
    }
    if (!client) {
      if (!form.contactName.trim()) {
        return "El nombre del primer contacto es obligatorio.";
      }
      if (!form.contactEmail.trim()) {
        return "El correo del primer contacto es obligatorio.";
      }
      if (!EMAIL_PATTERN.test(form.contactEmail.trim())) {
        return "Ingresa un correo válido para el primer contacto.";
      }
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
      const saved = client
        ? await clientsAPI.update(client.id, {
            name: form.name.trim(),
            type: form.type,
            notes: form.notes.trim(),
          })
        : await clientsAPI.create({
            name: form.name.trim(),
            type: form.type,
            notes: form.notes.trim(),
            contact: {
              name: form.contactName.trim(),
              email: form.contactEmail.trim(),
              phone: form.contactPhone.trim(),
            },
          });
      // Al crear se envía el acceso al portal: avisar si el correo no salió
      notifyClientMail(saved, client ? "Cliente actualizado" : "Cliente creado");
      onSaved(saved);
    } catch (err) {
      if (err.status === 422) {
        setFieldError(err.data?.message || "Ya existe un cliente o contacto con este correo");
      } else {
        showError("No se pudo guardar el cliente");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={client ? "Editar cliente" : "Nuevo cliente"}
      footer={
        <Button
          type='submit'
          form={formId}
          variant='primary'
          size='lg'
          loading={loading}
          loadingText='Guardando...'
          className='w-full sm:w-auto'
        >
          {client ? "Guardar cambios" : "Crear cliente"}
        </Button>
      }
    >
      <p className='text-sm text-gray-400 dark:text-night-500 -mt-2 mb-4'>
        {client ? "Actualiza los datos del cliente" : "Registra un nuevo cliente y su primer contacto"}
      </p>

      <AnimatePresence initial={false}>
        {fieldError && (
          <motion.p
            role='alert'
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
            className='overflow-hidden text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-lg px-3.5 py-2.5'
          >
            {fieldError}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.form
        id={formId}
        variants={fieldsContainer}
        initial='hidden'
        animate='visible'
        onSubmit={handleSubmit}
        className='space-y-4'
        noValidate
      >
        <TypeToggle value={form.type} onChange={(type) => setForm({ ...form, type })} />
        <Field
          icon={Building2}
          label={form.type === "company" ? "Nombre de la empresa" : "Nombre"}
          id={`${formId}-name`}
          type='text'
          required
          placeholder={form.type === "company" ? "Ej. Comercializadora del Norte S.A." : "Ej. Ana Torres"}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
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

        {!client && (
          <div className='border-t border-gray-100 dark:border-night-700 pt-4'>
            <p className='text-xs font-semibold text-gray-400 dark:text-night-500 uppercase tracking-wide mb-4 flex items-center gap-1.5'>
              <Users className='w-3.5 h-3.5' aria-hidden='true' />
              Primer contacto
            </p>
            <div className='space-y-4'>
              <Field
                icon={User}
                label='Nombre del contacto'
                id={`${formId}-contact-name`}
                type='text'
                required
                placeholder='Ej. Ana Torres'
                autoComplete='name'
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
              <Field
                icon={Mail}
                label='Correo del contacto'
                id={`${formId}-contact-email`}
                type='email'
                required
                placeholder='ana@empresa.com'
                autoComplete='email'
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
              <Field
                icon={Phone}
                label='Teléfono del contacto'
                id={`${formId}-contact-phone`}
                type='tel'
                placeholder='+52 55 1234 5678'
                autoComplete='tel'
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
          </div>
        )}
      </motion.form>
    </Modal>
  );
};

export default ClientModal;

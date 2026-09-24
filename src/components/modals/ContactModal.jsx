import { useId, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Phone, FileText } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { motionTokens } from "../animations/variants";
import { contactsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";
import { useMailResult } from "../../hooks/useMailResult";

const emptyForm = { name: "", email: "", phone: "", notes: "" };

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

const ContactModal = ({ isOpen, client, contact, onClose, onSaved }) => {
  const { error: showError } = useNotification();
  const { notifyClientMail } = useMailResult();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const formId = useId();

  useEffect(() => {
    if (isOpen) {
      setForm(
        contact
          ? {
              name: contact.name || "",
              email: contact.email || "",
              phone: contact.phone || "",
              notes: contact.notes || "",
            }
          : emptyForm
      );
      setFieldError(null);
    }
  }, [isOpen, contact]);

  const validate = () => {
    if (!form.name.trim()) {
      return "El nombre es obligatorio.";
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
      const saved = contact
        ? await contactsAPI.update(contact.id, {
            name: form.name.trim(),
            phone: form.phone.trim(),
            notes: form.notes.trim(),
          })
        : await contactsAPI.create(client.id, {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            notes: form.notes.trim(),
          });
      // Al agregar se envía el acceso al portal: avisar si el correo no salió
      notifyClientMail(saved, contact ? "Contacto actualizado" : "Contacto agregado");
      onSaved(saved);
    } catch (err) {
      if (err.status === 422) {
        setFieldError(err.data?.message || "Ya existe un contacto con este correo");
      } else {
        showError("No se pudo guardar el contacto");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={contact ? "Editar contacto" : "Nuevo contacto"}
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
          {contact ? "Guardar cambios" : "Agregar contacto"}
        </Button>
      }
    >
      <p className='text-sm text-gray-400 dark:text-night-500 -mt-2 mb-4 truncate'>
        {client?.name ? `De ${client.name}` : "Agrega una persona con acceso al portal"}
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
        <Field
          icon={User}
          label='Nombre'
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
          disabled={Boolean(contact)}
          placeholder='ana@empresa.com'
          autoComplete='email'
          helper={contact ? "El correo no se puede modificar." : undefined}
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
        <Field
          icon={FileText}
          label='Notas'
          id={`${formId}-notes`}
          textarea
          rows={3}
          placeholder='Contexto interno sobre este contacto (opcional)'
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </motion.form>
    </Modal>
  );
};

export default ContactModal;

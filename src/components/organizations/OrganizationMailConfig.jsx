import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Server,
  Key,
  Lock,
  User,
  Send,
  Loader2,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { organizationsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";

const OrganizationMailConfig = ({ organizationId, isOwner }) => {
  const { success, error: showError, info } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const [config, setConfig] = useState({
    mail_enabled: false,
    mail_host: "",
    mail_port: 587,
    mail_username: "",
    mail_password: "",
    mail_encryption: "tls",
    mail_from_address: "",
    mail_from_name: "",
  });

  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await organizationsAPI.getMailConfig(organizationId);
      const data = response.mail_config;
      setConfig({
        mail_enabled: data.mail_enabled || false,
        mail_host: data.mail_host || "",
        mail_port: data.mail_port || 587,
        mail_username: data.mail_username || "",
        mail_password: "", // Nunca se devuelve la contraseña
        mail_encryption: data.mail_encryption || "tls",
        mail_from_address: data.mail_from_address || "",
        mail_from_name: data.mail_from_name || "",
      });
      setHasExistingPassword(data.has_password || false);
    } catch (err) {
      console.error("Error loading mail config:", err);
      showError("No se pudo cargar la configuración de correo");
    } finally {
      setLoading(false);
    }
  }, [organizationId, showError]);

  useEffect(() => {
    if (isOwner) {
      loadConfig();
    }
  }, [isOwner, loadConfig]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "mail_password") {
      setPasswordChanged(true);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Si no se cambió la contraseña, no enviarla
      const dataToSend = { ...config };
      if (!passwordChanged && hasExistingPassword) {
        delete dataToSend.mail_password;
      }

      await organizationsAPI.updateMailConfig(organizationId, dataToSend);
      success("Configuración de correo guardada");
      setPasswordChanged(false);
      // Recargar para actualizar has_password
      loadConfig();
    } catch (err) {
      showError(err.message || "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      showError("Ingresa un email de prueba");
      return;
    }

    setTesting(true);
    try {
      await organizationsAPI.testMailConfig(organizationId, testEmail);
      success(`Email de prueba enviado a ${testEmail}`);
      setTestEmail("");
    } catch (err) {
      showError(err.message || "No se pudo enviar el email de prueba");
    } finally {
      setTesting(false);
    }
  };

  if (!isOwner) {
    return (
      <div className='text-center py-8'>
        <Mail className='w-12 h-12 text-gray-300 dark:text-night-600 mx-auto mb-3' />
        <p className='text-gray-500 dark:text-night-400'>
          Solo el dueño de la organización puede configurar el correo
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center py-8'>
        <Loader2 className='w-8 h-8 animate-spin text-brand-600' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Info Banner */}
      <div className='flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg'>
        <Info className='w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5' />
        <div className='text-sm text-blue-700 dark:text-blue-300'>
          <p className='font-medium mb-1'>
            Configuración de correo personalizado
          </p>
          <p>
            Si configuras un servidor de correo propio, las invitaciones y
            notificaciones de tu organización se enviarán desde tu dominio. Si
            no lo configuras, se usará el correo del sistema.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className='space-y-6'>
        {/* Enable/Disable Toggle */}
        <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-night-800 rounded-lg'>
          <div>
            <h4 className='font-medium text-gray-900 dark:text-night-50'>
              Usar correo personalizado
            </h4>
            <p className='text-sm text-gray-500 dark:text-night-400'>
              Habilita esta opción para enviar correos desde tu propio servidor
            </p>
          </div>
          <label className='relative inline-flex items-center cursor-pointer'>
            <input
              type='checkbox'
              name='mail_enabled'
              checked={config.mail_enabled}
              onChange={handleChange}
              className='sr-only peer'
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-night-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white dark:border-night-900 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white dark:bg-night-900 after:border-gray-300 dark:border-night-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {/* Status Badge */}
        {config.mail_enabled ? (
          <div className='flex items-center gap-2 text-green-600 dark:text-green-400'>
            <CheckCircle className='w-4 h-4' />
            <span className='text-sm font-medium'>
              Correo personalizado activo
            </span>
          </div>
        ) : (
          <div className='flex items-center gap-2 text-gray-500 dark:text-night-400'>
            <AlertCircle className='w-4 h-4' />
            <span className='text-sm'>
              Usando configuración del sistema por defecto
            </span>
          </div>
        )}

        {/* SMTP Configuration Fields */}
        <motion.div
          initial={false}
          animate={{
            opacity: config.mail_enabled ? 1 : 0.5,
            height: "auto",
          }}
          className={`space-y-4 ${
            !config.mail_enabled ? "pointer-events-none" : ""
          }`}
        >
          <h4 className='font-medium text-gray-900 dark:text-night-50 flex items-center gap-2'>
            <Server className='w-4 h-4' />
            Servidor SMTP
          </h4>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Host */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-1'>
                Servidor SMTP
              </label>
              <input
                type='text'
                name='mail_host'
                value={config.mail_host}
                onChange={handleChange}
                placeholder='smtp.tudominio.com'
                className='w-full px-3 py-2 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
              />
            </div>

            {/* Port */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-1'>
                Puerto
              </label>
              <input
                type='number'
                name='mail_port'
                value={config.mail_port}
                onChange={handleChange}
                placeholder='587'
                className='w-full px-3 py-2 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
              />
            </div>

            {/* Username */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-1'>
                <User className='w-4 h-4 inline mr-1' />
                Usuario
              </label>
              <input
                type='text'
                name='mail_username'
                value={config.mail_username}
                onChange={handleChange}
                placeholder='noreply@tudominio.com'
                className='w-full px-3 py-2 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
              />
            </div>

            {/* Password */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-1'>
                <Lock className='w-4 h-4 inline mr-1' />
                Contraseña
              </label>
              <div className='relative'>
                <input
                  type={showPassword ? "text" : "password"}
                  name='mail_password'
                  value={config.mail_password}
                  onChange={handleChange}
                  placeholder={
                    hasExistingPassword ? "••••••• (sin cambios)" : "Contraseña"
                  }
                  className='w-full px-3 py-2 pr-10 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-night-500 hover:text-gray-600 dark:hover:text-night-300'
                >
                  {showPassword ? (
                    <EyeOff className='w-4 h-4' />
                  ) : (
                    <Eye className='w-4 h-4' />
                  )}
                </button>
              </div>
              {hasExistingPassword && !passwordChanged && (
                <p className='text-xs text-gray-500 dark:text-night-400 mt-1'>
                  Deja vacío para mantener la contraseña actual
                </p>
              )}
            </div>

            {/* Encryption */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-1'>
                <Key className='w-4 h-4 inline mr-1' />
                Encriptación
              </label>
              <select
                name='mail_encryption'
                value={config.mail_encryption}
                onChange={handleChange}
                className='w-full px-3 py-2 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
              >
                <option value='tls'>TLS</option>
                <option value='ssl'>SSL</option>
                <option value=''>Ninguna</option>
              </select>
            </div>
          </div>

          {/* From Address Settings */}
          <h4 className='font-medium text-gray-900 dark:text-night-50 flex items-center gap-2 pt-4'>
            <Mail className='w-4 h-4' />
            Remitente
          </h4>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* From Address */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-1'>
                Email remitente
              </label>
              <input
                type='email'
                name='mail_from_address'
                value={config.mail_from_address}
                onChange={handleChange}
                placeholder='noreply@tudominio.com'
                className='w-full px-3 py-2 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
              />
            </div>

            {/* From Name */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-night-300 mb-1'>
                Nombre remitente
              </label>
              <input
                type='text'
                name='mail_from_name'
                value={config.mail_from_name}
                onChange={handleChange}
                placeholder='Mi Empresa'
                className='w-full px-3 py-2 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
              />
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <div className='flex items-center justify-end gap-3 pt-4 border-t'>
          <button
            type='submit'
            disabled={saving}
            className='flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors'
          >
            {saving ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                Guardando...
              </>
            ) : (
              <>
                <Save className='w-4 h-4' />
                Guardar configuración
              </>
            )}
          </button>
        </div>
      </form>

      {/* Test Email Section */}
      {config.mail_enabled && (
        <div className='border-t pt-6'>
          <h4 className='font-medium text-gray-900 dark:text-night-50 mb-3'>
            Probar configuración
          </h4>
          <div className='flex gap-3'>
            <input
              type='email'
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder='email@ejemplo.com'
              className='flex-1 px-3 py-2 border border-gray-300 dark:border-night-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
            />
            <button
              type='button'
              onClick={handleTest}
              disabled={testing || !testEmail.trim()}
              className='flex items-center gap-2 px-4 py-2 border border-brand-600 text-brand-600 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-50 transition-colors'
            >
              {testing ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className='w-4 h-4' />
                  Enviar prueba
                </>
              )}
            </button>
          </div>
          <p className='text-sm text-gray-500 dark:text-night-400 mt-2'>
            Se enviará un correo de prueba para verificar que la configuración
            es correcta
          </p>
        </div>
      )}
    </div>
  );
};

export default OrganizationMailConfig;

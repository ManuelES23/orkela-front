import { useState, useEffect } from "react";
import {
  Mail,
  Server,
  Lock,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Layout from "../../components/layout/Layout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import settingsAPI from "../../utils/settingsAPI";
import { useNotification } from "../../context/NotificationContext";

export default function Settings() {
  const { success, error: showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [config, setConfig] = useState({
    mail_mailer: "smtp",
    mail_host: "",
    mail_port: "587",
    mail_username: "",
    mail_password: "",
    mail_encryption: "tls",
    mail_from_address: "",
    mail_from_name: "Orkela",
  });
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getMailConfig();
      const data = response.data;
      setConfig({
        mail_mailer: data.mail_mailer || "smtp",
        mail_host: data.mail_host || "",
        mail_port: data.mail_port || "587",
        mail_username: data.mail_username || "",
        mail_password: data.mail_password || "",
        mail_encryption: data.mail_encryption || "tls",
        mail_from_address: data.mail_from_address || "",
        mail_from_name: data.mail_from_name || "Orkela",
      });
    } catch (err) {
      showError("Error al cargar la configuración");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await settingsAPI.updateMailConfig(config);
      success(response.message || "Configuración guardada correctamente");
    } catch (err) {
      showError(err.message || "Error al guardar la configuración");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      showError("Por favor ingresa un email");
      return;
    }

    try {
      setSendingTest(true);
      const response = await settingsAPI.sendTestEmail(testEmail);
      success(response.message || "Email de prueba enviado correctamente");
      setTestEmail("");
    } catch (err) {
      showError(err.message || "Error al enviar email de prueba");
      console.error(err);
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Layout
        title='Configuración'
        subtitle='Gestiona las configuraciones del sistema'
      >
        <div className='flex items-center justify-center h-64'>
          <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title='Configuración'
      subtitle='Gestiona las configuraciones del sistema'
    >
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Formulario de configuración */}
        <div className='lg:col-span-2'>
          <Card>
            <Card.Header>
              <div className='flex items-center gap-2'>
                <Mail className='w-5 h-5 text-indigo-600' />
                <h3 className='text-lg font-semibold'>
                  Configuración de Email (SMTP)
                </h3>
              </div>
            </Card.Header>
            <Card.Body>
              <form onSubmit={handleSubmit} className='space-y-5'>
                {/* Servidor SMTP */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Servidor SMTP
                    </label>
                    <div className='relative'>
                      <Server className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                      <input
                        type='text'
                        value={config.mail_host}
                        onChange={(e) =>
                          setConfig({ ...config, mail_host: e.target.value })
                        }
                        className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                        placeholder='smtp.office365.com'
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Puerto
                    </label>
                    <input
                      type='number'
                      value={config.mail_port}
                      onChange={(e) =>
                        setConfig({ ...config, mail_port: e.target.value })
                      }
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                      placeholder='587'
                      required
                    />
                  </div>
                </div>

                {/* Encriptación */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Encriptación
                  </label>
                  <select
                    value={config.mail_encryption}
                    onChange={(e) =>
                      setConfig({ ...config, mail_encryption: e.target.value })
                    }
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                    required
                  >
                    <option value='tls'>TLS</option>
                    <option value='ssl'>SSL</option>
                  </select>
                </div>

                {/* Credenciales */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Usuario (Email)
                    </label>
                    <div className='relative'>
                      <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                      <input
                        type='email'
                        value={config.mail_username}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            mail_username: e.target.value,
                          })
                        }
                        className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                        placeholder='tu-email@empresa.com'
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Contraseña
                    </label>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                      <input
                        type='password'
                        value={config.mail_password}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            mail_password: e.target.value,
                          })
                        }
                        className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                        placeholder='••••••••'
                      />
                    </div>
                    <p className='text-xs text-gray-500 mt-1'>
                      Dejar vacío para mantener la contraseña actual
                    </p>
                  </div>
                </div>

                {/* Remitente */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Email del remitente
                    </label>
                    <input
                      type='email'
                      value={config.mail_from_address}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          mail_from_address: e.target.value,
                        })
                      }
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                      placeholder='noreply@orkela.com'
                      required
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Nombre del remitente
                    </label>
                    <input
                      type='text'
                      value={config.mail_from_name}
                      onChange={(e) =>
                        setConfig({ ...config, mail_from_name: e.target.value })
                      }
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                      placeholder='Orkela'
                      required
                    />
                  </div>
                </div>

                {/* Botón de guardar */}
                <div className='flex justify-end pt-4 border-t'>
                  <Button type='submit' disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className='w-4 h-4 animate-spin' />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className='w-4 h-4' />
                        Guardar Configuración
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>
        </div>

        {/* Panel de prueba */}
        <div>
          <Card>
            <Card.Header>
              <div className='flex items-center gap-2'>
                <Send className='w-5 h-5 text-indigo-600' />
                <h3 className='text-lg font-semibold'>Probar Configuración</h3>
              </div>
            </Card.Header>
            <Card.Body>
              <p className='text-sm text-gray-600 mb-4'>
                Envía un email de prueba para verificar que la configuración
                SMTP esté funcionando correctamente.
              </p>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Email de destino
                  </label>
                  <input
                    type='email'
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                    placeholder='test@ejemplo.com'
                  />
                </div>

                <Button
                  onClick={handleSendTest}
                  disabled={sendingTest || !testEmail}
                  variant='secondary'
                  className='w-full'
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className='w-4 h-4' />
                      Enviar Email de Prueba
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Información adicional */}
          <Card className='mt-6'>
            <Card.Body>
              <div className='flex items-start gap-3'>
                <AlertCircle className='w-5 h-5 text-blue-500 shrink-0 mt-0.5' />
                <div className='text-sm text-gray-600'>
                  <p className='font-medium text-gray-900 mb-1'>
                    Proveedores SMTP comunes
                  </p>
                  <ul className='space-y-1 text-xs'>
                    <li>
                      <strong>Microsoft 365:</strong> smtp.office365.com:587
                      (TLS)
                    </li>
                    <li>
                      <strong>Gmail:</strong> smtp.gmail.com:587 (TLS)
                    </li>
                    <li>
                      <strong>SendGrid:</strong> smtp.sendgrid.net:587 (TLS)
                    </li>
                  </ul>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

import LegalDocument, { LEGAL_CONTACT_EMAIL } from "../components/legal/LegalDocument";

const SECTIONS = [
  {
    title: "Quién es responsable de tus datos",
    paragraphs: [
      `Orkela es una aplicación de gestión de proyectos, tareas, equipos y tickets. El responsable del tratamiento de los datos personales es el titular del servicio Orkela, al que puedes contactar en ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    title: "Qué datos recopilamos",
    items: [
      "Datos de tu cuenta: nombre, correo electrónico, contraseña (guardada cifrada, nunca en texto plano) y, si decides añadirlos, foto de perfil, teléfono, puesto y biografía.",
      "Preferencias: idioma, zona horaria y tema de la interfaz.",
      "Contenido que creas o recibes en Orkela: organizaciones, equipos, proyectos, tareas, comentarios, tickets, clientes, contactos y archivos adjuntos.",
      "Datos técnicos necesarios para mantener tu sesión segura, como los tokens de acceso y registros de actividad del sistema.",
    ],
  },
  {
    title: "Inicio de sesión con Google o Microsoft",
    paragraphs: [
      "Si eliges entrar con Google o con Microsoft, solo pedimos los permisos básicos de identidad (openid, email y profile; en Microsoft también User.Read para leer tu perfil). Con ellos recibimos tu nombre, tu correo electrónico, un identificador de tu cuenta y, en el caso de Google, tu foto de perfil.",
      "Usamos estos datos únicamente para crear tu cuenta de Orkela, vincularla y permitirte iniciar sesión. No accedemos a tu correo, tus contactos, tus archivos ni a ningún otro dato de tu cuenta de Google o Microsoft, y no guardamos tokens de acceso de estos proveedores para el inicio de sesión.",
      "Puedes desvincular Google o Microsoft en cualquier momento desde Configuración → Acceso y seguridad.",
    ],
  },
  {
    title: "Calendario de Microsoft Outlook",
    paragraphs: [
      "Si conectas voluntariamente tu calendario de Microsoft Outlook, Orkela solicita permiso para leer y escribir eventos de calendario y guarda, cifrados, los tokens necesarios para mantener la conexión. Solo se usan para crear y actualizar en tu calendario los eventos que corresponden a tus tareas y proyectos de Orkela.",
      "Al desconectar el calendario eliminamos los tokens guardados y los eventos que Orkela creó en tu cuenta externa.",
    ],
  },
  {
    title: "Para qué usamos tus datos",
    items: [
      "Prestar el servicio: mostrarte tu trabajo, el de tus equipos y colaborar con otros miembros de tus organizaciones.",
      "Enviarte correos del servicio: verificación de correo, recuperación de contraseña, avisos de seguridad, invitaciones y notificaciones de tickets.",
      "Proteger las cuentas y el servicio frente a accesos no autorizados y abusos.",
    ],
    paragraphs: [
      "No vendemos tus datos, no los usamos para publicidad y no los compartimos con terceros con fines comerciales.",
    ],
  },
  {
    title: "Con quién se comparten",
    paragraphs: [
      "El contenido de una organización es visible para los miembros de esa organización según los permisos que su administración configure. Los clientes que acceden al portal de tickets ven únicamente sus propios tickets.",
      "Los correos se envían a través del servidor de correo (SMTP) configurado para Orkela o, si una organización lo configura, a través de su propio servidor de correo. Fuera de estos casos, solo compartiremos datos cuando la ley nos obligue.",
    ],
  },
  {
    title: "Dónde se guardan y durante cuánto tiempo",
    paragraphs: [
      "Los datos se almacenan en los servidores de Orkela y se transmiten cifrados mediante HTTPS. Los conservamos mientras tu cuenta esté activa. Cuando solicitas eliminar tu cuenta, borramos tus datos personales, salvo aquellos que debamos conservar por obligación legal.",
    ],
  },
  {
    title: "Tus derechos",
    paragraphs: [
      `Puedes acceder a tus datos, corregirlos, pedir su eliminación u oponerte a su tratamiento. Buena parte puedes hacerlo tú mismo desde Configuración; para lo demás, incluida la eliminación de tu cuenta, escríbenos a ${LEGAL_CONTACT_EMAIL} y responderemos en un plazo máximo de 20 días hábiles.`,
    ],
  },
  {
    title: "Cookies y almacenamiento local",
    paragraphs: [
      "Orkela no usa cookies de publicidad ni herramientas de analítica de terceros. Solo guarda en tu navegador lo necesario para mantener tu sesión iniciada y recordar tus preferencias.",
    ],
  },
  {
    title: "Cambios en esta política",
    paragraphs: [
      "Si modificamos esta política, actualizaremos la fecha de esta página y, si el cambio es importante, te lo avisaremos por correo o dentro de la aplicación.",
    ],
  },
];

const PrivacyPolicy = () => (
  <LegalDocument
    path='/privacidad'
    title='Política de privacidad'
    intro='Esta política explica qué datos personales trata Orkela, para qué los usa y qué control tienes sobre ellos.'
    sections={SECTIONS}
  />
);

export default PrivacyPolicy;

import LegalDocument, { LEGAL_CONTACT_EMAIL } from "../components/legal/LegalDocument";

const SECTIONS = [
  {
    title: "Aceptación",
    paragraphs: [
      "Al crear una cuenta o usar Orkela aceptas estos términos. Si usas Orkela en nombre de una organización, declaras que tienes autorización para aceptarlos en su nombre.",
    ],
  },
  {
    title: "El servicio",
    paragraphs: [
      "Orkela es una herramienta en línea para organizar proyectos, tareas, equipos, clientes y tickets de soporte. Podemos mejorar, modificar o retirar funciones con el tiempo; cuando un cambio afecte de forma importante al uso que haces del servicio, intentaremos avisarte con antelación.",
    ],
  },
  {
    title: "Tu cuenta",
    items: [
      "Debes proporcionar datos verdaderos y mantener tu correo electrónico actualizado.",
      "Eres responsable de mantener segura tu contraseña y el acceso a las cuentas de Google o Microsoft que vincules.",
      "Avísanos de inmediato si detectas un uso no autorizado de tu cuenta.",
    ],
  },
  {
    title: "Uso aceptable",
    paragraphs: ["No puedes usar Orkela para:"],
    items: [
      "Actividades ilegales o que infrinjan derechos de terceros.",
      "Enviar spam o comunicaciones no solicitadas, incluidas invitaciones masivas.",
      "Subir software malicioso o intentar acceder sin autorización a otras cuentas, organizaciones o a la infraestructura del servicio.",
      "Interferir con el funcionamiento del servicio o sobrecargarlo de forma deliberada.",
    ],
  },
  {
    title: "Tu contenido",
    paragraphs: [
      "El contenido que subes a Orkela sigue siendo tuyo o de tu organización. Nos concedes únicamente el permiso necesario para almacenarlo, procesarlo y mostrarlo a las personas con las que decidas compartirlo, con el único fin de prestar el servicio.",
      "En las organizaciones, sus administradores pueden gestionar el contenido y los miembros de la organización.",
    ],
  },
  {
    title: "Planes y límites",
    paragraphs: [
      "Cada cuenta u organización tiene un plan con límites de uso, como almacenamiento o número de miembros. Si se alcanza un límite, algunas acciones dejarán de estar disponibles hasta liberar espacio o cambiar de plan.",
    ],
  },
  {
    title: "Suspensión y cancelación",
    paragraphs: [
      `Puedes dejar de usar Orkela cuando quieras y solicitar la eliminación de tu cuenta escribiendo a ${LEGAL_CONTACT_EMAIL}. Podemos suspender o cerrar cuentas que incumplan estos términos o pongan en riesgo el servicio o a otros usuarios.`,
    ],
  },
  {
    title: "Garantías y responsabilidad",
    paragraphs: [
      "Trabajamos para que Orkela esté disponible y funcione correctamente, pero el servicio se ofrece «tal cual», sin garantizar que esté libre de interrupciones o errores. Te recomendamos conservar copias de la información que sea crítica para ti.",
      "En la medida permitida por la ley, Orkela no será responsable de daños indirectos, pérdida de beneficios o pérdida de datos derivados del uso o la imposibilidad de uso del servicio.",
    ],
  },
  {
    title: "Privacidad",
    paragraphs: [
      "El tratamiento de tus datos personales se describe en la Política de privacidad, que forma parte de estos términos.",
    ],
  },
  {
    title: "Cambios en estos términos",
    paragraphs: [
      "Podemos actualizar estos términos. Publicaremos la nueva versión en esta página con su fecha y, si el cambio es importante, te lo avisaremos. Si sigues usando Orkela después del cambio, se entiende que aceptas la nueva versión.",
    ],
  },
];

const TermsOfService = () => (
  <LegalDocument
    path='/terminos'
    title='Términos del servicio'
    intro='Estos términos regulan el uso de Orkela. Léelos con atención antes de crear tu cuenta.'
    sections={SECTIONS}
  />
);

export default TermsOfService;

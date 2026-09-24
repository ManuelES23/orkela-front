import {
  AlertCircle,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MoreHorizontal,
} from "lucide-react";

// Vocabulario único de tickets para el staff (Bandeja, Clientes, detalle; el
// resto de pantallas migra en la fase 6). badgeClass trae el color del borde:
// quien lo use añade la clase `border`.
export const TICKET_STATUS = {
  open: {
    label: "Abierto",
    badgeClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    icon: AlertCircle,
    dotClass: "bg-blue-500",
  },
  in_progress: {
    label: "En progreso",
    badgeClass: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800",
    icon: PlayCircle,
    dotClass: "bg-brand-600",
  },
  pending: {
    label: "Pendiente",
    badgeClass: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800",
    icon: PauseCircle,
    dotClass: "bg-yellow-500",
  },
  resolved: {
    label: "Resuelto",
    badgeClass: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800",
    icon: CheckCircle2,
    dotClass: "bg-green-500",
  },
  closed: {
    label: "Cerrado",
    badgeClass: "text-gray-600 dark:text-night-300 bg-gray-50 dark:bg-night-800 border-gray-200 dark:border-night-700",
    icon: XCircle,
    dotClass: "bg-gray-400 dark:bg-night-500",
  },
};

export const TICKET_PRIORITY = {
  urgent: {
    label: "Urgente",
    badgeClass: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800",
    flagClass: "text-red-500 dark:text-red-400",
  },
  high: {
    label: "Alta",
    badgeClass: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",
    flagClass: "text-orange-500 dark:text-orange-400",
  },
  medium: {
    label: "Media",
    badgeClass: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800",
    flagClass: "text-yellow-500 dark:text-yellow-400",
  },
  low: {
    label: "Baja",
    badgeClass: "text-gray-600 dark:text-night-300 bg-gray-50 dark:bg-night-800 border-gray-200 dark:border-night-700",
    flagClass: "text-gray-300 dark:text-night-600",
  },
};

// portalLabel: vocabulario pensado para el cliente en el portal ("Reportar un
// problema" en vez de "Bug"). Si un tipo no lo tiene, el portal usa `label`.
export const TICKET_TYPE = {
  request: { label: "Solicitud", icon: MessageSquare, iconClass: "text-blue-500 dark:text-blue-400" },
  bug: { label: "Bug", icon: Bug, iconClass: "text-red-500 dark:text-red-400", portalLabel: "Reportar un problema" },
  question: { label: "Pregunta", icon: HelpCircle, iconClass: "text-accent-500 dark:text-accent-400" },
  feature: {
    label: "Funcionalidad",
    icon: Lightbulb,
    iconClass: "text-yellow-500 dark:text-yellow-400",
    portalLabel: "Pedir una función nueva",
  },
  support: { label: "Soporte", icon: Headphones, iconClass: "text-green-500 dark:text-green-400" },
  other: { label: "Otro", icon: MoreHorizontal, iconClass: "text-gray-500 dark:text-night-400" },
};

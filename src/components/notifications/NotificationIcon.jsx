import {
  AlertTriangle,
  Building2,
  CheckCircle,
  CheckSquare,
  Clock,
  FolderKanban,
  Inbox,
  ListTodo,
  Mail,
  MailCheck,
  MailPlus,
  MailX,
  MessageSquare,
  RefreshCw,
  Ticket,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

// Tonos del chip del ícono, con su variante oscura (los fondos -50 sin dark:
// quedaban como manchas claras en modo oscuro).
const TONES = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  gray: "bg-gray-100 text-gray-500 dark:bg-night-800 dark:text-night-300",
};

const VISUALS = {
  project_created: [FolderKanban, "blue"],
  project_updated: [FolderKanban, "blue"],
  project_collaborator_joined: [Users, "blue"],
  project_deleted: [Trash2, "red"],
  task_created: [CheckSquare, "green"],
  task_assigned: [CheckSquare, "brand"],
  task_updated: [RefreshCw, "brand"],
  task_status_changed: [RefreshCw, "brand"],
  task_completed: [CheckCircle, "green"],
  checklist_item_completed: [ListTodo, "green"],
  checklist_item_updated: [ListTodo, "brand"],
  task_due_soon: [Clock, "amber"],
  task_overdue: [AlertTriangle, "red"],
  team_member_joined: [Users, "purple"],
  team_deleted: [Trash2, "red"],
  team_invitation_sent: [Users, "purple"],
  project_invitation_sent: [FolderKanban, "blue"],
  project_invitation_received: [MailPlus, "blue"],
  team_invitation_received: [MailPlus, "purple"],
  organization_invitation_received: [Building2, "brand"],
  project_invitation_accepted: [MailCheck, "green"],
  team_invitation_accepted: [MailCheck, "green"],
  organization_invitation_accepted: [MailCheck, "green"],
  project_invitation_declined: [MailX, "red"],
  team_invitation_declined: [MailX, "red"],
  organization_invitation_declined: [MailX, "red"],
  organization_member_removed: [Building2, "red"],
  organization_member_left: [Building2, "orange"],
  organization_role_updated: [Building2, "brand"],
  organization_plan_downgraded: [AlertTriangle, "amber"],
  ticket_created: [Ticket, "orange"],
  ticket_taken: [UserCheck, "blue"],
  ticket_assigned: [UserCheck, "brand"],
  ticket_status_changed: [RefreshCw, "blue"],
  ticket_resolved: [CheckCircle, "green"],
  ticket_returned_to_inbox: [Inbox, "amber"],
  ticket_comment_added: [MessageSquare, "blue"],
};

const NotificationIcon = ({ type, size = "md" }) => {
  const [Icon, tone] = VISUALS[type] || [Mail, "gray"];
  const box = size === "lg" ? "w-10 h-10 rounded-xl" : "w-9 h-9 rounded-lg";

  return (
    <span aria-hidden='true' className={`${box} ${TONES[tone]} flex items-center justify-center shrink-0`}>
      <Icon className='w-4 h-4' />
    </span>
  );
};

export default NotificationIcon;

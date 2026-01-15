# Orkela Projects - AI Coding Instructions

## Architecture Overview

**Frontend**: React 19 + Vite + Tailwind CSS 4 + Framer Motion + react-select  
**Backend**: Laravel 12 + MySQL + Laravel Sanctum + Laravel Reverb (WebSockets)  
**Authentication**: Dual authentication system - SystemAdmins (table: `system_admins`) and Application Users (table: `users`)  
**Routing**: Protected routes with role-based access control via `PrivateRoute`, `AdminRoute`, `OrganizationRoute`  
**API Integration**: RESTful API at `http://orkela.localhost/api` (Apache) or `http://localhost:8000/api` (artisan serve)  
**State Management**: React Context (AuthContext, NotificationContext, RealtimeContext)  
**Notifications**: Toast notification system with auto-dismiss (5 seconds)  
**Real-time**: WebSockets via Laravel Reverb for live updates  
**Confirmations**: Custom `ConfirmModal` component - NEVER use native `confirm()` or `alert()`

## Critical Architecture Decisions

### Dual Authentication System

Authentication checks happen in **TWO STEPS** (see [AuthController.php](../../orkela-back/app/Http/Controllers/Api/AuthController.php#L36-L64)):

1. **First**: Check `system_admins` table - if match, return user with `isSystemAdmin: true`
2. **Second**: Check `users` table - if match, return user with `isSystemAdmin: false`

**Frontend Auth Flow** ([AuthContext.jsx](../src/context/AuthContext.jsx#L35-L46)):
- Token stored in `localStorage.getItem("token")`
- User object stored in `localStorage.getItem("user")` (includes `isSystemAdmin` flag)
- On mount, verify token validity with `GET /api/user`
- Context switching via `switchContext()` for organization/personal modes

### Organization Context & Route Protection

**Three route protection components:**
- `PrivateRoute`: Requires authenticated user (any)
- `AdminRoute`: Requires `isSystemAdmin: true`
- `OrganizationRoute`: Requires `active_context === "organization"` + organization membership

**OrganizationRoute Pattern** ([OrganizationRoute.jsx](../src/components/OrganizationRoute.jsx)):
```jsx
// Only allows access when:
// 1. User has organization (organization_id OR memberOrganizations)
// 2. User's active_context is "organization"
if (!hasOrganization || user.active_context !== "organization") {
    return <Navigate to='/dashboard' />;
}
```

**useOrganizationPermissions Hook** ([useOrganizationPermissions.js](../src/hooks/useOrganizationPermissions.js)):
```jsx
const { canDelete, canManage, canInviteMembers, isOwner, role } = useOrganizationPermissions(organization);
```

### Two Completely Separate User Systems

**1. System Administration (Superadmin Panel)**
- **Purpose**: Platform management for developers/vendors
- **Table**: `system_admins`
- **Routes**: `/admin/users`, `/admin/organizations`, `/admin/licenses`, `/admin/logs`, `/admin/stats`
- **API Prefix**: `/api/admin/*`
- **Components**: `src/components/admin/*`
- **API Client**: `src/utils/adminAPI.js`
- **Access**: Only users with `isSystemAdmin: true`
- **Scope**: Manage application users, organizations, licenses, logs - NO access to projects/tasks/teams
- **Test Login**: `admin@orkela.com` / `password`

**2. Application System (End Users)**
- **Purpose**: Project management application for clients
- **Table**: `users`
- **Routes**: `/dashboard`, `/projects`, `/tasks`, `/teams`, `/tickets`, `/organizations`, `/settings`
- **API Prefix**: `/api/*` (non-admin routes)
- **Components**: `src/components/modals/*`, `src/components/tasks/*`, etc.
- **API Client**: `src/utils/api.js`
- **Access**: Regular authenticated users
- **Scope**: Projects, tasks, checklists, teams, tickets (org only), organizations - NO access to admin panel
- **Test Login (Free)**: `demo@orkela.com` / `password`
- **Test Login (Org)**: `roberto@grupoesplendido.com` / `password`

## Critical Development Patterns

### Optimistic Updates Pattern

Used extensively for real-time features like checklist items ([TaskChecklist.jsx](../src/components/tasks/TaskChecklist.jsx#L78-L109)):

```jsx
// 1. Save original state for rollback
const originalItems = [...checklistItems];

// 2. Update UI immediately (optimistic)
setChecklistItems(newItems);

try {
  // 3. Make API call
  await checklistAPI.toggle(taskId, itemId);
} catch (err) {
  // 4. Rollback on error
  setChecklistItems(originalItems);
}
```

### Dual-Mode Component Pattern

Components like `TaskChecklist` operate in **two modes** ([TaskChecklist.jsx](../src/components/tasks/TaskChecklist.jsx#L14-L16)):

- **Local Mode** (`!taskId`): Items stored in component state, passed to parent via `onLocalChange`
- **API Mode** (`taskId` exists): Items synced with backend via optimistic API calls

This pattern allows using the same component during task creation (no API yet) and editing (API available).

### Animation System Rules

**ALWAYS use Framer Motion** - never CSS transitions for complex animations:

1. **List Animations** ([TaskChecklist.jsx](../src/components/tasks/TaskChecklist.jsx#L201-L219)):
   - Wrap in `<AnimatePresence mode="popLayout">`
   - Use `key={item.tempId || item.id}` to preserve animations across API syncs
   - Apply `layout` prop to motion elements for smooth reordering

2. **Stagger Animations** ([MotionComponents.jsx](../src/components/animations/MotionComponents.jsx#L3-L24)):
   - Use `<StaggerContainer>` + `<StaggerItem>` for list entry animations
   - `delayChildren` and `staggerChildren` create cascade effect

3. **Form Inside Form Bug** (FIXED):
   - Never nest `<form>` elements
   - Use `type="button"` with `e.stopPropagation()` for buttons inside forms
   - Changed TaskChecklist wrapper from `<form>` to `<div>`

### API Authorization Pattern

Backend checks project access before task operations ([ChecklistItemController.php](../../orkela-back/app/Http/Controllers/Api/ChecklistItemController.php#L11-L31)):

```php
// Verify user owns project OR is a project collaborator
return Project::where('id', $task->project_id)
    ->where(function ($query) use ($userId) {
        $query->where('user_id', $userId)
            ->orWhereHas('users', function ($q) use ($userId) {
                $q->where('users.id', $userId);
            });
    })
    ->exists();
```

All nested resource controllers follow this pattern for authorization.

### Confirmation Modal Pattern

**NEVER use** `confirm()` or `alert()` - always use `ConfirmModal` ([ConfirmModal.jsx](../src/components/ui/ConfirmModal.jsx)):

```jsx
const [confirmModal, setConfirmModal] = useState({
  isOpen: false,
  title: "",
  message: "",
  type: "danger", // "danger" | "warning" | "info"
  onConfirm: () => {},
});

// Trigger
setConfirmModal({
  isOpen: true,
  title: "Eliminar tarea",
  message: "¿Estás seguro de que deseas eliminar esta tarea?",
  type: "danger",
  onConfirm: async () => {
    await tasksAPI.delete(taskId);
    loadTasks();
  },
});

// Render
<ConfirmModal
  isOpen={confirmModal.isOpen}
  onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
  onConfirm={confirmModal.onConfirm}
  title={confirmModal.title}
  message={confirmModal.message}
  type={confirmModal.type}
/>
```



## Project Structure

```
orkela/
├── orkela-front/          # React 19 frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── admin/     # Admin panel (Users, Organizations, Licenses, Logs, Stats)
│   │   │   ├── animations/# Framer Motion wrappers (MotionComponents, variants)
│   │   │   ├── layout/    # Layout (Sidebar, Header, BottomNav for mobile)
│   │   │   ├── modals/    # Modals (ProjectModal, TaskModal, TicketDetailModal)
│   │   │   ├── organizations/ # Organization-specific components
│   │   │   ├── tasks/     # Task components (TaskChecklist - dual mode)
│   │   │   └── ui/        # Reusable UI (Button, Card, Modal, ConfirmModal, NotificationsPanel)
│   │   ├── context/       # React Context (Auth, Notifications, Realtime)
│   │   ├── hooks/         # Custom hooks (useOrganizationPermissions)
│   │   ├── pages/         # Route pages
│   │   │   ├── admin/     # Admin pages (Users, Organizations, Licenses, Logs, Stats)
│   │   │   └── ...        # App pages (Dashboard, Projects, Tasks, Teams, Tickets, Organizations)
│   │   └── utils/         # API clients (api.js, adminAPI.js, echo.js)
│   ├── documentacion/     # Frontend docs
│   └── package.json
└── orkela-back/           # Laravel 12 backend
    ├── app/
    │   ├── Http/
    │   │   ├── Controllers/Api/
    │   │   │   ├── Admin/           # Admin controllers
    │   │   │   ├── AuthController   # Dual auth
    │   │   │   ├── OrganizationController # Org management
    │   │   │   ├── TicketController # Tickets (org-only)
    │   │   │   └── ...
    │   │   ├── Middleware/          # OrganizationScope, RequireOrganizationContext
    │   │   └── Controllers/Traits/  # HasOrganizationScope
    │   ├── Models/                  # Organization, User, Team, Ticket, etc.
    │   └── Services/                # NotificationService
    ├── database/
    │   ├── migrations/
    │   └── seeders/DatabaseSeeder.php  # Creates test users + demo data
    ├── documentacion/     # Backend docs
    ├── routes/api.php     # All API routes
    └── .env               # MySQL + Reverb config
```

## Key Files Reference

### Frontend Core
- [App.jsx](../src/App.jsx) - Route definitions with PrivateRoute/AdminRoute/OrganizationRoute
- [AuthContext.jsx](../src/context/AuthContext.jsx) - Auth state, token management, context switching
- [RealtimeContext.jsx](../src/context/RealtimeContext.jsx) - WebSocket state, notifications, refresh callbacks
- [Layout.jsx](../src/components/layout/Layout.jsx) - Page layout with Sidebar + Header
- [api.js](../src/utils/api.js) - API client with all app endpoints
- [adminAPI.js](../src/utils/adminAPI.js) - Separate API client for admin endpoints

### Task System
- [Tasks.jsx](../src/pages/Tasks.jsx) - Task list with expandable checklists
- [TaskModal.jsx](../src/components/modals/TaskModal.jsx) - Create/edit with checklist + multi-user select
- [TaskChecklist.jsx](../src/components/tasks/TaskChecklist.jsx) - Dual-mode checklist component

### Organization System
- [Organizations.jsx](../src/pages/Organizations.jsx) - Organization listing
- [OrganizationDetail.jsx](../src/pages/OrganizationDetail.jsx) - Org management (members, invites, stats)
- [OrganizationRoute.jsx](../src/components/OrganizationRoute.jsx) - Route guard for org-only pages
- [useOrganizationPermissions.js](../src/hooks/useOrganizationPermissions.js) - Permission hook

### UI Components
- [ConfirmModal.jsx](../src/components/ui/ConfirmModal.jsx) - Custom confirmation dialogs (required)
- [NotificationsPanel.jsx](../src/components/ui/NotificationsPanel.jsx) - Real-time notifications dropdown
- [Modal.jsx](../src/components/ui/Modal.jsx) - Base modal component
- [Card.jsx](../src/components/ui/Card.jsx) - Card composition component

### Backend Core
- [api.php](../../orkela-back/routes/api.php) - All API routes (public + protected)
- [AuthController.php](../../orkela-back/app/Http/Controllers/Api/AuthController.php) - Dual authentication logic
- [ChecklistItemController.php](../../orkela-back/app/Http/Controllers/Api/ChecklistItemController.php) - Example of nested resource with auth
- [DatabaseSeeder.php](../../orkela-back/database/seeders/DatabaseSeeder.php) - Test data creation

## Recent Features Implemented

### ✅ Task Checklist/Subtasks System

**Backend:**
- Model: `ChecklistItem` with fields: task_id, text, is_completed, order
- Controller: `Api/ChecklistItemController` with CRUD + toggle + reorder
- Routes: Nested under tasks `/api/tasks/{task}/checklist`
- Relation: Task hasMany ChecklistItems (with cascade delete)

**Frontend:**
- Component: `src/components/tasks/TaskChecklist.jsx`
- Dual mode operation:
  - **Local mode** (creating new task): Items stored in component state
  - **API mode** (editing existing task): Items synced with backend via optimistic updates
- Features:
  - Add/delete/toggle completion of items
  - Progress bar showing completion percentage
  - Animated list with Framer Motion
  - No page reload on operations (fixed form nesting issue)

**TaskModal Integration:**
- Checklist appears after description field
- In create mode: items sent with task creation payload
- In edit mode: items managed via separate API calls

**Tasks Page:**
- Expandable checklist view in task cards
- Click to expand/collapse checklist items
- Visual indicator of checklist count

### ✅ Multi-User Task Assignment with react-select

**Installation:** `npm install react-select`

**TaskModal Features:**
- Select2-style multi-select dropdown for user assignment
- Custom components: `CustomOption` (with avatar) and `CustomMultiValue` (chips)
- Searchable dropdown with project members
- Styled to match application design (indigo focus colors)

**Backend:**
- `assigned_user_ids` array field on tasks
- Pivot table `task_user` for many-to-many relationship

### ✅ Custom Confirmation Modal (ConfirmModal)

**Component:** `src/components/ui/ConfirmModal.jsx`

**Features:**
- Replaces all native `confirm()` and `alert()` calls
- Three types: `danger` (red), `warning` (yellow), `info` (blue)
- Loading state support for async operations
- Framer Motion animations

**Usage Pattern:**
```jsx
const [confirmModal, setConfirmModal] = useState({
  isOpen: false,
  title: "",
  message: "",
  type: "danger",
  onConfirm: () => {},
});

// Open modal
setConfirmModal({
  isOpen: true,
  title: "Eliminar tarea",
  message: "¿Estás seguro de que deseas eliminar esta tarea?",
  type: "danger",
  onConfirm: async () => {
    await tasksAPI.delete(taskId);
    loadTasks();
  },
});

// Render
<ConfirmModal
  isOpen={confirmModal.isOpen}
  onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
  onConfirm={confirmModal.onConfirm}
  title={confirmModal.title}
  message={confirmModal.message}
  type={confirmModal.type}
/>
```

**Pages Updated:**
- Tasks.jsx
- Projects.jsx
- ProjectDetail.jsx
- Teams.jsx
- UsersManagement.jsx (admin)

### ✅ Teams Feature

**Backend:**
- Model: `Team` with fields: user_id, name, description, color, status
- Pivot table: `team_user` for team membership with role field
- Invitations: `team_invitations` table with email, token, expires_at
- Relationships: Team belongsTo User (owner), belongsToMany Users (members), hasMany Projects, hasMany TeamInvitations
- Controllers: TeamController (CRUD + getMembers), TeamInvitationController (sendInvitation, acceptInvitation, getPreviousCollaborators)
- Routes: `/api/teams`, `/api/teams/{teamId}/members`, `/api/teams/{team}/invite`, `/api/team-invitations/{token}/accept`, `/api/team-collaborators`
- Email: TeamInvitationMail with styled blade template
- Authorization: userHasTeamAccess() checks owner OR member

**Frontend:**
- Page: Teams.jsx - team listing with search, create/edit/delete, inline email invitations
- Modal: TeamModal.jsx - create/edit with react-select multi-member picker, color picker
- Component: AcceptTeamInvitation.jsx - handle email invitation acceptance
- API: teamsAPI (getAll, getById, create, update, delete, getMembers), teamInvitationsAPI (sendInvitation, acceptInvitation, getPreviousCollaborators)
- Navigation: Sidebar "Equipos" menu item, /teams and /accept-team-invitation/:token routes
- Features: 
  - Create teams with multiple members
  - Send email invitations to join teams
  - Assign teams to projects (optional team_id on projects)
  - Team members automatically get access to team's projects
  - Member count and project count display
  - Color-coded team cards

**Project Integration:**
- ProjectModal updated with team selection dropdown
- Projects can optionally belong to a team (team_id field)
- When project has a team, all team members get access automatically

### ✅ Real-Time Notifications (WebSockets)

**Architecture:**
- **Server**: Laravel Reverb (native Laravel WebSocket server)
- **Client**: Laravel Echo + Pusher.js
- **Broadcasting**: Event-based via private channels

**Key Files:**

1. **Echo Configuration** ([echo.js](../src/utils/echo.js)):
```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

export const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: false,
  enabledTransports: ['ws'],
  authEndpoint: 'http://orkela.localhost/api/broadcasting/auth',
});

export const updateEchoAuth = (token) => {
  echo.connector.options.auth = {
    headers: { Authorization: `Bearer ${token}` }
  };
};
```

2. **RealtimeContext** ([RealtimeContext.jsx](../src/context/RealtimeContext.jsx)):
```javascript
// Provides: isConnected, notifications, unreadCount, 
// markAsRead, clearAll, registerRefresh, unregisterRefresh
const { registerRefresh, unregisterRefresh } = useRealtime();
```

3. **NotificationsPanel** ([NotificationsPanel.jsx](../src/components/ui/NotificationsPanel.jsx)):
- Bell icon with unread badge
- Connection status indicator (green dot when connected)
- Dropdown list of notifications
- Mark as read / Clear all functionality
- Type-based icons and colors

**Usage in Pages:**

```jsx
import { useRealtime } from "../context/RealtimeContext";

const MyPage = () => {
  const { registerRefresh, unregisterRefresh } = useRealtime();

  const loadData = useCallback(async () => {
    // Load data from API
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Register refresh callback for realtime updates
  useEffect(() => {
    registerRefresh("myPage", loadData);
    return () => unregisterRefresh("myPage");
  }, [registerRefresh, unregisterRefresh, loadData]);

  // ...
};
```

**Notification Types:**
- `project_created`, `project_updated`, `project_deleted`
- `task_created`, `task_updated`, `task_assigned`, `task_completed`
- `checklist_item_completed`, `checklist_item_updated`
- `team_member_joined`, `team_deleted`
- `ticket_created`, `ticket_taken`, `ticket_assigned`, `ticket_resolved`, `ticket_comment_added`
- `organization_invitation_received`, `organization_member_removed`, `organization_role_updated`
- `info`, `success`, `warning`, `error`

**Environment Variables** (`.env`):
```env
VITE_REVERB_APP_KEY=dgczpergxfxyiffhkzvr
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=6001
VITE_REVERB_SCHEME=http
```

**Integration Points:**
- `App.jsx`: Wrapped with `<RealtimeProvider>`
- `Header.jsx`: Includes `<NotificationsPanel />`
- Pages (Projects, Tasks, Teams, Tickets, Organizations): Use `registerRefresh` for auto-reload

### ✅ Custom Confirmation Modal (ConfirmModal)

**Component:** `src/components/ui/ConfirmModal.jsx`

**Features:**
- Replaces all native `confirm()` and `alert()` calls
- Three types: `danger` (red), `warning` (yellow), `info` (blue)
- Loading state support for async operations
- Framer Motion animations

**Usage Pattern:**
```jsx
const [confirmModal, setConfirmModal] = useState({
  isOpen: false,
  title: "",
  message: "",
  type: "danger",
  onConfirm: () => {},
});

// Open modal
setConfirmModal({
  isOpen: true,
  title: "Eliminar tarea",
  message: "¿Estás seguro de que deseas eliminar esta tarea?",
  type: "danger",
  onConfirm: async () => {
    await tasksAPI.delete(taskId);
    loadTasks();
  },
});

// Render
<ConfirmModal
  isOpen={confirmModal.isOpen}
  onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
  onConfirm={confirmModal.onConfirm}
  title={confirmModal.title}
  message={confirmModal.message}
  type={confirmModal.type}
/>
```

**Pages Updated:**
- Tasks.jsx
- Projects.jsx
- ProjectDetail.jsx
- UsersManagement.jsx (admin)

## Component Structure Patterns

### Layout System

All authenticated pages use `Layout` component with `Sidebar` + `Header`. Sidebar toggles between expanded (ml-64) and collapsed (ml-20).

### UI Component Composition

```jsx
<Card hover>
  <Card.Header>...</Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>
```

## State Management

### Authentication
- Two separate auth systems via `AuthContext`
- Use `useAuth()` hook for `user`, `login`, `register`, `logout`
- User object includes `isSystemAdmin` flag
- Token + user persist in localStorage

### Notifications
- Toast system via `NotificationContext`
- Use `useNotification()` for `success`, `error`, `warning`, `info`
- Auto-dismiss after 5 seconds

### Protected Routes
Wrap authenticated pages with `<PrivateRoute>` in [App.jsx](../src/App.jsx)

## Styling Conventions

- **Tailwind CSS 4** with Vite plugin (no config file)
- Primary color: `indigo-600`
- Gradients: Use `bg-linear-to-br` (Tailwind 4 syntax, NOT `bg-gradient-to-br`)
- Spacing: `p-6` for cards, `space-y-5` for forms
- Responsive: Mobile-first, use `md:` and `lg:` breakpoints

## Development Workflow

### Frontend (orkela-front/)
```bash
npm run dev      # Vite dev server - http://localhost:5173 or :5174
npm run build    # Production build
npm run lint     # ESLint check
```

### Backend (orkela-back/)
```bash
# Backend served on Apache - http://orkela.localhost/
# OR use development server:
php artisan serve    # http://localhost:8000
php artisan migrate  # Run migrations
php artisan db:seed  # Seed test data
```

## API Structure

### Base URLs
- Apache: `http://orkela.localhost/api`
- Artisan: `http://localhost:8000/api`

### Key Endpoints
- `POST /api/login` - Dual auth (system_admins first, then users)
- `GET /api/user` - Get authenticated user
- `/api/projects` - Projects CRUD
- `/api/tasks` - Tasks CRUD
- `/api/tasks/{task}/checklist` - Checklist items CRUD + toggle/reorder
- `/api/admin/users` - Admin: user management

## Database Schema

**system_admins** - Platform administrators  
**users** - Application users (belongsToMany Projects via project_user)  
**projects** - belongsTo User, hasMany Tasks  
**tasks** - belongsTo Project, belongsToMany Users (assigned via task_user), hasMany ChecklistItems  
**checklist_items** - belongsTo Task (cascade delete on task delete)  
**task_user** - Pivot for multi-user assignment

### Test Credentials
Run `php artisan db:seed` to create:
- **System Admin**: `admin@orkela.com` / `password`
- **App Users**: `demo@orkela.com`, `maria@orkela.com`, `carlos@orkela.com` / `password`

## Known Issues & Solutions

### Form Inside Form (Fixed)
Checklist wrapper changed to `<div>`, buttons use `type="button"` with `e.stopPropagation()`

### Visual Flickering on List Updates (Fixed)
Use `useRef` for initial items, maintain `tempId` after server response, use `key={item.tempId || item.id}`

### Native Alerts (Replaced)
NEVER use `confirm()` or `alert()` - always use `ConfirmModal`

## Dependencies

### Frontend
- React 19 + React Router 7
- Vite (build tool)
- Tailwind CSS 4
- Framer Motion 11
- react-select 5
- lucide-react (icons)
- laravel-echo (WebSocket client)
- pusher-js (WebSocket transport)

### Backend
- Laravel 12
- Laravel Sanctum (auth)
- Laravel Reverb (WebSockets)
- MySQL


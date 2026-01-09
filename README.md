# Orkela Projects - Sistema de Gestión de Proyectos

Sistema moderno de gestión de proyectos construido con React, Vite y Tailwind CSS.

## 🚀 Características

- ✅ **Autenticación de usuarios** - Login y registro con validación
- 📊 **Dashboard interactivo** - Visualización de estadísticas y métricas
- 📁 **Gestión de proyectos** - Crea, edita y organiza proyectos
- ✔️ **Sistema de tareas** - Administra tareas con prioridades y estados
- 👥 **Gestión de equipo** - Administra miembros y colaboradores
- ⚙️ **Configuración** - Personaliza tu perfil y preferencias
- 🎨 **Diseño moderno** - Interfaz profesional con Tailwind CSS
- 📱 **Responsive** - Adaptado para todos los dispositivos

## 🛠️ Tecnologías

- **React 18** - Biblioteca de UI
- **Vite** - Build tool ultrarrápido
- **Tailwind CSS** - Framework de estilos
- **React Router** - Navegación
- **Lucide React** - Iconos modernos

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── layout/         # Layout components (Sidebar, Header)
│   └── ui/             # UI components (Button, Card, Modal)
├── context/            # Context API (Auth)
├── pages/              # Páginas de la aplicación
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── Projects.jsx
│   ├── Tasks.jsx
│   ├── Team.jsx
│   └── Settings.jsx
├── hooks/              # Custom hooks
├── utils/              # Utilidades
├── App.jsx             # Componente principal
└── main.jsx            # Entry point
```

## 🔐 Autenticación

El sistema incluye un contexto de autenticación que gestiona el estado del usuario. Actualmente usa datos mock, pero está preparado para conectarse con un backend.

Para conectar con tu API, modifica los métodos en `src/context/AuthContext.jsx`:

- `login(email, password)`
- `register(name, email, password)`
- `logout()`

## 🎨 Personalización

### Colores

Los colores principales se pueden modificar en la configuración de Tailwind. Los colores actuales son:

- Primary: Indigo (indigo-600)
- Success: Green (green-500)
- Warning: Yellow (yellow-500)
- Danger: Red (red-500)

### Componentes UI

Los componentes reutilizables están en `src/components/ui/`:

- `Button.jsx` - Botones con variantes
- `Card.jsx` - Tarjetas con header, body y footer
- `Modal.jsx` - Modal responsive

## 📱 Páginas Disponibles

- `/login` - Inicio de sesión
- `/register` - Registro de usuarios
- `/dashboard` - Panel principal
- `/projects` - Gestión de proyectos
- `/tasks` - Gestión de tareas
- `/team` - Gestión de equipo
- `/settings` - Configuración

## 🔄 Próximos Pasos

1. Conectar con backend (API REST o GraphQL)
2. Implementar gestión de estado global (Zustand/Redux)
3. Agregar funcionalidad de tiempo real (WebSockets)
4. Implementar drag & drop para tareas
5. Agregar notificaciones en tiempo real
6. Implementar sistema de archivos adjuntos
7. Agregar reportes y analytics

## 📄 Licencia

Este proyecto es privado y pertenece a Orkela.

---

Desarrollado con ❤️ usando React + Vite + Tailwind CSS

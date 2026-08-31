# Portal de Clientes (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir las 7 vistas nuevas del portal de clientes — 4 públicas (bandeja tipo conversación, Propuesta C) + 3 internas (`/clients` maestro-detalle, Propuesta B, más `/client-tickets`) — sobre la API que el backend ya expone.

**Architecture:** React 19 + Vite + React Router 7, reusando el sistema de diseño existente (`motionTokens`, `Button`, iconos `lucide-react`, paleta `brand`/`accent` de `index.css`) sin inventar ninguno nuevo. El portal público es un guard de auth independiente (token propio en `localStorage`, conexión Echo separada) que vive fuera de `PrivateRoute`; el panel interno se integra al layout autenticado que ya existe.

**Tech Stack:** React 19, React Router 7, framer-motion, lucide-react, laravel-echo/pusher-js (ya en uso), Tailwind 4. Sin framework de testing en este repo (no hay vitest/jest) — la verificación de cada tarea es `npm run lint` + `npm run build` + comprobación manual en el navegador vía el dev server, no tests automatizados. Esto sigue el patrón ya establecido del repo, no lo inventa esta plan.

**Spec:** [docs/superpowers/specs/2026-08-30-portal-clientes-frontend-design.md](../specs/2026-08-30-portal-clientes-frontend-design.md)

## Global Constraints

- Reusar `motionTokens`/`--ease-brand` de `src/components/animations/variants.js` — ninguna curva/duración nueva.
- Reusar los iconos de tipo/estado de ticket ya definidos en `src/pages/Tickets.jsx` (Bug/Lightbulb/HelpCircle/Headphones/MessageSquare/MoreHorizontal para tipo; los colores de estado open=azul, in_progress=brand, pending=amarillo, resolved=verde, closed=gris) — mismo vocabulario visual en el portal público y en las vistas internas.
- Token del portal en `localStorage` bajo la key `orkela_portal_token`, **nunca** la key `token` que usa el login interno — deben poder coexistir en el mismo navegador sin pisarse.
- Cualquier fetch del portal que reciba 401 dispara el evento global `window.dispatchEvent(new CustomEvent("portal:unauthorized"))` — `PortalLayout` es el único que escucha ese evento y decide a dónde redirigir. Ninguna otra parte del código debe manejar 401 del portal por su cuenta.
- **Nota sobre orden de rutas:** a diferencia de Laravel (backend), React Router 6+ rankea rutas por especificidad, no por orden de declaración — un segmento literal (`/portal/dashboard`) siempre gana sobre uno dinámico (`/portal/:orgSlug`) sin importar en qué orden se declaren en el JSX. No hace falta reordenar nada por esto, pero la Tarea 11 incluye una verificación manual explícita de que `/portal/dashboard` resuelve a la pantalla correcta — es exactamente la clase de bug silencioso que ya mordió una vez al backend de este mismo proyecto.
- Task 1 es la única tarea que toca `orkela-back` (agrega un campo a una respuesta ya existente). Todo lo demás vive en `orkela-front`.
- Cada tarea que agrega o cambia una pantalla incluye un paso de verificación manual con el dev server — no se skippea aunque "se vea bien a simple vista" en el código.

---

## Task 1: Backend — incluir la organización en `GET /api/portal/me`

**Files:**
- Modify: `orkela-back/app/Http/Controllers/Api/Portal/PortalTicketController.php`
- Modify: `orkela-back/tests/Feature/ClientPortalAuthTest.php`

**Interfaces:**
- Produces: `GET /api/portal/me` ahora incluye `organization: { slug, name, logo }` — lo necesita el frontend para saber a qué organización pedirle un magic link nuevo cuando el token expira y el cliente no llegó ahí por `/portal/{orgSlug}` (llegó directo por el link de un correo, que no lleva el slug en la URL).

- [ ] **Step 1: Modificar `PortalTicketController::me()`**

En `orkela-back/app/Http/Controllers/Api/Portal/PortalTicketController.php`, reemplazar el método `me()` completo por:

```php
    /**
     * Datos del cliente autenticado (por token) + lista de sus tickets.
     */
    public function me(Request $request)
    {
        $client = $request->user();
        $organization = $client->organization;

        $tickets = Ticket::where('client_id', $client->id)
            ->latest()
            ->get(['id', 'title', 'type', 'priority', 'status', 'created_at', 'resolved_at', 'closed_at']);

        return response()->json([
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'company_name' => $client->company_name,
                'email' => $client->email,
            ],
            'organization' => [
                'slug' => $organization->slug,
                'name' => $organization->name,
                'logo' => $organization->logo,
            ],
            'tickets' => $tickets,
        ]);
    }
```

- [ ] **Step 2: Actualizar el test existente**

En `orkela-back/tests/Feature/ClientPortalAuthTest.php`, en `test_valid_token_authenticates_and_returns_client_info`, el `assertJson` ya verifica `client`. Agregar, justo después del bloque `$response->assertJson([...]);` existente, esta aserción adicional:

```php
        $response->assertJson([
            'organization' => [
                'slug' => $organization->slug,
                'name' => $organization->name,
            ],
        ]);
```

- [ ] **Step 3: Correr el test**

Run (desde `orkela-back`): `php artisan test --filter ClientPortalAuthTest`
Expected: PASS (4 tests)

- [ ] **Step 4: Correr la suite completa de portal como regresión**

Run: `php artisan test --filter Portal`
Expected: PASS, sin romper nada de lo que ya estaba

- [ ] **Step 5: Commit**

```bash
cd orkela-back
git add app/Http/Controllers/Api/Portal/PortalTicketController.php tests/Feature/ClientPortalAuthTest.php
git commit -m "feat: incluir organization en la respuesta de /api/portal/me"
```

---

## Task 2: `utils/portalApi.js` — cliente API del portal

**Files:**
- Create: `orkela-front/src/utils/portalApi.js`

**Interfaces:**
- Produces: `portalAPI.{getOrgInfo, requestAccess, me, createTicket, getTicket, addComment}`, `getPortalToken()`, `setPortalToken(token)`, `clearPortalToken()`, `getPortalOrgSlug()`, `setPortalOrgSlug(slug)`, `PortalAPIError`.

- [ ] **Step 1: Crear el archivo**

```js
const API_URL = import.meta.env.VITE_API_URL || "http://orkela.localhost/api";

const PORTAL_TOKEN_KEY = "orkela_portal_token";
const PORTAL_ORG_SLUG_KEY = "orkela_portal_org_slug";

export class PortalAPIError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = "PortalAPIError";
    this.status = status;
    this.data = data;
  }
}

export const getPortalToken = () => localStorage.getItem(PORTAL_TOKEN_KEY);
export const setPortalToken = (token) =>
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
export const clearPortalToken = () =>
  localStorage.removeItem(PORTAL_TOKEN_KEY);

export const getPortalOrgSlug = () => localStorage.getItem(PORTAL_ORG_SLUG_KEY);
export const setPortalOrgSlug = (slug) =>
  localStorage.setItem(PORTAL_ORG_SLUG_KEY, slug);

// Helper de peticiones del portal: manda el token del portal, nunca la
// sesión interna de Sanctum. Un 401 dispara un evento global que
// PortalLayout escucha para decidir a dónde redirigir.
const portalRequest = async (endpoint, options = {}) => {
  const token = getPortalToken();

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("portal:unauthorized"));
    }
    throw new PortalAPIError(
      data.message || "Error en la petición",
      response.status,
      data
    );
  }

  return data;
};

export const portalAPI = {
  getOrgInfo: async (orgSlug) => {
    return await portalRequest(`/portal/${orgSlug}`);
  },

  requestAccess: async (orgSlug, email) => {
    return await portalRequest(`/portal/${orgSlug}/request-access`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  me: async () => {
    return await portalRequest("/portal/me");
  },

  createTicket: async (ticketData) => {
    return await portalRequest("/portal/tickets", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
  },

  getTicket: async (id) => {
    return await portalRequest(`/portal/tickets/${id}`);
  },

  addComment: async (id, content) => {
    return await portalRequest(`/portal/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};
```

- [ ] **Step 2: Lint**

Run (desde `orkela-front`): `npm run lint`
Expected: sin errores nuevos en `src/utils/portalApi.js`

- [ ] **Step 3: Commit**

```bash
cd orkela-front
git add src/utils/portalApi.js
git commit -m "feat: cliente API del portal de clientes"
```

---

## Task 3: `utils/echo.js` — conexión Echo del portal

**Files:**
- Modify: `orkela-front/src/utils/echo.js`

**Interfaces:**
- Consumes: nada nuevo (misma librería `laravel-echo`/`pusher-js` ya importada arriba del archivo)
- Produces: `getPortalEcho(token)`, `disconnectPortalEcho()` — instancia Echo separada de la interna (`echoInstance`), apuntando a `/api/portal/broadcasting/auth` con el token del portal.

- [ ] **Step 1: Agregar al final de `src/utils/echo.js`, antes del `export default`**

```js
// Instancia de Echo separada para el portal de clientes — autentica con
// el token del portal, no con la sesión de Sanctum del staff interno.
let portalEchoInstance = null;

export const getPortalEcho = (token) => {
  if (!portalEchoInstance) {
    portalEchoInstance = new Echo({
      broadcaster: "reverb",
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
      wsPort: parseInt(import.meta.env.VITE_REVERB_PORT) || 6001,
      wssPort: parseInt(import.meta.env.VITE_REVERB_PORT) || 6001,
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "http") === "https",
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${
        import.meta.env.VITE_API_URL || "http://orkela.localhost/api"
      }/portal/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
        },
      },
    });
  }
  return portalEchoInstance;
};

export const disconnectPortalEcho = () => {
  if (portalEchoInstance) {
    portalEchoInstance.disconnect();
    portalEchoInstance = null;
  }
};
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores nuevos

- [ ] **Step 3: Commit**

```bash
git add src/utils/echo.js
git commit -m "feat: conexión Echo separada para el portal de clientes"
```

---

## Task 4: `utils/api.js` — `clientsAPI` + extensión de `ticketsAPI`

**Files:**
- Modify: `orkela-front/src/utils/api.js`

**Interfaces:**
- Produces: `clientsAPI.{getAll, getById, create, update, archive, resendAccess}`, `ticketsAPI.getClientInbox(filters)`, `ticketsAPI.assignToTeam(id, teamId)`.

- [ ] **Step 1: Agregar `getClientInbox`/`assignToTeam` dentro del objeto `ticketsAPI` ya existente**

Localizar el objeto `ticketsAPI` (empieza en la línea que dice `export const ticketsAPI = {`) y agregar estos dos métodos junto a `getStats` (antes del cierre `};` del objeto):

```js
  getClientInbox: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.unassigned) params.append("unassigned", "1");
    if (filters.client_id) params.append("client_id", filters.client_id);

    const query = params.toString();
    return await request(`/client-tickets${query ? `?${query}` : ""}`);
  },

  assignToTeam: async (id, teamId) => {
    return await request(`/tickets/${id}/assign-team`, {
      method: "POST",
      body: JSON.stringify({ team_id: teamId }),
    });
  },
```

Nota: `client_id` como filtro de `getClientInbox` es conveniencia del frontend (usado desde `ClientsManagement` → "Ver todos" hacia `/client-tickets?client={id}`) — el backend ignora silenciosamente cualquier query param que no reconozca, así que no rompe nada si el filtro no está implementado del lado del servidor; el filtrado por cliente en ese caso se hace en el propio frontend sobre la respuesta ya recibida (ver Task 14).

- [ ] **Step 2: Agregar `clientsAPI` al final del archivo**

```js
export const clientsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);

    const query = params.toString();
    return await request(`/clients${query ? `?${query}` : ""}`);
  },

  getById: async (id) => {
    return await request(`/clients/${id}`);
  },

  create: async (clientData) => {
    return await request("/clients", {
      method: "POST",
      body: JSON.stringify(clientData),
    });
  },

  update: async (id, clientData) => {
    return await request(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(clientData),
    });
  },

  archive: async (id) => {
    return await request(`/clients/${id}`, {
      method: "DELETE",
    });
  },

  resendAccess: async (id) => {
    return await request(`/clients/${id}/resend-access`, {
      method: "POST",
    });
  },
};
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos

- [ ] **Step 4: Commit**

```bash
git add src/utils/api.js
git commit -m "feat: clientsAPI y extensión de ticketsAPI para el portal"
```

---

## Task 5: `PortalLayout` — shell público + guard de acceso

**Files:**
- Create: `orkela-front/src/components/portal/PortalLayout.jsx`

**Interfaces:**
- Consumes: `getPortalToken`, `clearPortalToken`, `getPortalOrgSlug` (Task 2), evento global `portal:unauthorized` (Task 2)
- Produces: `<PortalLayout>{children}</PortalLayout>` — envuelve toda pantalla del portal público.

- [ ] **Step 1: Crear el archivo**

```jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPortalToken,
  clearPortalToken,
  getPortalOrgSlug,
} from "../../utils/portalApi";

/**
 * Shell del portal público de clientes. No usa el layout interno de
 * Orkela (sin sidebar) — header mínimo con la marca de la organización.
 *
 * Guard de acceso: si no hay token, o si cualquier request del portal
 * responde 401 (evento global "portal:unauthorized"), redirige a la
 * pantalla de solicitar acceso de la organización guardada, o muestra
 * un mensaje si ni siquiera eso se conoce (primera visita con un link
 * roto, sin haber pasado nunca por un magic link válido).
 */
const PortalLayout = ({ children }) => {
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(() => Boolean(getPortalToken()));

  useEffect(() => {
    const handleUnauthorized = () => {
      clearPortalToken();
      setHasToken(false);
      const orgSlug = getPortalOrgSlug();
      if (orgSlug) {
        navigate(`/portal/${orgSlug}`, { replace: true });
      }
    };

    window.addEventListener("portal:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("portal:unauthorized", handleUnauthorized);
  }, [navigate]);

  if (!hasToken) {
    const orgSlug = getPortalOrgSlug();
    if (orgSlug) {
      navigate(`/portal/${orgSlug}`, { replace: true });
      return null;
    }

    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] p-6 text-center'>
        <div>
          <p className='text-gray-900 font-semibold mb-2'>
            No pudimos verificar tu acceso
          </p>
          <p className='text-gray-500 text-sm max-w-sm'>
            Revisa el correo con tu enlace de acceso al portal, o contacta al
            equipo de soporte para que te reenvíen uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#f7f5fb] flex flex-col'>
      <header className='border-b border-gray-200 bg-white px-6 py-3.5 flex items-center gap-2.5 shrink-0'>
        <img
          src='/img/isotipo_orkela.png'
          alt=''
          className='w-8 h-8 object-contain'
          aria-hidden='true'
        />
        <span className='font-bold text-gray-900'>Portal de soporte</span>
      </header>
      <main className='flex-1 flex flex-col min-h-0'>{children}</main>
    </div>
  );
};

export default PortalLayout;
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores nuevos

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/PortalLayout.jsx
git commit -m "feat: shell y guard de acceso del portal de clientes"
```

(Este componente no es visible aún por sí solo — se verifica junto con la primera pantalla que lo usa, Task 6.)

---

## Task 6: `PortalAccessRequest` — pantalla de solicitar acceso

**Files:**
- Create: `orkela-front/src/pages/portal/PortalAccessRequest.jsx`
- Modify: `orkela-front/src/App.jsx`

**Interfaces:**
- Consumes: `portalAPI.getOrgInfo`, `portalAPI.requestAccess` (Task 2), `Button` (existente), `motionTokens` (existente)
- Produces: ruta pública `/portal/:orgSlug`

- [ ] **Step 1: Crear `PortalAccessRequest.jsx`**

```jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Send } from "lucide-react";
import { portalAPI } from "../../utils/portalApi";
import { motionTokens } from "../../components/animations/variants";
import Button from "../../components/ui/Button";

const PortalAccessRequest = () => {
  const { orgSlug } = useParams();
  const [org, setOrg] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    portalAPI
      .getOrgInfo(orgSlug)
      .then(setOrg)
      .catch(() => setNotFound(true));
  }, [orgSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await portalAPI.requestAccess(orgSlug, email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] p-6 text-center'>
        <p className='text-gray-700'>
          No encontramos este portal de soporte. Verifica el enlace que te
          compartieron.
        </p>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] p-6'>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionTokens.duration.slow,
          ease: motionTokens.ease,
        }}
        className='w-full max-w-md bg-white rounded-2xl shadow-lg p-8'
      >
        <div className='flex items-center gap-2.5 mb-6'>
          <img
            src='/img/isotipo_orkela.png'
            alt=''
            className='w-9 h-9 object-contain'
            aria-hidden='true'
          />
          <span className='font-extrabold text-xl text-brand-700'>
            {org?.name || "Portal de soporte"}
          </span>
        </div>

        {sent ? (
          <p className='text-gray-700'>
            Si tu correo está registrado, te llegará un enlace de acceso en
            breve. Revisa tu bandeja de entrada.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-5' noValidate>
            <h2 className='text-2xl font-extrabold text-gray-900'>
              Accede a tus tickets
            </h2>
            <p className='text-gray-500 text-sm'>
              Escribe el correo con el que te registró{" "}
              {org?.name || "la organización"} y te enviaremos un enlace de
              acceso.
            </p>
            <div className='relative'>
              <Mail
                aria-hidden='true'
                className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400'
              />
              <input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='tu@empresa.com'
                autoComplete='email'
                className='w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
            <Button
              type='submit'
              variant='brand'
              size='xl'
              loading={loading}
              loadingText='Enviando...'
              className='w-full'
            >
              <Send className='w-5 h-5' />
              Enviar enlace de acceso
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default PortalAccessRequest;
```

- [ ] **Step 2: Agregar la ruta en `App.jsx`**

Agregar el import lazy junto a los demás (después de `AcceptOrganizationInvitation`):

```jsx
const PortalAccessRequest = lazy(() => import("./pages/portal/PortalAccessRequest"));
```

Agregar la ruta dentro de `<Routes>`, junto a las demás rutas públicas (después de `/accept-organization-invitation/:token`):

```jsx
                <Route path='/portal/:orgSlug' element={<PortalAccessRequest />} />
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos

- [ ] **Step 4: Verificación manual**

Iniciar el dev server (`npm run dev` o el preview del harness) y navegar a `http://localhost:5173/portal/acme-inc` (o el slug real de una organización de prueba que exista en la base de datos local). Confirmar:
- Se ve el formulario con el nombre de la organización si el slug existe.
- Si el slug no existe, se ve el mensaje "No encontramos este portal...".
- Enviar el formulario muestra el mensaje genérico de "revisa tu bandeja".

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalAccessRequest.jsx src/App.jsx
git commit -m "feat: pantalla de solicitar acceso al portal de clientes"
```

---

## Task 7: `PortalAccessConsume` — consumir el magic link

**Files:**
- Create: `orkela-front/src/pages/portal/PortalAccessConsume.jsx`
- Modify: `orkela-front/src/App.jsx`

**Interfaces:**
- Consumes: `portalAPI.me`, `setPortalToken`, `setPortalOrgSlug` (Task 2)
- Produces: ruta pública `/portal/access/:token`

- [ ] **Step 1: Crear `PortalAccessConsume.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { setPortalToken, setPortalOrgSlug, portalAPI } from "../../utils/portalApi";

const PortalAccessConsume = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    setPortalToken(token);

    portalAPI
      .me()
      .then((data) => {
        setPortalOrgSlug(data.organization.slug);
        const redirect = searchParams.get("redirect");
        navigate(redirect || "/portal/dashboard", { replace: true });
      })
      .catch(() => {
        setError(
          "Este enlace ya no es válido. Pide uno nuevo desde tu correo o contacta a soporte."
        );
      });
    // Solo debe correr una vez, al montar con el token de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb] p-6 text-center'>
        <p className='text-gray-700 max-w-sm'>{error}</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#f7f5fb]'>
      <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600'></div>
    </div>
  );
};

export default PortalAccessConsume;
```

- [ ] **Step 2: Agregar la ruta en `App.jsx`**

Import lazy junto al de `PortalAccessRequest`:

```jsx
const PortalAccessConsume = lazy(() => import("./pages/portal/PortalAccessConsume"));
```

Ruta, después de `/portal/:orgSlug`:

```jsx
                <Route path='/portal/access/:token' element={<PortalAccessConsume />} />
```

- [ ] **Step 3: Lint**

Run: `npm run lint`

- [ ] **Step 4: Verificación manual**

Generar un token válido (ej. vía tinker en `orkela-back`: `Client::first()->issuePortalToken()` y copiar el valor devuelto), navegar a `http://localhost:5173/portal/access/{ese-token}` y confirmar que redirige a `/portal/dashboard` sin quedarse en el spinner. Navegar con un token inventado y confirmar que se ve el mensaje de error.

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalAccessConsume.jsx src/App.jsx
git commit -m "feat: consumir el magic link de acceso al portal"
```

---

## Task 8: `PortalInbox` — el rail de tickets

**Files:**
- Create: `orkela-front/src/components/portal/PortalInbox.jsx`

**Interfaces:**
- Produces: `<PortalInbox tickets={[]} selectedId={null} onSelect={(id) => {}} onNewTicket={() => {}} />`. Cada ticket en `tickets` puede traer `has_unread: boolean` (estado derivado en el cliente, no viene del backend — lo agrega `PortalInboxScreen` en la Task 11).

- [ ] **Step 1: Crear el archivo**

```jsx
import {
  Bug,
  HelpCircle,
  Lightbulb,
  Headphones,
  MessageSquare,
  MoreHorizontal,
  Plus,
} from "lucide-react";

const typeIcons = {
  request: MessageSquare,
  bug: Bug,
  question: HelpCircle,
  feature: Lightbulb,
  support: Headphones,
  other: MoreHorizontal,
};

const statusDotColor = {
  open: "bg-blue-500",
  in_progress: "bg-brand-600",
  pending: "bg-yellow-500",
  resolved: "bg-green-500",
  closed: "bg-gray-400",
};

const statusLabels = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const PortalInbox = ({ tickets, selectedId, onSelect, onNewTicket }) => {
  return (
    <div className='flex flex-col h-full'>
      <div className='p-4 border-b border-gray-200 flex items-center justify-between shrink-0'>
        <h1 className='font-bold text-gray-900'>Mis tickets</h1>
        <button
          onClick={onNewTicket}
          aria-label='Nuevo ticket'
          className='w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors'
        >
          <Plus className='w-5 h-5' />
        </button>
      </div>
      <div className='flex-1 overflow-y-auto'>
        {tickets.length === 0 ? (
          <div className='p-6 text-center text-gray-500 text-sm'>
            Aún no tienes tickets. Crea el primero con el botón de arriba.
          </div>
        ) : (
          tickets.map((ticket) => {
            const Icon = typeIcons[ticket.type] || MessageSquare;
            const isSelected = ticket.id === selectedId;
            return (
              <button
                key={ticket.id}
                onClick={() => onSelect(ticket.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 flex items-start gap-3 transition-colors ${
                  isSelected ? "bg-brand-50" : "hover:bg-gray-50"
                }`}
              >
                <Icon
                  aria-hidden='true'
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isSelected ? "text-brand-600" : "text-gray-400"
                  }`}
                />
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span
                      className={`text-sm font-medium truncate ${
                        isSelected ? "text-brand-700" : "text-gray-900"
                      }`}
                    >
                      {ticket.title}
                    </span>
                    {ticket.has_unread && (
                      <span
                        aria-label='Actualización nueva'
                        className='w-2 h-2 rounded-full bg-brand-600 shrink-0'
                      />
                    )}
                  </div>
                  <div className='flex items-center gap-1.5 mt-1'>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        statusDotColor[ticket.status]
                      }`}
                      aria-hidden='true'
                    />
                    <span className='text-xs text-gray-500'>
                      {statusLabels[ticket.status] || ticket.status}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PortalInbox;
```

- [ ] **Step 2: Lint**

Run: `npm run lint`

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/PortalInbox.jsx
git commit -m "feat: rail de tickets del portal de clientes"
```

(Componente de presentación puro, sin estado propio de red — se verifica visualmente integrado en la Task 11.)

---

## Task 9: `PortalThread` — el hilo de conversación

**Files:**
- Create: `orkela-front/src/components/portal/PortalThread.jsx`

**Interfaces:**
- Produces: `<PortalThread ticket={ticketOrNull} onBack={() => {}} onSendComment={async (content) => {}} sending={false} />`. `ticket.comments[]` puede traer `client_id` (comentario del cliente) o `user: {name}` (comentario del staff) — mutuamente excluyentes, igual que en el backend.

- [ ] **Step 1: Crear el archivo**

```jsx
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { motionTokens } from "../animations/variants";

const statusLabels = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const statusBadgeColor = {
  open: "bg-blue-50 text-blue-600",
  in_progress: "bg-brand-50 text-brand-600",
  pending: "bg-yellow-50 text-yellow-600",
  resolved: "bg-green-50 text-green-600",
  closed: "bg-gray-100 text-gray-600",
};

const DRAFT_KEY_PREFIX = "orkela_portal_draft_";

const PortalThread = ({ ticket, onBack, onSendComment, sending }) => {
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.comments?.length]);

  // Restaura el borrador de este ticket si había uno guardado — cubre el
  // caso de que el token haya expirado a medio escribir: PortalLayout
  // redirige (desmontando este componente) antes de que el envío pueda
  // completarse, así que el borrador debe sobrevivir en sessionStorage,
  // no solo en el estado local de React.
  useEffect(() => {
    if (!ticket) return;
    const saved = sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${ticket.id}`);
    setDraft(saved || "");
  }, [ticket?.id]);

  useEffect(() => {
    if (!ticket) return;
    if (draft) {
      sessionStorage.setItem(`${DRAFT_KEY_PREFIX}${ticket.id}`, draft);
    } else {
      sessionStorage.removeItem(`${DRAFT_KEY_PREFIX}${ticket.id}`);
    }
  }, [draft, ticket?.id]);

  if (!ticket) {
    return (
      <div className='hidden md:flex flex-1 items-center justify-center text-gray-400 text-sm'>
        Selecciona un ticket para ver la conversación
      </div>
    );
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSendError(null);
    try {
      await onSendComment(draft);
      setDraft("");
    } catch {
      setSendError("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    }
  };

  return (
    <div className='flex-1 flex flex-col min-w-0 h-full'>
      <div className='p-4 border-b border-gray-200 flex items-center gap-3 shrink-0'>
        <button
          onClick={onBack}
          aria-label='Volver a mis tickets'
          className='md:hidden text-gray-500'
        >
          <ArrowLeft className='w-5 h-5' />
        </button>
        <div className='min-w-0 flex-1'>
          <p className='font-semibold text-gray-900 truncate'>{ticket.title}</p>
        </div>
        <motion.span
          key={ticket.status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: motionTokens.duration.fast }}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusBadgeColor[ticket.status]}`}
        >
          {statusLabels[ticket.status] || ticket.status}
        </motion.span>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-3'>
        <div className='max-w-[80%] bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-700'>
          {ticket.description}
        </div>
        {(ticket.comments || []).map((comment) => {
          const isClient = Boolean(comment.client_id);
          return (
            <div key={comment.id} className={`max-w-[80%] ${isClient ? "ml-auto" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  isClient
                    ? "bg-brand-600 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-700 rounded-tl-sm"
                }`}
              >
                {comment.content}
              </div>
              {!isClient && comment.user?.name && (
                <p className='text-xs text-gray-400 mt-1 px-1'>{comment.user.name}</p>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className='p-4 border-t border-gray-200 shrink-0'>
        {sendError && <p className='text-xs text-red-600 mb-2'>{sendError}</p>}
        <div className='flex items-center gap-2'>
          <input
            type='text'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='Escribe una respuesta...'
            disabled={sending}
            className='flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60'
          />
          <button
            type='submit'
            disabled={sending || !draft.trim()}
            aria-label='Enviar'
            className='w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 transition-colors'
          >
            <Send className='w-4.5 h-4.5' />
          </button>
        </div>
      </form>
    </div>
  );
};

export default PortalThread;
```

- [ ] **Step 2: Lint**

Run: `npm run lint`

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/PortalThread.jsx
git commit -m "feat: hilo de conversación del portal de clientes"
```

---

## Task 10: `PortalNewTicketModal`

**Files:**
- Create: `orkela-front/src/components/portal/PortalNewTicketModal.jsx`

**Interfaces:**
- Produces: `<PortalNewTicketModal isOpen={bool} onClose={() => {}} onCreate={async ({title, description, type, priority}) => {}} />`

- [ ] **Step 1: Crear el archivo**

```jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { motionTokens } from "../animations/variants";

const typeOptions = [
  { value: "bug", label: "Reportar un problema" },
  { value: "feature", label: "Pedir una función nueva" },
  { value: "question", label: "Pregunta" },
  { value: "support", label: "Soporte" },
  { value: "other", label: "Otro" },
];

const priorityOptions = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const PortalNewTicketModal = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onCreate({ title, description, type, priority });
      setTitle("");
      setDescription("");
      setType("bug");
      setPriority("medium");
    } catch {
      setError("No se pudo crear el ticket. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
            onClick={(e) => e.stopPropagation()}
            className='bg-white rounded-2xl w-full max-w-lg p-6'
          >
            <div className='flex items-center justify-between mb-5'>
              <h2 className='text-xl font-bold text-gray-900'>Nuevo ticket</h2>
              <button onClick={onClose} aria-label='Cerrar' className='text-gray-400 hover:text-gray-600'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4' noValidate>
              {error && <p className='text-sm text-red-600'>{error}</p>}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Título</label>
                <input
                  type='text'
                  required
                  maxLength={255}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Descripción</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type='submit'
                variant='brand'
                size='lg'
                loading={loading}
                loadingText='Creando...'
                className='w-full'
              >
                Crear ticket
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PortalNewTicketModal;
```

- [ ] **Step 2: Lint**

Run: `npm run lint`

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/PortalNewTicketModal.jsx
git commit -m "feat: modal de nuevo ticket del portal de clientes"
```

---

## Task 11: `PortalInboxScreen` — armar todo + rutas del dashboard

**Files:**
- Create: `orkela-front/src/pages/portal/PortalInboxScreen.jsx`
- Modify: `orkela-front/src/App.jsx`

**Interfaces:**
- Consumes: `PortalLayout` (Task 5), `PortalInbox` (Task 8), `PortalThread` (Task 9), `PortalNewTicketModal` (Task 10), `portalAPI` + `getPortalToken` (Task 2), `getPortalEcho`/`disconnectPortalEcho` (Task 3)
- Produces: rutas `/portal/dashboard` y `/portal/tickets/:id` — misma pantalla, con o sin ticket preseleccionado.

- [ ] **Step 1: Crear `PortalInboxScreen.jsx`**

```jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PortalLayout from "../../components/portal/PortalLayout";
import PortalInbox from "../../components/portal/PortalInbox";
import PortalThread from "../../components/portal/PortalThread";
import PortalNewTicketModal from "../../components/portal/PortalNewTicketModal";
import { portalAPI, getPortalToken } from "../../utils/portalApi";
import { getPortalEcho, disconnectPortalEcho } from "../../utils/echo";

const PortalInboxScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [clientId, setClientId] = useState(null);

  const selectedId = id ? Number(id) : null;

  useEffect(() => {
    portalAPI.me().then((data) => {
      setClientId(data.client.id);
      setTickets(data.tickets);
      setLoading(false);
      if (!selectedId && data.tickets.length > 0) {
        navigate(`/portal/tickets/${data.tickets[0].id}`, { replace: true });
      }
    });
    // Solo debe correr al montar — la selección se maneja aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTicket(null);
      return;
    }
    portalAPI.getTicket(selectedId).then(setSelectedTicket);
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, has_unread: false } : t))
    );
  }, [selectedId]);

  useEffect(() => {
    if (!clientId) return;

    const echo = getPortalEcho(getPortalToken());
    const channel = echo.private(`client-portal.${clientId}`);

    channel.listen(".client-notification", (payload) => {
      const ticketId = payload.data?.ticket_id;
      if (!ticketId) return;

      if (payload.type === "status_changed" || payload.type === "ticket_assigned") {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: payload.data?.new_status || t.status } : t
          )
        );
        if (ticketId === selectedId) {
          portalAPI.getTicket(ticketId).then(setSelectedTicket);
        }
      }

      if (payload.type === "comment_added") {
        if (ticketId === selectedId) {
          portalAPI.getTicket(ticketId).then(setSelectedTicket);
        } else {
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, has_unread: true } : t))
          );
        }
      }
    });

    return () => {
      echo.leave(`client-portal.${clientId}`);
    };
  }, [clientId, selectedId]);

  useEffect(() => {
    return () => disconnectPortalEcho();
  }, []);

  const handleSendComment = async (content) => {
    setSending(true);
    try {
      const comment = await portalAPI.addComment(selectedId, content);
      setSelectedTicket((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), comment],
      }));
    } finally {
      setSending(false);
    }
  };

  const handleCreateTicket = async (ticketData) => {
    const ticket = await portalAPI.createTicket(ticketData);
    setTickets((prev) => [ticket, ...prev]);
    setIsModalOpen(false);
    navigate(`/portal/tickets/${ticket.id}`);
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className='flex-1 flex items-center justify-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600'></div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className='flex-1 flex min-h-0'>
        <div
          className={`w-full md:w-80 border-r border-gray-200 shrink-0 ${
            selectedId ? "hidden md:block" : "block"
          }`}
        >
          <PortalInbox
            tickets={tickets}
            selectedId={selectedId}
            onSelect={(ticketId) => navigate(`/portal/tickets/${ticketId}`)}
            onNewTicket={() => setIsModalOpen(true)}
          />
        </div>
        <div className={`flex-1 min-w-0 ${selectedId ? "flex" : "hidden md:flex"}`}>
          <PortalThread
            ticket={selectedTicket}
            onBack={() => navigate("/portal/dashboard")}
            onSendComment={handleSendComment}
            sending={sending}
          />
        </div>
      </div>
      <PortalNewTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateTicket}
      />
    </PortalLayout>
  );
};

export default PortalInboxScreen;
```

- [ ] **Step 2: Agregar las rutas en `App.jsx`**

Import lazy junto a los demás del portal:

```jsx
const PortalInboxScreen = lazy(() => import("./pages/portal/PortalInboxScreen"));
```

Rutas, después de `/portal/access/:token`:

```jsx
                <Route path='/portal/dashboard' element={<PortalInboxScreen />} />
                <Route path='/portal/tickets/:id' element={<PortalInboxScreen />} />
```

- [ ] **Step 3: Lint y build**

Run: `npm run lint`
Run: `npm run build`
Expected: ambos sin errores — el build en particular confirma que no hay imports rotos entre los 6 archivos del portal creados hasta ahora.

- [ ] **Step 4: Verificación manual completa del flujo público**

Con el dev server corriendo y un cliente de prueba con al menos 2 tickets (uno de ellos con comentarios):

1. Navegar a `/portal/{orgSlug}`, pedir acceso, y usar el token real (vía tinker o el correo si el mailer local está configurado) para llegar a `/portal/dashboard`.
2. Confirmar que **`/portal/dashboard` muestra el inbox, no la pantalla de "solicitar acceso"** — esta es la verificación explícita de especificidad de rutas mencionada en las Global Constraints (`/portal/dashboard` no debe ser interpretado como `/portal/:orgSlug` con `orgSlug="dashboard"`).
3. Confirmar que el primer ticket se abre automáticamente y se ve su descripción + comentarios.
4. Hacer clic en el segundo ticket del rail y confirmar que el hilo cambia.
5. Escribir una respuesta y confirmar que aparece en el hilo alineada a la derecha en color de marca.
6. Crear un ticket nuevo desde el botón "+" y confirmar que aparece en el rail y se abre automáticamente.
7. Reducir el ancho de la ventana a menos de 768px (o usar el modo responsive del navegador) y confirmar que en `/portal/dashboard` solo se ve el rail, y que al tocar un ticket navega a `/portal/tickets/:id` mostrando solo el hilo con la flecha de regreso.

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalInboxScreen.jsx src/App.jsx
git commit -m "feat: bandeja conversacional del portal de clientes (rail + hilo)"
```

---

## Task 12: `ClientModal` — alta/edición de cliente

**Files:**
- Create: `orkela-front/src/components/modals/ClientModal.jsx`

**Interfaces:**
- Consumes: `clientsAPI.create`/`update` (Task 4)
- Produces: `<ClientModal isOpen={bool} client={clientOrNull} onClose={() => {}} onSaved={(client) => {}} />` — `client` presente = modo edición, ausente = modo creación.

- [ ] **Step 1: Crear el archivo**

```jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Button from "../ui/Button";
import { motionTokens } from "../animations/variants";
import { clientsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";

const emptyForm = { name: "", company_name: "", email: "", phone: "", notes: "" };

const ClientModal = ({ isOpen, client, onClose, onSaved }) => {
  const { success, error: showError } = useNotification();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setForm(
        client
          ? {
              name: client.name || "",
              company_name: client.company_name || "",
              email: client.email || "",
              phone: client.phone || "",
              notes: client.notes || "",
            }
          : emptyForm
      );
      setFieldError(null);
    }
  }, [isOpen, client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError(null);
    setLoading(true);
    try {
      const saved = client
        ? await clientsAPI.update(client.id, form)
        : await clientsAPI.create(form);
      success(client ? "Cliente actualizado" : "Cliente creado");
      onSaved(saved);
    } catch (err) {
      if (err.status === 422) {
        setFieldError(err.data?.message || "Ya existe un cliente con este correo");
      } else {
        showError("No se pudo guardar el cliente");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
            onClick={(e) => e.stopPropagation()}
            className='bg-white rounded-2xl w-full max-w-lg p-6'
          >
            <div className='flex items-center justify-between mb-5'>
              <h2 className='text-xl font-bold text-gray-900'>
                {client ? "Editar cliente" : "Nuevo cliente"}
              </h2>
              <button onClick={onClose} aria-label='Cerrar' className='text-gray-400 hover:text-gray-600'>
                <X className='w-5 h-5' />
              </button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4' noValidate>
              {fieldError && <p className='text-sm text-red-600'>{fieldError}</p>}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Nombre del contacto</label>
                <input
                  type='text'
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Empresa</label>
                <input
                  type='text'
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Correo</label>
                <input
                  type='email'
                  required
                  disabled={Boolean(client)}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Teléfono</label>
                <input
                  type='tel'
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-1.5'>Notas</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className='w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
              </div>
              <Button
                type='submit'
                variant='primary'
                size='lg'
                loading={loading}
                loadingText='Guardando...'
                className='w-full'
              >
                {client ? "Guardar cambios" : "Crear cliente"}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClientModal;
```

Nota: el email queda deshabilitado en modo edición porque `ClientController::update()` en el backend no acepta cambiar el email (no está en su lista de campos validados) — deshabilitarlo en el form evita que el usuario piense que lo está cambiando cuando no es así.

- [ ] **Step 2: Lint**

Run: `npm run lint`

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/ClientModal.jsx
git commit -m "feat: modal de alta/edición de cliente"
```

---

## Task 13: `ClientsManagement` — maestro-detalle + ruta + nav

**Files:**
- Create: `orkela-front/src/pages/ClientsManagement.jsx`
- Modify: `orkela-front/src/App.jsx`
- Modify: `orkela-front/src/components/layout/Sidebar.jsx`

**Interfaces:**
- Consumes: `clientsAPI` (Task 4), `ClientModal` (Task 12), `Layout` (existente)
- Produces: rutas `/clients` y `/clients/:id`, entrada "Clientes" en el sidebar.

- [ ] **Step 1: Crear `ClientsManagement.jsx`**

```jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ClientModal from "../components/modals/ClientModal";
import { clientsAPI } from "../utils/api";
import { useNotification } from "../context/NotificationContext";
import { Plus, Search, Mail, Send, Archive, ArchiveRestore } from "lucide-react";

const statusBadgeColor = {
  open: "bg-blue-50 text-blue-600",
  in_progress: "bg-brand-50 text-brand-600",
  pending: "bg-yellow-50 text-yellow-600",
  resolved: "bg-green-50 text-green-600",
  closed: "bg-gray-100 text-gray-600",
};

const statusLabels = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const ClientsManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [resending, setResending] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientsAPI.getAll();
      setClients(data);
      if (!id && data.length > 0) {
        navigate(`/clients/${data[0].id}`, { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadClients();
    // Solo al montar — seleccionar el primero es responsabilidad del efecto de arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) {
      setSelected(null);
      return;
    }
    clientsAPI.getById(id).then(setSelected).catch(() => setSelected(null));
  }, [id]);

  const filteredClients = clients.filter((c) =>
    `${c.name} ${c.company_name || ""} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleResendAccess = async () => {
    if (!selected) return;
    setResending(true);
    try {
      await clientsAPI.resendAccess(selected.id);
      success("Enlace de acceso reenviado");
    } catch {
      showError("No se pudo reenviar el acceso");
    } finally {
      setResending(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!selected) return;
    try {
      if (selected.status === "active") {
        await clientsAPI.archive(selected.id);
        success("Cliente archivado");
      } else {
        await clientsAPI.update(selected.id, { status: "active" });
        success("Cliente reactivado");
      }
      const updated = await clientsAPI.getById(selected.id);
      setSelected(updated);
      loadClients();
    } catch {
      showError("No se pudo actualizar el estado del cliente");
    }
  };

  const handleSaved = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    loadClients();
    if (selected) {
      clientsAPI.getById(selected.id).then(setSelected);
    }
  };

  return (
    <Layout title='Clientes' subtitle='Empresas y contactos con acceso al portal de soporte'>
      <div className='bg-white rounded-2xl border border-gray-200 flex h-[calc(100vh-220px)] min-h-[420px] overflow-hidden'>
        <div className='w-full md:w-80 border-r border-gray-200 shrink-0 flex flex-col'>
          <div className='p-4 border-b border-gray-200 space-y-3'>
            <div className='flex items-center justify-between'>
              <h2 className='font-bold text-gray-900'>Clientes</h2>
              <button
                onClick={() => {
                  setEditingClient(null);
                  setIsModalOpen(true);
                }}
                aria-label='Nuevo cliente'
                className='w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors'
              >
                <Plus className='w-5 h-5' />
              </button>
            </div>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' aria-hidden='true' />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Buscar cliente...'
                className='w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
              />
            </div>
          </div>
          <div className='flex-1 overflow-y-auto'>
            {!loading && filteredClients.length === 0 ? (
              <div className='p-6 text-center text-gray-500 text-sm'>
                {clients.length === 0
                  ? "Aún no hay clientes. Da de alta el primero con el botón +."
                  : "Ningún cliente coincide con la búsqueda."}
              </div>
            ) : (
              filteredClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                    Number(id) === c.id ? "bg-brand-50" : "hover:bg-gray-50"
                  } ${c.status === "archived" ? "opacity-60" : ""}`}
                >
                  <p
                    className={`text-sm font-medium truncate ${
                      Number(id) === c.id ? "text-brand-700" : "text-gray-900"
                    }`}
                  >
                    {c.company_name || c.name}
                  </p>
                  <p className='text-xs text-gray-500 truncate'>
                    {c.status === "archived" ? "Archivado" : `${c.tickets_count ?? 0} tickets`}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className='flex-1 min-w-0 p-6 overflow-y-auto'>
          {!selected ? (
            <div className='h-full flex items-center justify-center text-gray-400 text-sm'>
              Selecciona un cliente para ver su detalle
            </div>
          ) : (
            <div>
              <div className='flex items-start justify-between mb-6'>
                <div>
                  <h2 className='text-xl font-bold text-gray-900'>{selected.company_name || selected.name}</h2>
                  <p className='text-gray-500 text-sm mt-0.5'>{selected.name} · {selected.email}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingClient(selected);
                    setIsModalOpen(true);
                  }}
                  className='text-sm font-semibold text-brand-600 hover:text-brand-700'
                >
                  Editar
                </button>
              </div>

              <div className='flex flex-wrap gap-2 mb-6'>
                <button
                  onClick={handleResendAccess}
                  disabled={resending || selected.status !== "active"}
                  className='inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <Send className='w-3.5 h-3.5' />
                  Reenviar acceso
                </button>
                <button
                  onClick={handleToggleArchive}
                  className='inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50'
                >
                  {selected.status === "active" ? (
                    <>
                      <Archive className='w-3.5 h-3.5' />
                      Archivar
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className='w-3.5 h-3.5' />
                      Reactivar
                    </>
                  )}
                </button>
              </div>

              {selected.notes && (
                <p className='text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-6'>{selected.notes}</p>
              )}

              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-semibold text-gray-700'>Tickets recientes</h3>
                <a
                  href={`/client-tickets?client=${selected.id}`}
                  className='text-sm text-brand-600 hover:text-brand-700 font-medium'
                >
                  Ver todos
                </a>
              </div>
              {(selected.tickets || []).length === 0 ? (
                <p className='text-sm text-gray-400'>Este cliente aún no tiene tickets.</p>
              ) : (
                <div className='space-y-2'>
                  {selected.tickets.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className='flex items-center justify-between px-3 py-2 border border-gray-100 rounded-lg'
                    >
                      <span className='text-sm text-gray-700 truncate'>{t.title}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusBadgeColor[t.status]}`}
                      >
                        {statusLabels[t.status] || t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        client={editingClient}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />
    </Layout>
  );
};

export default ClientsManagement;
```

- [ ] **Step 2: Agregar las rutas en `App.jsx`**

Import lazy junto a los demás pages internas:

```jsx
const ClientsManagement = lazy(() => import("./pages/ClientsManagement"));
```

Rutas, junto a `/teams`/`/tickets` (mismo patrón `OrganizationRoute`):

```jsx
                <Route
                  path='/clients'
                  element={
                    <OrganizationRoute>
                      <ClientsManagement />
                    </OrganizationRoute>
                  }
                />
                <Route
                  path='/clients/:id'
                  element={
                    <OrganizationRoute>
                      <ClientsManagement />
                    </OrganizationRoute>
                  }
                />
```

- [ ] **Step 3: Agregar la entrada al sidebar**

En `src/components/layout/Sidebar.jsx`, agregar `Contact` a la lista de imports de `lucide-react` (junto a `Building2`), y agregar esta entrada dentro del array de menú normal, junto a la de Tickets (mismo patrón `...(isInOrganizationMode ? [...] : [])`):

```jsx
        ...(isInOrganizationMode
          ? [{ icon: Contact, label: "Clientes", path: "/clients" }]
          : []),
```

- [ ] **Step 4: Lint y build**

Run: `npm run lint`
Run: `npm run build`

- [ ] **Step 5: Verificación manual**

Con el dev server corriendo y sesión de un usuario con organización: navegar a `/clients`, confirmar que aparece "Clientes" en el sidebar, que la lista carga y auto-selecciona el primer cliente, crear un cliente nuevo, editarlo, y probar "Reenviar acceso"/"Archivar" (confirmar que el estado visual cambia).

- [ ] **Step 6: Commit**

```bash
git add src/pages/ClientsManagement.jsx src/App.jsx src/components/layout/Sidebar.jsx
git commit -m "feat: panel interno de gestión de clientes (maestro-detalle)"
```

---

## Task 14: `ClientTicketsInbox` — Bandeja de Clientes + ruta + nav

**Files:**
- Create: `orkela-front/src/pages/ClientTicketsInbox.jsx`
- Modify: `orkela-front/src/App.jsx`
- Modify: `orkela-front/src/components/layout/Sidebar.jsx`

**Interfaces:**
- Consumes: `ticketsAPI.getClientInbox`/`assignToTeam` (Task 4), `teamsAPI.getAll` (existente)
- Produces: ruta `/client-tickets`, entrada "Bandeja de Clientes" en el sidebar.

- [ ] **Step 1: Crear `ClientTicketsInbox.jsx`**

```jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Select from "react-select";
import Layout from "../components/layout/Layout";
import { ticketsAPI, teamsAPI } from "../utils/api";
import { useNotification } from "../context/NotificationContext";
import { Inbox } from "lucide-react";

const statusBadgeColor = {
  open: "bg-blue-50 text-blue-600",
  in_progress: "bg-brand-50 text-brand-600",
  pending: "bg-yellow-50 text-yellow-600",
  resolved: "bg-green-50 text-green-600",
  closed: "bg-gray-100 text-gray-600",
};

const statusLabels = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const ClientTicketsInbox = () => {
  const [searchParams] = useSearchParams();
  const clientFilter = searchParams.get("client");
  const { success, error: showError } = useNotification();

  const [tickets, setTickets] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ticketsAPI.getClientInbox(
        onlyUnassigned ? { unassigned: true } : {}
      );
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }, [onlyUnassigned]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    teamsAPI.getAll().then(setTeams);
  }, []);

  const visibleTickets = clientFilter
    ? tickets.filter((t) => String(t.client_id) === clientFilter)
    : tickets;

  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));

  const handleAssign = async (ticketId, teamId) => {
    setAssigningId(ticketId);
    try {
      await ticketsAPI.assignToTeam(ticketId, teamId);
      success("Ticket asignado al equipo");
      loadTickets();
    } catch {
      showError("No se pudo asignar el ticket");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Layout title='Bandeja de Clientes' subtitle='Tickets creados desde el portal de clientes'>
      <div className='bg-white rounded-2xl border border-gray-200 p-4'>
        <div className='flex items-center justify-between mb-4'>
          <label className='flex items-center gap-2 text-sm text-gray-600'>
            <input
              type='checkbox'
              checked={onlyUnassigned}
              onChange={(e) => setOnlyUnassigned(e.target.checked)}
              className='rounded border-gray-300 text-brand-600 focus:ring-brand-500'
            />
            Solo sin asignar
          </label>
        </div>

        {!loading && visibleTickets.length === 0 ? (
          <div className='py-12 text-center text-gray-400'>
            <Inbox className='w-8 h-8 mx-auto mb-2' aria-hidden='true' />
            <p className='text-sm'>No hay tickets de clientes {onlyUnassigned ? "sin asignar" : "todavía"}.</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {visibleTickets.map((ticket) => (
              <div key={ticket.id} className='py-3 flex items-center justify-between gap-4'>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-medium text-gray-900 truncate'>
                    {ticket.client?.company_name || ticket.client?.name} · {ticket.title}
                  </p>
                  <div className='flex items-center gap-2 mt-1'>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadgeColor[ticket.status]}`}
                    >
                      {statusLabels[ticket.status] || ticket.status}
                    </span>
                    {ticket.team && (
                      <span className='text-xs text-gray-400'>→ {ticket.team.name}</span>
                    )}
                  </div>
                </div>
                {!ticket.team_id && (
                  <div className='w-52 shrink-0'>
                    <Select
                      options={teamOptions}
                      isLoading={assigningId === ticket.id}
                      isDisabled={assigningId === ticket.id}
                      placeholder='Asignar a equipo...'
                      onChange={(selected) => selected && handleAssign(ticket.id, selected.value)}
                      classNamePrefix='react-select'
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClientTicketsInbox;
```

- [ ] **Step 2: Agregar la ruta en `App.jsx`**

Import lazy:

```jsx
const ClientTicketsInbox = lazy(() => import("./pages/ClientTicketsInbox"));
```

Ruta:

```jsx
                <Route
                  path='/client-tickets'
                  element={
                    <OrganizationRoute>
                      <ClientTicketsInbox />
                    </OrganizationRoute>
                  }
                />
```

- [ ] **Step 3: Agregar la entrada al sidebar**

En `src/components/layout/Sidebar.jsx`, agregar `Inbox` a los imports de `lucide-react` si no está ya, y esta entrada junto a la de "Clientes" agregada en la Task 13:

```jsx
        ...(isInOrganizationMode
          ? [{ icon: Inbox, label: "Bandeja de Clientes", path: "/client-tickets" }]
          : []),
```

- [ ] **Step 4: Lint y build**

Run: `npm run lint`
Run: `npm run build`

- [ ] **Step 5: Verificación manual**

Navegar a `/client-tickets`, confirmar que aparece "Bandeja de Clientes" en el sidebar, que se ven los tickets creados desde el portal (usar los que se crearon en la verificación de la Task 11), asignar uno sin asignar a un equipo y confirmar que desaparece el selector y aparece el nombre del equipo. Navegar a `/clients/{id}` y hacer clic en "Ver todos" para confirmar que `/client-tickets?client={id}` filtra correctamente.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ClientTicketsInbox.jsx src/App.jsx src/components/layout/Sidebar.jsx
git commit -m "feat: Bandeja de Clientes — asignar tickets del portal a un equipo"
```

---

## Task 15: Verificación final completa

**Files:** ninguno nuevo — solo verificación.

- [ ] **Step 1: Build limpio**

Run (desde `orkela-front`): `npm run build`
Expected: build exitoso, sin warnings de imports rotos.

- [ ] **Step 2: Lint limpio**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Recorrido manual completo del flujo público**

Repetir el recorrido de la Task 11 Step 4 de punta a punta una vez más, ahora con las 4 pantallas ya terminadas, más:
- Abrir el portal en dos pestañas del navegador con el mismo cliente logueado, cambiar el estado de un ticket desde el panel interno (`/tickets` o `/client-tickets` tras asignarlo) y confirmar que el badge de estado en ambas pestañas del portal se actualiza solo, sin recargar.
- Cerrar sesión del portal manualmente (`localStorage.removeItem("orkela_portal_token")` desde devtools) y refrescar `/portal/dashboard` — confirmar que redirige a `/portal/{orgSlug}` en vez de mostrar una pantalla rota.
- Escribir una respuesta sin enviarla, borrar `orkela_portal_token` desde devtools, e intentar enviar — confirmar que redirige a pedir un nuevo link; volver a entrar con un token válido al mismo ticket y confirmar que el texto que se estaba escribiendo sigue ahí (verifica la persistencia en `sessionStorage` agregada en la Task 9).

- [ ] **Step 4: Recorrido manual completo del panel interno**

Repetir los recorridos de las Tasks 13 y 14, y además:
- Confirmar que un usuario de una organización distinta no ve en `/clients` ni en `/client-tickets` nada de la organización de prueba (aislamiento multi-tenant, ya lo garantiza el backend — esto solo confirma que el frontend no está ignorando el scope de organización de alguna manera).

- [ ] **Step 5: Confirmar que no quedó nada del token/sesión interna pisado**

Con una sesión de staff activa en el navegador (`localStorage.token` seteado), abrir un link del portal de clientes en una pestaña nueva del mismo navegador, completar el flujo de acceso, y confirmar que la sesión de staff en la otra pestaña sigue funcionando sin pedir volver a loguearse (prueba de que `orkela_portal_token` y `token` conviven sin pisarse).

Si todo lo anterior pasa, el frontend del portal de clientes está completo.

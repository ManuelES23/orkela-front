# Portal de clientes — Frontend — Design Spec

**Fecha:** 2026-08-30
**Repos afectados:** orkela-front (consume la API ya construida en orkela-back)
**Precede a:** este spec cubre las 7 vistas nuevas (3 públicas del portal + 2 internas de administración, con `/clients` y `/clients/:id` unificadas en una sola pantalla) que el [backend del portal de clientes](../../../orkela-back/docs/superpowers/specs/2026-08-30-portal-clientes-tickets-design.md) dejó explícitamente fuera de su alcance.

## Contexto y motivación

El backend ya expone la API completa: clientes con magic link de acceso, tickets creados desde el portal, comentarios, tiempo real por Reverb (canal `client-portal.{clientId}`), y notificaciones por correo — ver el spec y plan del backend para el detalle completo de endpoints y modelo de datos. Este documento cubre solo la capa de UI que consume esa API, siguiendo el flujo de diseño ya acordado para toda vista nueva de Orkela: 3 propuestas de mockup estructural antes de construir.

Se presentaron y aprobaron dos rondas de mockups:
- **Portal público** (cliente externo, sin cuenta Orkela): se eligió la **Propuesta C — bandeja tipo conversación**. No hay una pantalla de "lista" separada de la de "detalle": es un inbox de mensajería, con un rail de tickets a la izquierda y el hilo de conversación del ticket seleccionado a la derecha. Se prefirió sobre una lista de tarjetas (Propuesta A, más segura pero menos alineada con la promesa de "conversación completa" del spec) y sobre un dashboard con KPIs (Propuesta B).
- **Panel interno** (staff de la organización): se eligió la **Propuesta B — maestro-detalle**. `/clients` es una sola pantalla con lista de clientes a la izquierda y panel de detalle (datos + tickets recientes) a la derecha, en vez del grid de tarjetas que usa hoy `Teams.jsx` (Propuesta A) o la bandeja-como-tablero (Propuesta C).

## Decisiones clave

- **Mismo repo, sin capas nuevas de infraestructura.** El portal público vive en `orkela-front` junto al resto de la app, con su propio layout (`PortalLayout`) fuera de `PrivateRoute`/`OrganizationRoute` — mismo patrón que ya usan `/accept-invitation/:token` y compañía.
- **Guard de autenticación separado, no reutiliza el estado de sesión interno.** El token del portal se guarda en `localStorage` bajo una key propia (`orkela_portal_token`), distinta de la que usa el login interno — abrir un link de cliente en el mismo navegador donde ya hay una sesión de staff no debe interferir con ninguna de las dos.
- **Un solo componente para "lista" y "detalle" en el portal.** `/portal/dashboard` y `/portal/tickets/:id` renderizan la misma pantalla (rail + hilo), solo cambia cuál ticket está seleccionado — consistente con que la Propuesta C fusiona ambos conceptos.
- **`/clients` y `/clients/:id` también son la misma pantalla** (maestro-detalle) — `:id` es opcional; sin él se auto-selecciona el primer cliente de la lista.
- **`/client-tickets` sigue siendo una página aparte.** La Propuesta B solo cambió cómo se ve `/clients`; no reemplaza la Bandeja de Clientes ya planeada como su propia vista.
- **Reuso máximo de lo que ya existe:** `motionTokens`/`ease-brand`, `Button`, `AuthShell` (adaptado, no reescrito, para la pantalla de solicitar acceso), iconos de `lucide-react` ya usados en `Tickets.jsx` (Bug/Lightbulb/Headphones/Clock/CheckCircle2 etc.), y el patrón de refresco silencioso vía `useRealtime` que ya usan `Teams.jsx`/`Tickets.jsx`.
- **Tiempo real del portal es una conexión Echo separada** (`getPortalEcho`), no una extensión del `RealtimeContext` interno — autentica contra `/api/portal/broadcasting/auth` con el token del portal, nunca con la sesión de Sanctum.

## Rutas

### Portal público (sin `PrivateRoute`/`OrganizationRoute`, layout `PortalLayout`)

| Ruta | Página | Notas |
|---|---|---|
| `/portal/:orgSlug` | `PortalAccessRequest` | Formulario de email — pide el magic link |
| `/portal/access/:token` | `PortalAccessConsume` | Consume el token, redirige a `?redirect=` o a `/portal/dashboard` |
| `/portal/dashboard` | `PortalInboxScreen` | Rail + hilo; abre el primer ticket automáticamente si existe |
| `/portal/tickets/:id` | `PortalInboxScreen` | Misma pantalla que `/dashboard`, con `:id` preseleccionado — es el link directo que traen los correos |

En mobile (`<768px`), `/portal/dashboard` colapsa a solo el rail (`PortalInbox`); tocar un ticket navega a `/portal/tickets/:id`, que en mobile muestra solo el hilo (`PortalThread`) con una flecha de regreso en el header. Es un colapso por URL, no por estado de React — evita tener que sincronizar "qué se ve" en dos sitios.

### Panel interno (dentro del layout autenticado existente, agregadas al sidebar)

| Ruta | Página | Notas |
|---|---|---|
| `/clients` | `ClientsManagement` | Lista + detalle; sin selección, auto-selecciona el primer cliente |
| `/clients/:id` | `ClientsManagement` | Misma pantalla, con `:id` preseleccionado |
| `/client-tickets` | `ClientTicketsInbox` | Bandeja de Clientes — tabla filtrable, acción "Asignar a equipo" |

## Componentes nuevos

### Portal público

- **`PortalLayout`** — shell mínimo (logo/nombre de la organización, sin sidebar interno). En cada render verifica el token en `localStorage`; si falta o una request devuelve 401, redirige a la pantalla de "pide un nuevo link" conservando la ruta a la que el cliente quería llegar (para redirigir de vuelta tras reautenticarse).
- **`PortalAccessRequest`** (`/portal/:orgSlug`) — trae nombre/logo de la organización vía `GET /api/portal/{orgSlug}` para el branding, formulario de email, llama `request-access`, muestra siempre el mismo mensaje genérico de éxito.
- **`PortalAccessConsume`** (`/portal/access/:token`) — al montar: guarda el token en `localStorage`, valida con `GET /api/portal/me`; si es válido, redirige a `?redirect=` (si viene en la URL, como en los links de los correos) o a `/portal/dashboard`; si no, pantalla de error con link de vuelta a `/portal/:orgSlug`.
- **`PortalInboxScreen`** — el contenedor que arma el layout rail+hilo y decide, según el ancho de pantalla y si hay un `:id` en la URL, qué mostrar (ambos en desktop, uno u otro en mobile).
- **`PortalInbox`** (el rail) — lista de tickets con punto de estado, preview del último mensaje, indicador de "nuevo" cuando llega una actualización en tiempo real a un ticket que no está abierto.
- **`PortalThread`** (el hilo) — header (título + badge de estado), burbujas de mensaje (cliente a la derecha en tono de marca, staff a la izquierda neutro), compositor abajo con reintentar si falla el envío.
- **`PortalNewTicketForm`** — modal simple: título, descripción, tipo, prioridad. Versión reducida de `TicketModal`, sin los campos internos (equipo, proyecto).

### Panel interno

- **`ClientsManagement`** (`/clients`, `/clients/:id`) — lista buscable a la izquierda; panel de detalle a la derecha con datos de contacto, botón "Reenviar acceso", notas, toggle activo/archivado, tickets recientes con badge de estado y link "Ver todos" hacia `/client-tickets?client={id}`.
- **`ClientModal`** — alta/edición de cliente (nombre, empresa, email, teléfono, notas) — mismo patrón visual que `TeamModal`/`ProjectModal`.
- **`ClientTicketsInbox`** (`/client-tickets`) — tabla filtrable por cliente/estado/sin-asignar; cada fila sin asignar tiene la acción "Asignar a equipo", reusando el selector de equipo que ya existe dentro de `TicketModal`.

## Cliente API y tiempo real

- **`utils/portalApi.js`** (nuevo) — cliente HTTP dedicado al portal: manda `Authorization: Bearer {orkela_portal_token}` en cada request, nunca la sesión de Sanctum. Expone `requestAccess`, `me`, `createTicket`, `getTicket`, `addComment`.
- **`utils/api.js`** — gana `clientsAPI` (`index`/`store`/`show`/`update`/`destroy`/`resendAccess`), y `ticketsAPI` gana `clientInbox`/`assignToTeam` — mismo patrón que el resto de los métodos ya definidos ahí (`teamsAPI`, etc.).
- **`utils/echo.js`** gana `getPortalEcho(token)` — misma librería Echo/Pusher-js ya en uso, apuntando el `authEndpoint` a `/api/portal/broadcasting/auth` con el token del portal en el header, en vez de a `/api/broadcasting/auth` con la sesión de Sanctum. `PortalThread` se suscribe al canal privado `client-portal.{clientId}`: `status_changed` actualiza el badge del ticket con una transición (nunca un salto brusco), `comment_added` agrega la burbuja al hilo en vivo y, si ese ticket no está abierto, marca el ítem correspondiente en `PortalInbox` como "nuevo".
- Del lado interno, `ClientTicketsInbox` reutiliza el patrón de refresco silencioso que ya usan `Teams.jsx`/`Tickets.jsx` vía `registerRefresh`/`useRealtime` — nada nuevo que construir ahí.

## Estados de carga, vacíos y error

- Portal sin tickets → estado vacío invitando a crear el primero, no un "no hay nada aquí" genérico.
- Token que expira a medio uso (ej. mientras el cliente escribe un comentario) → la request falla con 401, `PortalLayout` lo intercepta a nivel global y muestra la pantalla de "tu acceso venció, pide un link nuevo" — el texto que el cliente estaba escribiendo en el compositor se conserva en el estado local del componente (no se pierde) hasta que vuelva con un token válido y pueda reintentar el envío.
- `ClientsManagement` sin clientes → invita a dar de alta el primero.
- Envío de mensaje o de ticket nuevo con error de red (no de auth) → el compositor/formulario conserva lo escrito y ofrece reintentar, nunca lo descarta silenciosamente.

## Motion

Reutiliza `motionTokens`/`--ease-brand` ya definidos en `index.css` y `components/animations/variants.js` — no se define ninguna curva o duración nueva. Entrada de mensajes en `PortalThread` con `FadeIn` + stagger corto, igual al que ya usan las tarjetas de `Tickets.jsx`. Transiciones de estado (badge) animadas, no instantáneas, siguiendo el mismo criterio que ya aplica el resto de la app.

## Fuera de alcance de este spec

- Adjuntos en tickets/comentarios — ya estaba fuera del alcance del backend.
- Tratamiento de modo oscuro específico para el portal público — hereda el que tenga Orkela en general, sin diseño aparte.
- Cualquier vista de analítica o reportes agregados sobre clientes — el panel de detalle muestra tickets recientes de ese cliente, no métricas.
- La pantalla `addComment()` del lado staff para tickets sin asignar sigue teniendo la limitación ya documentada en el backend (no puede responder hasta que el ticket se asigna a un equipo) — este spec no la resuelve, `ClientTicketsInbox` simplemente refleja ese estado tal como la API lo permite hoy.

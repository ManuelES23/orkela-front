// Workspace al que hay que cambiar para abrir un enlace (OrganizationRoute).

/**
 * Organización a la que hay que cambiar para abrir el enlace, o null.
 * - ?org=ID (enlaces de notificaciones): esa organización, si el usuario
 *   tiene acceso y no es ya la activa.
 * - ?ticket=ID sin org (notificaciones guardadas antes de llevar la
 *   organización) en modo personal: la única organización disponible.
 */
export const workspaceToOpen = (user, searchParams, activeContextId) => {
  const organizations = (user?.available_contexts || []).filter(
    (ctx) => ctx.id !== "personal" && ctx.type !== "admin"
  );
  const org = searchParams.get("org");

  if (org) {
    const target = organizations.find((ctx) => String(ctx.id) === String(org));
    return target && String(target.id) !== String(activeContextId) ? String(target.id) : null;
  }

  if (searchParams.get("ticket") && activeContextId === "personal" && organizations.length === 1) {
    return String(organizations[0].id);
  }

  return null;
};

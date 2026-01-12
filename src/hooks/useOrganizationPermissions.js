import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Hook personalizado para manejar permisos de organización
 *
 * @param {Object} organization - Objeto de organización (opcional si está en contexto)
 * @returns {Object} - Objeto con permisos y rol del usuario
 *
 * Permisos disponibles:
 * - canDelete: Solo Owner puede eliminar la organización
 * - canManage: Owner y Admin pueden gestionar configuración
 * - canViewDetails: Solo Owner y Admin pueden ver detalles de la organización
 * - canCreateTeams: Owner, Admin y Manager pueden crear equipos
 * - canInviteMembers: Owner, Admin y Manager pueden invitar miembros
 * - canManageMembers: Owner y Admin pueden gestionar miembros
 *
 * Roles:
 * - owner: Dueño de la organización (todos los permisos)
 * - admin: Administrador (todos excepto delete org)
 * - manager: Manager (crear teams, proyectos, invitar)
 * - member: Miembro (crear proyectos solamente)
 */
export const useOrganizationPermissions = (organization = null) => {
  const { user } = useAuth();

  return useMemo(() => {
    // Si no hay usuario, retornar permisos vacíos
    if (!user) {
      return {
        canDelete: false,
        canManage: false,
        canViewDetails: false,
        canCreateTeams: false,
        canInviteMembers: false,
        canManageMembers: false,
        isOwner: false,
        isAdmin: false,
        isManager: false,
        isMember: false,
        role: null,
        hasOrganization: false,
      };
    }

    // Si no hay organización pasada, verificar si el usuario está en modo organization
    if (!organization) {
      // Usuario en modo personal o sin organización
      if (!user.organization_id || user.active_context === "personal") {
        return {
          canDelete: false,
          canManage: false,
          canViewDetails: false,
          canCreateTeams: true, // En modo personal pueden crear equipos
          canInviteMembers: true, // En modo personal pueden invitar
          canManageMembers: false,
          isOwner: false,
          isAdmin: false,
          isManager: false,
          isMember: false,
          role: null,
          hasOrganization: false,
        };
      }

      // Usuario tiene organización pero no la pasamos - retornar permisos básicos
      return {
        canDelete: user.is_organization_owner || false,
        canManage: user.is_organization_owner || false,
        canViewDetails: user.is_organization_owner || false,
        canCreateTeams: true, // Puede depender del rol
        canInviteMembers: true, // Puede depender del rol
        canManageMembers: user.is_organization_owner || false,
        isOwner: user.is_organization_owner || false,
        isAdmin: false,
        isManager: false,
        isMember: false,
        role: null,
        hasOrganization: true,
      };
    }

    // Tenemos objeto de organización con permisos del backend
    // Los permisos vienen calculados desde el backend en can_delete, can_manage, etc.
    const role = organization.user_role || "member";
    const isOwner = organization.is_owner || false;

    return {
      // Permisos desde el backend (prioritarios)
      canDelete: organization.can_delete || false,
      canManage: organization.can_manage || false,
      canViewDetails: organization.can_view_details || false,
      canCreateTeams:
        organization.can_create_teams !== undefined
          ? organization.can_create_teams
          : true,
      canInviteMembers:
        organization.can_invite_members !== undefined
          ? organization.can_invite_members
          : true,
      canManageMembers: organization.can_manage_members || false,

      // Flags de rol
      isOwner: isOwner,
      isAdmin: !isOwner && role === "admin",
      isManager: role === "manager",
      isMember: role === "member",
      role: role,
      hasOrganization: true,
    };
  }, [organization, user]);
};

/**
 * Hook para obtener el contexto actual del usuario
 * (personal vs organization)
 */
export const useUserContext = () => {
  const { user, getActiveContext } = useAuth();

  return useMemo(() => {
    const activeContext = getActiveContext();

    return {
      isPersonalContext: user?.active_context === "personal",
      isOrganizationContext: user?.active_context === "organization",
      activeContextId: user?.active_context || "personal",
      activeContextName: activeContext?.name || "Personal",
      hasOrganization: !!user?.organization_id,
      organizationId: user?.organization_id || null,
      organization: user?.organization || null,
    };
  }, [user, getActiveContext]);
};

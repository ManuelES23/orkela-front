import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { getAssetUrl } from "../utils/assetUrl";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import {
  Search,
  Building2,
  Users,
  FolderKanban,
  Loader2,
  Crown,
  Shield,
  ArrowRight,
} from "lucide-react";
import { organizationsAPI } from "../utils/api";

const Organizations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error: showError } = useNotification();
  const { registerRefresh, unregisterRefresh } = useRealtime();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Si el usuario es owner de una organización, redirigir directamente a ella
  useEffect(() => {
    if (user?.organization_id && user?.is_organization_owner) {
      navigate(`/organizations/${user.organization_id}`, { replace: true });
    }
  }, [user?.organization_id, user?.is_organization_owner, navigate]);

  const loadOrganizations = useCallback(async () => {
    // No cargar si el usuario es owner (será redirigido)
    if (user?.organization_id && user?.is_organization_owner) {
      return;
    }

    try {
      setLoading(true);
      const data = await organizationsAPI.getAll();
      setOrganizations(data);
    } catch (err) {
      console.error("Error loading organizations:", err);
      showError("No se pudieron cargar las organizaciones");
    } finally {
      setLoading(false);
    }
  }, [showError, user?.organization_id, user?.is_organization_owner]);

  // Función para refrescar organizaciones silenciosamente
  const refreshOrganizationsSilently = useCallback(async () => {
    if (user?.organization_id && user?.is_organization_owner) return;
    try {
      const data = await organizationsAPI.getAll();
      setOrganizations(data);
    } catch (err) {
      console.error("Error refreshing organizations:", err);
    }
  }, [user?.organization_id, user?.is_organization_owner]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  // Registrar callback para actualizaciones en tiempo real
  useEffect(() => {
    registerRefresh("organizations", refreshOrganizationsSilently);
    return () => unregisterRefresh("organizations");
  }, [registerRefresh, unregisterRefresh, refreshOrganizationsSilently]);

  const handleOrgClick = (orgId) => {
    navigate(`/organizations/${orgId}`);
  };

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Organización principal: la que el usuario posee, o si no, la más activa
  // (más miembros). El resto se muestra como tiles compactos debajo.
  const featuredOrg = useMemo(() => {
    if (filteredOrganizations.length === 0) return null;
    const owned = filteredOrganizations.find((o) => o.is_owner);
    if (owned) return owned;
    return [...filteredOrganizations].sort(
      (a, b) => (b.active_members_count || 0) - (a.active_members_count || 0)
    )[0];
  }, [filteredOrganizations]);

  const restOrganizations = featuredOrg
    ? filteredOrganizations.filter((o) => o.id !== featuredOrg.id)
    : filteredOrganizations;

  // Badges translúcidos para usar sobre el fondo degradado del hero
  // (la organización destacada es la única que muestra rol/plan en esta vista;
  // las tiles compactas de "otras organizaciones" solo usan texto plano).
  const getRoleBadgeHero = (org) => {
    if (org.is_owner) {
      return (
        <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold'>
          <Crown className='w-3 h-3' />
          Dueño
        </span>
      );
    }
    if (org.user_role === "admin") {
      return (
        <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold'>
          <Shield className='w-3 h-3' />
          Admin
        </span>
      );
    }
    return (
      <span className='inline-flex items-center px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold capitalize'>
        {org.user_role}
      </span>
    );
  };

  const getPlanBadgeHero = (plan) => (
    <span className='px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold'>
      {plan?.name || "Sin plan"}
    </span>
  );

  return (
    <Layout
      title='Mi Organización'
      subtitle='Organizaciones a las que perteneces'
    >
      {/* Barra de acciones */}
      <FadeIn delay={0.1}>
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6'>
          <div className='relative flex-1 w-full md:max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar organizaciones...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
            />
          </div>
        </div>
      </FadeIn>

      {/* Loading State */}
      {loading && (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-brand-600' />
        </div>
      )}

      {/* Empty State */}
      {!loading && organizations.length === 0 && (
        <FadeIn>
          <div className='text-center py-16 bg-white rounded-xl border border-gray-200'>
            <div className='w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Building2 className='w-10 h-10 text-brand-600' />
            </div>
            <h3 className='text-xl font-semibold text-gray-900 mb-2'>
              No perteneces a ninguna organización
            </h3>
            <p className='text-gray-500 max-w-md mx-auto'>
              Cuando seas invitado a una organización, aparecerá aquí. Contacta
              al administrador de tu empresa para solicitar acceso.
            </p>
          </div>
        </FadeIn>
      )}

      {/* Organización destacada */}
      {!loading && featuredOrg && (
        <FadeIn delay={0.15}>
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => handleOrgClick(featuredOrg.id)}
            className='relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-lg cursor-pointer mb-6 bg-linear-to-br from-brand-600 to-accent-600'
          >
            <div className='absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none' />

            <div className='relative flex flex-col sm:flex-row sm:items-center gap-5'>
              <div className='w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 overflow-hidden'>
                {featuredOrg.logo ? (
                  <img
                    src={getAssetUrl(featuredOrg.logo)}
                    alt={featuredOrg.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <Building2 className='w-8 h-8 sm:w-10 sm:h-10' />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex flex-wrap items-center gap-2 mb-1'>
                  <h2 className='text-xl sm:text-2xl font-bold'>
                    {featuredOrg.name}
                  </h2>
                  {getRoleBadgeHero(featuredOrg)}
                </div>
                {featuredOrg.description && (
                  <p className='text-white/80 text-sm sm:text-base line-clamp-2'>
                    {featuredOrg.description}
                  </p>
                )}
              </div>
              <div className='flex gap-5 sm:gap-6 text-center sm:ml-auto'>
                <div>
                  <p className='text-2xl sm:text-3xl font-bold font-mono'>
                    <AnimatedNumber
                      value={featuredOrg.active_members_count || 0}
                    />
                  </p>
                  <p className='text-xs sm:text-sm text-white/80'>Miembros</p>
                </div>
                <div>
                  <p className='text-2xl sm:text-3xl font-bold font-mono'>
                    <AnimatedNumber value={featuredOrg.projects_count || 0} />
                  </p>
                  <p className='text-xs sm:text-sm text-white/80'>
                    Proyectos
                  </p>
                </div>
                <div>
                  <p className='text-2xl sm:text-3xl font-bold font-mono'>
                    <AnimatedNumber value={featuredOrg.teams_count || 0} />
                  </p>
                  <p className='text-xs sm:text-sm text-white/80'>Equipos</p>
                </div>
              </div>
            </div>

            <div className='relative flex items-center justify-between mt-5 pt-4 border-t border-white/20'>
              {getPlanBadgeHero(featuredOrg.plan)}
              <span className='flex items-center gap-1 text-sm font-medium'>
                Ver detalles
                <ArrowRight className='w-4 h-4' />
              </span>
            </div>
          </motion.div>
        </FadeIn>
      )}

      {/* Otras organizaciones */}
      {!loading && restOrganizations.length > 0 && (
        <FadeIn delay={0.2}>
          <p className='text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3'>
            Otras organizaciones
          </p>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            <AnimatePresence mode='popLayout'>
              {restOrganizations.map((org) => (
                <motion.div
                  key={org.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -2 }}
                  onClick={() => handleOrgClick(org.id)}
                  className='flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-brand-300 hover:shadow-sm transition group'
                >
                  <div className='w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden'>
                    {org.logo ? (
                      <img
                        src={getAssetUrl(org.logo)}
                        alt={org.name}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <Building2 className='w-5 h-5 text-brand-600' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='font-semibold text-gray-900 text-sm truncate'>
                      {org.name}
                    </p>
                    <p className='text-xs text-gray-500 flex items-center gap-1'>
                      <Users className='w-3 h-3' />
                      {org.active_members_count || 0} miembros ·{" "}
                      {org.plan?.name || "Sin plan"}
                    </p>
                  </div>
                  <ArrowRight className='w-4 h-4 text-gray-300 group-hover:text-brand-500 shrink-0 transition-colors' />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </FadeIn>
      )}

      {/* No results */}
      {!loading &&
        organizations.length > 0 &&
        filteredOrganizations.length === 0 && (
          <FadeIn>
            <div className='text-center py-12'>
              <Search className='w-12 h-12 text-gray-300 mx-auto mb-3' />
              <p className='text-gray-500'>
                No se encontraron organizaciones con "{searchTerm}"
              </p>
            </div>
          </FadeIn>
        )}
    </Layout>
  );
};

export default Organizations;

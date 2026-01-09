import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "../components/animations/MotionComponents";
import {
  Search,
  Building2,
  Users,
  FolderKanban,
  Loader2,
  Crown,
  Shield,
  Globe,
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

  const getRoleBadge = (org) => {
    if (org.is_owner) {
      return (
        <span className='flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium'>
          <Crown className='w-3 h-3' />
          Dueño
        </span>
      );
    }
    if (org.user_role === "admin") {
      return (
        <span className='flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium'>
          <Shield className='w-3 h-3' />
          Admin
        </span>
      );
    }
    return (
      <span className='px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize'>
        {org.user_role}
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    const plans = {
      free: { bg: "bg-gray-100", text: "text-gray-700", label: "Gratis" },
      starter: { bg: "bg-blue-100", text: "text-blue-700", label: "Starter" },
      professional: {
        bg: "bg-indigo-100",
        text: "text-indigo-700",
        label: "Professional",
      },
      enterprise: {
        bg: "bg-purple-100",
        text: "text-purple-700",
        label: "Enterprise",
      },
    };
    const planStyle = plans[plan] || plans.free;
    return (
      <span
        className={`px-2 py-1 ${planStyle.bg} ${planStyle.text} rounded-full text-xs font-medium`}
      >
        {planStyle.label}
      </span>
    );
  };

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
              className='pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
            />
          </div>
        </div>
      </FadeIn>

      {/* Loading State */}
      {loading && (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        </div>
      )}

      {/* Empty State */}
      {!loading && organizations.length === 0 && (
        <FadeIn>
          <div className='text-center py-16 bg-white rounded-xl border border-gray-200'>
            <div className='w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Building2 className='w-10 h-10 text-indigo-600' />
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

      {/* Organizations Grid */}
      {!loading && filteredOrganizations.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          <AnimatePresence mode='popLayout'>
            {filteredOrganizations.map((org) => (
              <motion.div
                key={org.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{
                  y: -4,
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
                }}
                onClick={() => handleOrgClick(org.id)}
                className='bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer group'
              >
                {/* Header con color */}
                <div className='h-24 bg-linear-to-br from-indigo-500 to-purple-600 relative'>
                  {/* Logo o inicial */}
                  <div className='absolute -bottom-8 left-4'>
                    <div className='w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center border-4 border-white overflow-hidden'>
                      {org.logo ? (
                        <img
                          src={`http://orkela.localhost${org.logo}`}
                          alt={org.name}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <Building2 className='w-8 h-8 text-indigo-600' />
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className='pt-10 p-4'>
                  <div className='flex items-start justify-between mb-2'>
                    <h3 className='font-semibold text-gray-900 text-lg truncate flex-1 pr-2'>
                      {org.name}
                    </h3>
                    {getRoleBadge(org)}
                  </div>

                  {org.description && (
                    <p className='text-gray-500 text-sm mb-4 line-clamp-2'>
                      {org.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className='flex items-center gap-4 py-3 border-t border-gray-100'>
                    <div className='flex items-center gap-1.5 text-gray-600'>
                      <Users className='w-4 h-4' />
                      <span className='text-sm font-medium'>
                        {org.active_members_count || 0}
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5 text-gray-600'>
                      <FolderKanban className='w-4 h-4' />
                      <span className='text-sm font-medium'>
                        {org.projects_count || 0}
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5 text-gray-600'>
                      <Shield className='w-4 h-4' />
                      <span className='text-sm font-medium'>
                        {org.teams_count || 0}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
                    {getPlanBadge(org.plan)}
                    <span className='flex items-center gap-1 text-indigo-600 text-sm font-medium group-hover:gap-2 transition-all'>
                      Ver detalles
                      <ArrowRight className='w-4 h-4' />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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

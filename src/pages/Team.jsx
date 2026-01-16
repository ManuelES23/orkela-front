import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import UserAvatar from "../components/ui/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from "../components/animations/MotionComponents";
import {
  Mail,
  Search,
  Loader2,
  Users,
  FolderKanban,
  CheckCircle,
  Clock,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { myCollaboratorsAPI } from "../utils/api";

const Team = () => {
  const navigate = useNavigate();
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMember, setExpandedMember] = useState(null);

  useEffect(() => {
    loadCollaborators();
  }, []);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await myCollaboratorsAPI.getAll();
      setCollaborators(data);
    } catch (err) {
      console.error("Error al cargar colaboradores:", err);
      setError("No se pudieron cargar los colaboradores");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (memberId) => {
    setExpandedMember(expandedMember === memberId ? null : memberId);
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  // Filtrar colaboradores
  const filteredCollaborators = collaborators.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calcular estadísticas
  const totalProjects = collaborators.reduce(
    (acc, c) => acc + c.projects_count,
    0
  );
  const activeProjects = collaborators.reduce(
    (acc, c) => acc + c.active_projects_count,
    0
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "on_hold":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "Activo";
      case "completed":
        return "Completado";
      case "on_hold":
        return "En Pausa";
      default:
        return status;
    }
  };

  return (
    <Layout
      title='Mi Equipo'
      subtitle='Personas con las que has colaborado en proyectos'
    >
      {/* Barra de búsqueda */}
      <FadeIn delay={0.1}>
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6'>
          <div className='relative flex-1 w-full md:w-auto'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar colaboradores...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
            />
          </div>
        </div>
      </FadeIn>

      {/* Loading y Error States */}
      {loading && (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        </div>
      )}

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6'>
          {error}
        </div>
      )}

      {/* Estadísticas del equipo */}
      {!loading && !error && (
        <>
          <StaggerContainer className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            <StaggerItem>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                className='bg-white rounded-xl p-6 shadow-sm border border-gray-100'
              >
                <div className='flex items-center gap-3 mb-2'>
                  <div className='p-2 bg-indigo-100 rounded-lg'>
                    <Users className='w-5 h-5 text-indigo-600' />
                  </div>
                  <h3 className='text-3xl font-bold text-gray-900'>
                    {filteredCollaborators.length}
                  </h3>
                </div>
                <p className='text-gray-600'>
                  Colaboradores{searchTerm ? " Filtrados" : ""}
                </p>
              </motion.div>
            </StaggerItem>
            <StaggerItem>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                className='bg-white rounded-xl p-6 shadow-sm border border-gray-100'
              >
                <div className='flex items-center gap-3 mb-2'>
                  <div className='p-2 bg-blue-100 rounded-lg'>
                    <FolderKanban className='w-5 h-5 text-blue-600' />
                  </div>
                  <h3 className='text-3xl font-bold text-blue-600'>
                    {activeProjects}
                  </h3>
                </div>
                <p className='text-gray-600'>Proyectos Activos Compartidos</p>
              </motion.div>
            </StaggerItem>
            <StaggerItem>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                className='bg-white rounded-xl p-6 shadow-sm border border-gray-100'
              >
                <div className='flex items-center gap-3 mb-2'>
                  <div className='p-2 bg-green-100 rounded-lg'>
                    <CheckCircle className='w-5 h-5 text-green-600' />
                  </div>
                  <h3 className='text-3xl font-bold text-green-600'>
                    {totalProjects}
                  </h3>
                </div>
                <p className='text-gray-600'>Total Proyectos Compartidos</p>
              </motion.div>
            </StaggerItem>
          </StaggerContainer>

          {/* Lista de colaboradores */}
          {filteredCollaborators.length === 0 ? (
            <div className='text-center py-12 bg-white rounded-xl border border-gray-100'>
              <Users className='w-16 h-16 mx-auto text-gray-300 mb-4' />
              <p className='text-gray-500 text-lg mb-2'>
                {searchTerm
                  ? "No se encontraron colaboradores con ese criterio"
                  : "Aún no tienes colaboradores"}
              </p>
              <p className='text-gray-400 text-sm'>
                Los colaboradores aparecerán aquí cuando invites personas a tus
                proyectos o te inviten a los suyos.
              </p>
            </div>
          ) : (
            <StaggerContainer className='space-y-4'>
              {filteredCollaborators.map((member) => (
                <StaggerItem key={member.id}>
                  <motion.div
                    layout
                    className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'
                  >
                    {/* Header del colaborador */}
                    <div
                      className='p-6 cursor-pointer hover:bg-gray-50 transition-colors'
                      onClick={() => toggleExpand(member.id)}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          {/* Avatar */}
                          <UserAvatar user={member} size='xl' />

                          {/* Info */}
                          <div>
                            <h3 className='font-semibold text-gray-900 text-lg'>
                              {member.name}
                            </h3>
                            <div className='flex items-center gap-2 text-sm text-gray-500'>
                              <Mail className='w-4 h-4' />
                              {member.email}
                            </div>
                          </div>
                        </div>

                        {/* Stats y Toggle */}
                        <div className='flex items-center gap-6'>
                          {/* Estadísticas rápidas */}
                          <div className='hidden md:flex items-center gap-4'>
                            <div className='text-center'>
                              <div className='text-lg font-bold text-gray-900'>
                                {member.projects_count}
                              </div>
                              <div className='text-xs text-gray-500'>
                                Proyectos
                              </div>
                            </div>
                            <div className='text-center'>
                              <div className='text-lg font-bold text-blue-600'>
                                {member.active_projects_count}
                              </div>
                              <div className='text-xs text-gray-500'>
                                Activos
                              </div>
                            </div>
                            <div className='text-center'>
                              <div className='text-lg font-bold text-green-600'>
                                {member.completed_projects_count}
                              </div>
                              <div className='text-xs text-gray-500'>
                                Completados
                              </div>
                            </div>
                          </div>

                          {/* Toggle */}
                          <motion.div
                            animate={{
                              rotate: expandedMember === member.id ? 180 : 0,
                            }}
                            className='p-2 hover:bg-gray-100 rounded-lg'
                          >
                            <ChevronDown className='w-5 h-5 text-gray-400' />
                          </motion.div>
                        </div>
                      </div>

                      {/* Stats móvil */}
                      <div className='flex md:hidden items-center gap-4 mt-4 pt-4 border-t border-gray-100'>
                        <div className='flex-1 text-center'>
                          <div className='text-lg font-bold text-gray-900'>
                            {member.projects_count}
                          </div>
                          <div className='text-xs text-gray-500'>Proyectos</div>
                        </div>
                        <div className='flex-1 text-center'>
                          <div className='text-lg font-bold text-blue-600'>
                            {member.active_projects_count}
                          </div>
                          <div className='text-xs text-gray-500'>Activos</div>
                        </div>
                        <div className='flex-1 text-center'>
                          <div className='text-lg font-bold text-green-600'>
                            {member.completed_projects_count}
                          </div>
                          <div className='text-xs text-gray-500'>
                            Completados
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proyectos compartidos (expandible) */}
                    <AnimatePresence>
                      {expandedMember === member.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className='border-t border-gray-100 overflow-hidden'
                        >
                          <div className='p-6 bg-gray-50'>
                            <h4 className='text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2'>
                              <FolderKanban className='w-4 h-4' />
                              Proyectos en Común
                            </h4>

                            {member.shared_projects.length === 0 ? (
                              <p className='text-gray-500 text-sm'>
                                No hay proyectos compartidos actualmente
                              </p>
                            ) : (
                              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                                {member.shared_projects.map((project) => (
                                  <motion.div
                                    key={project.id}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewProject(project.id);
                                    }}
                                    className='bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all group'
                                  >
                                    <div className='flex items-start justify-between mb-2'>
                                      <div className='flex items-center gap-2'>
                                        <div
                                          className={`w-8 h-8 ${project.color} rounded-lg flex items-center justify-center`}
                                        >
                                          <span className='text-white font-bold text-sm'>
                                            {project.name.charAt(0)}
                                          </span>
                                        </div>
                                        <span className='font-medium text-gray-900 text-sm line-clamp-1'>
                                          {project.name}
                                        </span>
                                      </div>
                                      <ExternalLink className='w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity' />
                                    </div>

                                    <div className='flex items-center justify-between'>
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                                          project.status
                                        )}`}
                                      >
                                        {getStatusLabel(project.status)}
                                      </span>

                                      <div className='flex items-center gap-1 text-xs text-gray-500'>
                                        <Clock className='w-3 h-3' />
                                        {project.progress}%
                                      </div>
                                    </div>

                                    {/* Barra de progreso */}
                                    <div className='mt-2 w-full bg-gray-200 rounded-full h-1.5'>
                                      <div
                                        className={`h-1.5 rounded-full ${project.color}`}
                                        style={{
                                          width: `${project.progress}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </>
      )}
    </Layout>
  );
};

export default Team;

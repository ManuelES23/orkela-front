import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Plus, X, Loader2, Settings, ExternalLink } from "lucide-react";
import { projectTagsAPI } from "../../utils/api";

/**
 * Componente para seleccionar tags de un proyecto en tareas
 *
 * Props:
 * - projectId: ID del proyecto (requerido para cargar tags)
 * - selectedTagIds: Array de IDs de tags seleccionados
 * - onChange: Callback cuando cambian los tags seleccionados
 * - onManageTags: Callback para abrir el gestor de tags (opcional)
 * - disabled: Deshabilitar el selector
 * - showManageHint: Mostrar hint de dónde crear etiquetas si no hay onManageTags
 */
const TagSelector = ({
  projectId,
  selectedTagIds = [],
  onChange,
  onManageTags,
  disabled = false,
  showManageHint = false,
}) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Mapeo de colores Tailwind a clases CSS
  const colorClasses = {
    red: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
      dot: "bg-red-500",
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-200",
      dot: "bg-orange-500",
    },
    yellow: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "border-yellow-200",
      dot: "bg-yellow-500",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-200",
      dot: "bg-green-500",
    },
    teal: {
      bg: "bg-teal-100",
      text: "text-teal-700",
      border: "border-teal-200",
      dot: "bg-teal-500",
    },
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
    },
    indigo: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      border: "border-indigo-200",
      dot: "bg-indigo-500",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-500",
    },
    pink: {
      bg: "bg-pink-100",
      text: "text-pink-700",
      border: "border-pink-200",
      dot: "bg-pink-500",
    },
    gray: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
      dot: "bg-gray-500",
    },
  };

  const getColorClasses = (color) => colorClasses[color] || colorClasses.gray;

  // Cargar tags del proyecto
  useEffect(() => {
    const loadTags = async () => {
      if (!projectId) {
        setTags([]);
        return;
      }

      setLoading(true);
      try {
        console.log("TagSelector: Loading tags for project:", projectId);
        const data = await projectTagsAPI.getAll(projectId);
        console.log("TagSelector: Tags loaded:", data);
        setTags(data);
      } catch (err) {
        console.error("Error loading project tags:", err);
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    loadTags();
  }, [projectId]);

  // Alternar selección de un tag
  const toggleTag = (tagId) => {
    if (disabled) return;

    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];

    onChange(newSelectedIds);
  };

  // Tags seleccionados para mostrar
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  if (!projectId) {
    return (
      <div className='text-sm text-gray-400 italic'>
        Selecciona un proyecto para ver las etiquetas disponibles
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {/* Tags seleccionados */}
      {selectedTags.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          <AnimatePresence mode='popLayout'>
            {selectedTags.map((tag) => {
              const colors = getColorClasses(tag.color);
              return (
                <motion.span
                  key={tag.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  {tag.name}
                  {!disabled && (
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTag(tag.id);
                      }}
                      className='ml-0.5 hover:bg-white/50 rounded-full p-0.5'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  )}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Botón para abrir selector */}
      <div className='relative'>
        <button
          type='button'
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={`flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg transition-colors ${
            disabled
              ? "bg-gray-100 cursor-not-allowed"
              : "hover:bg-gray-50 hover:border-gray-400"
          }`}
        >
          {loading ? (
            <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
          ) : (
            <Tag className='w-4 h-4 text-gray-400' />
          )}
          <span className='text-gray-600'>
            {loading
              ? "Cargando etiquetas..."
              : selectedTags.length === 0
              ? "Agregar etiquetas"
              : `${selectedTags.length} etiqueta${
                  selectedTags.length > 1 ? "s" : ""
                }`}
          </span>
        </button>

        {/* Dropdown de tags */}
        <AnimatePresence>
          {isOpen && !disabled && (
            <>
              {/* Overlay para cerrar */}
              <div
                className='fixed inset-0 z-10'
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className='absolute left-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[240px] max-h-[300px] overflow-hidden'
              >
                {tags.length === 0 ? (
                  <div className='p-4 text-center'>
                    <Tag className='w-8 h-8 text-gray-300 mx-auto mb-2' />
                    <p className='text-sm text-gray-500 mb-3'>
                      No hay etiquetas en este proyecto
                    </p>
                    {onManageTags ? (
                      <button
                        type='button'
                        onClick={() => {
                          setIsOpen(false);
                          onManageTags();
                        }}
                        className='text-sm text-indigo-600 hover:text-indigo-700 font-medium'
                      >
                        Crear etiquetas →
                      </button>
                    ) : showManageHint ? (
                      <p className='text-xs text-gray-400'>
                        Ve al detalle del proyecto y usa el botón{" "}
                        <span className='inline-flex items-center gap-1 text-indigo-600 font-medium'>
                          <Tag className='w-3 h-3' />
                          Etiquetas
                        </span>{" "}
                        para crear etiquetas
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className='p-2 max-h-[200px] overflow-y-auto'>
                      {tags.map((tag) => {
                        const colors = getColorClasses(tag.color);
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type='button'
                            onClick={() => toggleTag(tag.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                              isSelected
                                ? `${colors.bg} ${colors.text}`
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`w-3 h-3 rounded-full ${colors.dot}`}
                            />
                            <span className='flex-1 text-sm font-medium'>
                              {tag.name}
                            </span>
                            {isSelected && (
                              <span className='text-xs opacity-75'>✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer con botón para gestionar tags */}
                    {onManageTags && (
                      <div className='border-t border-gray-100 p-2'>
                        <button
                          type='button'
                          onClick={() => {
                            setIsOpen(false);
                            onManageTags();
                          }}
                          className='w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors'
                        >
                          <Settings className='w-4 h-4' />
                          Gestionar etiquetas
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TagSelector;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  Plus,
  Pencil,
  Check,
  X,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { projectTagsAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";

/**
 * Componente para gestionar los tags de un proyecto
 * Permite crear, editar nombres y eliminar tags
 *
 * Props:
 * - projectId: ID del proyecto
 * - onClose: Callback para cerrar el gestor (opcional)
 */
const TagManager = ({ projectId, onClose }) => {
  const { success, error: showError } = useNotification();
  const [tags, setTags] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Mapeo de colores Tailwind a clases CSS
  const colorClasses = {
    red: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-300",
      dot: "bg-red-500",
      hover: "hover:bg-red-50",
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-300",
      dot: "bg-orange-500",
      hover: "hover:bg-orange-50",
    },
    yellow: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "border-yellow-300",
      dot: "bg-yellow-500",
      hover: "hover:bg-yellow-50",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-300",
      dot: "bg-green-500",
      hover: "hover:bg-green-50",
    },
    teal: {
      bg: "bg-teal-100",
      text: "text-teal-700",
      border: "border-teal-300",
      dot: "bg-teal-500",
      hover: "hover:bg-teal-50",
    },
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-300",
      dot: "bg-blue-500",
      hover: "hover:bg-blue-50",
    },
    indigo: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      border: "border-indigo-300",
      dot: "bg-indigo-500",
      hover: "hover:bg-indigo-50",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-300",
      dot: "bg-purple-500",
      hover: "hover:bg-purple-50",
    },
    pink: {
      bg: "bg-pink-100",
      text: "text-pink-700",
      border: "border-pink-300",
      dot: "bg-pink-500",
      hover: "hover:bg-pink-50",
    },
    gray: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-300",
      dot: "bg-gray-500",
      hover: "hover:bg-gray-50",
    },
  };

  const getColorClasses = (color) => colorClasses[color] || colorClasses.gray;

  // Cargar tags y colores disponibles
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;

      setLoading(true);
      try {
        const [tagsData, colorsData] = await Promise.all([
          projectTagsAPI.getAll(projectId),
          projectTagsAPI.getAvailableColors(),
        ]);
        setTags(tagsData);

        // Transformar el formato del backend a un array para el frontend
        // Backend devuelve: { colors: {...}, default_names: {...} }
        // Frontend necesita: [{ color: 'red', default_name: 'Urgente' }, ...]
        const colorsArray = Object.keys(colorsData.colors || {}).map(
          (color) => ({
            color,
            default_name:
              colorsData.default_names?.[color] ||
              color.charAt(0).toUpperCase() + color.slice(1),
          })
        );
        setAvailableColors(colorsArray);
      } catch (err) {
        console.error("Error loading tags:", err);
        showError("No se pudieron cargar las etiquetas");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, showError]);

  // Colores que aún no tienen tag creado
  const unusedColors = availableColors.filter(
    (color) => !tags.some((tag) => tag.color === color.color)
  );

  // Crear un nuevo tag con un color
  const handleCreateTag = async (color, defaultName) => {
    console.log("Creating tag:", { projectId, color, defaultName });
    setSaving(true);
    try {
      const newTag = await projectTagsAPI.create(projectId, {
        color,
        name: defaultName,
      });
      console.log("Tag created:", newTag);
      setTags((prev) => [...prev, newTag]);
      success("Etiqueta creada");
    } catch (err) {
      console.error("Error creating tag:", err);
      console.error("Error details:", err.message, err.status, err.data);
      showError(err.message || "No se pudo crear la etiqueta");
    } finally {
      setSaving(false);
    }
  };

  // Iniciar edición de un tag
  const startEditing = (tag) => {
    setEditingId(tag.id);
    setEditValue(tag.name);
  };

  // Cancelar edición
  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  // Guardar cambios de nombre
  const saveTagName = async (tagId) => {
    if (!editValue.trim()) {
      cancelEditing();
      return;
    }

    setSaving(true);
    try {
      const updatedTag = await projectTagsAPI.update(projectId, tagId, {
        name: editValue.trim(),
      });
      setTags((prev) =>
        prev.map((tag) => (tag.id === tagId ? updatedTag : tag))
      );
      success("Etiqueta actualizada");
      cancelEditing();
    } catch (err) {
      console.error("Error updating tag:", err);
      showError(err.message || "No se pudo actualizar la etiqueta");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar un tag
  const handleDeleteTag = async (tagId) => {
    setSaving(true);
    try {
      await projectTagsAPI.delete(projectId, tagId);
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      success("Etiqueta eliminada");
    } catch (err) {
      console.error("Error deleting tag:", err);
      showError(err.message || "No se pudo eliminar la etiqueta");
    } finally {
      setSaving(false);
    }
  };

  // Inicializar tags por defecto
  const handleInitializeDefaults = async () => {
    setInitializing(true);
    try {
      const newTags = await projectTagsAPI.initializeDefaults(projectId);
      setTags(newTags);
      success("Etiquetas creadas con nombres por defecto");
    } catch (err) {
      console.error("Error initializing tags:", err);
      showError(err.message || "No se pudieron crear las etiquetas");
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader2 className='w-6 h-6 animate-spin text-brand-600' />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Tag className='w-5 h-5 text-brand-600' />
          <h3 className='font-semibold text-gray-900'>
            Etiquetas del proyecto
          </h3>
        </div>
        {onClose && (
          <button
            type='button'
            onClick={onClose}
            className='p-1 hover:bg-gray-100 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        )}
      </div>

      <p className='text-sm text-gray-500'>
        Personaliza los nombres de las etiquetas para este proyecto. Los colores
        son fijos.
      </p>

      {/* Lista de tags existentes */}
      {tags.length > 0 && (
        <div className='space-y-2'>
          <AnimatePresence mode='popLayout'>
            {tags.map((tag) => {
              const colors = getColorClasses(tag.color);
              const isEditing = editingId === tag.id;

              return (
                <motion.div
                  key={tag.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg}`}
                >
                  {/* Indicador de color */}
                  <span
                    className={`w-4 h-4 rounded-full ${colors.dot} shrink-0`}
                  />

                  {/* Nombre o input de edición */}
                  {isEditing ? (
                    <input
                      type='text'
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTagName(tag.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className='flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
                      autoFocus
                      disabled={saving}
                    />
                  ) : (
                    <span
                      className={`flex-1 font-medium text-sm ${colors.text}`}
                    >
                      {tag.name}
                    </span>
                  )}

                  {/* Acciones */}
                  <div className='flex items-center gap-1'>
                    {isEditing ? (
                      <>
                        <button
                          type='button'
                          onClick={() => saveTagName(tag.id)}
                          disabled={saving}
                          className='p-1.5 hover:bg-green-100 rounded-full transition-colors'
                          title='Guardar'
                        >
                          {saving ? (
                            <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
                          ) : (
                            <Check className='w-4 h-4 text-green-600' />
                          )}
                        </button>
                        <button
                          type='button'
                          onClick={cancelEditing}
                          disabled={saving}
                          className='p-1.5 hover:bg-red-100 rounded-full transition-colors'
                          title='Cancelar'
                        >
                          <X className='w-4 h-4 text-red-600' />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type='button'
                          onClick={() => startEditing(tag)}
                          disabled={saving}
                          className='p-1.5 hover:bg-white/50 rounded-full transition-colors'
                          title='Editar nombre'
                        >
                          <Pencil className='w-4 h-4 text-gray-500' />
                        </button>
                        <button
                          type='button'
                          onClick={() => handleDeleteTag(tag.id)}
                          disabled={saving}
                          className='p-1.5 hover:bg-red-100 rounded-full transition-colors'
                          title='Eliminar'
                        >
                          <Trash2 className='w-4 h-4 text-red-500' />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Colores disponibles para crear */}
      {unusedColors.length > 0 && (
        <div className='space-y-2'>
          <h4 className='text-sm font-medium text-gray-700'>
            Agregar etiqueta:
          </h4>
          <div className='flex flex-wrap gap-2'>
            {unusedColors.map((colorItem) => {
              const colors = getColorClasses(colorItem.color);
              return (
                <button
                  key={colorItem.color}
                  type='button'
                  onClick={() =>
                    handleCreateTag(colorItem.color, colorItem.default_name)
                  }
                  disabled={saving}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.border} ${colors.hover} transition-colors disabled:opacity-50`}
                >
                  <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <span className='text-sm text-gray-600'>
                    {colorItem.default_name}
                  </span>
                  <Plus className='w-3 h-3 text-gray-400' />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botón para crear todas las etiquetas por defecto */}
      {tags.length === 0 && (
        <div className='text-center py-4'>
          <p className='text-gray-500 mb-3'>
            Este proyecto no tiene etiquetas configuradas.
          </p>
          <button
            type='button'
            onClick={handleInitializeDefaults}
            disabled={initializing}
            className='inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50'
          >
            {initializing ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <RefreshCw className='w-4 h-4' />
            )}
            Crear etiquetas por defecto
          </button>
        </div>
      )}

      {/* Info */}
      <p className='text-xs text-gray-400 mt-4'>
        Las etiquetas eliminadas se quitarán de todas las tareas que las tengan
        asignadas.
      </p>
    </div>
  );
};

export default TagManager;

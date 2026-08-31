import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
} from "lucide-react";
import { checklistAPI } from "../../utils/api";
import { useNotification } from "../../context/NotificationContext";

// Modo "local" para cuando se crea una tarea nueva (sin taskId)
// Modo "api" para cuando se edita una tarea existente (con taskId)
const TaskChecklist = ({ taskId, items = [], onUpdate, onLocalChange }) => {
  const [checklistItems, setChecklistItems] = useState(items);
  const [newItemText, setNewItemText] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const { error: showError } = useNotification();

  const isLocalMode = !taskId;

  // Sincronizar estado cuando cambian las props items (al abrir modal con otra tarea)
  useEffect(() => {
    setChecklistItems(items);
  }, [items]);

  // Notificar cambios locales al padre (sin causar re-sincronización)
  const notifyParent = (newItems) => {
    if (isLocalMode && onLocalChange) {
      onLocalChange(newItems);
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    const textToAdd = newItemText.trim();
    setNewItemText(""); // Limpiar input inmediatamente

    if (isLocalMode) {
      // Modo local: agregar al estado local
      const newItem = {
        id: `temp-${Date.now()}`,
        text: textToAdd,
        is_completed: false,
        order: checklistItems.length,
      };
      const newItems = [...checklistItems, newItem];
      setChecklistItems(newItems);
      notifyParent(newItems);
    } else {
      // Modo API: guardar en servidor con estado optimista
      const tempId = `temp-${Date.now()}`;
      const tempItem = {
        id: tempId,
        text: textToAdd,
        is_completed: false,
        order: checklistItems.length,
      };

      // Agregar optimísticamente
      setChecklistItems((prev) => [...prev, tempItem]);

      try {
        setAddingItem(true);
        const newItem = await checklistAPI.create(taskId, textToAdd);
        // Mantener el mismo tempId para evitar parpadeo en la animación
        // pero guardar el ID real para futuras operaciones
        setChecklistItems((prev) =>
          prev.map((item) =>
            item.id === tempId ? { ...newItem, tempId } : item
          )
        );
        // Notificar al padre que hubo un cambio exitoso (para actualizar progreso)
        onUpdate?.();
      } catch (err) {
        console.error("Error adding checklist item:", err);
        // Remover el item temporal si falló
        setChecklistItems((prev) => prev.filter((item) => item.id !== tempId));
        // Mostrar mensaje de error del backend
        showError(err.message || "No se pudo agregar el item");
      } finally {
        setAddingItem(false);
      }
    }
  };

  const handleToggleItem = async (itemId) => {
    if (isLocalMode) {
      // Modo local: toggle en estado
      const newItems = checklistItems.map((item) =>
        item.id === itemId
          ? { ...item, is_completed: !item.is_completed }
          : item
      );
      setChecklistItems(newItems);
      notifyParent(newItems);
    } else {
      // Modo API con actualización optimista
      const originalItems = [...checklistItems];

      // Actualizar optimísticamente
      setChecklistItems(
        checklistItems.map((item) =>
          item.id === itemId
            ? { ...item, is_completed: !item.is_completed }
            : item
        )
      );

      try {
        await checklistAPI.toggle(taskId, itemId);
        // Notificar al padre que hubo un cambio exitoso (para actualizar progreso)
        onUpdate?.();
      } catch (err) {
        console.error("Error toggling checklist item:", err);
        // Revertir si hay error
        setChecklistItems(originalItems);
        // Mostrar mensaje de error del backend
        showError(err.message || "No se pudo actualizar el item");
      }
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (isLocalMode) {
      // Modo local: eliminar del estado
      const newItems = checklistItems.filter((item) => item.id !== itemId);
      setChecklistItems(newItems);
      notifyParent(newItems);
    } else {
      // Modo API con actualización optimista
      const originalItems = [...checklistItems];

      // Eliminar optimísticamente
      setChecklistItems(checklistItems.filter((item) => item.id !== itemId));

      try {
        await checklistAPI.delete(taskId, itemId);
        // Notificar al padre que hubo un cambio exitoso (para actualizar progreso)
        onUpdate?.();
      } catch (err) {
        console.error("Error deleting checklist item:", err);
        // Revertir si hay error
        setChecklistItems(originalItems);
        // Mostrar mensaje de error del backend
        showError(err.message || "No se pudo eliminar el item");
      }
    }
  };

  const completedCount = checklistItems.filter(
    (item) => item.is_completed
  ).length;
  const totalCount = checklistItems.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className='space-y-3'>
      {/* Header con progreso */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <CheckSquare className='w-4 h-4 text-gray-500 dark:text-night-400' />
          <span className='text-sm font-medium text-gray-700 dark:text-night-300'>
            Lista de tareas
          </span>
          {totalCount > 0 && (
            <span className='text-xs text-gray-500 dark:text-night-400'>
              ({completedCount}/{totalCount})
            </span>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      {totalCount > 0 && (
        <div className='w-full bg-gray-200 dark:bg-night-700 rounded-full h-1.5'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            className='bg-green-500 h-1.5 rounded-full transition-all duration-300'
          />
        </div>
      )}

      {/* Lista de items */}
      <div className='space-y-1'>
        <AnimatePresence mode='popLayout'>
          {checklistItems.map((item, index) => (
            <motion.div
              key={item.tempId || item.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              layout
              className='flex items-center gap-2 group py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-night-800 transition-colors'
            >
              {/* Checkbox */}
              <button
                type='button'
                onClick={() => handleToggleItem(item.id)}
                className='shrink-0 focus:outline-none'
              >
                {item.is_completed ? (
                  <CheckSquare className='w-5 h-5 text-green-500 dark:text-green-400' />
                ) : (
                  <Square className='w-5 h-5 text-gray-400 dark:text-night-500 hover:text-gray-600 dark:hover:text-night-300' />
                )}
              </button>

              {/* Texto */}
              <span
                className={`flex-1 text-sm ${
                  item.is_completed
                    ? "text-gray-400 dark:text-night-500 line-through"
                    : "text-gray-700 dark:text-night-300"
                }`}
              >
                {item.text}
              </span>

              {/* Botón eliminar */}
              <button
                type='button'
                onClick={() => handleDeleteItem(item.id)}
                className='shrink-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-all'
              >
                <Trash2 className='w-4 h-4 text-red-500 dark:text-red-400' />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Agregar nuevo item */}
      <div className='flex items-center gap-2'>
        <div className='relative flex-1'>
          <Plus className='absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-night-500' />
          <input
            type='text'
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleAddItem();
              }
            }}
            placeholder='Agregar elemento...'
            disabled={addingItem}
            className='w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-night-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:bg-gray-100 dark:bg-night-800 disabled:cursor-not-allowed'
          />
        </div>
        <button
          type='button'
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAddItem();
          }}
          disabled={!newItemText.trim() || addingItem}
          className='px-3 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1'
        >
          {addingItem ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <>
              <Plus className='w-4 h-4' />
              <span className='hidden sm:inline'>Agregar</span>
            </>
          )}
        </button>
      </div>

      {/* Mensaje si no hay items */}
      {checklistItems.length === 0 && (
        <p className='text-xs text-gray-400 dark:text-night-500 text-center py-2'>
          Agrega elementos a tu lista de tareas
        </p>
      )}
    </div>
  );
};

export default TaskChecklist;

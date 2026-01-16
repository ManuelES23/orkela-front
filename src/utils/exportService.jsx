import { pdf } from "@react-pdf/renderer";
import * as XLSX from "xlsx";

// ========================================
// UTILIDADES
// ========================================

/**
 * Formatear fecha para mostrar
 */
const formatDate = (date) => {
  if (!date) return "Sin fecha";
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Formatear fecha para nombre de archivo
 */
const getDateForFilename = () => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Limpiar nombre para archivo
 */
const sanitizeFilename = (name) => {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
};

/**
 * Descargar blob como archivo
 */
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Etiquetas de prioridad
 */
const priorityLabels = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  urgent: "Urgente",
};

/**
 * Etiquetas de estado
 */
const statusLabels = {
  todo: "Por hacer",
  "in-progress": "En progreso",
  done: "Completada",
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
  active: "Activo",
  on_hold: "En pausa",
};

// ========================================
// EXPORTACIÓN EXCEL/CSV
// ========================================

/**
 * Exportar lista de proyectos a Excel
 */
export const exportProjectsToExcel = (projects) => {
  const data = projects.map((project) => ({
    Nombre: project.name,
    Descripción: project.description || "",
    Estado: statusLabels[project.status] || project.status,
    Prioridad: priorityLabels[project.priority] || project.priority,
    Progreso: `${project.progress || 0}%`,
    "Fecha Vencimiento": formatDate(project.due_date),
    Tareas: project.tasks?.length || 0,
    Colaboradores: project.users?.length || 0,
    "Fecha Creación": formatDate(project.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Proyectos");

  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 30 }, // Nombre
    { wch: 40 }, // Descripción
    { wch: 12 }, // Estado
    { wch: 10 }, // Prioridad
    { wch: 10 }, // Progreso
    { wch: 15 }, // Fecha Vencimiento
    { wch: 8 }, // Tareas
    { wch: 12 }, // Colaboradores
    { wch: 15 }, // Fecha Creación
  ];
  worksheet["!cols"] = colWidths;

  const filename = `proyectos_${getDateForFilename()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Exportar lista de proyectos a CSV
 */
export const exportProjectsToCsv = (projects) => {
  const data = projects.map((project) => ({
    Nombre: project.name,
    Descripción: project.description || "",
    Estado: statusLabels[project.status] || project.status,
    Prioridad: priorityLabels[project.priority] || project.priority,
    Progreso: `${project.progress || 0}%`,
    "Fecha Vencimiento": formatDate(project.due_date),
    Tareas: project.tasks?.length || 0,
    Colaboradores: project.users?.length || 0,
    "Fecha Creación": formatDate(project.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const filename = `proyectos_${getDateForFilename()}.csv`;
  downloadBlob(blob, filename);
};

/**
 * Exportar detalle de proyecto a Excel
 */
export const exportProjectDetailToExcel = (project) => {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Información del proyecto
  const projectInfo = [
    ["INFORMACIÓN DEL PROYECTO"],
    [""],
    ["Nombre", project.name],
    ["Descripción", project.description || "Sin descripción"],
    ["Estado", statusLabels[project.status] || project.status],
    ["Prioridad", priorityLabels[project.priority] || project.priority],
    ["Progreso", `${project.progress || 0}%`],
    ["Fecha de Vencimiento", formatDate(project.due_date)],
    ["Fecha de Creación", formatDate(project.created_at)],
    [""],
    ["ESTADÍSTICAS"],
    ["Total de Tareas", project.tasks?.length || 0],
    [
      "Tareas Completadas",
      project.tasks?.filter((t) => t.status === "done" || t.status === "completed").length || 0,
    ],
    ["Colaboradores", project.users?.length || 0],
  ];

  const infoSheet = XLSX.utils.aoa_to_sheet(projectInfo);
  infoSheet["!cols"] = [{ wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Información");

  // Hoja 2: Tareas
  if (project.tasks && project.tasks.length > 0) {
    const tasksData = project.tasks.map((task) => ({
      Título: task.title,
      Descripción: task.description || "",
      Estado: statusLabels[task.status] || task.status,
      Prioridad: priorityLabels[task.priority] || task.priority,
      "Fecha Vencimiento": formatDate(task.due_date),
      Asignados:
        task.assigned_users?.map((u) => u.name).join(", ") ||
        task.assigned_user?.name ||
        "Sin asignar",
      Subtareas: task.checklist_items?.length || 0,
      "Subtareas Completadas":
        task.checklist_items?.filter((i) => i.is_completed).length || 0,
    }));

    const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
    tasksSheet["!cols"] = [
      { wch: 30 },
      { wch: 40 },
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, tasksSheet, "Tareas");
  }

  // Hoja 3: Colaboradores
  if (project.users && project.users.length > 0) {
    const collaboratorsData = project.users.map((user) => ({
      Nombre: user.name,
      Email: user.email,
    }));

    const collabSheet = XLSX.utils.json_to_sheet(collaboratorsData);
    collabSheet["!cols"] = [{ wch: 25 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(workbook, collabSheet, "Colaboradores");
  }

  const safeName = sanitizeFilename(project.name);
  const filename = `${safeName}_${getDateForFilename()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

// ========================================
// EXPORTACIÓN PDF (se importan los documentos desde otro archivo)
// ========================================

/**
 * Generar y descargar PDF de lista de proyectos
 */
export const exportProjectsToPdf = async (projects, PdfDocument) => {
  const blob = await pdf(<PdfDocument projects={projects} />).toBlob();
  const filename = `proyectos_${getDateForFilename()}.pdf`;
  downloadBlob(blob, filename);
};

/**
 * Generar y descargar PDF de detalle de proyecto
 */
export const exportProjectDetailToPdf = async (project, PdfDocument) => {
  const blob = await pdf(<PdfDocument project={project} />).toBlob();
  const safeName = sanitizeFilename(project.name);
  const filename = `${safeName}_${getDateForFilename()}.pdf`;
  downloadBlob(blob, filename);
};

/**
 * Generar y descargar PDF de Gantt de un proyecto
 */
export const exportProjectGanttToPdf = async (project, tasks, PdfDocument) => {
  const blob = await pdf(<PdfDocument project={project} tasks={tasks} />).toBlob();
  const safeName = sanitizeFilename(project.name);
  const filename = `gantt_${safeName}_${getDateForFilename()}.pdf`;
  downloadBlob(blob, filename);
};

/**
 * Generar y descargar PDF de Gantt de todos los proyectos
 */
export const exportAllProjectsGanttToPdf = async (projects, PdfDocument) => {
  const blob = await pdf(<PdfDocument projects={projects} />).toBlob();
  const filename = `gantt_todos_proyectos_${getDateForFilename()}.pdf`;
  downloadBlob(blob, filename);
};

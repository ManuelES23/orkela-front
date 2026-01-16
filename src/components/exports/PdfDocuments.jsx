import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ========================================
// ESTILOS COMPARTIDOS
// ========================================

const colors = {
  primary: "#4F46E5", // indigo-600
  secondary: "#6B7280", // gray-500
  success: "#10B981", // green-500
  warning: "#F59E0B", // amber-500
  danger: "#EF4444", // red-500
  dark: "#1F2937", // gray-800
  light: "#F3F4F6", // gray-100
  white: "#FFFFFF",
};

const baseStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    padding: 8,
  },
  tableHeaderCell: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
    padding: 8,
  },
  tableRowAlt: {
    backgroundColor: "#F9FAFB",
  },
  tableCell: {
    fontSize: 9,
    color: colors.dark,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: colors.secondary,
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: colors.secondary,
  },
});

// ========================================
// UTILIDADES
// ========================================

/**
 * Parsea una fecha string "YYYY-MM-DD" como fecha local (no UTC)
 * Evita el problema de timezone donde new Date("2025-01-16") se interpreta como UTC
 * y en zonas horarias negativas (ej: México UTC-6) muestra el día anterior.
 */
const parseDateString = (dateString) => {
  if (!dateString) return null;
  // Si ya es un objeto Date, retornarlo
  if (dateString instanceof Date) return dateString;
  // Si es string en formato YYYY-MM-DD, parsearlo como fecha local
  if (
    typeof dateString === "string" &&
    dateString.match(/^\d{4}-\d{2}-\d{2}$/)
  ) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  // Para otros formatos, usar el constructor por defecto
  return new Date(dateString);
};

const formatDate = (date) => {
  if (!date) return "Sin fecha";
  const parsedDate = parseDateString(date);
  return parsedDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const priorityLabels = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  urgent: "Urgente",
};

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

const getPriorityColor = (priority) => {
  switch (priority) {
    case "high":
    case "urgent":
      return colors.danger;
    case "medium":
      return colors.warning;
    default:
      return colors.secondary;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "done":
    case "completed":
      return colors.success;
    case "in-progress":
    case "in_progress":
      return colors.primary;
    case "cancelled":
      return colors.danger;
    default:
      return colors.secondary;
  }
};

// ========================================
// PDF: LISTA DE PROYECTOS
// ========================================

const projectsListStyles = StyleSheet.create({
  ...baseStyles,
  col1: { width: "25%" },
  col2: { width: "15%" },
  col3: { width: "12%" },
  col4: { width: "12%" },
  col5: { width: "18%" },
  col6: { width: "18%" },
});

export const ProjectsListPdf = ({ projects }) => (
  <Document>
    <Page size='A4' orientation='landscape' style={baseStyles.page}>
      {/* Header */}
      <View style={baseStyles.header}>
        <Text style={baseStyles.title}>Lista de Proyectos</Text>
        <Text style={baseStyles.subtitle}>
          Generado el {formatDate(new Date())} • {projects.length} proyectos
        </Text>
      </View>

      {/* Tabla */}
      <View style={baseStyles.table}>
        {/* Header de tabla */}
        <View style={baseStyles.tableHeader}>
          <Text style={[baseStyles.tableHeaderCell, projectsListStyles.col1]}>
            Proyecto
          </Text>
          <Text style={[baseStyles.tableHeaderCell, projectsListStyles.col2]}>
            Estado
          </Text>
          <Text style={[baseStyles.tableHeaderCell, projectsListStyles.col3]}>
            Prioridad
          </Text>
          <Text style={[baseStyles.tableHeaderCell, projectsListStyles.col4]}>
            Progreso
          </Text>
          <Text style={[baseStyles.tableHeaderCell, projectsListStyles.col5]}>
            Vencimiento
          </Text>
          <Text style={[baseStyles.tableHeaderCell, projectsListStyles.col6]}>
            Tareas
          </Text>
        </View>

        {/* Filas */}
        {projects.map((project, index) => (
          <View
            key={project.id}
            style={[
              baseStyles.tableRow,
              index % 2 === 1 && baseStyles.tableRowAlt,
            ]}
          >
            <View style={projectsListStyles.col1}>
              <Text style={[baseStyles.tableCell, { fontWeight: "bold" }]}>
                {project.name}
              </Text>
              {project.description && (
                <Text
                  style={[
                    baseStyles.tableCell,
                    { color: colors.secondary, marginTop: 2 },
                  ]}
                >
                  {project.description.substring(0, 50)}
                  {project.description.length > 50 ? "..." : ""}
                </Text>
              )}
            </View>
            <Text
              style={[
                baseStyles.tableCell,
                projectsListStyles.col2,
                { color: getStatusColor(project.status) },
              ]}
            >
              {statusLabels[project.status] || project.status}
            </Text>
            <Text
              style={[
                baseStyles.tableCell,
                projectsListStyles.col3,
                { color: getPriorityColor(project.priority) },
              ]}
            >
              {priorityLabels[project.priority] || project.priority}
            </Text>
            <Text style={[baseStyles.tableCell, projectsListStyles.col4]}>
              {project.progress || 0}%
            </Text>
            <Text style={[baseStyles.tableCell, projectsListStyles.col5]}>
              {formatDate(project.due_date)}
            </Text>
            <Text style={[baseStyles.tableCell, projectsListStyles.col6]}>
              {project.tasks?.length || 0} tareas
            </Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={baseStyles.footer}>Orkela - Gestión de Proyectos</Text>
      <Text
        style={baseStyles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </Page>
  </Document>
);

// ========================================
// PDF: DETALLE DE PROYECTO
// ========================================

const detailStyles = StyleSheet.create({
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  infoItem: {
    width: "50%",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 9,
    color: colors.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    color: colors.dark,
    fontWeight: "bold",
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.light,
    borderRadius: 4,
    marginTop: 5,
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  taskCol1: { width: "35%" },
  taskCol2: { width: "15%" },
  taskCol3: { width: "15%" },
  taskCol4: { width: "15%" },
  taskCol5: { width: "20%" },
});

export const ProjectDetailPdf = ({ project }) => {
  const completedTasks =
    project.tasks?.filter(
      (t) => t.status === "done" || t.status === "completed",
    ).length || 0;
  const totalTasks = project.tasks?.length || 0;

  return (
    <Document>
      <Page size='A4' style={baseStyles.page}>
        {/* Header */}
        <View style={baseStyles.header}>
          <Text style={baseStyles.title}>{project.name}</Text>
          <Text style={baseStyles.subtitle}>
            Reporte generado el {formatDate(new Date())}
          </Text>
        </View>

        {/* Información del proyecto */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>Información General</Text>
          <View style={detailStyles.infoGrid}>
            <View style={detailStyles.infoItem}>
              <Text style={detailStyles.infoLabel}>Estado</Text>
              <Text
                style={[
                  detailStyles.infoValue,
                  { color: getStatusColor(project.status) },
                ]}
              >
                {statusLabels[project.status] || project.status}
              </Text>
            </View>
            <View style={detailStyles.infoItem}>
              <Text style={detailStyles.infoLabel}>Prioridad</Text>
              <Text
                style={[
                  detailStyles.infoValue,
                  { color: getPriorityColor(project.priority) },
                ]}
              >
                {priorityLabels[project.priority] || project.priority}
              </Text>
            </View>
            <View style={detailStyles.infoItem}>
              <Text style={detailStyles.infoLabel}>Fecha de Vencimiento</Text>
              <Text style={detailStyles.infoValue}>
                {formatDate(project.due_date)}
              </Text>
            </View>
            <View style={detailStyles.infoItem}>
              <Text style={detailStyles.infoLabel}>Progreso</Text>
              <Text style={detailStyles.infoValue}>
                {project.progress || 0}%
              </Text>
              <View style={detailStyles.progressBar}>
                <View
                  style={[
                    detailStyles.progressFill,
                    { width: `${project.progress || 0}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {project.description && (
            <View style={{ marginTop: 10 }}>
              <Text style={detailStyles.infoLabel}>Descripción</Text>
              <Text style={{ fontSize: 10, color: colors.dark, marginTop: 3 }}>
                {project.description}
              </Text>
            </View>
          )}
        </View>

        {/* Estadísticas */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>Estadísticas</Text>
          <View style={detailStyles.infoGrid}>
            <View style={detailStyles.infoItem}>
              <Text style={detailStyles.infoLabel}>Total de Tareas</Text>
              <Text style={detailStyles.infoValue}>{totalTasks}</Text>
            </View>
            <View style={detailStyles.infoItem}>
              <Text style={detailStyles.infoLabel}>Tareas Completadas</Text>
              <Text style={[detailStyles.infoValue, { color: colors.success }]}>
                {completedTasks}
              </Text>
            </View>
            <View style={detailStyles.infoItem}>
              <Text style={detailStyles.infoLabel}>Tareas Pendientes</Text>
              <Text style={[detailStyles.infoValue, { color: colors.warning }]}>
                {totalTasks - completedTasks}
              </Text>
            </View>
            <View style={detailStyles.infoItem}>
              <Text style={detailStyles.infoLabel}>Colaboradores</Text>
              <Text style={detailStyles.infoValue}>
                {project.users?.length || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Lista de Tareas */}
        {project.tasks && project.tasks.length > 0 && (
          <View style={baseStyles.section}>
            <Text style={baseStyles.sectionTitle}>
              Tareas ({project.tasks.length})
            </Text>
            <View style={baseStyles.table}>
              <View style={baseStyles.tableHeader}>
                <Text
                  style={[baseStyles.tableHeaderCell, detailStyles.taskCol1]}
                >
                  Tarea
                </Text>
                <Text
                  style={[baseStyles.tableHeaderCell, detailStyles.taskCol2]}
                >
                  Estado
                </Text>
                <Text
                  style={[baseStyles.tableHeaderCell, detailStyles.taskCol3]}
                >
                  Prioridad
                </Text>
                <Text
                  style={[baseStyles.tableHeaderCell, detailStyles.taskCol4]}
                >
                  Vencimiento
                </Text>
                <Text
                  style={[baseStyles.tableHeaderCell, detailStyles.taskCol5]}
                >
                  Asignado
                </Text>
              </View>

              {project.tasks.map((task, index) => (
                <View
                  key={task.id}
                  style={[
                    baseStyles.tableRow,
                    index % 2 === 1 && baseStyles.tableRowAlt,
                  ]}
                >
                  <Text style={[baseStyles.tableCell, detailStyles.taskCol1]}>
                    {task.title}
                  </Text>
                  <Text
                    style={[
                      baseStyles.tableCell,
                      detailStyles.taskCol2,
                      { color: getStatusColor(task.status) },
                    ]}
                  >
                    {statusLabels[task.status] || task.status}
                  </Text>
                  <Text
                    style={[
                      baseStyles.tableCell,
                      detailStyles.taskCol3,
                      { color: getPriorityColor(task.priority) },
                    ]}
                  >
                    {priorityLabels[task.priority] || task.priority}
                  </Text>
                  <Text style={[baseStyles.tableCell, detailStyles.taskCol4]}>
                    {formatDate(task.due_date)}
                  </Text>
                  <Text style={[baseStyles.tableCell, detailStyles.taskCol5]}>
                    {task.assigned_users?.map((u) => u.name).join(", ") ||
                      task.assigned_user?.name ||
                      "Sin asignar"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={baseStyles.footer}>Orkela - Gestión de Proyectos</Text>
        <Text
          style={baseStyles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
};

// ========================================
// PDF: GANTT DE UN PROYECTO
// ========================================

const ganttStyles = StyleSheet.create({
  ganttContainer: {
    marginTop: 10,
  },
  ganttRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
    minHeight: 30,
    alignItems: "center",
  },
  ganttLabel: {
    width: "25%",
    paddingRight: 10,
    paddingVertical: 5,
  },
  ganttLabelText: {
    fontSize: 8,
    color: colors.dark,
  },
  ganttTimeline: {
    width: "75%",
    flexDirection: "row",
    position: "relative",
    height: 20,
  },
  ganttBar: {
    position: "absolute",
    height: 14,
    borderRadius: 3,
    top: 3,
  },
  ganttHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 5,
    marginBottom: 5,
  },
  ganttHeaderLabel: {
    width: "25%",
    fontSize: 9,
    fontWeight: "bold",
    color: colors.dark,
  },
  ganttHeaderTimeline: {
    width: "75%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ganttDateLabel: {
    fontSize: 7,
    color: colors.secondary,
  },
  legend: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 5,
  },
  legendText: {
    fontSize: 8,
    color: colors.secondary,
  },
});

export const ProjectGanttPdf = ({ project, tasks }) => {
  // Calcular rango de fechas
  const taskList = tasks || project.tasks || [];
  const tasksWithDates = taskList.filter((t) => t.start_date || t.due_date);

  if (tasksWithDates.length === 0) {
    return (
      <Document>
        <Page size='A4' orientation='landscape' style={baseStyles.page}>
          <View style={baseStyles.header}>
            <Text style={baseStyles.title}>
              Diagrama Gantt - {project.name}
            </Text>
            <Text style={baseStyles.subtitle}>
              Generado el {formatDate(new Date())}
            </Text>
          </View>
          <Text
            style={{
              textAlign: "center",
              marginTop: 50,
              color: colors.secondary,
            }}
          >
            No hay tareas con fechas definidas para mostrar en el diagrama.
          </Text>
        </Page>
      </Document>
    );
  }

  // Calcular fechas mínima y máxima
  let minDate = new Date();
  let maxDate = new Date();

  tasksWithDates.forEach((task) => {
    const start = task.start_date
      ? parseDateString(task.start_date)
      : parseDateString(task.due_date);
    const end = task.due_date
      ? parseDateString(task.due_date)
      : parseDateString(task.start_date);
    if (start < minDate) minDate = new Date(start);
    if (end > maxDate) maxDate = new Date(end);
  });

  // Agregar margen
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);

  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

  // Calcular posición de barra
  const getBarStyle = (task) => {
    const start = task.start_date
      ? parseDateString(task.start_date)
      : parseDateString(task.due_date);
    const end = task.due_date
      ? parseDateString(task.due_date)
      : parseDateString(task.start_date);

    const startOffset = Math.ceil((start - minDate) / (1000 * 60 * 60 * 24));
    const duration = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
    );

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    let bgColor = colors.primary;
    if (task.status === "done" || task.status === "completed") {
      bgColor = colors.success;
    } else if (task.status === "in-progress" || task.status === "in_progress") {
      bgColor = colors.warning;
    }

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: bgColor,
    };
  };

  // Generar etiquetas de fechas para el header
  const dateLabels = [];
  const step = Math.max(1, Math.floor(totalDays / 6));
  for (let i = 0; i <= totalDays; i += step) {
    const date = new Date(minDate);
    date.setDate(date.getDate() + i);
    dateLabels.push(formatDate(date));
  }

  return (
    <Document>
      <Page size='A4' orientation='landscape' style={baseStyles.page}>
        {/* Header */}
        <View style={baseStyles.header}>
          <Text style={baseStyles.title}>Diagrama Gantt - {project.name}</Text>
          <Text style={baseStyles.subtitle}>
            Generado el {formatDate(new Date())} • {tasksWithDates.length}{" "}
            tareas
          </Text>
        </View>

        {/* Gantt Chart */}
        <View style={ganttStyles.ganttContainer}>
          {/* Header del Gantt */}
          <View style={ganttStyles.ganttHeader}>
            <Text style={ganttStyles.ganttHeaderLabel}>Tarea</Text>
            <View style={ganttStyles.ganttHeaderTimeline}>
              {dateLabels.map((label, i) => (
                <Text key={i} style={ganttStyles.ganttDateLabel}>
                  {label}
                </Text>
              ))}
            </View>
          </View>

          {/* Filas del Gantt */}
          {tasksWithDates.map((task) => (
            <View key={task.id} style={ganttStyles.ganttRow}>
              <View style={ganttStyles.ganttLabel}>
                <Text style={ganttStyles.ganttLabelText}>{task.title}</Text>
              </View>
              <View style={ganttStyles.ganttTimeline}>
                <View style={[ganttStyles.ganttBar, getBarStyle(task)]} />
              </View>
            </View>
          ))}
        </View>

        {/* Leyenda */}
        <View style={ganttStyles.legend}>
          <View style={ganttStyles.legendItem}>
            <View
              style={[
                ganttStyles.legendColor,
                { backgroundColor: colors.secondary },
              ]}
            />
            <Text style={ganttStyles.legendText}>Pendiente</Text>
          </View>
          <View style={ganttStyles.legendItem}>
            <View
              style={[
                ganttStyles.legendColor,
                { backgroundColor: colors.warning },
              ]}
            />
            <Text style={ganttStyles.legendText}>En Progreso</Text>
          </View>
          <View style={ganttStyles.legendItem}>
            <View
              style={[
                ganttStyles.legendColor,
                { backgroundColor: colors.success },
              ]}
            />
            <Text style={ganttStyles.legendText}>Completada</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={baseStyles.footer}>Orkela - Gestión de Proyectos</Text>
        <Text
          style={baseStyles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
};

// ========================================
// PDF: GANTT DE TODOS LOS PROYECTOS
// ========================================

export const AllProjectsGanttPdf = ({ projects }) => {
  // Filtrar proyectos con tareas que tienen fechas
  const projectsWithTasks = projects.filter(
    (p) => p.tasks && p.tasks.some((t) => t.start_date || t.due_date),
  );

  if (projectsWithTasks.length === 0) {
    return (
      <Document>
        <Page size='A4' orientation='landscape' style={baseStyles.page}>
          <View style={baseStyles.header}>
            <Text style={baseStyles.title}>
              Diagrama Gantt - Todos los Proyectos
            </Text>
            <Text style={baseStyles.subtitle}>
              Generado el {formatDate(new Date())}
            </Text>
          </View>
          <Text
            style={{
              textAlign: "center",
              marginTop: 50,
              color: colors.secondary,
            }}
          >
            No hay proyectos con tareas fechadas para mostrar.
          </Text>
        </Page>
      </Document>
    );
  }

  // Calcular rango global
  let minDate = new Date();
  let maxDate = new Date();

  projectsWithTasks.forEach((project) => {
    project.tasks.forEach((task) => {
      if (task.start_date || task.due_date) {
        const start = task.start_date
          ? parseDateString(task.start_date)
          : parseDateString(task.due_date);
        const end = task.due_date
          ? parseDateString(task.due_date)
          : parseDateString(task.start_date);
        if (start < minDate) minDate = new Date(start);
        if (end > maxDate) maxDate = new Date(end);
      }
    });
  });

  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

  const getBarStyle = (task) => {
    const start = task.start_date
      ? parseDateString(task.start_date)
      : parseDateString(task.due_date);
    const end = task.due_date
      ? parseDateString(task.due_date)
      : parseDateString(task.start_date);

    const startOffset = Math.ceil((start - minDate) / (1000 * 60 * 60 * 24));
    const duration = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
    );

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    let bgColor = colors.primary;
    if (task.status === "done" || task.status === "completed") {
      bgColor = colors.success;
    } else if (task.status === "in-progress" || task.status === "in_progress") {
      bgColor = colors.warning;
    }

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: bgColor,
    };
  };

  const dateLabels = [];
  const step = Math.max(1, Math.floor(totalDays / 6));
  for (let i = 0; i <= totalDays; i += step) {
    const date = new Date(minDate);
    date.setDate(date.getDate() + i);
    dateLabels.push(formatDate(date));
  }

  return (
    <Document>
      <Page size='A4' orientation='landscape' style={baseStyles.page}>
        {/* Header */}
        <View style={baseStyles.header}>
          <Text style={baseStyles.title}>
            Diagrama Gantt - Todos los Proyectos
          </Text>
          <Text style={baseStyles.subtitle}>
            Generado el {formatDate(new Date())} • {projectsWithTasks.length}{" "}
            proyectos
          </Text>
        </View>

        {/* Gantt por proyecto */}
        {projectsWithTasks.map((project) => {
          const tasksWithDates = project.tasks.filter(
            (t) => t.start_date || t.due_date,
          );
          if (tasksWithDates.length === 0) return null;

          return (
            <View key={project.id} style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: colors.primary,
                  marginBottom: 5,
                }}
              >
                {project.name}
              </Text>

              <View style={ganttStyles.ganttContainer}>
                <View style={ganttStyles.ganttHeader}>
                  <Text style={ganttStyles.ganttHeaderLabel}>Tarea</Text>
                  <View style={ganttStyles.ganttHeaderTimeline}>
                    {dateLabels.map((label, i) => (
                      <Text key={i} style={ganttStyles.ganttDateLabel}>
                        {label}
                      </Text>
                    ))}
                  </View>
                </View>

                {tasksWithDates.map((task) => (
                  <View key={task.id} style={ganttStyles.ganttRow}>
                    <View style={ganttStyles.ganttLabel}>
                      <Text style={ganttStyles.ganttLabelText}>
                        {task.title}
                      </Text>
                    </View>
                    <View style={ganttStyles.ganttTimeline}>
                      <View style={[ganttStyles.ganttBar, getBarStyle(task)]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Leyenda */}
        <View style={ganttStyles.legend}>
          <View style={ganttStyles.legendItem}>
            <View
              style={[
                ganttStyles.legendColor,
                { backgroundColor: colors.secondary },
              ]}
            />
            <Text style={ganttStyles.legendText}>Pendiente</Text>
          </View>
          <View style={ganttStyles.legendItem}>
            <View
              style={[
                ganttStyles.legendColor,
                { backgroundColor: colors.warning },
              ]}
            />
            <Text style={ganttStyles.legendText}>En Progreso</Text>
          </View>
          <View style={ganttStyles.legendItem}>
            <View
              style={[
                ganttStyles.legendColor,
                { backgroundColor: colors.success },
              ]}
            />
            <Text style={ganttStyles.legendText}>Completada</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={baseStyles.footer}>Orkela - Gestión de Proyectos</Text>
        <Text
          style={baseStyles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
};

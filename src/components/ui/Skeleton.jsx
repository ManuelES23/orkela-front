import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../animations/variants";

/**
 * Bloque base de skeleton ("Andamio"). Composición libre vía className.
 * El barrido de brillo es CSS (ver .skeleton en index.css) por ser un loop
 * continuo; las piezas de abajo son las que se encargan de la entrada
 * (stagger) y del cruce hacia el contenido real, con framer-motion.
 */
export const Skeleton = ({ className = "" }) => (
  <div aria-hidden='true' className={`skeleton ${className}`} />
);

/**
 * Envoltorio con stagger listo para usar: solo hay que ponerle dentro
 * los bloques (Skeleton, SkeletonCard, SkeletonRow, ...).
 */
export const SkeletonGroup = ({ className = "", children }) => (
  <motion.div variants={containerVariants} initial='hidden' animate='visible' className={className}>
    {children}
  </motion.div>
);

/** Tarjeta genérica (Proyectos, Equipos, Organizaciones en grid). */
export const SkeletonCard = () => (
  <motion.div
    variants={itemVariants}
    className='bg-white rounded-xl p-5 border border-gray-100 space-y-4'
  >
    <div className='flex items-center gap-3'>
      <Skeleton className='w-10 h-10 rounded-lg shrink-0' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
      </div>
    </div>
    <Skeleton className='h-2 w-full' />
    <div className='flex gap-2'>
      <Skeleton className='h-5 w-16 rounded-full' />
      <Skeleton className='h-5 w-12 rounded-full' />
    </div>
  </motion.div>
);

/** Grid de tarjetas listo para usar (Proyectos, Equipos, Organizaciones). */
export const SkeletonCardGrid = ({ count = 6, className = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" }) => (
  <SkeletonGroup className={`grid ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </SkeletonGroup>
);

/** Fila horizontal genérica (Tareas, Tickets, listas de Admin). */
export const SkeletonRow = () => (
  <motion.div
    variants={itemVariants}
    className='flex items-center gap-4 bg-white rounded-lg p-4 border border-gray-100'
  >
    <Skeleton className='w-9 h-9 rounded-lg shrink-0' />
    <div className='flex-1 space-y-2'>
      <Skeleton className='h-4 w-2/3' />
      <Skeleton className='h-3 w-1/3' />
    </div>
    <Skeleton className='h-5 w-16 rounded-full shrink-0' />
  </motion.div>
);

/** Lista de filas lista para usar. */
export const SkeletonRows = ({ count = 6, className = "space-y-3" }) => (
  <SkeletonGroup className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonRow key={i} />
    ))}
  </SkeletonGroup>
);

/** Fila de tabla/panel compacto (paneles internos de Admin). */
export const SkeletonTableRow = ({ columns = 4 }) => (
  <motion.div variants={itemVariants} className='flex items-center gap-4 py-3'>
    <Skeleton className='w-8 h-8 rounded-full shrink-0' />
    {Array.from({ length: columns }).map((_, c) => (
      <Skeleton key={c} className={c === 0 ? "h-3.5 w-1/4" : "h-3.5 flex-1 max-w-[140px]"} />
    ))}
  </motion.div>
);

export const SkeletonTableRows = ({ rows = 6, columns = 4, className = "divide-y divide-gray-100" }) => (
  <SkeletonGroup className={className}>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonTableRow key={i} columns={columns} />
    ))}
  </SkeletonGroup>
);

/** Cabecera de página de detalle (avatar/ícono + título + subtítulo). */
export const SkeletonDetailHeader = () => (
  <motion.div variants={itemVariants} className='flex items-center gap-4 mb-8'>
    <Skeleton className='w-14 h-14 rounded-xl shrink-0' />
    <div className='flex-1 space-y-2'>
      <Skeleton className='h-6 w-64 max-w-full' />
      <Skeleton className='h-3.5 w-40' />
    </div>
  </motion.div>
);

/** Bloque de contenido rectangular (secciones de una página de detalle). */
export const SkeletonPanel = ({ className = "" }) => (
  <motion.div
    variants={itemVariants}
    className={`bg-white rounded-xl border border-gray-100 p-5 space-y-3 ${className}`}
  >
    <Skeleton className='h-4 w-1/3' />
    <Skeleton className='h-3 w-full' />
    <Skeleton className='h-3 w-5/6' />
  </motion.div>
);

/**
 * Andamio completo para páginas de detalle (ProjectDetail, TeamDetail,
 * OrganizationDetail): cabecera + fila de stats + dos paneles de contenido.
 */
export const SkeletonDetail = () => (
  <SkeletonGroup>
    <SkeletonDetailHeader />
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
      {[0, 1, 2, 3].map((i) => (
        <motion.div key={i} variants={itemVariants} className='bg-white rounded-xl p-4 border border-gray-100 space-y-2'>
          <Skeleton className='h-6 w-12' />
          <Skeleton className='h-3 w-20' />
        </motion.div>
      ))}
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      <SkeletonPanel className='lg:col-span-2' />
      <SkeletonPanel />
    </div>
  </SkeletonGroup>
);

/** Andamio para páginas de ajustes/configuración (secciones tipo formulario). */
export const SkeletonSettings = ({ sections = 3 }) => (
  <SkeletonGroup className='space-y-6'>
    {Array.from({ length: sections }).map((_, i) => (
      <motion.div key={i} variants={itemVariants} className='bg-white rounded-xl border border-gray-100 p-6 space-y-4'>
        <Skeleton className='h-4 w-40' />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Skeleton className='h-3 w-24' />
            <Skeleton className='h-10 w-full rounded-lg' />
          </div>
          <div className='space-y-2'>
            <Skeleton className='h-3 w-24' />
            <Skeleton className='h-10 w-full rounded-lg' />
          </div>
        </div>
      </motion.div>
    ))}
  </SkeletonGroup>
);

export default Skeleton;

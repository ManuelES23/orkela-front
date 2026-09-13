import { motion } from "framer-motion";
import { Skeleton, SkeletonGroup, SkeletonPanel } from "../ui/Skeleton";
import { itemVariants } from "../animations/variants";

/** Fila de la lista de clientes: icono + nombre + subtítulo. */
const ClientRowSkeleton = () => (
  <motion.div variants={itemVariants} className='px-4 py-3 border-b border-gray-100 dark:border-night-800 space-y-1.5'>
    <div className='flex items-center gap-1.5'>
      <Skeleton className='w-3.5 h-3.5 rounded shrink-0' />
      <Skeleton className='h-3.5 w-2/3' />
    </div>
    <Skeleton className='h-3 w-1/3' />
  </motion.div>
);

/** Andamio de la columna izquierda (lista de clientes) mientras carga. */
export const ClientListSkeleton = ({ count = 8 }) => (
  <SkeletonGroup>
    {Array.from({ length: count }).map((_, i) => (
      <ClientRowSkeleton key={i} />
    ))}
  </SkeletonGroup>
);

/**
 * Andamio del panel de detalle de un cliente, calcado de su forma real:
 * encabezado, fila de acciones, notas, contactos y tickets recientes.
 */
export const ClientDetailSkeleton = () => (
  <SkeletonGroup>
    <div className='flex items-start justify-between mb-6'>
      <div className='space-y-2'>
        <Skeleton className='h-6 w-48' />
        <Skeleton className='h-3.5 w-24' />
      </div>
      <Skeleton className='h-4 w-12' />
    </div>

    <div className='flex gap-2 mb-6'>
      <Skeleton className='h-8 w-28 rounded-lg' />
    </div>

    <motion.div variants={itemVariants} className='mb-3'>
      <Skeleton className='h-4 w-24 mb-3' />
    </motion.div>
    <div className='space-y-2 mb-6'>
      {[0, 1].map((i) => (
        <motion.div key={i} variants={itemVariants} className='flex items-center gap-3 px-3 py-2.5 border border-gray-100 dark:border-night-800 rounded-lg'>
          <div className='flex-1 space-y-1.5'>
            <Skeleton className='h-3.5 w-1/3' />
            <Skeleton className='h-3 w-1/2' />
          </div>
        </motion.div>
      ))}
    </div>

    <SkeletonPanel />
  </SkeletonGroup>
);

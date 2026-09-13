import { motion } from "framer-motion";
import { Skeleton, SkeletonGroup } from "../ui/Skeleton";
import { itemVariants } from "../animations/variants";

/** Andamio del formulario de TicketModal (crear/editar) mientras carga equipos/proyectos. */
export const TicketFormSkeleton = () => (
  <SkeletonGroup className='space-y-5'>
    <motion.div variants={itemVariants} className='space-y-2'>
      <Skeleton className='h-3 w-32' />
      <Skeleton className='h-10 w-full rounded-lg' />
    </motion.div>
    <motion.div variants={itemVariants} className='space-y-2'>
      <Skeleton className='h-3 w-28' />
      <Skeleton className='h-24 w-full rounded-lg' />
    </motion.div>
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
      <motion.div variants={itemVariants} className='space-y-2'>
        <Skeleton className='h-3 w-20' />
        <Skeleton className='h-10 w-full rounded-lg' />
      </motion.div>
      <motion.div variants={itemVariants} className='space-y-2'>
        <Skeleton className='h-3 w-20' />
        <Skeleton className='h-10 w-full rounded-lg' />
      </motion.div>
    </div>
    <motion.div variants={itemVariants} className='space-y-2'>
      <Skeleton className='h-3 w-24' />
      <Skeleton className='h-10 w-full rounded-lg' />
    </motion.div>
  </SkeletonGroup>
);

/** Andamio del detalle de TicketDetailModal, calcado de su forma real. */
export const TicketDetailSkeleton = () => (
  <SkeletonGroup className='space-y-6'>
    <motion.div variants={itemVariants} className='flex items-start gap-4'>
      <Skeleton className='w-12 h-12 rounded-lg shrink-0' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-5 w-2/3' />
        <Skeleton className='h-3.5 w-1/3' />
      </div>
    </motion.div>

    <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
      {[0, 1, 2, 3].map((i) => (
        <motion.div key={i} variants={itemVariants} className='space-y-1.5'>
          <Skeleton className='h-3 w-3/4' />
          <Skeleton className='h-4 w-1/2' />
        </motion.div>
      ))}
    </div>

    <motion.div variants={itemVariants}>
      <Skeleton className='h-3 w-24 mb-3' />
      <div className='space-y-3'>
        {[0, 1, 2].map((i) => (
          <div key={i} className='flex items-start gap-2'>
            <Skeleton className='w-7 h-7 rounded-full shrink-0' />
            <Skeleton className={`h-10 rounded-lg ${i === 1 ? "w-1/2" : "w-2/3"}`} />
          </div>
        ))}
      </div>
    </motion.div>
  </SkeletonGroup>
);

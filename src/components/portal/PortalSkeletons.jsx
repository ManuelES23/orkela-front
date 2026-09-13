import { motion } from "framer-motion";
import { Skeleton, SkeletonGroup } from "../ui/Skeleton";
import { itemVariants } from "../animations/variants";

/** Andamio del hilo de conversación (PortalThread) mientras carga un ticket. */
export const PortalThreadSkeleton = () => (
  <SkeletonGroup className='flex-1 overflow-y-auto p-4 space-y-3'>
    <motion.div variants={itemVariants}>
      <Skeleton className='h-16 w-3/4 rounded-2xl' />
    </motion.div>
    <motion.div variants={itemVariants} className='ml-auto w-fit'>
      <Skeleton className='h-10 w-1/2 rounded-2xl' />
    </motion.div>
    <motion.div variants={itemVariants}>
      <Skeleton className='h-10 w-2/3 rounded-2xl' />
    </motion.div>
  </SkeletonGroup>
);

/** Andamio del panel de detalles del ticket (PortalTicketDetailsPanel). */
export const PortalPanelSkeleton = () => (
  <SkeletonGroup className='p-5 space-y-6'>
    <motion.div variants={itemVariants}>
      <Skeleton className='h-3 w-32' />
    </motion.div>
    <motion.div variants={itemVariants} className='flex items-center gap-2'>
      <Skeleton className='w-7 h-7 rounded-full shrink-0' />
      <Skeleton className='h-4 w-24' />
    </motion.div>
    <motion.div variants={itemVariants} className='grid grid-cols-2 gap-4'>
      <div className='space-y-1.5'>
        <Skeleton className='h-3 w-12' />
        <Skeleton className='h-4 w-16' />
      </div>
      <div className='space-y-1.5'>
        <Skeleton className='h-3 w-14' />
        <Skeleton className='h-4 w-16' />
      </div>
    </motion.div>
    <motion.div variants={itemVariants} className='space-y-3'>
      <Skeleton className='h-3 w-24' />
      <Skeleton className='h-3 w-full' />
      <Skeleton className='h-3 w-3/4' />
    </motion.div>
  </SkeletonGroup>
);

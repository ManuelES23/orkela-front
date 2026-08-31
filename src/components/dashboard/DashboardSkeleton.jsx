import { motion } from "framer-motion";
import Skeleton from "../ui/Skeleton";
import { containerVariants, itemVariants } from "../animations/variants";

/**
 * Silueta ("Andamio") de la vista de Dashboard mientras se resuelven
 * projects/tasks/teams en paralelo. Se dibuja dentro de <Layout>, así que
 * la barra lateral y la cabecera ya son reales — solo se skeletoniza el
 * contenido, con la misma proporción que el Dashboard cargado.
 */
const DashboardSkeleton = () => (
  <motion.div variants={containerVariants} initial='hidden' animate='visible'>
    {/* Saludo */}
    <motion.div variants={itemVariants} className='mb-8 flex items-center justify-between'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-4 w-48' />
      </div>
      <Skeleton className='hidden md:block h-10 w-36' />
    </motion.div>

    {/* Anillos de progreso */}
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className='bg-white dark:bg-night-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-night-700 flex items-center gap-4'
        >
          <Skeleton className='w-13 h-13 rounded-full shrink-0' />
          <div className='space-y-2 flex-1'>
            <Skeleton className='h-6 w-12' />
            <Skeleton className='h-3 w-20' />
          </div>
        </motion.div>
      ))}
    </div>

    {/* Proyectos recientes + panel lateral */}
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      <motion.div
        variants={itemVariants}
        className='lg:col-span-2 bg-white dark:bg-night-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-night-700'
      >
        <Skeleton className='h-5 w-40 mb-5' />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='p-4 rounded-lg border border-gray-100 dark:border-night-700 space-y-3'>
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-3 w-1/2' />
              <Skeleton className='h-2 w-full' />
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className='bg-white dark:bg-night-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-night-700 space-y-4'
      >
        <Skeleton className='h-5 w-32' />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className='flex items-center gap-3'>
            <Skeleton className='w-8 h-8 rounded-full shrink-0' />
            <Skeleton className='h-3 flex-1' />
          </div>
        ))}
      </motion.div>
    </div>
  </motion.div>
);

export default DashboardSkeleton;

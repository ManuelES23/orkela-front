import { motion } from "framer-motion";
import { itemVariants } from "../../animations/variants";

/** Ficha de un método de acceso (propuesta B). */
const AccessTile = ({ icon: Icon, title, subtitle, active, statusLabel, children }) => (
  <motion.div
    layout
    variants={itemVariants}
    className={`flex min-w-0 flex-col gap-3 rounded-xl border p-4 transition-colors duration-300 ${
      active
        ? "border-brand-200 bg-white dark:border-brand-800 dark:bg-night-900"
        : "border-gray-100 bg-gray-50 dark:border-night-700 dark:bg-night-800"
    }`}
  >
    <div className='flex items-center justify-between gap-2'>
      <span className='grid h-10 w-10 place-items-center rounded-xl border border-gray-100 bg-white dark:border-night-700 dark:bg-night-900'>
        {Icon && <Icon className='h-5 w-5' aria-hidden='true' />}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
          active
            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
            : "border border-gray-200 text-gray-500 dark:border-night-700 dark:text-night-400"
        }`}
      >
        {active && <span className='h-1.5 w-1.5 rounded-full bg-current' aria-hidden='true' />}
        {statusLabel}
      </span>
    </div>
    <div className='min-w-0 flex-1'>
      <p className='text-sm font-extrabold text-gray-900 dark:text-night-50'>{title}</p>
      <p className='text-xs text-gray-500 dark:text-night-400 break-all'>{subtitle}</p>
    </div>
    {children}
  </motion.div>
);

export default AccessTile;

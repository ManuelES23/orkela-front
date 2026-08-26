import { motion } from "framer-motion";

const RESOURCE_LABELS = {
  members: "Miembros",
  projects: "Proyectos",
  teams: "Equipos",
  storage: "Almacenamiento",
};

const formatStorage = (bytes) => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

const PlanUsageBars = ({ limits, usage }) => {
  if (!limits) return null;

  const rows = [
    { key: "members", used: usage.members ?? 0, limit: limits.members },
    { key: "projects", used: usage.projects ?? 0, limit: limits.projects },
    { key: "teams", used: usage.teams ?? 0, limit: limits.teams },
    {
      key: "storage",
      used: usage.storage_bytes ?? 0,
      limit: limits.storage_mb === -1 ? -1 : limits.storage_mb * 1024 * 1024,
      formatted: true,
    },
  ];

  return (
    <div className='space-y-4'>
      {rows.map((row, index) => {
        const unlimited = row.limit === -1;
        const percent = unlimited
          ? 0
          : Math.min(100, row.limit > 0 ? (row.used / row.limit) * 100 : 100);
        const barColor =
          percent >= 90
            ? "bg-red-500"
            : percent >= 70
              ? "bg-yellow-500"
              : "bg-indigo-600";

        return (
          <motion.div
            key={row.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className='flex justify-between items-center mb-1'>
              <span className='text-sm font-medium text-gray-700'>
                {RESOURCE_LABELS[row.key]}
              </span>
              <span className='text-xs text-gray-500'>
                {unlimited
                  ? "Sin límite"
                  : row.formatted
                    ? `${formatStorage(row.used)} / ${formatStorage(row.limit)}`
                    : `${row.used}/${row.limit}`}
              </span>
            </div>
            <div className='w-full bg-gray-200 rounded-full h-2'>
              <div
                className={`h-2 rounded-full transition-all ${unlimited ? "bg-gray-300" : barColor}`}
                style={{ width: `${unlimited ? 100 : percent}%` }}
              ></div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PlanUsageBars;

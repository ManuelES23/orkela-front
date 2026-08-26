import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Building2, Save } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import { adminOrganizationsAPI } from "../../utils/adminAPI";
import PlanUsageBars from "../ui/PlanUsageBars";

const PLAN_LABELS = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const getExpiryStatus = (org) => {
  if (org.plan === "free" || !org.plan_expires_at) {
    return { label: "Sin vencimiento", dot: "bg-gray-300" };
  }
  const daysLeft = Math.ceil(
    (new Date(org.plan_expires_at) - new Date()) / (1000 * 60 * 60 * 24),
  );
  if (daysLeft < 0) return { label: "Vencida", dot: "bg-red-500" };
  if (daysLeft <= 30) return { label: "Por vencer", dot: "bg-yellow-500" };
  return { label: "Activa", dot: "bg-green-500" };
};

const LicensesManagement = () => {
  const { success, error } = useNotification();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm] = useState({ plan: "free", plan_expires_at: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await adminOrganizationsAPI.getAll();
      setOrganizations(data);
      if (data.length > 0) {
        setSelectedId((current) => current ?? data[0].id);
      }
    } catch (err) {
      error("Error al cargar organizaciones");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const loadDetail = async (id) => {
    try {
      setLoadingDetail(true);
      const data = await adminOrganizationsAPI.getStats(id);
      setDetail(data);
      setForm({
        plan: data.organization.plan,
        plan_expires_at: data.organization.plan_expires_at
          ? data.organization.plan_expires_at.slice(0, 10)
          : "",
      });
    } catch (err) {
      error("Error al cargar el detalle de la organización");
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = useMemo(() => {
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [organizations, search]);

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      setSaving(true);
      await adminOrganizationsAPI.update(selectedId, {
        plan: form.plan,
        plan_expires_at: form.plan_expires_at || null,
      });
      success("Plan actualizado exitosamente");
      await loadOrganizations();
      await loadDetail(selectedId);
    } catch (err) {
      error(err.message || "Error al actualizar el plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600'></div>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6'>
      <div className='bg-white border border-gray-200 rounded-xl overflow-hidden'>
        <div className='p-4 border-b border-gray-100'>
          <div className='relative'>
            <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Buscar organización'
              className='w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
            />
          </div>
        </div>
        <div className='divide-y divide-gray-100 max-h-[560px] overflow-y-auto'>
          {filtered.length === 0 && (
            <p className='p-4 text-sm text-gray-500'>
              No se encontraron organizaciones.
            </p>
          )}
          {filtered.map((org) => {
            const status = getExpiryStatus(org);
            const isSelected = org.id === selectedId;
            return (
              <button
                key={org.id}
                type='button'
                onClick={() => setSelectedId(org.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected ? "bg-brand-50" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`}
                  aria-hidden='true'
                ></span>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-medium text-gray-900 truncate'>
                    {org.name}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {PLAN_LABELS[org.plan] || org.plan}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className='bg-white border border-gray-200 rounded-xl p-6'>
        {loadingDetail || !detail ? (
          <div className='flex items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600'></div>
          </div>
        ) : (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className='flex items-center gap-3 mb-6'>
              <div className='w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center'>
                <Building2 className='w-5 h-5 text-brand-600' />
              </div>
              <div>
                <h3 className='font-semibold text-gray-900'>
                  {detail.organization.name}
                </h3>
                <p className='text-sm text-gray-500'>
                  {PLAN_LABELS[detail.organization.plan] ||
                    detail.organization.plan}
                </p>
              </div>
            </div>

            <div className='mb-6'>
              <PlanUsageBars
                limits={detail.plan_limits}
                usage={{
                  members: detail.stats.members,
                  projects: detail.stats.projects,
                  teams: detail.stats.teams,
                  storage_bytes: detail.storage_used_bytes,
                }}
              />
            </div>

            <div className='border-t border-gray-100 pt-6'>
              <h4 className='text-sm font-medium text-gray-900 mb-3'>
                Cambiar plan
              </h4>
              <div className='flex flex-col sm:flex-row gap-3'>
                <select
                  value={form.plan}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, plan: e.target.value }))
                  }
                  className='flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                >
                  <option value='free'>Free</option>
                  <option value='starter'>Starter</option>
                  <option value='professional'>Professional</option>
                  <option value='enterprise'>Enterprise</option>
                </select>
                <input
                  type='date'
                  value={form.plan_expires_at}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      plan_expires_at: e.target.value,
                    }))
                  }
                  className='px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className='flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm disabled:opacity-50'
                >
                  <Save className='w-4 h-4' />
                  {saving ? "Guardando..." : "Guardar"}
                </motion.button>
              </div>
              <p className='text-xs text-gray-400 mt-2'>
                Deja la fecha vacía para un plan sin vencimiento.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LicensesManagement;

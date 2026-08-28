import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Building2, Save } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import { adminOrganizationsAPI, adminPlansAPI } from "../../utils/adminAPI";
import PlanUsageBars from "../ui/PlanUsageBars";

const getExpiryStatus = (org) => {
  if (org.plan?.is_default || !org.plan_expires_at) {
    return { label: "Sin vencimiento", dot: "bg-gray-300" };
  }
  const dateOnly = org.plan_expires_at.slice(0, 10);
  const expiresAtUTC = new Date(`${dateOnly}T00:00:00Z`);
  const todayUTC = new Date(
    `${new Date().toISOString().slice(0, 10)}T00:00:00Z`,
  );
  const daysLeft = Math.ceil(
    (expiresAtUTC - todayUTC) / (1000 * 60 * 60 * 24),
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
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [plansCatalog, setPlansCatalog] = useState([]);
  const [form, setForm] = useState({
    plan_id: "",
    plan_expires_at: "",
    billing_cycle: "monthly",
    custom_monthly_price: "",
    custom_annual_price: "",
    custom_limits: { members: "", projects: "", teams: "", storage_mb: "" },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    adminPlansAPI.getAll().then(setPlansCatalog).catch((err) => console.error(err));
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
      setDetailError(null);
      const data = await adminOrganizationsAPI.getStats(id);
      setDetail(data);
      setForm({
        plan_id: data.organization.plan?.id ?? "",
        plan_expires_at: data.organization.plan_expires_at
          ? data.organization.plan_expires_at.slice(0, 10)
          : "",
        billing_cycle: data.organization.billing_cycle || "monthly",
        custom_monthly_price: data.organization.custom_monthly_price ?? "",
        custom_annual_price: data.organization.custom_annual_price ?? "",
        custom_limits: {
          members: data.organization.custom_limits?.members ?? "",
          projects: data.organization.custom_limits?.projects ?? "",
          teams: data.organization.custom_limits?.teams ?? "",
          storage_mb: data.organization.custom_limits?.storage_mb ?? "",
        },
      });
    } catch (err) {
      setDetail(null);
      setForm({
        plan_id: "",
        plan_expires_at: "",
        billing_cycle: "monthly",
        custom_monthly_price: "",
        custom_annual_price: "",
        custom_limits: { members: "", projects: "", teams: "", storage_mb: "" },
      });
      setDetailError("Error al cargar el detalle de la organización");
      error("Error al cargar el detalle de la organización");
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch = org.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesPlan = planFilter === "all" || org.plan?.id === Number(planFilter);
      return matchesSearch && matchesPlan;
    });
  }, [organizations, search, planFilter]);

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      setSaving(true);
      const selectedPlan = plansCatalog.find((p) => p.id === Number(form.plan_id));
      const payload = {
        plan_id: form.plan_id,
        plan_expires_at: form.plan_expires_at || null,
        billing_cycle: form.billing_cycle,
      };
      if (selectedPlan?.is_custom) {
        payload.custom_monthly_price = form.custom_monthly_price || null;
        payload.custom_annual_price = form.custom_annual_price || null;
        const limits = {};
        for (const key of ["members", "projects", "teams", "storage_mb"]) {
          if (form.custom_limits[key] !== "") {
            limits[key] = Number(form.custom_limits[key]);
          }
        }
        payload.custom_limits = Object.keys(limits).length ? limits : null;
      }
      await adminOrganizationsAPI.update(selectedId, payload);
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
        <div className='p-4 border-b border-gray-100 space-y-2'>
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
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
          >
            <option value='all'>Todos los planes</option>
            {plansCatalog.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
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
                    {org.plan?.name || "Sin plan"}
                    <span className='text-gray-400'> · {status.label}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className='bg-white border border-gray-200 rounded-xl p-6'>
        {organizations.length === 0 ? (
          <p className='text-sm text-gray-500 text-center py-12'>
            No hay organizaciones para mostrar.
          </p>
        ) : detailError ? (
          <div className='text-sm text-gray-500 text-center py-12'>
            <p className='mb-4'>{detailError}</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type='button'
              onClick={() => loadDetail(selectedId)}
              className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm'
            >
              Reintentar
            </motion.button>
          </div>
        ) : loadingDetail || !detail ? (
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
                  {detail.organization.plan?.name || "Sin plan"}
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
              <div className='flex flex-col sm:flex-row gap-3 mb-3'>
                <select
                  value={form.plan_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, plan_id: e.target.value }))
                  }
                  className='flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                >
                  {plansCatalog
                    .filter((p) => p.is_active || p.id === Number(form.plan_id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{!p.is_active ? " (inactivo)" : ""}
                      </option>
                    ))}
                </select>
                <select
                  value={form.billing_cycle}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, billing_cycle: e.target.value }))
                  }
                  className='px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500'
                >
                  <option value='monthly'>Mensual</option>
                  <option value='annual'>Anual</option>
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
              </div>

              {plansCatalog.find((p) => p.id === Number(form.plan_id))?.is_custom && (
                <div className='mb-3 p-3 bg-gray-50 rounded-lg space-y-2'>
                  <p className='text-xs font-medium text-gray-700'>
                    Personalizar para esta organización
                  </p>
                  <div className='grid grid-cols-2 gap-2'>
                    <input
                      type='number'
                      placeholder='Precio mensual (MXN)'
                      value={form.custom_monthly_price}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, custom_monthly_price: e.target.value }))
                      }
                      className='px-3 py-2 text-xs border border-gray-200 rounded-lg'
                    />
                    <input
                      type='number'
                      placeholder='Precio anual (MXN)'
                      value={form.custom_annual_price}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, custom_annual_price: e.target.value }))
                      }
                      className='px-3 py-2 text-xs border border-gray-200 rounded-lg'
                    />
                    {[
                      { key: "members", label: "Miembros" },
                      { key: "projects", label: "Proyectos" },
                      { key: "teams", label: "Equipos" },
                      { key: "storage_mb", label: "Almacenamiento (MB)" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label
                          htmlFor={`custom-limit-${key}`}
                          className='block text-xs text-gray-500 mb-1'
                        >
                          {label}
                        </label>
                        <input
                          id={`custom-limit-${key}`}
                          type='number'
                          placeholder='-1 = ilimitado'
                          value={form.custom_limits[key]}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              custom_limits: { ...prev.custom_limits, [key]: e.target.value },
                            }))
                          }
                          className='w-full px-3 py-2 text-xs border border-gray-200 rounded-lg'
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

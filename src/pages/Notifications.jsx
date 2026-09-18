import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bell, BellOff, Check, CheckCheck, Clock, Loader2, RefreshCw, Trash2 } from "lucide-react";
import Layout from "../components/layout/Layout";
import Button from "../components/ui/Button";
import { SkeletonRows } from "../components/ui/Skeleton";
import { FadeIn } from "../components/animations/MotionComponents";
import { motionTokens } from "../components/animations/variants";
import NotificationIcon from "../components/notifications/NotificationIcon";
import { useRealtime } from "../context/RealtimeContext";
import { useNotification } from "../context/NotificationContext";
import { notificationsAPI } from "../utils/api";
import {
  NOTIFICATION_CATEGORIES,
  groupByDay,
  normalizeNotification,
  notificationTarget,
  retentionLabel,
} from "../utils/notifications";
import { formatDistanceToNow } from "../utils/dateUtils";

const PAGE_SIZE = 20;

const CATEGORY_TABS = [{ value: "all", label: "Todas" }, ...NOTIFICATION_CATEGORIES];

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "No leídas" },
];

const formatTime = (date) =>
  date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

const Notifications = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { error: showError } = useNotification();
  const {
    unreadCount,
    retentionDays: contextRetention,
    markAsRead,
    markAllAsRead,
    removeNotification,
    subscribeToNotifications,
  } = useRealtime();

  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [retentionDays, setRetentionDays] = useState(contextRetention);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Id de la última carga: al cambiar de filtro se descartan las respuestas
  // viejas que lleguen tarde.
  const requestIdRef = useRef(0);
  const sentinelRef = useRef(null);

  const buildParams = useCallback(
    (cursor) => ({
      limit: PAGE_SIZE,
      ...(category !== "all" && { category }),
      ...(status !== "all" && { status }),
      ...(cursor && { cursor }),
    }),
    [category, status]
  );

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsAPI.list(buildParams());
      if (requestId !== requestIdRef.current) return;
      setItems((response?.data || []).map(normalizeNotification));
      setNextCursor(response?.next_cursor || null);
      if (response?.retention_days !== undefined) setRetentionDays(response.retention_days);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error al cargar notificaciones:", err);
      setError("No se pudieron cargar las notificaciones");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    try {
      const response = await notificationsAPI.list(buildParams(nextCursor));
      if (requestId !== requestIdRef.current) return;
      const more = (response?.data || []).map(normalizeNotification);
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...more.filter((n) => !seen.has(n.id))];
      });
      setNextCursor(response?.next_cursor || null);
    } catch (err) {
      console.error("Error al cargar más notificaciones:", err);
      showError("No se pudieron cargar más notificaciones");
    } finally {
      setLoadingMore(false);
    }
  }, [buildParams, loadingMore, nextCursor, showError]);

  // Scroll infinito: cargar la siguiente página al acercarse al final
  // (el botón "Cargar más" queda como alternativa accesible).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextCursor || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  // Cambios del historial hechos en otro lado (campana) o recibidos en vivo
  useEffect(
    () =>
      subscribeToNotifications((change) => {
        switch (change.kind) {
          case "created": {
            const n = change.notification;
            if (category !== "all" && n.category !== category) return;
            setItems((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
            break;
          }
          case "read":
            setItems((prev) => prev.map((n) => (n.id === change.id ? { ...n, read: true } : n)));
            break;
          case "read-all":
            setItems((prev) => prev.map((n) => ({ ...n, read: true })));
            break;
          case "removed":
            setItems((prev) => prev.filter((n) => n.id !== change.id));
            break;
          default:
            break;
        }
      }),
    [subscribeToNotifications, category]
  );

  const handleOpen = (notification) => {
    if (!notification.read) markAsRead(notification.id);
    const target = notificationTarget(notification);
    if (target) navigate(target);
  };

  const handleMarkAsRead = (event, notification) => {
    event.stopPropagation();
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    markAsRead(notification.id);
  };

  const handleRemove = async (event, notification) => {
    event.stopPropagation();
    const snapshot = items;
    setItems((prev) => prev.filter((n) => n.id !== notification.id));
    try {
      await removeNotification(notification.id);
    } catch (err) {
      console.error("Error al eliminar notificación:", err);
      setItems(snapshot);
      showError("No se pudo eliminar la notificación");
    }
  };

  const groups = useMemo(() => groupByDay(items), [items]);
  const effectiveRetention = retentionDays ?? contextRetention;

  const rowMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 },
      };

  const emptyTitle =
    status === "unread" ? "No tienes notificaciones sin leer" : "No tienes notificaciones";
  const emptyText =
    category !== "all"
      ? "Prueba con otra categoría o revisa todas tus notificaciones."
      : "Cuando haya novedades en tus tareas, proyectos o equipos aparecerán aquí.";

  return (
    <Layout
      title='Notificaciones'
      subtitle='Historial de tus avisos'
    >
      <div className='max-w-3xl mx-auto'>
        {/* Barra de filtros */}
        <FadeIn delay={0.05}>
          <div className='flex flex-col gap-3 mb-6'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
              {/* Todas / No leídas */}
              <div
                role='radiogroup'
                aria-label='Estado'
                className='flex gap-1 p-1 bg-gray-100 dark:bg-night-800 rounded-xl w-fit'
              >
                {STATUS_OPTIONS.map((option) => {
                  const active = status === option.value;
                  return (
                    <button
                      key={option.value}
                      type='button'
                      role='radio'
                      aria-checked={active}
                      aria-label={option.label}
                      onClick={() => setStatus(option.value)}
                      className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        active
                          ? "text-brand-700 dark:text-brand-300"
                          : "text-gray-600 dark:text-night-300 hover:text-gray-900 dark:hover:text-night-50"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId='notifications-status'
                          transition={reduceMotion ? { duration: 0 } : motionTokens.springSnappy}
                          className='absolute inset-0 rounded-lg bg-white dark:bg-night-900 shadow-sm'
                        />
                      )}
                      <span className='relative'>
                        {option.label}
                        {option.value === "unread" && unreadCount > 0 && (
                          <span className='ml-1.5 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-brand-600 text-white text-[11px] font-semibold'>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className='flex items-center gap-2'>
                {effectiveRetention !== null && effectiveRetention !== undefined && (
                  <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-night-800 dark:text-night-300'>
                    <Clock className='w-3.5 h-3.5' />
                    {retentionLabel(effectiveRetention)}
                  </span>
                )}
                {unreadCount > 0 && (
                  <Button variant='outline' size='sm' onClick={markAllAsRead} className='border'>
                    <CheckCheck className='w-4 h-4' />
                    Marcar todas como leídas
                  </Button>
                )}
              </div>
            </div>

            {/* Categorías */}
            <div
              role='tablist'
              aria-label='Categoría'
              className='flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1'
            >
              {CATEGORY_TABS.map((tab) => {
                const active = category === tab.value;
                return (
                  <button
                    key={tab.value}
                    type='button'
                    role='tab'
                    aria-selected={active}
                    onClick={() => setCategory(tab.value)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                      active
                        ? "bg-brand-600 border-brand-600 text-white shadow-sm shadow-brand-600/20"
                        : "bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700 dark:bg-night-900 dark:border-night-700 dark:text-night-300 dark:hover:border-brand-500/50 dark:hover:text-brand-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Contenido */}
        {loading ? (
          <SkeletonRows count={6} />
        ) : error ? (
          <div className='flex flex-col items-center gap-3 py-12 text-center'>
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            <Button variant='secondary' size='sm' onClick={loadFirstPage}>
              <RefreshCw className='w-4 h-4' />
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <FadeIn>
            <div className='flex flex-col items-center text-center py-16 px-6 bg-white dark:bg-night-900 rounded-xl border border-dashed border-gray-200 dark:border-night-700'>
              <span className='w-14 h-14 mb-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-300 flex items-center justify-center'>
                {status === "unread" ? <CheckCheck className='w-7 h-7' /> : <BellOff className='w-7 h-7' />}
              </span>
              <p className='text-base font-semibold text-gray-900 dark:text-night-50'>{emptyTitle}</p>
              <p className='text-sm text-gray-500 dark:text-night-400 mt-1 max-w-sm'>{emptyText}</p>
            </div>
          </FadeIn>
        ) : (
          <div className='space-y-6'>
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h2 className='flex items-center gap-2 mb-2 px-1 text-xs font-semibold text-gray-500 dark:text-night-400'>
                  {group.label}
                  <span className='h-px flex-1 bg-gray-200 dark:bg-night-700' />
                </h2>
                <ul className='bg-white dark:bg-night-900 rounded-xl border border-gray-200 dark:border-night-700 divide-y divide-gray-100 dark:divide-night-800 overflow-hidden'>
                  <AnimatePresence initial={false}>
                    {group.items.map((notification) => (
                      <motion.li
                        key={notification.id}
                        {...rowMotion}
                        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease }}
                        className='group relative'
                      >
                        <div
                          role='button'
                          tabIndex={0}
                          onClick={() => handleOpen(notification)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleOpen(notification);
                            }
                          }}
                          className={`flex items-start gap-3 sm:gap-4 px-4 py-4 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
                            notification.read
                              ? "hover:bg-gray-50 dark:hover:bg-night-800/60"
                              : "bg-brand-50/50 hover:bg-brand-50 dark:bg-brand-500/[0.07] dark:hover:bg-brand-500/10"
                          }`}
                        >
                          <NotificationIcon type={notification.type} size='lg' />
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-start justify-between gap-3'>
                              <p
                                className={`text-sm ${
                                  notification.read
                                    ? "font-medium text-gray-700 dark:text-night-200"
                                    : "font-semibold text-gray-900 dark:text-night-50"
                                }`}
                              >
                                {notification.title}
                              </p>
                              <time
                                dateTime={notification.createdAt.toISOString()}
                                title={formatDistanceToNow(notification.createdAt)}
                                className='shrink-0 text-xs text-gray-400 dark:text-night-500 tabular-nums'
                              >
                                {formatTime(notification.createdAt)}
                              </time>
                            </div>
                            <p className='text-sm text-gray-600 dark:text-night-300 leading-snug mt-0.5'>
                              {notification.message}
                            </p>
                          </div>

                          {/* Acciones: visibles en táctil, al pasar el mouse o con foco en escritorio */}
                          <div className='flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity'>
                            {!notification.read && (
                              <button
                                type='button'
                                onClick={(event) => handleMarkAsRead(event, notification)}
                                aria-label='Marcar como leída'
                                title='Marcar como leída'
                                className='p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:text-night-400 dark:hover:text-brand-300 dark:hover:bg-brand-500/10 transition-colors cursor-pointer'
                              >
                                <Check className='w-4 h-4' />
                              </button>
                            )}
                            <button
                              type='button'
                              onClick={(event) => handleRemove(event, notification)}
                              aria-label='Eliminar notificación'
                              title='Eliminar'
                              className='p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:text-night-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-colors cursor-pointer'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>

                          {!notification.read && (
                            <span
                              aria-label='Sin leer'
                              className='absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-500'
                            />
                          )}
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}

            {/* Paginación por cursor */}
            {nextCursor && (
              <div ref={sentinelRef} className='flex justify-center pt-2'>
                <Button variant='secondary' size='sm' onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className='w-4 h-4 animate-spin' /> : <Bell className='w-4 h-4' />}
                  {loadingMore ? "Cargando…" : "Cargar más"}
                </Button>
              </div>
            )}
            {!nextCursor && items.length > PAGE_SIZE / 2 && (
              <p className='text-center text-xs text-gray-400 dark:text-night-500 pt-2'>
                No hay más notificaciones
                {effectiveRetention ? ` · ${retentionLabel(effectiveRetention).toLowerCase()}` : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;

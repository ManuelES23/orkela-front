// Fusión de comentarios del hilo del portal. El mismo comentario puede
// llegar por dos caminos (respuesta del POST y recarga disparada por el
// evento en vivo) en cualquier orden: se unen por id.

const timeOf = (comment) => new Date(comment?.created_at).getTime() || 0;

const byCreatedAtThenId = (a, b) => timeOf(a) - timeOf(b) || a.id - b.id;

export const mergeComments = (current = [], incoming = []) => {
  const byId = new Map();
  [...(current || []), ...(incoming || [])].forEach((comment) => {
    if (comment && comment.id != null) {
      byId.set(comment.id, { ...byId.get(comment.id), ...comment });
    }
  });
  return [...byId.values()].sort(byCreatedAtThenId);
};

// Una recarga del detalle pudo salir antes de que el POST se guardara:
// no debe borrar el comentario que ya se añadió localmente.
export const mergeTicketDetail = (prev, fresh) => {
  if (!prev || prev.id !== fresh.id) return fresh;
  return { ...fresh, comments: mergeComments(fresh.comments, prev.comments) };
};

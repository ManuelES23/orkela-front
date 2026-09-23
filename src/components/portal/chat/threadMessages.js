// Normaliza el ticket del portal en la lista de mensajes que pinta el hilo.
// "Propio" = escrito por el contacto que mira (comment.contact_id ===
// contactId), no "escrito por algún contacto": el admin del Cliente ve los
// mensajes de sus colegas a la izquierda y con nombre.
// Orden y dedupe de comentarios: mergeComments (fase 3), una sola fuente.
import { mergeComments } from "../../../utils/portalComments";

export const buildThreadMessages = (ticket, contactId) => {
  if (!ticket) return [];

  const creator = ticket.creator ?? null;
  const openingIsOwn = creator ? creator.id === contactId : true;

  const opening = {
    key: "description",
    id: null,
    content: ticket.description ?? "",
    created_at: ticket.created_at,
    own: openingIsOwn,
    fromStaff: false,
    authorName: openingIsOwn ? null : creator?.name ?? null,
    status: "sent",
  };

  const comments = mergeComments([], ticket.comments).map((comment) => {
    const fromStaff = !comment.contact_id;
    const own = !fromStaff && comment.contact_id === contactId;
    let authorName = null;
    if (fromStaff) authorName = comment.user?.name || "Soporte";
    else if (!own) authorName = comment.contact?.name || "Otro contacto";

    return {
      key: `c-${comment.id}`,
      id: comment.id,
      content: comment.content ?? "",
      created_at: comment.created_at,
      own,
      fromStaff,
      authorName,
      status: "sent",
    };
  });

  return [opening, ...comments];
};

export const formatMessageTime = (value, now = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const sameDay = date.toDateString() === now.toDateString();
  return date.toLocaleString(
    "es-ES",
    sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
  );
};

// Lectura defensiva del cuerpo de las respuestas de la API.
//
// Un 413/502 del servidor web o del proxy llega como HTML, y un 204 llega
// vacío: llamar directo a response.json() tira un SyntaxError crudo
// ("Unexpected token '<'...") que terminaba mostrándose al usuario.

export const INVALID_RESPONSE = Symbol("invalid-response");

// Devuelve el JSON parseado, {} si el cuerpo está vacío, o INVALID_RESPONSE
// si el cuerpo no es JSON.
export const readResponseBody = async (response) => {
  if (response.status === 204) return {};

  let text;
  try {
    text = await response.text();
  } catch {
    return INVALID_RESPONSE;
  }

  if (!text || !text.trim()) return {};

  try {
    const data = JSON.parse(text);
    return data ?? {};
  } catch {
    return INVALID_RESPONSE;
  }
};

// Mensaje amigable cuando el servidor no devolvió un JSON con "message".
export const friendlyHttpErrorMessage = (status) => {
  if (status === 413) {
    return "El archivo o los datos enviados son demasiado grandes.";
  }
  if (status === 429) {
    return "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.";
  }
  if (status >= 500) {
    return "El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos.";
  }
  return "El servidor respondió de forma inesperada. Inténtalo de nuevo.";
};

// Resuelve cuerpo + mensaje de error de una respuesta. `ok` indica si la
// respuesta es utilizable; si no, `message` trae el texto a mostrar.
export const parseApiResponse = async (response, fallbackMessage = "Error en la petición") => {
  const body = await readResponseBody(response);
  const isInvalid = body === INVALID_RESPONSE;
  const data = isInvalid ? {} : body;

  if (response.ok && !isInvalid) {
    return { ok: true, data, message: null };
  }

  const message = isInvalid
    ? friendlyHttpErrorMessage(response.status)
    : data.message || fallbackMessage;

  return { ok: false, data, message };
};

import { getRetryMessage } from "./authErrors";

const MESSAGES = {
  already_linked: "Esa cuenta ya está conectada a otro usuario de Orkela.",
  provider_already_linked: "Ya tienes otra cuenta de ese proveedor conectada. Desconéctala primero.",
  last_login_method:
    "No puedes desconectar tu única forma de entrar. Crea una contraseña o conecta otra cuenta primero.",
  invalid_password: "La contraseña no es correcta.",
  no_password:
    "Esta cuenta no tiene contraseña. Entra con la cuenta con la que la creaste y conecta esta desde Configuración.",
  email_unverified: "Confirma tu correo de Orkela antes de conectar esta cuenta. Revisa tu bandeja de entrada.",
  password_exists: "Tu cuenta ya tiene contraseña.",
};

// Mensaje para un error de vinculación: primero el `code` del backend, luego
// el tiempo de espera de un 429 y, si no, el texto genérico del llamador.
export const getSocialLinkErrorMessage = (err, fallback) =>
  (err?.code && MESSAGES[err.code]) || getRetryMessage(err) || fallback;

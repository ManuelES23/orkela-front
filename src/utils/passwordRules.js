// Espejo de Password::defaults() del backend: min(8)->mixedCase()->numbers().
// uncompromised() solo se puede validar en el servidor.
export const PASSWORD_RULES = [
  { id: "length", label: "Al menos 8 caracteres", test: (value) => value.length >= 8 },
  { id: "lower", label: "Una letra minúscula", test: (value) => /\p{Ll}/u.test(value) },
  { id: "upper", label: "Una letra mayúscula", test: (value) => /\p{Lu}/u.test(value) },
  { id: "number", label: "Un número", test: (value) => /\p{N}/u.test(value) },
];

export const evaluatePassword = (value = "") =>
  PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(value) }));

export const isPasswordValid = (value = "") => PASSWORD_RULES.every((rule) => rule.test(value));

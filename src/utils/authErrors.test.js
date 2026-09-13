import { describe, it, expect } from "vitest";
import { APIError } from "./api";
import { getRetryMessage, getPasswordError, PASSWORD_REJECTED_MESSAGE } from "./authErrors";

describe("authErrors", () => {
  it("arma el mensaje de espera para 429", () => {
    expect(getRetryMessage(new APIError("Too Many Attempts.", 429, { retryAfter: 42 }))).toBe(
      "Demasiados intentos. Espera 42 segundos e inténtalo de nuevo."
    );
    expect(getRetryMessage(new APIError("x", 429, {}))).toContain("60 segundos");
    expect(getRetryMessage(new APIError("x", 422, {}))).toBeNull();
  });

  it("traduce errores de validación de contraseña sin mostrar el texto crudo", () => {
    const err = new APIError("x", 422, { errors: { password: ["The password field must contain..."] } });
    expect(getPasswordError(err)).toBe(PASSWORD_REJECTED_MESSAGE);
    expect(getPasswordError(err, "new_password")).toBeNull();
    expect(getPasswordError(new APIError("x", 400, {}))).toBeNull();
  });
});

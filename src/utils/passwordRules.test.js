import { describe, it, expect } from "vitest";
import { evaluatePassword, isPasswordValid, PASSWORD_RULES } from "./passwordRules";

describe("passwordRules", () => {
  it("evalúa cada regla por separado", () => {
    const result = evaluatePassword("abc");
    expect(result.map((r) => r.id)).toEqual(PASSWORD_RULES.map((r) => r.id));
    expect(Object.fromEntries(result.map((r) => [r.id, r.met]))).toEqual({
      length: false,
      lower: true,
      upper: false,
      number: false,
    });
  });

  it("acepta solo contraseñas que cumplen las mismas reglas que el backend", () => {
    expect(isPasswordValid("Password1")).toBe(true);
    expect(isPasswordValid("Contraseña9")).toBe(true);
    expect(isPasswordValid("password1")).toBe(false);
    expect(isPasswordValid("PASSWORD1")).toBe(false);
    expect(isPasswordValid("Password")).toBe(false);
    expect(isPasswordValid("Pass1")).toBe(false);
    expect(isPasswordValid()).toBe(false);
  });
});

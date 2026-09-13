import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthPanelHeading, AuthAlert } from "./AuthPanel";
import { useHasChanged } from "../../hooks/useHasChanged";

const Harness = () => {
  const [step, setStep] = useState("form");
  const focus = useHasChanged(step);

  return (
    <>
      {step === "form" ? (
        <AuthPanelHeading key='form' focusOnMount={focus}>
          Formulario
        </AuthPanelHeading>
      ) : (
        <AuthPanelHeading key='sent' focusOnMount={focus}>
          Enviado
        </AuthPanelHeading>
      )}
      <button type='button' onClick={() => setStep((s) => (s === "form" ? "sent" : "form"))}>
        Cambiar
      </button>
    </>
  );
};

describe("AuthPanelHeading", () => {
  it("no roba el foco al montar y lo mueve al heading cuando cambia el panel", () => {
    render(<Harness />);

    expect(screen.getByRole("heading", { name: "Formulario" })).not.toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
    expect(screen.getByRole("heading", { name: "Enviado" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));
    expect(screen.getByRole("heading", { name: "Formulario" })).toHaveFocus();
  });
});

describe("AuthAlert", () => {
  it("usa role alert para error y aviso, y status para éxito", () => {
    render(
      <>
        <AuthAlert tone='error'>Error</AuthAlert>
        <AuthAlert tone='warning'>Aviso</AuthAlert>
        <AuthAlert tone='success'>Listo</AuthAlert>
      </>
    );

    expect(screen.getAllByRole("alert").map((el) => el.textContent)).toEqual(["Error", "Aviso"]);
    expect(screen.getByRole("status")).toHaveTextContent("Listo");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";

const renderPage = (Page) =>
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );

describe("páginas legales", () => {
  it("la política de privacidad explica el inicio de sesión con Google y enlaza a los términos", () => {
    renderPage(PrivacyPolicy);

    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inicio de sesión con Google o Microsoft" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Términos del servicio" })).toHaveAttribute("href", "/terminos");
  });

  it("los términos enlazan a la política de privacidad", () => {
    renderPage(TermsOfService);

    expect(screen.getByRole("heading", { level: 1, name: "Términos del servicio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacidad");
  });
});

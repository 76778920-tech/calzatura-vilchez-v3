import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { useCookieConsent } from "@/context/useCookieConsent";

vi.mock("@/firebase/appCheckConsent", () => ({
  tryInitAppCheckFromConsent: vi.fn(),
}));

function Probe() {
  const {
    bannerOpen,
    acceptAll,
    rejectNonEssential,
    openPreferences,
    preferencesOpen,
    closePreferences,
  } = useCookieConsent();
  return (
    <div>
      <span data-testid="banner">{bannerOpen ? "open" : "closed"}</span>
      <span data-testid="prefs">{preferencesOpen ? "open" : "closed"}</span>
      <button type="button" onClick={acceptAll}>
        Aceptar
      </button>
      <button type="button" onClick={rejectNonEssential}>
        Rechazar
      </button>
      <button type="button" onClick={openPreferences}>
        Preferencias
      </button>
      <button type="button" onClick={closePreferences}>
        Cerrar
      </button>
    </div>
  );
}

describe("CookieConsentProvider", () => {
  it("cierra banner tras aceptar y abre/cierra preferencias", async () => {
    const user = userEvent.setup();
    render(
      <CookieConsentProvider>
        <Probe />
      </CookieConsentProvider>,
    );

    expect(screen.getByTestId("banner")).toHaveTextContent("open");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(screen.getByTestId("banner")).toHaveTextContent("closed");

    await user.click(screen.getByRole("button", { name: "Preferencias" }));
    expect(screen.getByTestId("prefs")).toHaveTextContent("open");
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.getByTestId("prefs")).toHaveTextContent("closed");

    await user.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(screen.getByTestId("banner")).toHaveTextContent("closed");
  });

  it("useCookieConsent exige provider", () => {
    expect(() => render(<Probe />)).toThrow(/CookieConsentProvider/);
  });
});

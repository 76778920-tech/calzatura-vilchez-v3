import { useContext } from "react";
import {
  CookieConsentContext,
  type CookieConsentContextValue,
} from "@/context/CookieConsentStore";

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent debe usarse dentro de CookieConsentProvider");
  }
  return ctx;
}

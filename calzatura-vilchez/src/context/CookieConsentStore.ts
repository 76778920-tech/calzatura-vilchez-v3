import { createContext } from "react";
import type { CookieChoices, CookieConsentRecord } from "@/config/cookieConsentPolicy";

export type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  bannerOpen: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (choices: CookieChoices) => void;
};

export const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

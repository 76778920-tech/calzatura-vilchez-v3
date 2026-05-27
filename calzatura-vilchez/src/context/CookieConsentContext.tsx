import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  acceptAllCookies,
  hasValidCookieConsent,
  loadCookieConsent,
  rejectNonEssentialCookies,
  saveCookieConsent,
  type CookieChoices,
} from "@/config/cookieConsent";
import type { CookieConsentRecord } from "@/config/cookieConsentPolicy";
import { tryInitAppCheckFromConsent } from "@/firebase/appCheckConsent";

type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  bannerOpen: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (choices: CookieChoices) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function applyConsentSideEffects(): void {
  tryInitAppCheckFromConsent();
}

export function CookieConsentProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [consent, setConsent] = useState<CookieConsentRecord | null>(() => loadCookieConsent());
  const [bannerOpen, setBannerOpen] = useState(() => !hasValidCookieConsent());
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (consent) applyConsentSideEffects();
  }, [consent]);

  const finalize = useCallback((record: CookieConsentRecord) => {
    setConsent(record);
    setBannerOpen(false);
    setPreferencesOpen(false);
    applyConsentSideEffects();
  }, []);

  const acceptAll = useCallback(() => {
    finalize(acceptAllCookies());
  }, [finalize]);

  const rejectNonEssential = useCallback(() => {
    finalize(rejectNonEssentialCookies());
  }, [finalize]);

  const savePreferences = useCallback(
    (choices: CookieChoices) => {
      finalize(saveCookieConsent(choices));
    },
    [finalize],
  );

  const value = useMemo(
    () => ({
      consent,
      bannerOpen,
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      acceptAll,
      rejectNonEssential,
      savePreferences,
    }),
    [consent, bannerOpen, preferencesOpen, acceptAll, rejectNonEssential, savePreferences],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent debe usarse dentro de CookieConsentProvider");
  }
  return ctx;
}

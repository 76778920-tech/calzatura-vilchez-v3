import {
  useCallback,
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
} from "@/config/cookieConsent";
import type { CookieChoices, CookieConsentRecord } from "@/config/cookieConsentPolicy";
import {
  CookieConsentContext,
} from "@/context/CookieConsentStore";
import { tryInitAppCheckFromConsent } from "@/firebase/appCheckConsent";

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


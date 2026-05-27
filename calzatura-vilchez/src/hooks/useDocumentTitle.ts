import { useEffect } from "react";

const BASE_TITLE = "Calzatura Vilchez";

export function useDocumentTitle(section?: string) {
  useEffect(() => {
    document.title = section ? `${section} — ${BASE_TITLE}` : BASE_TITLE;
    return () => { document.title = BASE_TITLE; };
  }, [section]);
}

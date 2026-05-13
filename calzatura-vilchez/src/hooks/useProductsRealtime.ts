import { useEffect, useRef } from "react";
import { supabase } from "@/supabase/client";

/**
 * Suscribe al canal Realtime de Supabase para productos y sus metadatos
 * administrativos (`productos`, `productoCodigos`, `productoFinanzas`).
 */
export function useProductsRealtime(onProductChange: () => void): void {
  const callbackRef = useRef(onProductChange);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    callbackRef.current = onProductChange;
  }, [onProductChange]);

  useEffect(() => {
    const handleChange = () => {
      if (debounceRef.current !== null) {
        globalThis.clearTimeout(debounceRef.current);
      }
      debounceRef.current = globalThis.setTimeout(() => {
        callbackRef.current();
        debounceRef.current = null;
      }, 300);
    };
    const channel = supabase
      .channel(`productos-rt-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "productoCodigos" }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "productoFinanzas" }, handleChange)
      .subscribe();

    return () => {
      if (debounceRef.current !== null) {
        globalThis.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, []);
}

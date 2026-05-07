import { useEffect, useRef } from "react";
import { supabase } from "@/supabase/client";

/**
 * Suscribe al canal Realtime de Supabase para la tabla `productos`.
 * Cuando se detecta INSERT, UPDATE o DELETE, llama a `onProductChange`.
 * El canal se cierra automáticamente al desmontar el componente.
 *
 * Requiere que la tabla esté incluida en la publicación `supabase_realtime`
 * (ya aplicado vía migración 20260505160000_enable_realtime_productos.sql).
 */
export function useProductsRealtime(onProductChange: () => void): void {
  // useRef evita re-suscribirse cuando el callback cambia de referencia
  const callbackRef = useRef(onProductChange);

  useEffect(() => {
    callbackRef.current = onProductChange;
  }, [onProductChange]);

  useEffect(() => {
    const channel = supabase
      .channel(`productos-rt-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, () => {
        callbackRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

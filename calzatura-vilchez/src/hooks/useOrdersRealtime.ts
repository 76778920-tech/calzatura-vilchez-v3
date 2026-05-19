import { useEffect, useRef } from "react";
import { supabase } from "@/supabase/client";

export function useOrdersRealtime(onOrderChange: () => void, userId?: string): void {
  const callbackRef = useRef(onOrderChange);

  useEffect(() => {
    callbackRef.current = onOrderChange;
  }, [onOrderChange]);

  useEffect(() => {
    const config = userId
      ? { event: "*" as const, schema: "public", table: "pedidos", filter: `userId=eq.${userId}` }
      : { event: "*" as const, schema: "public", table: "pedidos" };

    const channel = supabase
      .channel(`pedidos-rt-${userId ?? "admin"}-${Date.now()}`)
      .on("postgres_changes", config, () => {
        callbackRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

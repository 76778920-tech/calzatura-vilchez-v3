import { useEffect, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";

/**
 * Suscribe en tiempo real a la colección `usuarios/{userId}/favoritos` de Firestore.
 * Llama a `onChange` cada vez que la lista cambia desde cualquier dispositivo
 * (web o móvil), permitiendo sincronización bidireccional sin recargar la página.
 *
 * Usa useRef para que el callback nunca provoque una re-suscripción aunque
 * la referencia de la función cambie entre renders.
 */
export function useFavoritesRealtime(userId: string | undefined, onChange: () => void): void {
  const callbackRef = useRef(onChange);

  useEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!userId) return;

    const col = collection(db, "usuarios", userId, "favoritos");
    const unsubscribe = onSnapshot(
      col,
      { includeMetadataChanges: false },
      () => { callbackRef.current(); },
      (error) => { console.error("[useFavoritesRealtime]", error); },
    );

    return unsubscribe;
  }, [userId]);
}

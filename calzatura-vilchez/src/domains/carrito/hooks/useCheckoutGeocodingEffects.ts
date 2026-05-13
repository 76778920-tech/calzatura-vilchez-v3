import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { Address } from "@/types";
import { buildCheckoutAddressLine } from "@/domains/carrito/utils/checkoutAddressLine";
import {
  calculateDeliveryForCoordinates,
  geocodeCheckoutFormSuggestions,
  geocodeSearchBarSuggestions,
  hasOpenRouteServiceKey,
  reverseGeocodeLabel,
  type DeliveryQuote,
  type GeocodeCandidate,
} from "@/services/deliveryOpenRoute";

type Params = {
  direccion: Address;
};

export function useCheckoutGeocodingEffects({ direccion }: Params) {
  const orsEnabled = hasOpenRouteServiceKey();

  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState("");

  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeCandidate[]>([]);
  const [addressSuggestLoading, setAddressSuggestLoading] = useState(false);
  const [addressSuggestError, setAddressSuggestError] = useState("");

  const [mapSearchInput, setMapSearchInput] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<GeocodeCandidate[]>([]);
  const [searchSuggestLoading, setSearchSuggestLoading] = useState(false);
  const [searchSuggestError, setSearchSuggestError] = useState("");

  const [selectedDelivery, setSelectedDelivery] = useState<GeocodeCandidate | null>(null);
  const [mapFitNonce, setMapFitNonce] = useState(0);

  const selectedDeliveryRef = useRef<GeocodeCandidate | null>(null);
  useEffect(() => {
    selectedDeliveryRef.current = selectedDelivery;
  }, [selectedDelivery]);

  const reverseGeocodeRequestId = useRef(0);

  useEffect(() => {
    if (!orsEnabled) {
      return;
    }
    const ctrl = new AbortController();
    const timer = globalThis.setTimeout(() => {
      const line = buildCheckoutAddressLine(direccion);
      if (line.length < 10) {
        setAddressSuggestions([]);
        setAddressSuggestError("");
        setAddressSuggestLoading(false);
        setSelectedDelivery(null);
        setDeliveryQuote(null);
        setDeliveryQuoteError("");
        setDeliveryQuoteLoading(false);
        return;
      }
      void (async () => {
        setAddressSuggestLoading(true);
        setAddressSuggestError("");
        try {
          const list = await geocodeCheckoutFormSuggestions({
            direccion: direccion.direccion,
            distrito: direccion.distrito,
            ciudad: direccion.ciudad,
          });
          if (ctrl.signal.aborted) return;
          setAddressSuggestions(list);
        } catch (err) {
          if (ctrl.signal.aborted) return;
          setAddressSuggestions([]);
          setAddressSuggestError(err instanceof Error ? err.message : "No se pudieron cargar sugerencias");
        } finally {
          if (!ctrl.signal.aborted) setAddressSuggestLoading(false);
        }
      })();
    }, 550);

    return () => {
      ctrl.abort();
      globalThis.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo dirección compuesta (evita re-fetch en cada campo)
  }, [direccion.direccion, direccion.distrito, direccion.ciudad, orsEnabled]);

  useEffect(() => {
    if (!orsEnabled) return;
    const ctrl = new AbortController();
    const q = mapSearchInput.trim();
    const timer = globalThis.setTimeout(() => {
      if (q.length < 3) {
        setSearchSuggestions([]);
        setSearchSuggestError("");
        setSearchSuggestLoading(false);
        return;
      }
      void (async () => {
        setSearchSuggestLoading(true);
        setSearchSuggestError("");
        try {
          const list = await geocodeSearchBarSuggestions(q, {
            ciudad: direccion.ciudad,
            distrito: direccion.distrito,
          });
          if (ctrl.signal.aborted) return;
          setSearchSuggestions(list);
        } catch (err) {
          if (ctrl.signal.aborted) return;
          setSearchSuggestions([]);
          setSearchSuggestError(err instanceof Error ? err.message : "Error en la búsqueda");
        } finally {
          if (!ctrl.signal.aborted) setSearchSuggestLoading(false);
        }
      })();
    }, 450);
    return () => {
      ctrl.abort();
      globalThis.clearTimeout(timer);
    };
  }, [mapSearchInput, orsEnabled, direccion.ciudad, direccion.distrito]);

  useEffect(() => {
    if (!orsEnabled || !selectedDelivery) {
      startTransition(() => {
        setDeliveryQuote(null);
        setDeliveryQuoteError("");
        setDeliveryQuoteLoading(false);
      });
      return;
    }
    const lat = selectedDelivery.lat;
    const lng = selectedDelivery.lng;
    let cancelled = false;
    startTransition(() => {
      setDeliveryQuoteLoading(true);
      setDeliveryQuoteError("");
    });
    void calculateDeliveryForCoordinates(lat, lng, selectedDeliveryRef.current?.label)
      .then((q) => {
        if (cancelled) return;
        setDeliveryQuote({
          ...q,
          label: selectedDeliveryRef.current?.label ?? q.label,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setDeliveryQuote(null);
        setDeliveryQuoteError(err instanceof Error ? err.message : "No se pudo calcular el envío");
      })
      .finally(() => {
        if (!cancelled) setDeliveryQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cotización al cambiar coordenadas; etiqueta vía ref
  }, [orsEnabled, selectedDelivery?.lat, selectedDelivery?.lng]);

  useEffect(() => {
    if (!selectedDelivery?.label) return;
    const sel = selectedDelivery;
    startTransition(() => {
      setDeliveryQuote((prev) => {
        if (prev?.customerLat !== sel.lat || prev?.customerLng !== sel.lng) {
          return prev;
        }
        if (prev.label === sel.label) return prev;
        return { ...prev, label: sel.label };
      });
    });
  }, [selectedDelivery]);

  const pickCandidate = useCallback((c: GeocodeCandidate, refitMap: boolean) => {
    setSelectedDelivery(c);
    if (refitMap) setMapFitNonce((n) => n + 1);
  }, []);

  const onMapCustomerMove = useCallback((lat: number, lng: number) => {
    const id = ++reverseGeocodeRequestId.current;
    setSelectedDelivery({ lat, lng, label: "Ubicación en el mapa…" });
    void (async () => {
      let label: string | null = null;
      try {
        label = await reverseGeocodeLabel(lng, lat);
      } catch {
        label = null;
      }
      if (reverseGeocodeRequestId.current !== id) return;
      setSelectedDelivery({ lat, lng, label: label ?? "Ubicación elegida en el mapa" });
    })();
  }, []);

  const envioMonto = useMemo(() => {
    if (!orsEnabled) return 0;
    if (!deliveryQuote || deliveryQuote.isOutOfRange) return 0;
    return deliveryQuote.cost;
  }, [deliveryQuote, orsEnabled]);

  return {
    orsEnabled,
    deliveryQuote,
    deliveryQuoteLoading,
    deliveryQuoteError,
    addressSuggestions,
    addressSuggestLoading,
    addressSuggestError,
    mapSearchInput,
    setMapSearchInput,
    searchSuggestions,
    searchSuggestLoading,
    searchSuggestError,
    selectedDelivery,
    mapFitNonce,
    pickCandidate,
    onMapCustomerMove,
    envioMonto,
    addressLine: () => buildCheckoutAddressLine(direccion),
  };
}

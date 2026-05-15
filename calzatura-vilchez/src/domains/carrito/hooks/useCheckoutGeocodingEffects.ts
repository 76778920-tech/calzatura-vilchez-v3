import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { Address } from "@/types";
import { buildCheckoutAddressLine } from "@/domains/carrito/utils/checkoutAddressLine";
import { DELIVERY_CONFIG } from "@/config/delivery";
import {
  addressLabelContainsHousenumber,
  calculateDeliveryForCoordinates,
  deliveryLookupErrorMessage,
  estimateDeliveryQuoteHaversine,
  fetchDrivingRoutePositions,
  geocodeCheckoutFormSuggestions,
  geocodeSearchBarSuggestions,
  hasOpenRouteServiceKey,
  isDeliveryLookupUnavailableError,
  normalizeGeocodeQuery,
  parseStreetHousenumber,
  reverseGeocodeLabel,
  type DeliveryQuote,
  type GeocodeCandidate,
  type MapRoutePosition,
} from "@/services/deliveryOpenRoute";

const ROUTE_FETCH_DEBOUNCE_MS = 320;
const ADDRESS_GEOCODE_MIN_LEN = 8;

function isConfidentGeocodePick(best: GeocodeCandidate, streetLine: string): boolean {
  if (best.layer === "address" || best.layer === "street" || best.layer === "venue") {
    return true;
  }
  const parsed = parseStreetHousenumber(normalizeGeocodeQuery(streetLine));
  if (!parsed.housenumber) {
    return best.layer === "tertiary" || best.layer === "neighbourhood";
  }
  return addressLabelContainsHousenumber(best.label, parsed.housenumber);
}

type Params = {
  direccion: Address;
};

export function useCheckoutGeocodingEffects({ direccion }: Params) {
  const orsConfigured = hasOpenRouteServiceKey();
  const [geocodeUnavailable, setGeocodeUnavailable] = useState("");
  const geocodeEnabled = orsConfigured && !geocodeUnavailable;
  const mapDegraded = !geocodeEnabled;
  const deliveryPricingActive = orsConfigured;

  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState("");
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeCandidate[]>([]);
  const [addressSuggestLoading, setAddressSuggestLoading] = useState(false);
  const [addressSuggestError, setAddressSuggestError] = useState("");

  const [mapSearchInput, setMapSearchInput] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<GeocodeCandidate[]>([]);
  const [searchSuggestLoading, setSearchSuggestLoading] = useState(false);
  const [searchSuggestError, setSearchSuggestError] = useState("");

  const [selectedDelivery, setSelectedDelivery] = useState<GeocodeCandidate | null>(null);
  const [mapFitNonce, setMapFitNonce] = useState(0);
  const [routePositions, setRoutePositions] = useState<MapRoutePosition[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const selectedDeliveryRef = useRef<GeocodeCandidate | null>(null);
  const reverseGeocodeRequestId = useRef(0);
  useEffect(() => {
    selectedDeliveryRef.current = selectedDelivery;
  }, [selectedDelivery]);

  const addressLine = useMemo(() => buildCheckoutAddressLine(direccion), [direccion]);

  const mapDisplayDelivery = useMemo((): GeocodeCandidate | null => {
    return locationConfirmed && selectedDelivery ? selectedDelivery : null;
  }, [selectedDelivery, locationConfirmed]);

  const showDeliveryMap = addressLine.length >= ADDRESS_GEOCODE_MIN_LEN;

  const normalizeGeocodeError = useCallback((err: unknown, fallback: string) => {
    const message = deliveryLookupErrorMessage(err, fallback);
    if (isDeliveryLookupUnavailableError(err)) {
      setGeocodeUnavailable(message);
    }
    return message;
  }, []);

  const deliveryPricingErrorMessage = useCallback((err: unknown, fallback: string) => {
    return deliveryLookupErrorMessage(err, fallback);
  }, []);

  const confirmLocation = useCallback((c: GeocodeCandidate, refitMap: boolean) => {
    setLocationConfirmed(true);
    setSelectedDelivery(c);
    if (refitMap) setMapFitNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!orsConfigured || geocodeUnavailable) {
      return;
    }
    const ctrl = new AbortController();
    const timer = globalThis.setTimeout(() => {
      if (addressLine.length < ADDRESS_GEOCODE_MIN_LEN) {
        setAddressSuggestions([]);
        setAddressSuggestError("");
        setAddressSuggestLoading(false);
        setLocationConfirmed(false);
        setSelectedDelivery(null);
        setRoutePositions(null);
        setDeliveryQuote(null);
        setDeliveryQuoteError("");
        setDeliveryQuoteLoading(false);
        return;
      }
      void (async () => {
        setAddressSuggestLoading(true);
        setAddressSuggestError("");
        setLocationConfirmed(false);
        setSelectedDelivery(null);
        setRoutePositions(null);
        try {
          const list = await geocodeCheckoutFormSuggestions({
            direccion: direccion.direccion,
            distrito: direccion.distrito,
            ciudad: direccion.ciudad,
          });
          if (ctrl.signal.aborted) return;
          setAddressSuggestions(list);
          if (list.length > 0) {
            const best = list[0];
            if (isConfidentGeocodePick(best, direccion.direccion)) {
              confirmLocation(best, true);
            }
          }
        } catch (err) {
          if (ctrl.signal.aborted) return;
          setAddressSuggestions([]);
          setAddressSuggestError(normalizeGeocodeError(err, "No se pudieron cargar sugerencias"));
        } finally {
          if (!ctrl.signal.aborted) setAddressSuggestLoading(false);
        }
      })();
    }, 550);

    return () => {
      ctrl.abort();
      globalThis.clearTimeout(timer);
    };
  }, [
    addressLine,
    direccion.direccion,
    direccion.distrito,
    direccion.ciudad,
    orsConfigured,
    geocodeUnavailable,
    confirmLocation,
    normalizeGeocodeError,
  ]);

  useEffect(() => {
    if (!orsConfigured || geocodeUnavailable) return;
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
          setSearchSuggestError(normalizeGeocodeError(err, "Error en la búsqueda"));
        } finally {
          if (!ctrl.signal.aborted) setSearchSuggestLoading(false);
        }
      })();
    }, 450);
    return () => {
      ctrl.abort();
      globalThis.clearTimeout(timer);
    };
  }, [mapSearchInput, orsConfigured, geocodeUnavailable, direccion.ciudad, direccion.distrito, normalizeGeocodeError]);

  useEffect(() => {
    if (searchSuggestLoading || searchSuggestions.length === 0) return;
    const q = normalizeGeocodeQuery(mapSearchInput.trim());
    if (q.length < 8) return;
    const parsed = parseStreetHousenumber(q);
    if (!parsed.housenumber) return;
    const best =
      searchSuggestions.find((c) => addressLabelContainsHousenumber(c.label, parsed.housenumber!)) ??
      searchSuggestions[0];
    if (!isConfidentGeocodePick(best, q)) return;
    if (
      locationConfirmed &&
      selectedDelivery &&
      Math.abs(selectedDelivery.lat - best.lat) < 0.00005 &&
      Math.abs(selectedDelivery.lng - best.lng) < 0.00005
    ) {
      return;
    }
    setMapSearchInput(best.label);
    confirmLocation(best, true);
  }, [
    searchSuggestions,
    searchSuggestLoading,
    mapSearchInput,
    locationConfirmed,
    selectedDelivery,
    confirmLocation,
  ]);

  const onMapSearchChange = useCallback((value: string) => {
    setMapSearchInput(value);
    setLocationConfirmed(false);
    setSelectedDelivery(null);
    setRoutePositions(null);
    setDeliveryQuote(null);
    setDeliveryQuoteError("");
  }, []);

  useEffect(() => {
    const point = mapDisplayDelivery;
    if (!point) {
      startTransition(() => {
        setDeliveryQuote(null);
        setDeliveryQuoteError(mapDegraded ? "" : geocodeUnavailable);
        setDeliveryQuoteLoading(false);
      });
      return;
    }
    if (!orsConfigured) {
      startTransition(() => {
        setDeliveryQuote(
          estimateDeliveryQuoteHaversine(point.lat, point.lng, selectedDeliveryRef.current?.label),
        );
        setDeliveryQuoteError("");
        setDeliveryQuoteLoading(false);
      });
      return;
    }
    const lat = point.lat;
    const lng = point.lng;
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
        setDeliveryQuote(
          estimateDeliveryQuoteHaversine(point.lat, point.lng, selectedDeliveryRef.current?.label),
        );
        setDeliveryQuoteError(deliveryPricingErrorMessage(err, "No se pudo calcular el envío"));
      })
      .finally(() => {
        if (!cancelled) setDeliveryQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orsConfigured, mapDisplayDelivery, locationConfirmed, deliveryPricingErrorMessage]);

  useEffect(() => {
    const point = mapDisplayDelivery;
    if (!point || !orsConfigured) {
      startTransition(() => {
        setRoutePositions(null);
        setRouteLoading(false);
      });
      return;
    }
    const { storeLat, storeLng } = DELIVERY_CONFIG;
    let cancelled = false;
    startTransition(() => setRouteLoading(true));
    const timer = globalThis.setTimeout(() => {
      void fetchDrivingRoutePositions(storeLat, storeLng, point.lat, point.lng)
        .then((positions) => {
          if (!cancelled) setRoutePositions(positions.length >= 3 ? positions : null);
        })
        .catch(() => {
          if (!cancelled) setRoutePositions(null);
        })
        .finally(() => {
          if (!cancelled) setRouteLoading(false);
        });
    }, ROUTE_FETCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [orsConfigured, mapDisplayDelivery]);

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

  const pickCandidate = useCallback(
    (c: GeocodeCandidate, refitMap: boolean) => {
      setMapSearchInput(c.label);
      confirmLocation(c, refitMap);
    },
    [confirmLocation],
  );

  const onMapCustomerMove = useCallback(
    (lat: number, lng: number) => {
      const id = ++reverseGeocodeRequestId.current;
      setLocationConfirmed(true);
      setSelectedDelivery({ lat, lng, label: "Ubicación en el mapa…" });
      if (mapDegraded) {
        setSelectedDelivery({ lat, lng, label: "Ubicación elegida en el mapa" });
        return;
      }
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
    },
    [mapDegraded],
  );

  const envioMonto = useMemo(() => {
    if (!deliveryPricingActive || !locationConfirmed) return 0;
    if (!deliveryQuote || deliveryQuote.isOutOfRange) return 0;
    return deliveryQuote.cost;
  }, [deliveryQuote, deliveryPricingActive, locationConfirmed]);

  return {
    orsEnabled: geocodeEnabled,
    mapDegraded,
    deliveryPricingActive,
    locationConfirmed,
    orsConfigured,
    orsRuntimeError: geocodeUnavailable,
    geocodeUnavailable,
    deliveryQuote,
    deliveryQuoteLoading,
    deliveryQuoteError,
    addressSuggestions,
    addressSuggestLoading,
    addressSuggestError,
    mapSearchInput,
    setMapSearchInput: onMapSearchChange,
    searchSuggestions,
    searchSuggestLoading,
    searchSuggestError,
    selectedDelivery,
    mapDisplayDelivery,
    showDeliveryMap,
    mapFitNonce,
    routePositions,
    routeLoading,
    pickCandidate,
    onMapCustomerMove,
    envioMonto,
    addressLine: () => addressLine,
  };
};

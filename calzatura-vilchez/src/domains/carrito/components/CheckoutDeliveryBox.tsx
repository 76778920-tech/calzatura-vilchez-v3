import { useEffect, useState } from "react";
import { DELIVERY_CONFIG } from "@/config/delivery";
import type { DeliveryQuote, GeocodeCandidate, MapRoutePosition } from "@/services/deliveryOpenRoute";
import CheckoutDeliveryMap from "@/domains/carrito/components/CheckoutDeliveryMap";
import { checkoutGeoLayerHint } from "@/domains/carrito/utils/checkoutGeoHints";

function SuggestionList({ candidates, keyPrefix, ariaLabel, onPick }: Readonly<{
  candidates: GeocodeCandidate[];
  keyPrefix: string;
  ariaLabel: string;
  onPick: (c: GeocodeCandidate) => void;
}>) {
  return (
    <ul className="checkout-delivery-suggest-list" aria-label={ariaLabel}>
      {candidates.map((c, i) => {
        const layerHint = checkoutGeoLayerHint(c.layer);
        return (
          <li key={`${keyPrefix}-${i}-${c.lat}-${c.lng}`}>
            <button
              type="button"
              className="checkout-delivery-suggest-btn"
              title={c.label}
              onClick={() => onPick(c)}
            >
              <span className="checkout-delivery-suggest-label">{c.label}</span>
              {layerHint ? <span className="checkout-delivery-layer-hint">{layerHint}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type Props = Readonly<{
  mapDegraded?: boolean;
  degradedNotice?: string;
  addressLineLength: number;
  mapSearchInput: string;
  mapSearchHasHouseNumber?: boolean;
  onMapSearchChange: (value: string) => void;
  searchSuggestLoading: boolean;
  searchSuggestError: string;
  searchSuggestions: GeocodeCandidate[];
  onPickCandidate: (c: GeocodeCandidate, refitMap: boolean, syncSearchInput?: boolean) => void;
  onPickSearchByIndex?: (index: number) => void;
  addressSuggestLoading: boolean;
  addressSuggestError: string;
  addressSuggestions: GeocodeCandidate[];
  addressHasHouseNumber?: boolean;
  selectedDelivery: GeocodeCandidate | null;
  showDeliveryMap: boolean;
  locationConfirmed: boolean;
  mapFitNonce: number;
  routePositions?: MapRoutePosition[] | null;
  routeLoading?: boolean;
  onMapCustomerMove: (lat: number, lng: number) => void;
  deliveryQuoteLoading: boolean;
  deliveryQuoteError: string;
  deliveryQuote: DeliveryQuote | null;
}>;

function quoteStatus(quote: DeliveryQuote) {
  if (quote.isOutOfRange) {
    return (
      <p className="checkout-delivery-error">
        Fuera de zona de reparto (maximo {DELIVERY_CONFIG.maxDeliveryKm} km).
      </p>
    );
  }
  if (quote.isFreeDelivery) {
    return <p className="checkout-delivery-ok">Envio gratis en tu zona.</p>;
  }
  return (
    <p className="checkout-delivery-line">
      Costo de envio: <strong>{quote.costFormatted}</strong>
    </p>
  );
}

type SearchGroupProps = Readonly<
  Pick<
    Props,
    | "mapSearchInput"
    | "mapSearchHasHouseNumber"
    | "onMapSearchChange"
    | "searchSuggestLoading"
    | "searchSuggestError"
    | "searchSuggestions"
    | "onPickCandidate"
    | "onPickSearchByIndex"
  >
>;

function SearchGroup(props: SearchGroupProps) {
  const {
    mapSearchInput,
    mapSearchHasHouseNumber,
    onMapSearchChange,
    searchSuggestLoading,
    searchSuggestError,
    searchSuggestions,
    onPickCandidate,
    onPickSearchByIndex,
  } = props;
  const showEmpty = !searchSuggestLoading && !searchSuggestError && mapSearchInput.trim().length >= 3 && searchSuggestions.length === 0;
  const emptyMessage = mapSearchHasHouseNumber
    ? "No encontramos ese numero exacto. Toca el mapa sobre la puerta o arrastra el pin azul."
    : "No hay resultados exactos; prueba con via y numero, o marca el punto en el mapa.";

  return (
    <div className="form-group checkout-delivery-search-group">
      <label htmlFor="checkout-delivery-map-search">Buscar ubicacion en el mapa</label>
      <input
        id="checkout-delivery-map-search"
        type="text"
        value={mapSearchInput}
        onChange={(e) => onMapSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (searchSuggestions.length > 0) onPickSearchByIndex?.(0);
          }
        }}
        className="form-input"
        placeholder="Ej: Av. Giraldez 314, Huancayo"
        autoComplete="street-address"
      />
      {searchSuggestLoading && <p className="checkout-delivery-muted">Buscando...</p>}
      {!searchSuggestLoading && searchSuggestError ? (
        <p className="checkout-delivery-error">{searchSuggestError}</p>
      ) : null}
      {!searchSuggestLoading && !searchSuggestError && searchSuggestions.length > 0 ? (
        <SuggestionList
          candidates={searchSuggestions}
          keyPrefix="s"
          ariaLabel="Resultados de busqueda"
          onPick={(c) => onPickCandidate(c, true, true)}
        />
      ) : null}
      {showEmpty ? <p className="checkout-delivery-muted">{emptyMessage}</p> : null}
    </div>
  );
}

type AddressSuggestBlockProps = Readonly<
  Pick<
    Props,
    | "addressSuggestLoading"
    | "addressSuggestError"
    | "addressSuggestions"
    | "addressHasHouseNumber"
    | "onPickCandidate"
  >
>;

function AddressSuggestBlock(props: AddressSuggestBlockProps) {
  const {
    addressSuggestLoading,
    addressSuggestError,
    addressSuggestions,
    addressHasHouseNumber,
    onPickCandidate,
  } = props;
  const showEmpty = !addressSuggestLoading && !addressSuggestError && addressSuggestions.length === 0;
  const emptyMessage = addressHasHouseNumber
    ? "No encontramos ese numero exacto. Usa el buscador o marca la puerta en el mapa."
    : "No hay resultados; prueba el buscador de arriba.";

  return (
    <div className="checkout-delivery-suggest-block">
      <p className="checkout-delivery-subtitle">Sugerencias segun tu direccion</p>
      {addressSuggestLoading && <p className="checkout-delivery-muted">Cargando sugerencias...</p>}
      {!addressSuggestLoading && addressSuggestError ? (
        <p className="checkout-delivery-error">{addressSuggestError}</p>
      ) : null}
      {showEmpty ? <p className="checkout-delivery-muted">{emptyMessage}</p> : null}
      {!addressSuggestLoading && !addressSuggestError && addressSuggestions.length > 0 ? (
        <SuggestionList
          candidates={addressSuggestions}
          keyPrefix="a"
          ariaLabel="Sugerencias por direccion"
          onPick={(c) => onPickCandidate(c, true, false)}
        />
      ) : null}
    </div>
  );
}

type QuoteSummaryProps = Readonly<Pick<Props, "deliveryQuoteLoading" | "deliveryQuoteError" | "deliveryQuote">>;

function QuoteSummary(props: QuoteSummaryProps) {
  const { deliveryQuoteLoading, deliveryQuoteError, deliveryQuote } = props;
  if (deliveryQuoteLoading) return <p className="checkout-delivery-muted">Calculando distancia y costo...</p>;
  if (deliveryQuoteError) return <p className="checkout-delivery-error">{deliveryQuoteError}</p>;
  if (!deliveryQuote) return null;

  return (
    <>
      <p className="checkout-delivery-line">
        Distancia aprox.: <strong>{deliveryQuote.distanceFormatted}</strong>
        {deliveryQuote.label ? <span className="checkout-delivery-muted"> - {deliveryQuote.label}</span> : null}
      </p>
      {quoteStatus(deliveryQuote)}
    </>
  );
}

function introCopy(mapDegraded: boolean) {
  if (mapDegraded) {
    return "Toca el mapa o arrastra el pin azul hasta tu puerta. Las busquedas automaticas vuelven cuando el servicio de mapas este disponible.";
  }
  return "La lista prioriza direcciones y calles sobre solo ciudad. Incluye en Direccion el nombre de la via y el numero (ej. Jr. Puno 245). Si no aparece tu puerta exacta, toca el mapa o arrastra el pin azul.";
}

function DeliveryBoxTitle({ mapDegraded }: Readonly<{ mapDegraded: boolean }>) {
  return (
    <p className="checkout-delivery-title">
      {mapDegraded ? "Ubicacion de entrega" : "Envio y ruta de entrega"}
    </p>
  );
}

function DegradedBanner({ mapDegraded, degradedNotice }: Readonly<{ mapDegraded: boolean; degradedNotice: string }>) {
  if (!mapDegraded || !degradedNotice.trim()) return null;
  return (
    <output className="checkout-delivery-warn">
      {degradedNotice} Puedes marcar el punto en el mapa; el costo usa distancia aproximada.
    </output>
  );
}

function DeliveryMapSection(
  props: Readonly<{
    showDeliveryMap: boolean;
    locationConfirmed: boolean;
    selectedDelivery: GeocodeCandidate | null;
    mapFitNonce: number;
    routePositions: MapRoutePosition[] | null | undefined;
    routeLoading: boolean;
    onMapCustomerMove: (lat: number, lng: number) => void;
  }>,
) {
  const {
    showDeliveryMap,
    locationConfirmed,
    selectedDelivery,
    mapFitNonce,
    routePositions,
    routeLoading,
    onMapCustomerMove,
  } = props;
  const [mapMounted, setMapMounted] = useState(showDeliveryMap);
  useEffect(() => {
    if (showDeliveryMap) setMapMounted(true);
  }, [showDeliveryMap]);

  if (!mapMounted) return null;

  const customerLat = locationConfirmed && selectedDelivery ? selectedDelivery.lat : null;
  const customerLng = locationConfirmed && selectedDelivery ? selectedDelivery.lng : null;
  return (
    <div className="checkout-delivery-map-shell" hidden={showDeliveryMap ? undefined : true}>
    <CheckoutDeliveryMap
      storeLat={DELIVERY_CONFIG.storeLat}
      storeLng={DELIVERY_CONFIG.storeLng}
      customerLat={customerLat}
      customerLng={customerLng}
      locationConfirmed={locationConfirmed}
      fitBoundsNonce={mapFitNonce}
      routePositions={routePositions}
      routeLoading={routeLoading}
      interactive
      onCustomerPositionChange={onMapCustomerMove}
    />
    </div>
  );
}

function SelectedDeliveryHighlight(
  props: Readonly<{ selectedDelivery: GeocodeCandidate | null; locationConfirmed: boolean }>,
) {
  const { selectedDelivery, locationConfirmed } = props;
  if (!selectedDelivery?.label || !locationConfirmed) return null;
  return (
    <output className="checkout-delivery-selected">
      Punto de entrega: <strong>{selectedDelivery.label}</strong>
    </output>
  );
}

export default function CheckoutDeliveryBox({
  mapDegraded = false,
  degradedNotice = "",
  addressLineLength,
  mapSearchInput,
  mapSearchHasHouseNumber = false,
  onMapSearchChange,
  searchSuggestLoading,
  searchSuggestError,
  searchSuggestions,
  onPickCandidate,
  onPickSearchByIndex,
  addressSuggestLoading,
  addressSuggestError,
  addressSuggestions,
  addressHasHouseNumber = false,
  selectedDelivery,
  showDeliveryMap,
  locationConfirmed,
  mapFitNonce,
  routePositions = null,
  routeLoading = false,
  onMapCustomerMove,
  deliveryQuoteLoading,
  deliveryQuoteError,
  deliveryQuote,
}: Props) {
  const shouldShowSearch = !mapDegraded;
  const shouldShowAddressSuggestions = !mapDegraded && addressLineLength >= 10;
  const shouldShowCompletionHint = !mapDegraded && addressLineLength < 8;

  return (
    <div className="checkout-delivery-box">
      <DeliveryBoxTitle mapDegraded={mapDegraded} />
      <DegradedBanner mapDegraded={mapDegraded} degradedNotice={degradedNotice} />
      <p className="checkout-delivery-muted checkout-delivery-intro">{introCopy(mapDegraded)}</p>

      {shouldShowSearch ? (
        <SearchGroup
          mapSearchInput={mapSearchInput}
          mapSearchHasHouseNumber={mapSearchHasHouseNumber}
          onMapSearchChange={onMapSearchChange}
          searchSuggestLoading={searchSuggestLoading}
          searchSuggestError={searchSuggestError}
          searchSuggestions={searchSuggestions}
          onPickCandidate={onPickCandidate}
          onPickSearchByIndex={onPickSearchByIndex}
        />
      ) : null}

      {shouldShowAddressSuggestions ? (
        <AddressSuggestBlock
          addressSuggestLoading={addressSuggestLoading}
          addressSuggestError={addressSuggestError}
          addressSuggestions={addressSuggestions}
          addressHasHouseNumber={addressHasHouseNumber}
          onPickCandidate={onPickCandidate}
        />
      ) : null}

      <DeliveryMapSection
        showDeliveryMap={showDeliveryMap}
        locationConfirmed={locationConfirmed}
        selectedDelivery={selectedDelivery}
        mapFitNonce={mapFitNonce}
        routePositions={routePositions}
        routeLoading={routeLoading}
        onMapCustomerMove={onMapCustomerMove}
      />

      <SelectedDeliveryHighlight selectedDelivery={selectedDelivery} locationConfirmed={locationConfirmed} />

      <QuoteSummary
        deliveryQuoteLoading={deliveryQuoteLoading}
        deliveryQuoteError={deliveryQuoteError}
        deliveryQuote={deliveryQuote}
      />

      {shouldShowCompletionHint ? (
        <p className="checkout-delivery-muted">Completa direccion, distrito y ciudad para ver el mapa y las sugerencias.</p>
      ) : null}
    </div>
  );
}

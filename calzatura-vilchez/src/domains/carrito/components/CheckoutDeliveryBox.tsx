import type { ReactNode } from "react";
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
      {candidates.map((c, i) => (
        <li key={`${keyPrefix}-${i}-${c.lat}-${c.lng}`}>
          <button
            type="button"
            className="checkout-delivery-suggest-btn"
            title={c.label}
            onClick={() => onPick(c)}
          >
            <span className="checkout-delivery-suggest-label">{c.label}</span>
            {checkoutGeoLayerHint(c.layer) ? (
              <span className="checkout-delivery-layer-hint">{checkoutGeoLayerHint(c.layer)}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

type Props = Readonly<{
  mapDegraded?: boolean;
  degradedNotice?: string;
  addressLineLength: number;
  mapSearchInput: string;
  onMapSearchChange: (value: string) => void;
  searchSuggestLoading: boolean;
  searchSuggestError: string;
  searchSuggestions: GeocodeCandidate[];
  onPickCandidate: (c: GeocodeCandidate, refitMap: boolean) => void;
  addressSuggestLoading: boolean;
  addressSuggestError: string;
  addressSuggestions: GeocodeCandidate[];
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

export default function CheckoutDeliveryBox({
  mapDegraded = false,
  degradedNotice = "",
  addressLineLength,
  mapSearchInput,
  onMapSearchChange,
  searchSuggestLoading,
  searchSuggestError,
  searchSuggestions,
  onPickCandidate,
  addressSuggestLoading,
  addressSuggestError,
  addressSuggestions,
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
  let deliveryQuoteStatus: ReactNode = null;
  if (!deliveryQuoteLoading && !deliveryQuoteError && deliveryQuote) {
    const q = deliveryQuote;
    if (q.isOutOfRange) {
      deliveryQuoteStatus = (
        <p className="checkout-delivery-error">
          Fuera de zona de reparto (máximo {DELIVERY_CONFIG.maxDeliveryKm} km).
        </p>
      );
    } else if (q.isFreeDelivery) {
      deliveryQuoteStatus = <p className="checkout-delivery-ok">Envío gratis en tu zona.</p>;
    } else {
      deliveryQuoteStatus = (
        <p className="checkout-delivery-line">
          Costo de envío: <strong>{q.costFormatted}</strong>
        </p>
      );
    }
  }

  return (
    <div className="checkout-delivery-box">
      <p className="checkout-delivery-title">
        {mapDegraded ? "Ubicación de entrega" : "Envío y ruta de entrega"}
      </p>
      {mapDegraded && degradedNotice ? (
        <p className="checkout-delivery-warn" role="status">
          {degradedNotice} Podés marcar el punto en el mapa; el costo usa distancia aproximada (línea recta).
        </p>
      ) : null}
      <p className="checkout-delivery-muted checkout-delivery-intro">
        {mapDegraded
          ? "Tocá el mapa o arrastrá el pin azul hasta tu puerta. Las búsquedas automáticas vuelven cuando el servicio de mapas esté disponible."
          : "La lista prioriza direcciones y calles sobre solo «ciudad». Incluí en Dirección el nombre de la vía y el número (ej. Jr. Puno 245). Si no aparece tu puerta exacta, tocá el mapa o arrastrá el pin azul."}
      </p>

      {!mapDegraded && (
      <div className="form-group checkout-delivery-search-group">
        <label htmlFor="checkout-delivery-map-search">Buscar ubicación en el mapa</label>
        <input
          id="checkout-delivery-map-search"
          type="text"
          value={mapSearchInput}
          onChange={(e) => onMapSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const first = searchSuggestions[0];
              if (first) onPickCandidate(first, true);
            }
          }}
          className="form-input"
          placeholder="Ej: Av. Giraldez 314, Huancayo"
          autoComplete="street-address"
        />
        {searchSuggestLoading && <p className="checkout-delivery-muted">Buscando…</p>}
        {!searchSuggestLoading && searchSuggestError && (
          <p className="checkout-delivery-error">{searchSuggestError}</p>
        )}
        {!searchSuggestLoading && !searchSuggestError && searchSuggestions.length > 0 && (
          <SuggestionList
            candidates={searchSuggestions}
            keyPrefix="s"
            ariaLabel="Resultados de búsqueda"
            onPick={(c) => onPickCandidate(c, true)}
          />
        )}
      </div>
      )}

      {!mapDegraded && addressLineLength >= 10 && (
        <div className="checkout-delivery-suggest-block">
          <p className="checkout-delivery-subtitle">Sugerencias según tu dirección</p>
          {addressSuggestLoading && <p className="checkout-delivery-muted">Cargando sugerencias…</p>}
          {!addressSuggestLoading && addressSuggestError && (
            <p className="checkout-delivery-error">{addressSuggestError}</p>
          )}
          {!addressSuggestLoading && !addressSuggestError && addressSuggestions.length === 0 && (
            <p className="checkout-delivery-muted">No hay resultados; probá el buscador de arriba.</p>
          )}
          {!addressSuggestLoading && !addressSuggestError && addressSuggestions.length > 0 && (
            <SuggestionList
              candidates={addressSuggestions}
              keyPrefix="a"
              ariaLabel="Sugerencias por dirección"
              onPick={(c) => onPickCandidate(c, true)}
            />
          )}
        </div>
      )}

      {showDeliveryMap ? (
        <CheckoutDeliveryMap
          storeLat={DELIVERY_CONFIG.storeLat}
          storeLng={DELIVERY_CONFIG.storeLng}
          customerLat={locationConfirmed && selectedDelivery ? selectedDelivery.lat : null}
          customerLng={locationConfirmed && selectedDelivery ? selectedDelivery.lng : null}
          locationConfirmed={locationConfirmed}
          fitBoundsNonce={mapFitNonce}
          routePositions={routePositions}
          routeLoading={routeLoading}
          interactive
          onCustomerPositionChange={onMapCustomerMove}
        />
      ) : null}

      {selectedDelivery?.label && locationConfirmed ? (
        <p className="checkout-delivery-selected" role="status">
          Punto de entrega: <strong>{selectedDelivery.label}</strong>
        </p>
      ) : null}

      {deliveryQuoteLoading && <p className="checkout-delivery-muted">Calculando distancia y costo…</p>}
      {!deliveryQuoteLoading && deliveryQuoteError && (
        <p className="checkout-delivery-error">{deliveryQuoteError}</p>
      )}
      {!deliveryQuoteLoading && !deliveryQuoteError && deliveryQuote && (
        <>
          <p className="checkout-delivery-line">
            Distancia aprox.: <strong>{deliveryQuote.distanceFormatted}</strong>
            {deliveryQuote.label ? <span className="checkout-delivery-muted"> — {deliveryQuote.label}</span> : null}
          </p>
          {deliveryQuoteStatus}
        </>
      )}

      {!mapDegraded && addressLineLength < 8 && (
        <p className="checkout-delivery-muted">Completa dirección, distrito y ciudad para ver el mapa y las sugerencias.</p>
      )}
    </div>
  );
}

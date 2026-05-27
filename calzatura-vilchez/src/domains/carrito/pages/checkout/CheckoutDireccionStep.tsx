import { Truck } from "lucide-react";
import CheckoutDeliveryBox from "@/domains/carrito/components/CheckoutDeliveryBox";
import { useCheckoutGeocodingEffects } from "@/domains/carrito/hooks/useCheckoutGeocodingEffects";
import { normalizePeruPhoneInput } from "@/utils/phone";
import type { Address } from "@/types";
import type { CheckoutFieldErrors } from "@/domains/carrito/utils/checkoutDireccionValidation";

type CheckoutGeo = ReturnType<typeof useCheckoutGeocodingEffects>;

type CheckoutDireccionStepProps = {
  direccion: Address;
  fieldErrors: CheckoutFieldErrors;
  geo: CheckoutGeo;
  degradedNotice: string;
  addressLineLen: number;
  onDireccionChange: (next: Address) => void;
  onClearFieldError: (key: keyof CheckoutFieldErrors) => void;
  onSubmit: (e: { preventDefault: () => void }) => void;
};

export function CheckoutDireccionStep({
  direccion,
  fieldErrors,
  geo,
  degradedNotice,
  addressLineLen,
  onDireccionChange,
  onClearFieldError,
  onSubmit,
}: CheckoutDireccionStepProps) {
  const patchDireccion = (patch: Partial<Address>) => {
    onDireccionChange({ ...direccion, ...patch });
  };

  return (
    <form onSubmit={onSubmit} className="checkout-form">
      <h2 className="form-section-title">
        <Truck size={18} /> Datos de Entrega
      </h2>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="checkout-nombre">Nombre *</label>
          <input
            id="checkout-nombre"
            value={direccion.nombre}
            onChange={(e) => patchDireccion({ nombre: e.target.value })}
            required
            className="form-input"
            placeholder="Tu nombre"
            autoComplete="given-name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="checkout-apellido">Apellido *</label>
          <input
            id="checkout-apellido"
            value={direccion.apellido}
            onChange={(e) => patchDireccion({ apellido: e.target.value })}
            required
            className="form-input"
            placeholder="Tu apellido"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="checkout-direccion">Dirección *</label>
        <input
          id="checkout-direccion"
          value={direccion.direccion}
          onChange={(e) => {
            patchDireccion({ direccion: e.target.value });
            onClearFieldError("direccion");
          }}
          required
          className={`form-input${fieldErrors.direccion ? " input-error" : ""}`}
          placeholder="Av., Calle, Jr..."
          aria-invalid={!!fieldErrors.direccion}
          aria-describedby={fieldErrors.direccion ? "checkout-direccion-error" : undefined}
          autoComplete="street-address"
        />
        {fieldErrors.direccion ? (
          <p id="checkout-direccion-error" className="field-error" role="alert">
            {fieldErrors.direccion}
          </p>
        ) : null}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="checkout-ciudad">Ciudad *</label>
          <input
            id="checkout-ciudad"
            value={direccion.ciudad}
            onChange={(e) => patchDireccion({ ciudad: e.target.value })}
            required
            className="form-input"
            autoComplete="address-level2"
          />
        </div>
        <div className="form-group">
          <label htmlFor="checkout-distrito">Distrito *</label>
          <input
            id="checkout-distrito"
            value={direccion.distrito}
            onChange={(e) => {
              patchDireccion({ distrito: e.target.value });
              onClearFieldError("distrito");
            }}
            required
            className={`form-input${fieldErrors.distrito ? " input-error" : ""}`}
            placeholder="Miraflores, SJL..."
            aria-invalid={!!fieldErrors.distrito}
            aria-describedby={fieldErrors.distrito ? "checkout-distrito-error" : undefined}
            autoComplete="address-level3"
          />
          {fieldErrors.distrito ? (
            <p id="checkout-distrito-error" className="field-error" role="alert">
              {fieldErrors.distrito}
            </p>
          ) : null}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="checkout-telefono">Teléfono *</label>
        <input
          id="checkout-telefono"
          type="tel"
          value={direccion.telefono}
          onChange={(e) => {
            patchDireccion({ telefono: normalizePeruPhoneInput(e.target.value) });
            onClearFieldError("telefono");
          }}
          required
          inputMode="tel"
          maxLength={15}
          pattern="(?:\+51\s?)?9[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}"
          className={`form-input${fieldErrors.telefono ? " input-error" : ""}`}
          placeholder="+51 999 999 999"
          aria-invalid={!!fieldErrors.telefono}
          aria-describedby={fieldErrors.telefono ? "checkout-telefono-error" : undefined}
          autoComplete="tel"
        />
        {fieldErrors.telefono ? (
          <p id="checkout-telefono-error" className="field-error" role="alert">
            {fieldErrors.telefono}
          </p>
        ) : null}
      </div>

      <div className="form-group">
        <label htmlFor="checkout-referencia">Referencia</label>
        <input
          id="checkout-referencia"
          value={direccion.referencia ?? ""}
          onChange={(e) => patchDireccion({ referencia: e.target.value })}
          className="form-input"
          placeholder="Cerca a..."
        />
      </div>

      <CheckoutDeliveryBox
        mapDegraded={geo.mapDegraded}
        degradedNotice={degradedNotice}
        addressLineLength={addressLineLen}
        mapSearchInput={geo.mapSearchInput}
        mapSearchHasHouseNumber={geo.mapSearchHasHouseNumber}
        onMapSearchChange={geo.setMapSearchInput}
        searchSuggestLoading={geo.searchSuggestLoading}
        searchSuggestError={geo.searchSuggestError}
        searchSuggestions={geo.searchSuggestions}
        onPickCandidate={geo.pickCandidate}
        onPickSearchByIndex={geo.pickSearchSuggestion}
        addressSuggestLoading={geo.addressSuggestLoading}
        addressSuggestError={geo.addressSuggestError}
        addressSuggestions={geo.addressSuggestions}
        addressHasHouseNumber={geo.addressHasHouseNumber}
        selectedDelivery={geo.selectedDelivery}
        showDeliveryMap={geo.showDeliveryMap}
        locationConfirmed={geo.locationConfirmed}
        mapFitNonce={geo.mapFitNonce}
        routePositions={geo.routePositions}
        routeLoading={geo.routeLoading}
        onMapCustomerMove={geo.onMapCustomerMove}
        deliveryQuoteLoading={geo.deliveryQuoteLoading}
        deliveryQuoteError={geo.deliveryQuoteError}
        deliveryQuote={geo.deliveryQuote}
      />

      <button type="submit" className="btn-primary btn-full">
        Continuar al Pago
      </button>
    </form>
  );
}

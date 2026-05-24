import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/router/auth_navigation.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../../../shared/widgets/cv_logo.dart';
import '../../../../shared/utils/peru_phone.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../cart/presentation/providers/cart_provider.dart';
import '../../../orders/data/orders_repository.dart';
import '../../data/delivery_quote_service.dart';
import '../../data/stripe_service.dart';

// ─── Constantes de UI ─────────────────────────────────────────────────────────

const _kDebounceMs = 800;

// ─── CheckoutPage ─────────────────────────────────────────────────────────────

class CheckoutPage extends ConsumerStatefulWidget {
  const CheckoutPage({super.key});

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  final _formKey = GlobalKey<FormState>();
  final _nombreCtrl = TextEditingController();
  final _apellidoCtrl = TextEditingController();
  final _direccionCtrl = TextEditingController();
  final _ciudadCtrl = TextEditingController(text: 'Huancayo');
  final _distritoCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  final _referenciaCtrl = TextEditingController();

  bool _submitting = false;
  String _metodoPago = 'contraentrega';

  // ── Delivery quote ───────────────────────────────────────────────────────────
  final _deliveryService = DeliveryQuoteService();
  DeliveryQuote? _quote;
  bool _quoteLoading = false;
  String? _quoteError;
  double? _confirmedLat;
  double? _confirmedLng;
  List<List<double>> _routePositions = [];

  // ── Geocode autocomplete ─────────────────────────────────────────────────────
  List<GeoCandidate> _geoCandidates = [];
  bool _geocoding = false;
  DateTime? _lastGeoRequest;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    final displayName = (user?.displayName ?? '').trim();
    final parts = displayName.isEmpty ? <String>[] : displayName.split(RegExp(r'\s+'));
    if (parts.isNotEmpty) {
      _nombreCtrl.text = parts.first;
      if (parts.length > 1) _apellidoCtrl.text = parts.sublist(1).join(' ');
    }
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _apellidoCtrl.dispose();
    _direccionCtrl.dispose();
    _ciudadCtrl.dispose();
    _distritoCtrl.dispose();
    _telefonoCtrl.dispose();
    _referenciaCtrl.dispose();
    super.dispose();
  }

  // ── Geocode con debounce ──────────────────────────────────────────────────────
  void _onDireccionChanged(String value) {
    // Resetear coordenadas confirmadas cuando el usuario edita la dirección
    setState(() {
      _confirmedLat = null;
      _confirmedLng = null;
      _quote = null;
      _quoteError = null;
    });

    final provincia = _ciudadCtrl.text.trim();
    final distrito = _distritoCtrl.text.trim();
    final parts = [value.trim(), if (distrito.isNotEmpty) distrito, if (provincia.isNotEmpty) provincia, 'Perú'];
    final query = parts.join(', ');
    if (query.length < 6) {
      setState(() => _geoCandidates = []);
      return;
    }

    final requestTime = DateTime.now();
    _lastGeoRequest = requestTime;

    Future.delayed(Duration(milliseconds: _kDebounceMs), () async {
      if (_lastGeoRequest != requestTime || !mounted) return;
      setState(() => _geocoding = true);
      try {
        final candidates = await _deliveryService.geocode(query);
        if (!mounted) return;
        setState(() {
          _geoCandidates = candidates;
          _geocoding = false;
        });
      } catch (_) {
        if (mounted) setState(() => _geocoding = false);
      }
    });
  }

  Future<void> _selectCandidate(GeoCandidate candidate) async {
    // Auto-fill ciudad y distrito desde el resultado geocode
    if (candidate.city.isNotEmpty) _ciudadCtrl.text = candidate.city;
    if (candidate.district.isNotEmpty) _distritoCtrl.text = candidate.district;

    setState(() {
      _geoCandidates = [];
      _confirmedLat = candidate.lat;
      _confirmedLng = candidate.lng;
      _quoteLoading = true;
      _quoteError = null;
      _quote = null;
      _routePositions = [];
    });

    try {
      final results = await Future.wait([
        _deliveryService.getQuote(candidate.lat, candidate.lng),
        _deliveryService.getRoute(candidate.lat, candidate.lng),
      ]);
      if (!mounted) return;
      final q = results[0] as DeliveryQuote?;
      final route = results[1] as List<List<double>>;
      if (q == null) {
        setState(() {
          _quoteLoading = false;
          _quoteError = 'No se pudo calcular el costo de envío.';
        });
        return;
      }
      if (q.isOutOfRange) {
        setState(() {
          _quoteLoading = false;
          _quoteError = 'Esta dirección está fuera del área de reparto (máx. ~15 km).';
          _confirmedLat = null;
          _confirmedLng = null;
        });
        return;
      }
      setState(() {
        _quote = q;
        _quoteLoading = false;
        _routePositions = route;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _quoteLoading = false;
        _quoteError = 'Error calculando envío: $e';
      });
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  Future<void> _submit() async {
    final items = ref.read(cartProvider);
    final user = ref.read(currentUserProvider);

    if (user == null) {
      if (mounted) context.go(loginPathWithRedirect('/checkout'));
      return;
    }
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tu carrito está vacío.'), backgroundColor: AppColors.warning),
      );
      return;
    }
    if (!_formKey.currentState!.validate()) return;

    final phoneError = peruPhoneError(_telefonoCtrl.text);
    if (phoneError != null || !isValidPeruPhone(_telefonoCtrl.text)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(phoneError ?? 'Ingresa un teléfono válido.'), backgroundColor: AppColors.error),
      );
      return;
    }

    if (_quoteLoading) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Espera, calculando costo de envío...'), backgroundColor: AppColors.warning),
      );
      return;
    }

    if (_quoteError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_quoteError!), backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final envio = _quote?.cost ?? 0.0;
      final direccion = OrderAddress(
        nombre: _nombreCtrl.text.trim(),
        apellido: _apellidoCtrl.text.trim(),
        direccion: _direccionCtrl.text.trim(),
        ciudad: _ciudadCtrl.text.trim(),
        distrito: _distritoCtrl.text.trim(),
        telefono: formatPeruPhone(_telefonoCtrl.text),
        referencia: _referenciaCtrl.text.trim(),
        lat: _confirmedLat,
        lng: _confirmedLng,
      );

      final orderId = await ref.read(ordersRepositoryProvider).createOrder(
            items: items,
            direccion: direccion,
            metodoPago: _metodoPago,
            envio: envio,
          );

      if (_metodoPago == 'stripe') {
        await StripeService().payWithSheet(orderId);
      }

      ref.read(cartProvider.notifier).clear();
      if (mounted) context.go('/order-success/$orderId');
    } on StripeException catch (e) {
      if (!mounted) return;
      final msg = e.error.localizedMessage ?? e.error.message ?? 'Pago cancelado';
      // El usuario canceló el sheet — no es un error fatal
      if (e.error.code == FailureCode.Canceled) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Pago cancelado: $msg'), backgroundColor: AppColors.warning),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error de pago: $msg'), backgroundColor: AppColors.error),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo crear el pedido: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final items = ref.watch(cartProvider);
    final subtotal = ref.watch(cartTotalProvider);
    final envio = _quote?.cost ?? 0.0;
    final total = subtotal + envio;
    final format = NumberFormat('#,##0.00', 'es_PE');
    final itemCount = items.fold<int>(0, (sum, item) => sum + item.quantity);

    return BackNavigationScope(
      fallbackRoute: '/cart',
      child: Scaffold(
        backgroundColor: AppColors.beige,
        appBar: AppBar(
          backgroundColor: AppColors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () => handleBackNavigation(context, fallbackRoute: '/cart'),
          ),
          title: const Text(
            'Finalizar compra',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        body: user == null
            ? _CheckoutLoginPrompt()
            : items.isEmpty
                ? _CheckoutEmptyCart()
                : SafeArea(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                      children: [
                        // ── Cabecera ──────────────────────────────────────
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.black,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Row(
                            children: [
                              const CVLogo(size: 38, dark: true),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Pedido seguro',
                                      style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
                                    ),
                                    Text(
                                      '$itemCount ${itemCount == 1 ? 'producto' : 'productos'} · S/ ${format.format(subtotal)}',
                                      style: const TextStyle(color: AppColors.gold, fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // ── Formulario de dirección ───────────────────────
                        Form(
                          key: _formKey,
                          child: _Card(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Dirección de entrega',
                                  style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(height: 14),
                                Row(
                                  children: [
                                    Expanded(child: _CheckoutField(controller: _nombreCtrl, label: 'Nombre', icon: Icons.person_outline)),
                                    const SizedBox(width: 10),
                                    Expanded(child: _CheckoutField(controller: _apellidoCtrl, label: 'Apellido', icon: Icons.badge_outlined)),
                                  ],
                                ),
                                // Provincia y Distrito primero
                                Row(
                                  children: [
                                    Expanded(child: _CheckoutField(controller: _ciudadCtrl, label: 'Provincia', icon: Icons.location_city_outlined)),
                                    const SizedBox(width: 10),
                                    Expanded(child: _CheckoutField(controller: _distritoCtrl, label: 'Distrito', icon: Icons.map_outlined)),
                                  ],
                                ),
                                // Dirección con autocomplete (usa provincia+distrito como contexto)
                                _CheckoutField(
                                  controller: _direccionCtrl,
                                  label: 'Dirección y N° de casa',
                                  icon: Icons.location_on_outlined,
                                  onChanged: _onDireccionChanged,
                                  suffix: _geocoding
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.gold),
                                        )
                                      : null,
                                ),
                                if (_geoCandidates.isNotEmpty)
                                  _GeoSuggestions(
                                    candidates: _geoCandidates,
                                    onSelect: (c) {
                                      _direccionCtrl.text = c.label;
                                      _selectCandidate(c);
                                    },
                                  ),
                                // Estado del costo de envío
                                if (_quoteLoading)
                                  const Padding(
                                    padding: EdgeInsets.only(bottom: 8),
                                    child: Row(
                                      children: [
                                        SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.gold)),
                                        SizedBox(width: 8),
                                        Text('Calculando envío...', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                      ],
                                    ),
                                  ),
                                if (_quoteError != null)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Text(_quoteError!, style: const TextStyle(fontSize: 12, color: AppColors.error)),
                                  ),
                                if (_quote != null && !_quoteLoading)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.check_circle_outline, size: 14, color: AppColors.success),
                                        const SizedBox(width: 6),
                                        Text(
                                          _quote!.isFreeDelivery
                                              ? 'Envío gratis (${_quote!.distanceKm.toStringAsFixed(1)} km)'
                                              : 'Envío: S/ ${format.format(_quote!.cost)} (${_quote!.distanceKm.toStringAsFixed(1)} km)',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: _quote!.isFreeDelivery ? AppColors.success : AppColors.textPrimary,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                if (_routePositions.length >= 2)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: _RouteMap(positions: _routePositions),
                                  ),
                                _CheckoutField(
                                  controller: _telefonoCtrl,
                                  label: 'Teléfono',
                                  icon: Icons.phone_outlined,
                                  keyboardType: TextInputType.phone,
                                  onChanged: (value) {
                                    final formatted = normalizePeruPhoneInput(value);
                                    if (formatted != value) {
                                      _telefonoCtrl.value = TextEditingValue(
                                        text: formatted,
                                        selection: TextSelection.collapsed(offset: formatted.length),
                                      );
                                    }
                                  },
                                ),
                                _CheckoutField(
                                  controller: _referenciaCtrl,
                                  label: 'Referencia (opcional)',
                                  icon: Icons.info_outline,
                                  required: false,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // ── Método de pago ────────────────────────────────
                        _Card(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Método de pago',
                                style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 12),
                              _PaymentOptionCard(
                                title: 'Pago contra entrega',
                                subtitle: 'Tu pedido se registra al instante y pagas al recibirlo.',
                                selected: _metodoPago == 'contraentrega',
                                onTap: () => setState(() => _metodoPago = 'contraentrega'),
                              ),
                              const SizedBox(height: 8),
                              _PaymentOptionCard(
                                title: 'Pagar con tarjeta',
                                subtitle: 'Pago seguro vía Stripe. Visa, Mastercard y más.',
                                icon: Icons.credit_card_rounded,
                                selected: _metodoPago == 'stripe',
                                onTap: () => setState(() => _metodoPago = 'stripe'),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // ── Resumen ───────────────────────────────────────
                        _Card(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Resumen',
                                style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 12),
                              ...items.map(
                                (item) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${item.product.nombre} x${item.quantity}',
                                          style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                                        ),
                                      ),
                                      Text(
                                        'S/ ${format.format(item.subtotal)}',
                                        style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const Divider(color: AppColors.shimmerBase),
                              _SummaryRow(label: 'Subtotal', value: 'S/ ${format.format(subtotal)}'),
                              const SizedBox(height: 6),
                              _SummaryRow(
                                label: 'Envío',
                                value: _quoteLoading
                                    ? 'Calculando...'
                                    : (_quote == null
                                        ? '—'
                                        : (_quote!.isFreeDelivery ? 'Gratis' : 'S/ ${format.format(_quote!.cost)}')),
                                valueColor: (_quote?.isFreeDelivery ?? false) ? AppColors.success : null,
                              ),
                              const SizedBox(height: 10),
                              _SummaryRow(
                                label: 'Total',
                                value: 'S/ ${format.format(total)}',
                                emphasis: true,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),

                        // ── Botón confirmar ───────────────────────────────
                        SizedBox(
                          height: 54,
                          child: ElevatedButton(
                            onPressed: _submitting ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.black,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            child: _submitting
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(color: AppColors.gold, strokeWidth: 2.4),
                                  )
                                : Text(
                                    _metodoPago == 'stripe'
                                        ? 'Pagar con tarjeta · S/ ${format.format(total)}'
                                        : 'Confirmar pedido · S/ ${format.format(total)}',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }
}

// ─── Widgets internos ─────────────────────────────────────────────────────────

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 3))],
      ),
      child: child,
    );
  }
}

class _GeoSuggestions extends StatelessWidget {
  const _GeoSuggestions({required this.candidates, required this.onSelect});
  final List<GeoCandidate> candidates;
  final ValueChanged<GeoCandidate> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.shimmerBase),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: candidates.map((c) {
          return InkWell(
            onTap: () => onSelect(c),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 16, color: AppColors.textSecondary),
                  const SizedBox(width: 8),
                  Expanded(child: Text(c.label, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary))),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _CheckoutField extends StatelessWidget {
  const _CheckoutField({
    required this.controller,
    required this.label,
    required this.icon,
    this.required = true,
    this.keyboardType,
    this.onChanged,
    this.suffix,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool required;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;
  final Widget? suffix;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        onChanged: onChanged,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 18),
          suffixIcon: suffix != null ? Padding(padding: const EdgeInsets.all(12), child: suffix) : null,
        ),
        validator: required
            ? (value) {
                if (value == null || value.trim().isEmpty) return 'Campo requerido';
                return null;
              }
            : null,
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value, this.valueColor, this.emphasis = false});

  final String label;
  final String value;
  final Color? valueColor;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: AppColors.textSecondary, fontSize: emphasis ? 15 : 13, fontWeight: emphasis ? FontWeight.w700 : FontWeight.w500),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? AppColors.textPrimary,
            fontWeight: emphasis ? FontWeight.w900 : FontWeight.w700,
            fontSize: emphasis ? 16 : 13,
          ),
        ),
      ],
    );
  }
}

class _PaymentOptionCard extends StatelessWidget {
  const _PaymentOptionCard({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
    this.icon = Icons.payments_outlined,
  });

  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? AppColors.gold.withValues(alpha: 0.1) : AppColors.beige,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? AppColors.gold : AppColors.shimmerBase),
        ),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
              color: selected ? AppColors.gold : AppColors.textSecondary,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckoutLoginPrompt extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.lock_outline_rounded, size: 56, color: AppColors.gold),
            const SizedBox(height: 16),
            const Text(
              'Debes iniciar sesión para continuar',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => context.go(loginPathWithRedirect('/checkout')),
              child: const Text('Iniciar sesión'),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => context.go('/register?redirect=${Uri.encodeComponent('/checkout')}'),
              child: const Text('Crear cuenta'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckoutEmptyCart extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.shopping_bag_outlined, size: 56, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text('Tu carrito está vacío', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: () => context.go('/catalog'), child: const Text('Explorar catálogo')),
          ],
        ),
      ),
    );
  }
}

class _RouteMap extends StatelessWidget {
  const _RouteMap({required this.positions});
  final List<List<double>> positions;

  static const _storeLat = -12.071951;
  static const _storeLng = -75.205281;

  @override
  Widget build(BuildContext context) {
    final points = positions.map((p) => LatLng(p[0], p[1])).toList();
    final midIdx = points.length ~/ 2;
    final center = points.isNotEmpty ? points[midIdx] : const LatLng(_storeLat, _storeLng);

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: 260,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: center,
            initialZoom: 13,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.pinchZoom | InteractiveFlag.doubleTapZoom | InteractiveFlag.drag,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.calzaturavilchez.calzatura_vilchez_mobile',
            ),
            PolylineLayer(
              polylines: [
                Polyline(points: points, strokeWidth: 4, color: AppColors.gold),
              ],
            ),
            MarkerLayer(
              markers: [
                Marker(
                  point: const LatLng(_storeLat, _storeLng),
                  child: const Icon(Icons.store_rounded, color: AppColors.black, size: 30),
                ),
                Marker(
                  point: points.last,
                  child: const Icon(Icons.location_pin, color: AppColors.error, size: 36),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

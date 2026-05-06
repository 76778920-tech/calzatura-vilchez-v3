import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../../../shared/widgets/cv_logo.dart';
import '../../../../shared/utils/peru_phone.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../cart/presentation/providers/cart_provider.dart';
import '../../../orders/data/orders_repository.dart';

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

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    final displayName = (user?.displayName ?? '').trim();
    final parts = displayName.isEmpty
        ? <String>[]
        : displayName.split(RegExp(r'\s+'));
    if (parts.isNotEmpty) {
      _nombreCtrl.text = parts.first;
      if (parts.length > 1) {
        _apellidoCtrl.text = parts.sublist(1).join(' ');
      }
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

  Future<void> _submit() async {
    final items = ref.read(cartProvider);
    final user = ref.read(currentUserProvider);

    if (user == null) {
      if (mounted) context.go('/login');
      return;
    }

    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tu carrito está vacío.'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    final phoneError = peruPhoneError(_telefonoCtrl.text);
    if (phoneError != null || !isValidPeruPhone(_telefonoCtrl.text)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(phoneError ?? 'Ingresa un teléfono válido.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final orderId = await ref
          .read(ordersRepositoryProvider)
          .createOrder(
            items: items,
            direccion: OrderAddress(
              nombre: _nombreCtrl.text.trim(),
              apellido: _apellidoCtrl.text.trim(),
              direccion: _direccionCtrl.text.trim(),
              ciudad: _ciudadCtrl.text.trim(),
              distrito: _distritoCtrl.text.trim(),
              telefono: formatPeruPhone(_telefonoCtrl.text),
              referencia: _referenciaCtrl.text.trim(),
            ),
            metodoPago: _metodoPago,
          );

      ref.read(cartProvider.notifier).clear();
      if (mounted) {
        context.go('/order-success/$orderId');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('No se pudo crear el pedido: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final items = ref.watch(cartProvider);
    final total = ref.watch(cartTotalProvider);
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
            onPressed: () =>
                handleBackNavigation(context, fallbackRoute: '/cart'),
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
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  '$itemCount ${itemCount == 1 ? 'producto' : 'productos'} · S/ ${format.format(total)}',
                                  style: const TextStyle(
                                    color: AppColors.gold,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Form(
                      key: _formKey,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Dirección de entrega',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: _CheckoutField(
                                    controller: _nombreCtrl,
                                    label: 'Nombre',
                                    icon: Icons.person_outline,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _CheckoutField(
                                    controller: _apellidoCtrl,
                                    label: 'Apellido',
                                    icon: Icons.badge_outlined,
                                  ),
                                ),
                              ],
                            ),
                            _CheckoutField(
                              controller: _direccionCtrl,
                              label: 'Dirección',
                              icon: Icons.location_on_outlined,
                            ),
                            Row(
                              children: [
                                Expanded(
                                  child: _CheckoutField(
                                    controller: _ciudadCtrl,
                                    label: 'Ciudad',
                                    icon: Icons.location_city_outlined,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _CheckoutField(
                                    controller: _distritoCtrl,
                                    label: 'Distrito',
                                    icon: Icons.map_outlined,
                                  ),
                                ),
                              ],
                            ),
                            _CheckoutField(
                              controller: _telefonoCtrl,
                              label: 'Teléfono',
                              icon: Icons.phone_outlined,
                              keyboardType: TextInputType.phone,
                              onChanged: (value) {
                                final formatted = normalizePeruPhoneInput(
                                  value,
                                );
                                if (formatted != value) {
                                  _telefonoCtrl.value = TextEditingValue(
                                    text: formatted,
                                    selection: TextSelection.collapsed(
                                      offset: formatted.length,
                                    ),
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
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Método de pago',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _PaymentOptionCard(
                            title: 'Pago contra entrega',
                            subtitle:
                                'Tu pedido se registra al instante y pagas al recibirlo.',
                            selected: _metodoPago == 'contraentrega',
                            onTap: () =>
                                setState(() => _metodoPago = 'contraentrega'),
                          ),
                          Container(
                            margin: const EdgeInsets.only(top: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.shimmerBase,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              children: [
                                Icon(
                                  Icons.lock_outline_rounded,
                                  color: AppColors.textSecondary,
                                  size: 18,
                                ),
                                SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Pago con tarjeta por Stripe: pendiente de integración móvil nativa.',
                                    style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Resumen',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
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
                                      style: const TextStyle(
                                        color: AppColors.textPrimary,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    'S/ ${format.format(item.subtotal)}',
                                    style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const Divider(color: AppColors.shimmerBase),
                          _SummaryRow(
                            label: 'Subtotal',
                            value: 'S/ ${format.format(total)}',
                          ),
                          const SizedBox(height: 6),
                          const _SummaryRow(
                            label: 'Envío',
                            value: 'Gratis',
                            valueColor: AppColors.success,
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
                    SizedBox(
                      height: 54,
                      child: ElevatedButton(
                        onPressed: _submitting ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.black,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: _submitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  color: AppColors.gold,
                                  strokeWidth: 2.4,
                                ),
                              )
                            : Text(
                                'Confirmar pedido · S/ ${format.format(total)}',
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                ),
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

class _CheckoutField extends StatelessWidget {
  const _CheckoutField({
    required this.controller,
    required this.label,
    required this.icon,
    this.required = true,
    this.keyboardType,
    this.onChanged,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool required;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;

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
        ),
        validator: required
            ? (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Campo requerido';
                }
                return null;
              }
            : null,
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.emphasis = false,
  });

  final String label;
  final String value;
  final Color? valueColor;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    final textStyle = TextStyle(
      color: valueColor ?? AppColors.textPrimary,
      fontWeight: emphasis ? FontWeight.w900 : FontWeight.w700,
      fontSize: emphasis ? 16 : 13,
    );

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: emphasis ? 15 : 13,
            fontWeight: emphasis ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        Text(value, style: textStyle),
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
  });

  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.gold.withValues(alpha: 0.1)
              : AppColors.beige,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.gold : AppColors.shimmerBase,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_off_rounded,
              color: selected ? AppColors.gold : AppColors.textSecondary,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
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
            const Icon(
              Icons.lock_outline_rounded,
              size: 56,
              color: AppColors.gold,
            ),
            const SizedBox(height: 16),
            const Text(
              'Debes iniciar sesión para continuar',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => context.go('/login'),
              child: const Text('Iniciar sesión'),
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
            const Icon(
              Icons.shopping_bag_outlined,
              size: 56,
              color: AppColors.textSecondary,
            ),
            const SizedBox(height: 16),
            const Text(
              'Tu carrito está vacío',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => context.go('/catalog'),
              child: const Text('Explorar catálogo'),
            ),
          ],
        ),
      ),
    );
  }
}

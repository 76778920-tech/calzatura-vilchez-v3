import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';
import '../../../cart/presentation/providers/cart_provider.dart';
import '../../data/orders_repository.dart';

final orderByIdProvider = FutureProvider.autoDispose.family<Order?, String>((
  ref,
  orderId,
) async {
  return ref.watch(ordersRepositoryProvider).getOrderById(orderId);
});

class OrderSuccessPage extends ConsumerWidget {
  const OrderSuccessPage({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderAsync = ref.watch(orderByIdProvider(orderId));
    ref.listen<AsyncValue<Order?>>(orderByIdProvider(orderId), (_, next) {
      if (next.valueOrNull != null) {
        ref.read(cartProvider.notifier).clear();
      }
    });

    return BackNavigationScope(
      fallbackRoute: '/profile/orders',
      child: Scaffold(
        backgroundColor: AppColors.beige,
        appBar: AppBar(
          backgroundColor: AppColors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () =>
                handleBackNavigation(context, fallbackRoute: '/profile/orders'),
          ),
          title: const Text(
            'Pedido confirmado',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        body: orderAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.gold),
          ),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 56,
                    color: AppColors.error,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'No se pudo cargar el pedido: $error',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          data: (order) {
            if (order == null) {
              return const Center(child: Text('Pedido no encontrado'));
            }

            final distrito = order.direccion?['distrito']?.toString() ?? '';
            final ciudad = order.direccion?['ciudad']?.toString() ?? '';

            return SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 84,
                          height: 84,
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_circle_rounded,
                            size: 56,
                            color: AppColors.success,
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          '¡Pedido confirmado!',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Tu compra fue registrada correctamente. Te contactaremos pronto para coordinar la entrega.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 20),
                        _SuccessRow(
                          label: 'N.° de pedido',
                          value: '#${order.id.split('-').first.toUpperCase()}',
                        ),
                        const SizedBox(height: 8),
                        _SuccessRow(
                          label: 'Total',
                          value: 'S/ ${order.total.toStringAsFixed(2)}',
                        ),
                        const SizedBox(height: 8),
                        _SuccessRow(label: 'Estado', value: order.estadoLabel),
                        if (distrito.isNotEmpty || ciudad.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          _SuccessRow(
                            label: 'Entrega',
                            value: [
                              distrito,
                              ciudad,
                            ].where((part) => part.isNotEmpty).join(', '),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: () => context.go('/profile/orders'),
                      icon: const Icon(Icons.receipt_long_outlined),
                      label: const Text('Ver mis pedidos'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: () => context.go('/catalog'),
                      icon: const Icon(Icons.storefront_outlined),
                      label: const Text('Seguir comprando'),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SuccessRow extends StatelessWidget {
  const _SuccessRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/orders_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final userOrdersProvider = FutureProvider.autoDispose<List<Order>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final orders = await ref.read(ordersRepositoryProvider).getUserOrders(user.uid);
  final seen = <String>{};
  return orders.where((o) => seen.add(o.id)).toList();
});

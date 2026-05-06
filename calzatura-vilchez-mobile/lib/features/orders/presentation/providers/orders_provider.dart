import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/orders_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final userOrdersProvider =
    FutureProvider.autoDispose<List<Order>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  return ref.watch(ordersRepositoryProvider).getUserOrders(user.uid);
});

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../../../core/services/favorites_api.dart';
import '../../../../shared/models/product.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final favoritesApiProvider = Provider<FavoritesApi>((ref) => FavoritesApi());

class WishlistNotifier extends AsyncNotifier<Set<String>> {
  @override
  Future<Set<String>> build() async {
    final user = ref.watch(currentUserProvider);
    if (user == null) return {};

    return ref.read(favoritesApiProvider).fetchProductIds();
  }

  Future<void> toggle(String productId) async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    final original = Set<String>.from(state.valueOrNull ?? {});
    final isAdding = !original.contains(productId);
    final api = ref.read(favoritesApiProvider);

    final updated = Set<String>.from(original);
    if (isAdding) {
      updated.add(productId);
    } else {
      updated.remove(productId);
    }
    // Actualización optimista — wishlistProductsProvider reacciona automáticamente
    state = AsyncData(updated);

    try {
      if (isAdding) {
        await api.add(productId);
      } else {
        await api.remove(productId);
      }
    } catch (_) {
      // Revertir si falla la API
      state = AsyncData(Set<String>.from(original));
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      final ids = await ref.read(favoritesApiProvider).fetchProductIds();
      state = AsyncData(ids);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

final wishlistProvider = AsyncNotifierProvider<WishlistNotifier, Set<String>>(
  WishlistNotifier.new,
);

final isWishedProvider = Provider.family<bool, String>((ref, productId) {
  return ref.watch(wishlistProvider).valueOrNull?.contains(productId) ?? false;
});

// Espera con .future para no emitir [] mientras wishlistProvider carga.
// Usa pull-to-refresh (invalidate wishlistProvider) para datos frescos.
final wishlistProductsProvider = FutureProvider<List<Product>>((ref) async {
  final ids = await ref.watch(wishlistProvider.future);
  if (ids.isEmpty) return [];

  final data = await sb.Supabase.instance.client
      .from('productos')
      .select()
      .inFilter('id', ids.toList())
      .eq('activo', true);

  return (data as List).map((e) => Product.fromJson(e)).toList();
});

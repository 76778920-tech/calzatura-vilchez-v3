import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/catalog_repository.dart';
import '../../domain/product_recommendation.dart';
import '../../../../shared/models/product.dart';

final selectedCategoryProvider = StateProvider<String>((ref) => 'todos');
final searchQueryProvider = StateProvider<String>((ref) => '');

// Versión del catálogo — se incrementa cuando Supabase notifica un cambio en
// la tabla `productos` (INSERT, UPDATE, DELETE).
final _catalogVersionProvider = StateProvider<int>((ref) => 0);

// Canal Supabase Realtime — activo toda la sesión (ver catalogLiveSyncProvider).
final _productRealtimeProvider = Provider<void>((ref) {
  final channel = Supabase.instance.client
      .channel('cv-productos-mobile')
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'productos',
        callback: (_) {
          ref.read(_catalogVersionProvider.notifier).update((v) => v + 1);
        },
      )
      .subscribe();

  ref.onDispose(() => channel.unsubscribe());
});

/// Mantener Realtime siempre encendido (aunque no estés en Catálogo).
final catalogLiveSyncProvider = Provider<void>((ref) {
  ref.watch(_productRealtimeProvider);
  ref.keepAlive();
});

final productsProvider = FutureProvider.autoDispose<List<Product>>((ref) async {
  ref.watch(_productRealtimeProvider); // mantiene el canal vivo
  ref.watch(
    _catalogVersionProvider,
  ); // se re-ejecuta al recibir cambios remotos

  final categoria = ref.watch(selectedCategoryProvider);
  final query = ref.watch(searchQueryProvider);
  final repo = ref.watch(catalogRepositoryProvider);

  if (query.isNotEmpty) return repo.searchProducts(query);
  return repo.getActiveProducts(categoria: categoria);
});

final featuredProductsProvider = FutureProvider.autoDispose<List<Product>>((
  ref,
) async {
  ref.watch(_productRealtimeProvider);
  ref.watch(_catalogVersionProvider);
  return ref.watch(catalogRepositoryProvider).getFeaturedProducts();
});

final recommendedProductsProvider = FutureProvider.autoDispose
    .family<List<Product>, Product>((ref, product) async {
      ref.watch(catalogLiveSyncProvider);
      ref.watch(_catalogVersionProvider);

      final catalog = await ref
          .watch(catalogRepositoryProvider)
          .getActiveProducts(categoria: 'todos');

      return ProductRecommendation.similarProducts(product, catalog);
    });

final productDetailProvider = FutureProvider.autoDispose
    .family<Product?, String>((ref, id) async {
      ref.watch(catalogLiveSyncProvider);
      ref.watch(_catalogVersionProvider);
      return ref.watch(catalogRepositoryProvider).getProductById(id);
    });

// Categorías — coinciden con los valores exactos de la BD
final categoriesProvider = Provider<List<Map<String, String>>>(
  (ref) => [
    {'id': 'todos', 'label': 'Todos'},
    {'id': 'hombre', 'label': 'Hombre'},
    {'id': 'dama', 'label': 'Dama'},
    {'id': 'juvenil', 'label': 'Juvenil'},
    {'id': 'nino', 'label': 'Niños'},
    {'id': 'bebe', 'label': 'Bebé'},
  ],
);

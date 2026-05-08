import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/models/product.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

// ── Helpers Firestore ─────────────────────────────────────────────────────────

CollectionReference<Map<String, dynamic>> _favoritesCol(String uid) =>
    FirebaseFirestore.instance
        .collection('usuarios')
        .doc(uid)
        .collection('favoritos');

// ── Wishlist notifier ─────────────────────────────────────────────────────────

class WishlistNotifier extends AsyncNotifier<Set<String>> {
  @override
  Future<Set<String>> build() async {
    final user = ref.watch(currentUserProvider);
    if (user == null) return {};

    // Stream en tiempo real: cualquier cambio desde la web o el móvil
    // se refleja automáticamente sin necesidad de recargar.
    final completer = Completer<Set<String>>();

    final sub = _favoritesCol(user.uid).snapshots().listen(
      (snapshot) {
        final ids = snapshot.docs.map((d) => d.id).toSet();
        if (!completer.isCompleted) {
          completer.complete(ids);
        } else {
          state = AsyncData(ids);
        }
      },
      onError: (Object e, StackTrace st) {
        if (!completer.isCompleted) completer.completeError(e, st);
      },
    );

    ref.onDispose(sub.cancel);
    return completer.future;
  }

  Future<void> toggle(String productId) async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;

    final original = Set<String>.from(state.valueOrNull ?? {});
    final isAdding = !original.contains(productId);
    final docRef = _favoritesCol(user.uid).doc(productId);

    // Actualización optimista inmediata para respuesta visual rápida
    final updated = Set<String>.from(original);
    if (isAdding) {
      updated.add(productId);
    } else {
      updated.remove(productId);
    }
    state = AsyncData(updated);

    try {
      if (isAdding) {
        await docRef.set({
          'productId': productId,
          'creadoEn': FieldValue.serverTimestamp(),
        });
      } else {
        await docRef.delete();
      }
    } catch (_) {
      // Revertir al estado original si falla la escritura en Firestore
      state = AsyncData(Set<String>.from(original));
    }
  }
}

final wishlistProvider = AsyncNotifierProvider<WishlistNotifier, Set<String>>(
  WishlistNotifier.new,
);

/// true si el producto está en favoritos del usuario actual
final isWishedProvider = Provider.family<bool, String>((ref, productId) {
  return ref.watch(wishlistProvider).valueOrNull?.contains(productId) ?? false;
});

// ── Productos favoritos completos (desde Supabase) ────────────────────────────

final wishlistProductsProvider = FutureProvider<List<Product>>((ref) async {
  final ids = ref.watch(wishlistProvider).valueOrNull ?? {};
  if (ids.isEmpty) return [];

  final data = await sb.Supabase.instance.client
      .from('productos')
      .select()
      .inFilter('id', ids.toList())
      .eq('activo', true);

  return (data as List).map((e) => Product.fromJson(e)).toList();
});

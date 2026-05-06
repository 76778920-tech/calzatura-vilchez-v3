import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/product.dart';

class CatalogRepository {
  final _supabase = Supabase.instance.client;

  Future<List<Product>> getActiveProducts({String? categoria}) async {
    var query = _supabase
        .from('productos')
        .select('*')
        .eq('activo', true);
    if (categoria != null && categoria != 'todos') {
      query = query.eq('categoria', categoria);
    }
    final data = await query.order('nombre');
    return (data as List).map((e) => Product.fromJson(e)).toList();
  }

  Future<Product?> getProductById(String id) async {
    final data = await _supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .eq('activo', true)
        .maybeSingle();
    if (data == null) return null;
    return Product.fromJson(data);
  }

  Future<List<Product>> searchProducts(String query) async {
    final data = await _supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .or('nombre.ilike.%$query%,marca.ilike.%$query%')
        .order('nombre')
        .limit(30);
    return (data as List).map((e) => Product.fromJson(e)).toList();
  }

  Future<List<Product>> getFeaturedProducts() async {
    final data = await _supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .eq('destacado', true)
        .order('nombre')
        .limit(10);
    return (data as List).map((e) => Product.fromJson(e)).toList();
  }
}

final catalogRepositoryProvider =
    Provider<CatalogRepository>((ref) => CatalogRepository());

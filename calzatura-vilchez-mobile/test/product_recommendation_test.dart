import 'package:calzatura_vilchez_mobile/features/catalog/domain/product_recommendation.dart';
import 'package:calzatura_vilchez_mobile/shared/models/product.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Product product({
    required String id,
    required String nombre,
    String categoria = 'hombre',
    String? marca,
    String? tipoCalzado,
    String? color,
    String? familiaId,
    double precio = 120,
    bool activo = true,
    int stock = 5,
  }) {
    return Product(
      id: id,
      nombre: nombre,
      precio: precio,
      descripcion: '',
      imagen: '',
      imagenes: const [],
      stock: stock,
      categoria: categoria,
      marca: marca,
      tipoCalzado: tipoCalzado,
      color: color,
      familiaId: familiaId,
      activo: activo,
    );
  }

  test('prioriza productos similares y excluye el producto actual', () {
    final reference = product(
      id: 'p1',
      nombre: 'Botin urbano cuero',
      marca: 'Vilchez',
      tipoCalzado: 'Botin',
      familiaId: 'fam-botin',
    );

    final result = ProductRecommendation.similarProducts(reference, [
      reference,
      product(
        id: 'p2',
        nombre: 'Botin urbano negro',
        marca: 'Vilchez',
        tipoCalzado: 'Botin',
        familiaId: 'fam-botin',
      ),
      product(
        id: 'p3',
        nombre: 'Sandalia verano',
        categoria: 'dama',
        tipoCalzado: 'Sandalia',
      ),
    ]);

    expect(result.map((p) => p.id), ['p2']);
  });

  test('respeta el limite de recomendados', () {
    final reference = product(id: 'p1', nombre: 'Zapatilla urbana');
    final catalog = [
      reference,
      product(id: 'p2', nombre: 'Zapatilla urbana azul'),
      product(id: 'p3', nombre: 'Zapatilla urbana blanca'),
      product(id: 'p4', nombre: 'Zapatilla urbana negra'),
      product(id: 'p5', nombre: 'Zapatilla urbana roja'),
    ];

    final result = ProductRecommendation.similarProducts(
      reference,
      catalog,
      limit: 3,
    );

    expect(result, hasLength(3));
    expect(result.any((p) => p.id == reference.id), isFalse);
  });
}

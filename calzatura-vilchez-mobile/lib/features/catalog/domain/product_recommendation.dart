import '../../../shared/models/product.dart';

class ProductRecommendation {
  const ProductRecommendation._();

  static List<Product> similarProducts(
    Product reference,
    List<Product> catalog, {
    int limit = 3,
  }) {
    final scored =
        catalog
            .where((product) => product.id != reference.id && product.activo)
            .map(
              (product) => _ScoredProduct(product, _score(reference, product)),
            )
            .where((item) => item.score >= 10)
            .toList()
          ..sort((a, b) {
            final scoreCompare = b.score.compareTo(a.score);
            if (scoreCompare != 0) return scoreCompare;
            return a.product.nombre.compareTo(b.product.nombre);
          });

    return scored.take(limit).map((item) => item.product).toList();
  }

  static int _score(Product reference, Product candidate) {
    var score = 0;
    score += _prefixSimilarity(reference.nombre, candidate.nombre) * 4;
    score += _sharedTokenScore(reference.nombre, candidate.nombre) * 3;

    if (_same(reference.familiaId, candidate.familiaId)) score += 18;
    if (_same(reference.categoria, candidate.categoria)) score += 14;
    if (_same(reference.tipoCalzado, candidate.tipoCalzado)) score += 12;
    if (_same(reference.marca, candidate.marca)) score += 8;
    if (_same(reference.material, candidate.material)) score += 5;
    if (_same(reference.estilo, candidate.estilo)) score += 5;
    if (_same(reference.color, candidate.color)) score += 3;

    final priceGap =
        (reference.precioConDescuento - candidate.precioConDescuento).abs();
    if (priceGap <= 10) {
      score += 5;
    } else if (priceGap <= 25) {
      score += 3;
    }

    if (candidate.hasStock) score += 2;
    if (candidate.destacado) score += 1;

    return score;
  }

  static int _prefixSimilarity(String a, String b) {
    final left = _normalize(a);
    final right = _normalize(b);
    final max = left.length < right.length ? left.length : right.length;
    var score = 0;
    for (var i = 0; i < max; i++) {
      if (left[i] != right[i]) break;
      score++;
    }
    return score;
  }

  static int _sharedTokenScore(String a, String b) {
    final left = _tokens(a);
    final right = _tokens(b);
    return left.where(right.contains).length;
  }

  static Set<String> _tokens(String value) => _normalize(
    value,
  ).split(RegExp(r'[^a-z0-9]+')).where((token) => token.length >= 3).toSet();

  static bool _same(String? a, String? b) {
    if (a == null || b == null) return false;
    final left = _normalize(a);
    final right = _normalize(b);
    return left.isNotEmpty && left == right;
  }

  static String _normalize(String value) => value
      .toLowerCase()
      .replaceAll('á', 'a')
      .replaceAll('é', 'e')
      .replaceAll('í', 'i')
      .replaceAll('ó', 'o')
      .replaceAll('ú', 'u')
      .replaceAll('ñ', 'n')
      .trim();
}

class _ScoredProduct {
  const _ScoredProduct(this.product, this.score);

  final Product product;
  final int score;
}

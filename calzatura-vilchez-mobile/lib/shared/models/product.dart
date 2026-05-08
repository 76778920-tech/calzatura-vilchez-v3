class Product {
  final String id;
  final String nombre;
  final double precio;
  final String descripcion;
  final String imagen;
  final List<String> imagenes;
  final int stock;
  final String categoria;
  final String? color;
  final List<String>? tallas;
  final Map<String, int>? tallaStock;
  final String? marca;
  final String? tipoCalzado;
  final String? estilo;
  final String? material;
  final bool activo;
  final bool destacado;
  final int? descuento; // 10, 20 o 30
  final String? campana;
  final String? familiaId;

  const Product({
    required this.id,
    required this.nombre,
    required this.precio,
    required this.descripcion,
    required this.imagen,
    required this.imagenes,
    required this.stock,
    required this.categoria,
    this.color,
    this.tallas,
    this.tallaStock,
    this.marca,
    this.tipoCalzado,
    this.estilo,
    this.material,
    this.activo = true,
    this.destacado = false,
    this.descuento,
    this.campana,
    this.familiaId,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    // tallaStock puede venir como {"36": 5, "37": 3} en jsonb
    Map<String, int>? tallaStockMap;
    final ts = json['tallaStock'];
    if (ts is Map) {
      tallaStockMap = ts.map(
        (k, v) => MapEntry(k.toString(), (v as num?)?.toInt() ?? 0),
      );
    }

    return Product(
      id: json['id'] as String,
      nombre: json['nombre'] as String? ?? '',
      precio: (json['precio'] as num?)?.toDouble() ?? 0.0,
      descripcion: json['descripcion'] as String? ?? '',
      imagen: json['imagen'] as String? ?? '',
      imagenes: (json['imagenes'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      categoria: json['categoria'] as String? ?? 'hombre',
      color: json['color'] as String?,
      tallas: (json['tallas'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      tallaStock: tallaStockMap,
      marca: json['marca'] as String?,
      tipoCalzado: json['tipoCalzado'] as String?,
      estilo: json['estilo'] as String?,
      material: json['material'] as String?,
      activo: json['activo'] as bool? ?? true,
      destacado: json['destacado'] as bool? ?? false,
      descuento: (json['descuento'] as num?)?.toInt(),
      campana: json['campana'] as String?,
      familiaId: json['familiaId'] as String?,
    );
  }

  List<String> get allImages {
    if (imagenes.isNotEmpty) return imagenes;
    if (imagen.isNotEmpty) return [imagen];
    return [];
  }

  bool get hasStock => stock > 0;

  bool get hasDescuento => descuento != null && descuento! > 0;

  double get precioConDescuento =>
      hasDescuento ? precio * (1 - descuento! / 100) : precio;

  String get precioFormatted =>
      'S/ ${precioConDescuento.toStringAsFixed(2)}';

  String get precioOriginalFormatted => 'S/ ${precio.toStringAsFixed(2)}';

  int stockDeTalla(String talla) => tallaStock?[talla] ?? 0;

  Map<String, dynamic> toMap() => {
        'id': id,
        'nombre': nombre,
        'precio': precio,
        'descripcion': descripcion,
        'imagen': imagen,
        'imagenes': imagenes,
        'stock': stock,
        'categoria': categoria,
        'color': color,
        'tallas': tallas,
        'tallaStock': tallaStock,
        'marca': marca,
        'tipoCalzado': tipoCalzado,
        'estilo': estilo,
        'material': material,
        'activo': activo,
        'destacado': destacado,
        'descuento': descuento,
        'campana': campana,
        'familiaId': familiaId,
      };
}

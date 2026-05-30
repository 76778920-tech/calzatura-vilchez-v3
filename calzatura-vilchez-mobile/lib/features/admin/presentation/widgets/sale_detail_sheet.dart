import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

const saleDocLabels = <String, String>{
  'ninguno': 'Venta simple',
  'nota_venta': 'Nota de venta',
  'guia_remision': 'Guía de remisión',
};

String maskDni(String? dni) {
  if (dni == null || dni.isEmpty) return '–';
  if (dni.length < 5) return '****';
  return '${dni.substring(0, 3)}****${dni.substring(dni.length - 2)}';
}

String maskName(String? name) {
  if (name == null || name.isEmpty) return '';
  return '${name[0].toUpperCase()}***';
}

String fmtSaleDateTime(String? iso) {
  if (iso == null) return '–';
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return '–';
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  return '${dt.day} ${months[dt.month - 1]} ${dt.year}, '
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}

/// Detalle de venta con devolución (web `AdminSaleDetailModal`).
class SaleDetailSheet extends StatefulWidget {
  const SaleDetailSheet({
    super.key,
    required this.sale,
    required this.onReturn,
    this.showFinancialDetails = true,
  });

  final Map<String, dynamic> sale;
  final Future<void> Function(String motivo) onReturn;
  final bool showFinancialDetails;

  @override
  State<SaleDetailSheet> createState() => _SaleDetailSheetState();
}

class _SaleDetailSheetState extends State<SaleDetailSheet> {
  final _motivoCtrl = TextEditingController();
  bool _returning = false;

  @override
  void dispose() {
    _motivoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sale = widget.sale;
    final devuelto = sale['devuelto'] as bool? ?? false;
    final ganancia = (sale['ganancia'] as num?)?.toDouble();
    final docTipo = sale['documentoTipo'] as String? ?? 'ninguno';
    final encargado = sale['encargadoNombre'] as String?;
    final clienteRaw = sale['cliente'];
    final cliente = clienteRaw is Map
        ? Map<String, dynamic>.from(clienteRaw)
        : null;
    final creadoEn = sale['creadoEn'] as String?;
    final motivoDev = sale['motivoDevolucion'] as String?;
    final devueltoEn = sale['devueltoEn'] as String?;
    final canal = sale['canal'] as String?;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      builder: (ctx, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ListView(
          controller: scrollCtrl,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 16),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              children: [
                const Text(
                  'Detalle de venta',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
                const Spacer(),
                if (devuelto)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.textSecondary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Devuelto',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.beige,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      sale['codigo'] as String? ?? '',
                      style: const TextStyle(
                        color: AppColors.gold,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sale['nombre'] as String? ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        if ((sale['color'] as String?)?.isNotEmpty == true ||
                            (sale['talla'] as String?)?.isNotEmpty == true)
                          Text(
                            [
                              if ((sale['color'] as String?)?.isNotEmpty ==
                                  true)
                                'Color: ${sale['color']}',
                              if ((sale['talla'] as String?)?.isNotEmpty ==
                                  true)
                                'Talla: ${sale['talla']}',
                            ].join(' · '),
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        if (canal != null)
                          Text(
                            canal == 'web'
                                ? 'Canal: Tienda online'
                                : 'Canal: Tienda física',
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _InfoCell(
                    label: 'Fecha y hora',
                    value: fmtSaleDateTime(creadoEn),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _InfoCell(
                    label: 'Comprobante',
                    value: saleDocLabels[docTipo] ?? 'Sin comprobante',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _InfoCell(
              label: 'Encargado',
              value: (encargado?.isNotEmpty == true)
                  ? encargado!
                  : 'Sin encargado',
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.beige,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _AmountRow(
                    label: 'Cantidad',
                    value: '${sale['cantidad'] ?? 1} ud.',
                  ),
                  const SizedBox(height: 6),
                  _AmountRow(
                    label: 'Precio unitario',
                    value:
                        'S/ ${((sale['precioVenta'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                  ),
                  const Divider(height: 16),
                  _AmountRow(
                    label: 'Total vendido',
                    value:
                        'S/ ${((sale['total'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                    bold: true,
                  ),
                  if (widget.showFinancialDetails && ganancia != null) ...[
                    const SizedBox(height: 6),
                    _AmountRow(
                      label: 'Ganancia',
                      value: 'S/ ${ganancia.toStringAsFixed(2)}',
                      color: AppColors.success,
                    ),
                  ],
                ],
              ),
            ),
            if (cliente != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[200]!),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CLIENTE',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${maskName(cliente['nombres'] as String?)} ${maskName(cliente['apellidos'] as String?)}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      'DNI: ${maskDni(cliente['dni'] as String?)}',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (devuelto) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Devolución registrada',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.error,
                      ),
                    ),
                    if (devueltoEn != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        fmtSaleDateTime(devueltoEn),
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                    if (motivoDev?.isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Motivo: $motivoDev',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ],
            if (!devuelto) ...[
              const SizedBox(height: 24),
              const Text(
                'Devolución o corrección',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              const Text(
                'Indica el motivo. El stock será restaurado automáticamente.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _motivoCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText:
                      'Ej: Talla equivocada, venta duplicada, cliente desistió...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.gold),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  onPressed: _returning
                      ? null
                      : () async {
                          final motivo = _motivoCtrl.text.trim();
                          if (motivo.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Escribe un motivo de devolución'),
                                backgroundColor: AppColors.error,
                              ),
                            );
                            return;
                          }
                          final navigator = Navigator.of(context);
                          final messenger = ScaffoldMessenger.of(context);
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (dlgCtx) => AlertDialog(
                              title: const Text('Confirmar devolución'),
                              content: Text(
                                'Motivo: "$motivo"\n\nEl stock del producto será restaurado.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      Navigator.pop(dlgCtx, false),
                                  child: const Text('Cancelar'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(dlgCtx, true),
                                  child: const Text(
                                    'Confirmar',
                                    style: TextStyle(color: AppColors.error),
                                  ),
                                ),
                              ],
                            ),
                          );
                          if (confirmed != true || !mounted) return;
                          setState(() => _returning = true);
                          try {
                            await widget.onReturn(motivo);
                            if (mounted) navigator.pop();
                          } catch (e) {
                            if (mounted) {
                              setState(() => _returning = false);
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text('Error: $e'),
                                  backgroundColor: AppColors.error,
                                ),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                    minimumSize: Size.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: _returning
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Confirmar devolución',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoCell extends StatelessWidget {
  const _InfoCell({required this.label, required this.value});
  final String label, value;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: AppColors.beige,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ],
    ),
  );
}

class _AmountRow extends StatelessWidget {
  const _AmountRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.color,
  });
  final String label, value;
  final bool bold;
  final Color? color;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(
        label,
        style: TextStyle(
          color: AppColors.textSecondary,
          fontSize: 13,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
        ),
      ),
      const Spacer(),
      Text(
        value,
        style: TextStyle(
          fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
          fontSize: 13,
          color: color ?? AppColors.textPrimary,
        ),
      ),
    ],
  );
}

import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AdminDataService {
  final _s = Supabase.instance.client;

  static const _testTables = [
    'productos',
    'productoFinanzas',
    'fabricantes',
    'ventasDiarias',
  ];

  Future<void> exportAndShare(String collection) async {
    final data = await _s.from(collection).select();
    final rows = List<Map<String, dynamic>>.from(data as List);
    if (rows.isEmpty) throw Exception('La colección "$collection" está vacía.');
    final csv = _buildCsv(rows);
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$collection.csv');
    await file.writeAsString(csv);
    await Share.shareXFiles(
      [XFile(file.path, mimeType: 'text/csv')],
      subject: 'CV Export · $collection',
    );
  }

  Future<int> countScenario(String escenario) async {
    int total = 0;
    for (final t in _testTables) {
      try {
        final r = await _s
            .from(t)
            .select()
            .eq('esDePrueba', true)
            .eq('escenario', escenario)
            .count(CountOption.exact);
        total += r.count;
      } catch (_) {}
    }
    return total;
  }

  Future<void> deleteScenario(String escenario) async {
    for (final t in _testTables) {
      try {
        await _s
            .from(t)
            .delete()
            .eq('esDePrueba', true)
            .eq('escenario', escenario);
      } catch (_) {}
    }
  }

  Future<List<String>> listBatches() async {
    final lotes = <String>{};
    await Future.wait(
      _testTables.map((t) async {
        try {
          final result = await _s
              .from(t)
              .select('loteImportacion')
              .eq('esDePrueba', true);
          for (final row
              in List<Map<String, dynamic>>.from(result as List)) {
            final lote = row['loteImportacion'] as String?;
            if (lote != null && lote.isNotEmpty) lotes.add(lote);
          }
        } catch (_) {}
      }),
    );
    return lotes.toList()..sort((a, b) => b.compareTo(a));
  }

  Future<int> countBatch(String lote) async {
    int total = 0;
    for (final t in _testTables) {
      try {
        final r = await _s
            .from(t)
            .select()
            .eq('loteImportacion', lote)
            .count(CountOption.exact);
        total += r.count;
      } catch (_) {}
    }
    return total;
  }

  Future<void> deleteBatch(String lote) async {
    for (final t in _testTables) {
      try {
        await _s.from(t).delete().eq('loteImportacion', lote);
      } catch (_) {}
    }
  }

  Future<int> countSalesUntil(String isoDate) async {
    final r = await _s
        .from('ventasDiarias')
        .select()
        .lte('fecha', isoDate)
        .count(CountOption.exact);
    return r.count;
  }

  Future<void> deleteSalesUntil(String isoDate) async {
    await _s.from('ventasDiarias').delete().lte('fecha', isoDate);
  }

  static String _buildCsv(List<Map<String, dynamic>> rows) {
    final headers = rows.first.keys.toList();
    final buf = StringBuffer();
    buf.writeln(headers.map(_esc).join(','));
    for (final row in rows) {
      buf.writeln(
        headers.map((h) => _esc(row[h]?.toString() ?? '')).join(','),
      );
    }
    return buf.toString();
  }

  static String _esc(String? v) {
    if (v == null || v.isEmpty) return '';
    if (v.contains(',') || v.contains('"') || v.contains('\n')) {
      return '"${v.replaceAll('"', '""')}"';
    }
    return v;
  }
}

final adminDataServiceProvider = Provider<AdminDataService>(
  (_) => AdminDataService(),
);

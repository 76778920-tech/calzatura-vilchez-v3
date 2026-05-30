import 'package:calzatura_vilchez_mobile/core/services/worker_notification_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final workerUids = {'worker-1'};

  test('incluye venta_diaria además de venta', () {
    expect(trackedWorkerEntities.contains('venta_diaria'), isTrue);
    expect(trackedWorkerEntities.contains('venta'), isTrue);
  });

  test('detecta venta_diaria de trabajador', () {
    expect(
      isWorkerAuditEntry(
        usuarioUid: 'worker-1',
        entidad: 'venta_diaria',
        workerUids: workerUids,
      ),
      isTrue,
    );
  });

  test('ignora acciones de admin', () {
    expect(
      isWorkerAuditEntry(
        usuarioUid: 'admin-9',
        entidad: 'venta_diaria',
        workerUids: workerUids,
      ),
      isFalse,
    );
  });

  test('formatea toast de registrar venta', () {
    expect(
      formatWorkerNotifToast(
        accion: 'registrar_venta',
        entidad: 'venta_diaria',
        entidadNombre: '#ABC12345',
      ),
      'Trabajador registró Venta: #ABC12345',
    );
  });

  test('formatea toast de devolver venta', () {
    expect(
      formatWorkerNotifToast(
        accion: 'devolver_venta',
        entidad: 'venta_diaria',
        entidadNombre: '#XYZ98765',
      ),
      'Trabajador devolvió Venta: #XYZ98765',
    );
  });
}

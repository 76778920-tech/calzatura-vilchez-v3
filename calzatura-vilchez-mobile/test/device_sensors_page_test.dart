import 'package:calzatura_vilchez_mobile/features/sensors/presentation/pages/device_sensors_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('DeviceSensorsPage muestra encabezado y tarjetas de sensores', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: DeviceSensorsPage()),
    );

    expect(find.text('Sensores del móvil'), findsOneWidget);
    expect(find.textContaining('Supabase'), findsOneWidget);
    expect(find.text('Acelerómetro...'), findsOneWidget);
    expect(find.text('Giroscopio...'), findsOneWidget);
    expect(find.text('Magnetómetro...'), findsOneWidget);
    expect(find.text('User Accel...'), findsOneWidget);
  });
}

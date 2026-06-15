import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/cv_app_bar.dart';

/// Lectura de sensores del dispositivo (Guía Práctica — punto 1).
class DeviceSensorsPage extends StatefulWidget {
  const DeviceSensorsPage({super.key});

  @override
  State<DeviceSensorsPage> createState() => _DeviceSensorsPageState();
}

class _DeviceSensorsPageState extends State<DeviceSensorsPage> {
  final List<StreamSubscription<dynamic>> _subscriptions = [];

  String _accelerometer = '';
  String _gyroscope = '';
  String _magnetometer = '';
  String _userAccelerometer = '';

  @override
  void initState() {
    super.initState();
    _listenSensor(
      accelerometerEventStream(),
      (event) => _accelerometer = _formatReading('Acelerómetro', event),
      (message) => _accelerometer = message,
    );
    _listenSensor(
      gyroscopeEventStream(),
      (event) => _gyroscope = _formatReading('Giroscopio', event),
      (message) => _gyroscope = message,
    );
    _listenSensor(
      magnetometerEventStream(),
      (event) => _magnetometer = _formatReading('Magnetómetro', event),
      (message) => _magnetometer = message,
    );
    _listenSensor(
      userAccelerometerEventStream(),
      (event) => _userAccelerometer = _formatReading('User Accel', event),
      (message) => _userAccelerometer = message,
    );
  }

  void _listenSensor<T>(
    Stream<T> stream,
    void Function(T event) onData,
    void Function(String message) onError,
  ) {
    _subscriptions.add(stream.listen(
      (event) {
        if (!mounted) return;
        setState(() => onData(event));
      },
      onError: (Object error) {
        if (!mounted) return;
        setState(() => onError('Sensor no disponible en este dispositivo.'));
      },
    ));
  }

  String _formatReading(String label, dynamic event) {
    final x = (event.x as num).toDouble();
    final y = (event.y as num).toDouble();
    final z = (event.z as num).toDouble();
    return '$label:\nX: ${x.toStringAsFixed(2)}\nY: ${y.toStringAsFixed(2)}\nZ: ${z.toStringAsFixed(2)}';
  }

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      unawaited(subscription.cancel());
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.beige,
      appBar: CVAppBar(
        leading: CVBackButton(onPressed: () => context.pop()),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            const Text(
              'Sensores del móvil',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Datos en tiempo real del dispositivo. La app usa Supabase para '
              'negocio; los sensores son solo lectura local.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 20),
            _SensorCard(text: _accelerometer, placeholder: 'Acelerómetro...'),
            _SensorCard(text: _gyroscope, placeholder: 'Giroscopio...'),
            _SensorCard(text: _magnetometer, placeholder: 'Magnetómetro...'),
            _SensorCard(text: _userAccelerometer, placeholder: 'User Accel...'),
          ],
        ),
      ),
    );
  }
}

class _SensorCard extends StatelessWidget {
  const _SensorCard({required this.text, required this.placeholder});

  final String text;
  final String placeholder;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(
          text.isEmpty ? placeholder : text,
          style: const TextStyle(fontSize: 16, height: 1.45),
        ),
      ),
    );
  }
}

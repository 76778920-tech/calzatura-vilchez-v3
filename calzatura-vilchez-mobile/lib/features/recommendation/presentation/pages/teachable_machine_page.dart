import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:tflite_flutter/tflite_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';

class TeachableMachinePage extends StatefulWidget {
  const TeachableMachinePage({super.key});

  @override
  State<TeachableMachinePage> createState() => _TeachableMachinePageState();
}

class _TeachableMachinePageState extends State<TeachableMachinePage> {
  static const _modelPath = 'assets/teachable/model.tflite';
  static const _labelsPath = 'assets/teachable/labels.txt';

  final _picker = ImagePicker();
  Interpreter? _interpreter;
  List<String> _labels = const [];
  Uint8List? _imageBytes;
  String _status = 'Cargando modelo...';
  String _result = '';
  double? _confidence;
  bool _loadingModel = true;
  bool _predicting = false;

  @override
  void initState() {
    super.initState();
    _loadModel();
  }

  @override
  void dispose() {
    _interpreter?.close();
    super.dispose();
  }

  Future<void> _loadModel() async {
    setState(() {
      _loadingModel = true;
      _status = 'Cargando modelo...';
      _result = '';
      _confidence = null;
    });

    try {
      final labelsData = await rootBundle.loadString(_labelsPath);
      final labels = labelsData
          .split('\n')
          .map((line) => line.trim())
          .where((line) => line.isNotEmpty)
          .toList(growable: false);
      final interpreter = await Interpreter.fromAsset(_modelPath);

      if (!mounted) return;
      setState(() {
        _interpreter = interpreter;
        _labels = labels;
        _loadingModel = false;
        _status = 'Modelo listo';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingModel = false;
        _status =
            'Agrega model.tflite y labels.txt en assets/teachable para activar la clasificacion.';
        _result = error.toString();
      });
    }
  }

  Future<void> _pickImage() async {
    if (_interpreter == null || _loadingModel) {
      await _loadModel();
      if (_interpreter == null) return;
    }

    final picked = await _picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;

    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _imageBytes = bytes;
      _predicting = true;
      _result = 'Procesando...';
      _confidence = null;
    });

    try {
      final prediction = _predict(bytes);
      if (!mounted) return;
      setState(() {
        _predicting = false;
        _result = prediction.label;
        _confidence = prediction.confidence;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _predicting = false;
        _result = error.toString();
        _confidence = null;
      });
    }
  }

  _Prediction _predict(Uint8List bytes) {
    final interpreter = _interpreter;
    if (interpreter == null) {
      throw StateError('El modelo no esta cargado.');
    }

    final decoded = img.decodeImage(bytes);
    if (decoded == null) {
      throw StateError('La imagen seleccionada no se pudo leer.');
    }

    final inputTensor = interpreter.getInputTensors().first;
    final outputTensor = interpreter.getOutputTensors().first;
    final inputShape = inputTensor.shape;
    final outputShape = outputTensor.shape;

    if (inputShape.length != 4 || inputShape[3] < 3) {
      throw StateError(
        'El modelo debe recibir imagenes con forma [1, alto, ancho, 3].',
      );
    }

    final height = inputShape[1];
    final width = inputShape[2];
    final resized = img.copyResize(decoded, width: width, height: height);
    final input = _buildInput(resized, inputTensor.type);
    final outputSize = outputShape.isEmpty ? _labels.length : outputShape.last;
    final output = _buildOutput(outputSize, outputTensor.type);

    interpreter.run(input, output);

    final scores = ((output as List).first as List)
        .map((value) => (value as num).toDouble())
        .toList(growable: false);
    if (scores.isEmpty) {
      throw StateError('El modelo no devolvio resultados.');
    }

    var bestIndex = 0;
    for (var i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIndex]) bestIndex = i;
    }

    final label = bestIndex < _labels.length
        ? _labels[bestIndex]
        : 'Clase $bestIndex';
    return _Prediction(label, _confidenceFrom(scores, bestIndex));
  }

  Object _buildInput(img.Image image, TensorType type) {
    final isFloat = type == TensorType.float32;
    return [
      List.generate(image.height, (y) {
        return List.generate(image.width, (x) {
          final pixel = image.getPixel(x, y);
          if (isFloat) {
            return [
              pixel.r.toDouble() / 255.0,
              pixel.g.toDouble() / 255.0,
              pixel.b.toDouble() / 255.0,
            ];
          }
          return [pixel.r.toInt(), pixel.g.toInt(), pixel.b.toInt()];
        });
      }),
    ];
  }

  Object _buildOutput(int size, TensorType type) {
    if (type == TensorType.uint8 ||
        type == TensorType.int8 ||
        type == TensorType.int16 ||
        type == TensorType.int32 ||
        type == TensorType.int64) {
      return [List<int>.filled(size, 0)];
    }
    return [List<double>.filled(size, 0)];
  }

  double _confidenceFrom(List<double> scores, int bestIndex) {
    final total = scores.fold<double>(
      0,
      (sum, score) => sum + math.max(score, 0),
    );
    if (total > 1) return scores[bestIndex] / total;
    return scores[bestIndex].clamp(0, 1);
  }

  @override
  Widget build(BuildContext context) {
    final ready = _interpreter != null && !_loadingModel;

    return BackNavigationScope(
      fallbackRoute: '/catalog',
      child: Scaffold(
        backgroundColor: AppColors.beige,
        appBar: AppBar(
          title: const Text('Teachable Machine'),
          backgroundColor: AppColors.black,
          foregroundColor: Colors.white,
          actions: [
            IconButton(
              tooltip: 'Recargar modelo',
              icon: const Icon(Icons.refresh_rounded),
              onPressed: _loadingModel ? null : _loadModel,
            ),
          ],
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _ModelStatusCard(
                loading: _loadingModel,
                ready: ready,
                status: _status,
              ),
              const SizedBox(height: 18),
              _ImagePreview(imageBytes: _imageBytes),
              const SizedBox(height: 18),
              _ResultCard(
                predicting: _predicting,
                result: _result,
                confidence: _confidence,
              ),
              const SizedBox(height: 22),
              ElevatedButton.icon(
                onPressed: _predicting ? null : _pickImage,
                icon: const Icon(Icons.image_search_rounded),
                label: const Text('Seleccionar imagen'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  foregroundColor: AppColors.black,
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModelStatusCard extends StatelessWidget {
  const _ModelStatusCard({
    required this.loading,
    required this.ready,
    required this.status,
  });

  final bool loading;
  final bool ready;
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = ready ? AppColors.success : AppColors.warning;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Row(
        children: [
          loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.2),
                )
              : Icon(
                  ready ? Icons.check_circle_rounded : Icons.info_rounded,
                  color: color,
                ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              status,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({required this.imageBytes});

  final Uint8List? imageBytes;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Container(
          color: Colors.white,
          child: imageBytes == null
              ? const Center(
                  child: Icon(
                    Icons.add_photo_alternate_outlined,
                    color: AppColors.textSecondary,
                    size: 72,
                  ),
                )
              : Image.memory(imageBytes!, fit: BoxFit.cover),
        ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.predicting,
    required this.result,
    required this.confidence,
  });

  final bool predicting;
  final String result;
  final double? confidence;

  @override
  Widget build(BuildContext context) {
    final hasResult = result.isNotEmpty;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(
            predicting ? Icons.auto_awesome_rounded : Icons.analytics_outlined,
            color: AppColors.gold,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              hasResult
                  ? confidence == null
                        ? result
                        : '$result - ${(confidence! * 100).toStringAsFixed(1)}%'
                  : 'Selecciona una imagen para clasificarla',
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w700,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Prediction {
  const _Prediction(this.label, this.confidence);

  final String label;
  final double confidence;
}

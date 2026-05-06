import 'package:flutter_test/flutter_test.dart';
import 'package:calzatura_vilchez_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    expect(CalzaturaApp, isNotNull);
  });
}

import 'package:calzatura_vilchez_mobile/shared/widgets/cv_app_bar.dart';
import 'package:calzatura_vilchez_mobile/shared/widgets/cv_logo.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CVAppBar (Guías Prácticas PDF)', () {
    testWidgets('muestra el logo centrado por defecto', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(appBar: CVAppBar()),
        ),
      );

      expect(find.byType(CVLogo), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);

      final appBar = tester.widget<AppBar>(find.byType(AppBar));
      expect(appBar.centerTitle, isTrue);
      expect(appBar.title, isA<CVLogo>());
    });

    testWidgets('acepta acciones y leading personalizados', (tester) async {
      var backPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            appBar: CVAppBar(
              leading: CVBackButton(onPressed: () => backPressed = true),
              actions: const [Icon(Icons.search)],
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.search), findsOneWidget);
      await tester.tap(find.byType(CVBackButton));
      expect(backPressed, isTrue);
    });

    testWidgets('permite título personalizado (búsqueda)', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            appBar: CVAppBar(
              centerTitle: false,
              title: Text('Buscar'),
            ),
          ),
        ),
      );

      expect(find.text('Buscar'), findsOneWidget);
      expect(find.byType(CVLogo), findsNothing);
    });
  });

  group('CVSliverAppBar', () {
    testWidgets('muestra logo en sliver', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: CustomScrollView(
              slivers: [CVSliverAppBar()],
            ),
          ),
        ),
      );

      expect(find.byType(CVLogo), findsOneWidget);
      expect(find.byType(SliverAppBar), findsOneWidget);
    });
  });

  group('CVAppBarTitle', () {
    testWidgets('combina logo con encabezado y subtítulo', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            appBar: CVAppBar(
              centerTitle: false,
              title: CVAppBarTitle(
                heading: 'Tienda',
                subheading: 'Todos los productos',
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CVLogo), findsOneWidget);
      expect(find.text('Tienda'), findsOneWidget);
      expect(find.text('Todos los productos'), findsOneWidget);
    });
  });
}

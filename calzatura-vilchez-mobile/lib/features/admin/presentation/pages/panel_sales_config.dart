import '../../../../core/services/panel_bff_api.dart';

/// Textos y alcance BFF por panel (alineado con web `PAGE_COPY` en `AdminSalesLoadedView`).
class PanelSalesUiConfig {
  const PanelSalesUiConfig({
    required this.scope,
    required this.showFinancialDetails,
    required this.showEncargadoInHistorial,
    required this.useDarkTheme,
    required this.kicker,
    required this.title,
    required this.subtitle,
    required this.dateLabel,
    required this.finanzasMissing,
  });

  final PanelScope scope;
  final bool showFinancialDetails;
  final bool showEncargadoInHistorial;
  final bool useDarkTheme;
  final String kicker;
  final String title;
  final String subtitle;
  final String dateLabel;
  final String finanzasMissing;

  static const staff = PanelSalesUiConfig(
    scope: PanelScope.staff,
    showFinancialDetails: false,
    showEncargadoInHistorial: false,
    useDarkTheme: true,
    kicker: 'Área tienda',
    title: 'Registro de ventas físicas',
    subtitle:
        'Registra tus ventas del día, emite nota o guía y consulta solo tu historial.',
    dateLabel: 'Fecha de registro',
    finanzasMissing:
        'Este producto no tiene rango de precio configurado. Avisa a administración.',
  );

  static const admin = PanelSalesUiConfig(
    scope: PanelScope.admin,
    showFinancialDetails: true,
    showEncargadoInHistorial: true,
    useDarkTheme: false,
    kicker: 'Ventas diarias',
    title: 'Consulta y registro de ventas',
    subtitle:
        'Agrega una o varias tallas al detalle y registra la venta completa.',
    dateLabel: 'Fecha de métricas y registro',
    finanzasMissing:
        'Este producto necesita costo real y márgenes en Productos.',
  );
}

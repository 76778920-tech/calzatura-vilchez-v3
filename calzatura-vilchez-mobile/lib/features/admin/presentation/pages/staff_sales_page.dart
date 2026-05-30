import 'package:flutter/material.dart';

import 'panel_sales_config.dart';
import 'panel_sales_page.dart';

/// Ventas trabajador — delega en [PanelSalesPage] (config staff).
class StaffSalesPage extends StatelessWidget {
  const StaffSalesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const PanelSalesPage(config: PanelSalesUiConfig.staff);
  }
}

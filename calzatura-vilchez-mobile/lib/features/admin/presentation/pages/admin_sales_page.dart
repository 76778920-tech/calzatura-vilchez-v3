import 'package:flutter/material.dart';

import 'panel_sales_config.dart';
import 'panel_sales_page.dart';

/// Ventas admin — paridad web `AdminSales` / `useAdminSalesPage`.
class AdminSalesPage extends StatelessWidget {
  const AdminSalesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const PanelSalesPage(config: PanelSalesUiConfig.admin);
  }
}

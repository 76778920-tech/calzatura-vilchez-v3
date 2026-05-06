import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/config/env.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/back_navigation_scope.dart';

const _panelCard = Color(0xFF2A1F10);
const _panelCardSoft = Color(0xFF1A1712);
const _panelStroke = Color(0xFF7A5A15);
const _panelTextSoft = Color(0xFFD9CDB9);
const _panelTextMuted = Color(0xFFBCA98A);

const _horizonOptions = [7, 15, 30];
const _historyOptions = [30, 60, 90, 120];
const _alertOptions = [7, 14, 21, 30];
const _rankingOptions = [7, 15, 30];

final _aiServiceProvider = Provider<_AiService>((ref) => const _AiService());

final _combinedDashboardProvider = FutureProvider.autoDispose
    .family<_AiCombinedResponse, ({int horizon, int history})>((ref, options) {
      return ref
          .watch(_aiServiceProvider)
          .fetchCombined(horizon: options.horizon, history: options.history);
    });

final _weeklyChartProvider =
    FutureProvider.autoDispose<List<_WeeklySalesPoint>>((ref) {
      return ref.watch(_aiServiceProvider).fetchWeeklyChart(weeks: 8);
    });

final _ireHistoryProvider = FutureProvider.autoDispose<List<_IreHistoryPoint>>((
  ref,
) {
  return ref.watch(_aiServiceProvider).fetchIreHistory(days: 60);
});

final _modelMetricsProvider = FutureProvider.autoDispose<_ModelMetricsStatus>((
  ref,
) {
  return ref.watch(_aiServiceProvider).fetchModelMetrics();
});

class AdminPredictionsPage extends ConsumerStatefulWidget {
  const AdminPredictionsPage({super.key});

  @override
  ConsumerState<AdminPredictionsPage> createState() =>
      _AdminPredictionsPageState();
}

class _AdminPredictionsPageState extends ConsumerState<AdminPredictionsPage>
    with SingleTickerProviderStateMixin {
  static const _prefHorizon = 'mobile_ai_horizon';
  static const _prefHistory = 'mobile_ai_history';
  static const _prefAlert = 'mobile_ai_alert';

  late final TabController _tabController;
  final _chatController = TextEditingController();

  int _horizon = 7;
  int _history = 30;
  int _alertDays = 14;
  int _rankingWindow = 30;
  String _search = '';

  bool _assistantLoading = false;
  final List<_ChatMessage> _messages = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    unawaited(_loadPreferences());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _chatController.dispose();
    super.dispose();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _horizon = prefs.getInt(_prefHorizon) ?? _horizon;
      _history = prefs.getInt(_prefHistory) ?? _history;
      _alertDays = prefs.getInt(_prefAlert) ?? _alertDays;
    });
  }

  Future<void> _savePreferences() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_prefHorizon, _horizon);
    await prefs.setInt(_prefHistory, _history);
    await prefs.setInt(_prefAlert, _alertDays);
  }

  Future<void> _refreshData() async {
    ref.invalidate(
      _combinedDashboardProvider((horizon: _horizon, history: _history)),
    );
    ref.invalidate(_weeklyChartProvider);
    ref.invalidate(_ireHistoryProvider);
    ref.invalidate(_modelMetricsProvider);
    await Future<void>.delayed(const Duration(milliseconds: 100));
  }

  void _updateHorizon(int value) {
    if (_horizon == value) return;
    setState(() => _horizon = value);
    unawaited(_savePreferences());
  }

  void _updateHistory(int value) {
    if (_history == value) return;
    setState(() => _history = value);
    unawaited(_savePreferences());
  }

  void _updateAlertDays(int value) {
    if (_alertDays == value) return;
    setState(() => _alertDays = value);
    unawaited(_savePreferences());
  }

  Future<void> _sendAssistantMessage(_DashboardInsights? insights) async {
    final message = _chatController.text.trim();
    if (message.isEmpty || _assistantLoading || insights == null) return;

    setState(() {
      _messages.add(_ChatMessage(role: 'user', text: message));
      _assistantLoading = true;
      _chatController.clear();
    });

    await Future<void>.delayed(const Duration(milliseconds: 240));
    final reply = _buildAssistantReply(message, insights);

    if (!mounted) return;
    setState(() {
      _messages.add(_ChatMessage(role: 'assistant', text: reply));
      _assistantLoading = false;
    });
  }

  void _applyQuickQuestion(String prompt, _DashboardInsights? insights) {
    if (insights == null) return;
    _chatController.text = prompt;
    unawaited(_sendAssistantMessage(insights));
  }

  @override
  Widget build(BuildContext context) {
    final combinedAsync = ref.watch(
      _combinedDashboardProvider((horizon: _horizon, history: _history)),
    );
    final weeklyAsync = ref.watch(_weeklyChartProvider);
    final ireHistoryAsync = ref.watch(_ireHistoryProvider);
    final modelMetricsAsync = ref.watch(_modelMetricsProvider);

    final dashboard = combinedAsync.valueOrNull;
    final insights = dashboard == null
        ? null
        : _DashboardInsights.fromData(
            data: dashboard,
            horizon: _horizon,
            alertDays: _alertDays,
          );

    return BackNavigationScope(
      fallbackRoute: '/admin',
      child: Scaffold(
        backgroundColor: AppColors.black,
        appBar: AppBar(
          backgroundColor: AppColors.black,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            onPressed: () =>
                handleBackNavigation(context, fallbackRoute: '/admin'),
          ),
          title: const Text(
            'Inteligencia Artificial',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        body: Column(
          children: [
            _PageHeader(
              horizon: _horizon,
              history: _history,
              alertDays: _alertDays,
              atRisk: insights?.atRiskCount ?? 0,
              onRefresh: _refreshData,
              onHorizonChanged: _updateHorizon,
              onHistoryChanged: _updateHistory,
              onAlertChanged: _updateAlertDays,
            ),
            Container(
              alignment: Alignment.centerLeft,
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: _panelStroke, width: 0.6),
                ),
              ),
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                indicatorColor: AppColors.gold,
                dividerColor: Colors.transparent,
                labelColor: Colors.white,
                unselectedLabelColor: _panelTextMuted,
                labelStyle: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
                tabs: [
                  _tab('Resumen', badge: insights?.atRiskCount ?? 0),
                  _tab('Ventas e inventario'),
                  _tab('Finanzas'),
                  _tab('Ranking'),
                  _tab('Modelo IA'),
                  _tab('Asistente'),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _SummaryTab(
                    combinedAsync: combinedAsync,
                    ireHistoryAsync: ireHistoryAsync,
                    insights: insights,
                    onRefresh: _refreshData,
                  ),
                  _SalesInventoryTab(
                    combinedAsync: combinedAsync,
                    weeklyAsync: weeklyAsync,
                    insights: insights,
                    search: _search,
                    horizon: _horizon,
                    alertDays: _alertDays,
                    onSearchChanged: (value) => setState(() => _search = value),
                    onRefresh: _refreshData,
                  ),
                  _FinanceTab(
                    combinedAsync: combinedAsync,
                    insights: insights,
                    onRefresh: _refreshData,
                  ),
                  _RankingTab(
                    combinedAsync: combinedAsync,
                    insights: insights,
                    rankingWindow: _rankingWindow,
                    onWindowChanged: (value) =>
                        setState(() => _rankingWindow = value),
                    onRefresh: _refreshData,
                  ),
                  _ModelTab(
                    combinedAsync: combinedAsync,
                    modelMetricsAsync: modelMetricsAsync,
                    onRefresh: _refreshData,
                  ),
                  _AssistantTab(
                    combinedAsync: combinedAsync,
                    insights: insights,
                    messages: _messages,
                    loading: _assistantLoading,
                    controller: _chatController,
                    onRefresh: _refreshData,
                    onSend: () => _sendAssistantMessage(insights),
                    onQuickQuestion: (prompt) =>
                        _applyQuickQuestion(prompt, insights),
                    horizon: _horizon,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Tab _tab(String label, {int badge = 0}) {
    return Tab(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label),
          if (badge > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: AppColors.error.withValues(alpha: 0.35),
                ),
              ),
              child: Text(
                '$badge',
                style: const TextStyle(
                  color: AppColors.error,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PageHeader extends StatelessWidget {
  const _PageHeader({
    required this.horizon,
    required this.history,
    required this.alertDays,
    required this.atRisk,
    required this.onRefresh,
    required this.onHorizonChanged,
    required this.onHistoryChanged,
    required this.onAlertChanged,
  });

  final int horizon;
  final int history;
  final int alertDays;
  final int atRisk;
  final Future<void> Function() onRefresh;
  final ValueChanged<int> onHorizonChanged;
  final ValueChanged<int> onHistoryChanged;
  final ValueChanged<int> onAlertChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      color: AppColors.black,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Panel de decisiones',
            style: TextStyle(
              color: _panelTextMuted,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.psychology_alt_outlined, color: Colors.white),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Inteligencia Artificial',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              IconButton(
                onPressed: onRefresh,
                icon: const Icon(
                  Icons.refresh_rounded,
                  color: Colors.white70,
                  size: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'El horizonte define la proyeccion financiera y de demanda. El umbral de alerta controla que productos se marcan en riesgo.',
            style: TextStyle(color: _panelTextSoft, fontSize: 13, height: 1.45),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _FilterBlock(
                title: 'Horizonte',
                options: _horizonOptions,
                suffix: ' dias',
                value: horizon,
                onChanged: onHorizonChanged,
              ),
              _FilterBlock(
                title: 'Historial modelo',
                options: _historyOptions,
                suffix: 'd',
                value: history,
                onChanged: onHistoryChanged,
              ),
              _FilterBlock(
                title: 'Alerta stock',
                options: _alertOptions,
                suffix: 'd',
                value: alertDays,
                onChanged: onAlertChanged,
              ),
              if (atRisk > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.error.withValues(alpha: 0.30),
                    ),
                  ),
                  child: Text(
                    '$atRisk alertas activas',
                    style: const TextStyle(
                      color: AppColors.error,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FilterBlock extends StatelessWidget {
  const _FilterBlock({
    required this.title,
    required this.options,
    required this.value,
    required this.onChanged,
    required this.suffix,
  });

  final String title;
  final List<int> options;
  final int value;
  final String suffix;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$title:',
          style: const TextStyle(
            color: _panelTextSoft,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(width: 6),
        Wrap(
          spacing: 6,
          children: options
              .map(
                (option) => _ChoicePill(
                  label: '$option$suffix',
                  selected: option == value,
                  onTap: () => onChanged(option),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

class _ChoicePill extends StatelessWidget {
  const _ChoicePill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.gold.withValues(alpha: 0.14) : _panelCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected
                ? AppColors.gold
                : Colors.white.withValues(alpha: 0.14),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppColors.goldLight : Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _SummaryTab extends StatelessWidget {
  const _SummaryTab({
    required this.combinedAsync,
    required this.ireHistoryAsync,
    required this.insights,
    required this.onRefresh,
  });

  final AsyncValue<_AiCombinedResponse> combinedAsync;
  final AsyncValue<List<_IreHistoryPoint>> ireHistoryAsync;
  final _DashboardInsights? insights;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return combinedAsync.when(
      loading: () => _LoadingList(onRefresh: onRefresh),
      error: (error, _) => _TabErrorView(
        message: 'No se pudo cargar el panel IA: $error',
        onRefresh: onRefresh,
      ),
      data: (dashboard) {
        final currentInsights =
            insights ??
            _DashboardInsights.fromData(
              data: dashboard,
              horizon: dashboard.revenue?.horizonDays ?? 7,
              alertDays: 14,
            );

        return RefreshIndicator(
          color: AppColors.gold,
          onRefresh: onRefresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
            children: [
              if (dashboard.warnings.isNotEmpty)
                _WarningBanner(warnings: dashboard.warnings),
              if (dashboard.warnings.isNotEmpty) const SizedBox(height: 16),
              _IreHeroCard(
                ire: dashboard.ire,
                insights: currentInsights,
                history: ireHistoryAsync.valueOrNull ?? const [],
              ),
              const SizedBox(height: 16),
              _ProjectedIreCard(
                current: dashboard.ire,
                projected: dashboard.ireProjected,
                horizon: currentInsights.horizon,
              ),
              const SizedBox(height: 16),
              _ExecutiveSummaryGrid(insights: currentInsights),
              const SizedBox(height: 16),
              _ReadingCards(insights: currentInsights),
              const SizedBox(height: 16),
              if (currentInsights.riskAlerts.isEmpty)
                const _DarkInfoCard(
                  title: 'Sin alertas fuertes',
                  body:
                      'No hay productos con quiebre cercano para el umbral seleccionado.',
                )
              else
                _RiskAlertsCard(
                  title:
                      'Productos con seguimiento prioritario (${currentInsights.riskAlerts.length})',
                  products: currentInsights.riskAlerts,
                ),
            ],
          ),
        );
      },
    );
  }
}

class _SalesInventoryTab extends StatelessWidget {
  const _SalesInventoryTab({
    required this.combinedAsync,
    required this.weeklyAsync,
    required this.insights,
    required this.search,
    required this.horizon,
    required this.alertDays,
    required this.onSearchChanged,
    required this.onRefresh,
  });

  final AsyncValue<_AiCombinedResponse> combinedAsync;
  final AsyncValue<List<_WeeklySalesPoint>> weeklyAsync;
  final _DashboardInsights? insights;
  final String search;
  final int horizon;
  final int alertDays;
  final ValueChanged<String> onSearchChanged;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return combinedAsync.when(
      loading: () => _LoadingList(onRefresh: onRefresh),
      error: (error, _) => _TabErrorView(
        message: 'No se pudo cargar ventas e inventario: $error',
        onRefresh: onRefresh,
      ),
      data: (dashboard) {
        final currentInsights =
            insights ??
            _DashboardInsights.fromData(
              data: dashboard,
              horizon: horizon,
              alertDays: alertDays,
            );
        final filtered = currentInsights.predictions.where((product) {
          if (search.trim().isEmpty) return true;
          final haystack = [
            product.code,
            product.name,
            product.category,
          ].join(' ').toLowerCase();
          return haystack.contains(search.trim().toLowerCase());
        }).toList()..sort((a, b) => a.riskSort.compareTo(b.riskSort));

        return RefreshIndicator(
          color: AppColors.gold,
          onRefresh: onRefresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
            children: [
              Row(
                children: [
                  Expanded(
                    child: _PanelCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const _SectionKicker('Ventas semanales'),
                          const SizedBox(height: 8),
                          const Text(
                            'Como se esta moviendo la venta',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 14),
                          weeklyAsync.when(
                            loading: () => const _InlineLoadingCard(
                              message: 'Cargando historial de ventas...',
                            ),
                            error: (error, _) =>
                                _InlineMessageCard(message: '$error'),
                            data: (chart) => _WeeklyBars(points: chart),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionKicker('Lectura operativa'),
                    const SizedBox(height: 8),
                    const Text(
                      'Distribucion del inventario analizado',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ...currentInsights.inventoryDistribution.map(
                      (item) => _DistributionRow(item: item),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Esta lectura ayuda a gerencia y operaciones a ver cuanta presion real existe antes de revisar producto por producto.',
                      style: TextStyle(
                        color: _panelTextSoft,
                        fontSize: 13,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionKicker('Estado del inventario'),
                    const SizedBox(height: 8),
                    Text(
                      'Proyeccion a $horizon dias y umbral de alerta en $alertDays dias',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      onChanged: onSearchChanged,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Buscar por codigo o nombre...',
                        hintStyle: const TextStyle(color: _panelTextMuted),
                        filled: true,
                        fillColor: _panelCardSoft,
                        prefixIcon: const Icon(
                          Icons.search_rounded,
                          color: _panelTextMuted,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: _panelStroke),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: AppColors.gold),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (filtered.isEmpty)
                      const _InlineMessageCard(
                        message:
                            'No hay productos que coincidan con la busqueda.',
                      )
                    else
                      ...filtered.map(
                        (product) => _InventoryTile(product: product),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _FinanceTab extends StatelessWidget {
  const _FinanceTab({
    required this.combinedAsync,
    required this.insights,
    required this.onRefresh,
  });

  final AsyncValue<_AiCombinedResponse> combinedAsync;
  final _DashboardInsights? insights;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return combinedAsync.when(
      loading: () => _LoadingList(onRefresh: onRefresh),
      error: (error, _) => _TabErrorView(
        message: 'No se pudo cargar finanzas: $error',
        onRefresh: onRefresh,
      ),
      data: (dashboard) {
        final currentInsights =
            insights ??
            _DashboardInsights.fromData(
              data: dashboard,
              horizon: dashboard.revenue?.horizonDays ?? 7,
              alertDays: 14,
            );
        final summary = dashboard.revenue?.summary;

        return RefreshIndicator(
          color: AppColors.gold,
          onRefresh: onRefresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
            children: [
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionKicker('Planificacion financiera'),
                    const SizedBox(height: 8),
                    const Text(
                      'Prediccion de ingresos futuros',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (summary == null)
                      const _InlineMessageCard(
                        message:
                            'La proyeccion financiera no esta disponible para este horizonte.',
                      )
                    else ...[
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _FinanceKpiCard(
                            title: 'Proxima semana',
                            value: _formatCurrency(summary.next7Days),
                            subtitle: 'ingreso estimado en 7 dias',
                            icon: Icons.calendar_view_week_rounded,
                          ),
                          _FinanceKpiCard(
                            title: 'Horizonte actual',
                            value: _formatCurrency(summary.nextHorizon),
                            subtitle:
                                'ingreso estimado en ${dashboard.revenue?.horizonDays ?? currentInsights.horizon} dias',
                            icon: Icons.timeline_rounded,
                          ),
                          _FinanceKpiCard(
                            title: 'Vs. ultimo horizonte',
                            value: _formatPercent(summary.horizonGrowthPct),
                            subtitle: _trendLabel(summary.trend),
                            icon: Icons.trending_up_rounded,
                            positive: summary.horizonGrowthPct >= 0,
                          ),
                          _FinanceKpiCard(
                            title: 'Confianza',
                            value: '${summary.confidence.round()}%',
                            subtitle: _confidenceLabel(summary.confidence),
                            icon: Icons.psychology_alt_outlined,
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      _RevenueChartCard(forecast: dashboard.revenue!),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _DarkMetricTile(
                              label: 'Promedio diario historico',
                              value: _formatCurrency(
                                summary.averageHistoricalDaily,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _DarkMetricTile(
                              label: 'Promedio diario proyectado',
                              value: _formatCurrency(
                                summary.averageProjectedDaily,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _DarkMetricTile(
                              label: 'Ultimo horizonte',
                              value: _formatCurrency(summary.lastHorizon),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _DarkMetricTile(
                              label: 'Venta web + tienda',
                              value: _formatCurrency(
                                summary.totalStoreHistory +
                                    summary.totalWebHistory,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionKicker('Diagnostico financiero'),
                    const SizedBox(height: 8),
                    const Text(
                      'Riesgo financiero',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: _DarkMetricTile(
                            label: 'Capital inmovilizado',
                            value: _formatCurrency(
                              currentInsights.immobilizedCapital,
                            ),
                            tone: AppColors.warning,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _DarkMetricTile(
                            label: 'Ingresos en riesgo',
                            value: _formatCurrency(
                              currentInsights.revenueAtRisk,
                            ),
                            tone: currentInsights.revenueAtRisk > 0
                                ? AppColors.error
                                : AppColors.success,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _DarkMetricTile(
                      label: 'Lectura financiera',
                      value: currentInsights.financialRead,
                    ),
                    const SizedBox(height: 12),
                    _DarkMetricTile(
                      label: 'Recomendacion',
                      value: currentInsights.recommendation,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _RankingTab extends StatelessWidget {
  const _RankingTab({
    required this.combinedAsync,
    required this.insights,
    required this.rankingWindow,
    required this.onWindowChanged,
    required this.onRefresh,
  });

  final AsyncValue<_AiCombinedResponse> combinedAsync;
  final _DashboardInsights? insights;
  final int rankingWindow;
  final ValueChanged<int> onWindowChanged;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return combinedAsync.when(
      loading: () => _LoadingList(onRefresh: onRefresh),
      error: (error, _) => _TabErrorView(
        message: 'No se pudo cargar ranking: $error',
        onRefresh: onRefresh,
      ),
      data: (dashboard) {
        final currentInsights =
            insights ??
            _DashboardInsights.fromData(
              data: dashboard,
              horizon: dashboard.revenue?.horizonDays ?? 7,
              alertDays: 14,
            );
        final topProducts = currentInsights.topProducts(rankingWindow);
        final lowRotation = currentInsights.lowRotationProducts(rankingWindow);

        return RefreshIndicator(
          color: AppColors.gold,
          onRefresh: onRefresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
            children: [
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionKicker('Periodo'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: _rankingOptions
                          .map(
                            (option) => _ChoicePill(
                              label: option == 7
                                  ? 'Semana'
                                  : option == 15
                                  ? '15 dias'
                                  : 'Mes',
                              selected: rankingWindow == option,
                              onTap: () => onWindowChanged(option),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Top 3 mas vendidos - ${_windowLabel(rankingWindow)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (topProducts.isEmpty)
                      const _InlineMessageCard(
                        message:
                            'Todavia no hay datos de ventas suficientes para este periodo.',
                      )
                    else
                      ...topProducts.asMap().entries.map(
                        (entry) => _PodiumTile(
                          position: entry.key + 1,
                          product: entry.value,
                          window: rankingWindow,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Productos de baja rotacion - ${_windowLabel(rankingWindow)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Productos con stock disponible y pocas o ninguna venta en el periodo.',
                      style: TextStyle(
                        color: _panelTextSoft,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (lowRotation.isEmpty)
                      const _InlineMessageCard(
                        message:
                            'No se detectan productos de baja rotacion para este corte.',
                      )
                    else
                      ...lowRotation.asMap().entries.map(
                        (entry) => _LowRotationTile(
                          index: entry.key + 1,
                          product: entry.value,
                          window: rankingWindow,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Analisis ABC de inventario',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: _AbcCard(
                            label: 'A',
                            count: currentInsights.abcA.length,
                            description:
                                'Productos estrella. Stock prioritario.',
                            tone: AppColors.success,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _AbcCard(
                            label: 'B',
                            count: currentInsights.abcB.length,
                            description: 'Importancia media.',
                            tone: AppColors.warning,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _AbcCard(
                            label: 'C',
                            count: currentInsights.abcC.length,
                            description: 'Baja contribucion.',
                            tone: AppColors.error,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ModelTab extends StatelessWidget {
  const _ModelTab({
    required this.combinedAsync,
    required this.modelMetricsAsync,
    required this.onRefresh,
  });

  final AsyncValue<_AiCombinedResponse> combinedAsync;
  final AsyncValue<_ModelMetricsStatus> modelMetricsAsync;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return combinedAsync.when(
      loading: () => _LoadingList(onRefresh: onRefresh),
      error: (error, _) => _TabErrorView(
        message: 'No se pudo cargar el modelo IA: $error',
        onRefresh: onRefresh,
      ),
      data: (dashboard) {
        final modelMeta = dashboard.modelMeta;
        return RefreshIndicator(
          color: AppColors.gold,
          onRefresh: onRefresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
            children: [
              _PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionKicker(
                      'Reproducibilidad - explicabilidad - monitoreo',
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Modelo IA - detalles tecnicos',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (modelMeta == null)
                      const _InlineMessageCard(
                        message: 'No hay metadata tecnica disponible.',
                      )
                    else ...[
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _MetaPill(
                            label: 'Tipo de modelo',
                            value: modelMeta.modelLabel,
                          ),
                          _MetaPill(
                            label: 'Muestras',
                            value: '${modelMeta.sampleCount}',
                          ),
                          _MetaPill(
                            label: 'Productos',
                            value: '${modelMeta.productCount}',
                          ),
                          _MetaPill(
                            label: 'Periodo',
                            value:
                                '${modelMeta.dateStart} -> ${modelMeta.dateEnd}',
                          ),
                          _MetaPill(
                            label: 'random_state',
                            value: '${modelMeta.randomState}',
                          ),
                          _MetaPill(
                            label: 'sklearn',
                            value: 'v${modelMeta.sklearnVersion}',
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _DarkMetricTile(
                        label: 'Data fingerprint',
                        value: modelMeta.dataHash,
                      ),
                      const SizedBox(height: 12),
                      _DarkMetricTile(
                        label: 'Variables de entrada',
                        value: modelMeta.featureColumns.isEmpty
                            ? 'Sin variables reportadas'
                            : modelMeta.featureColumns.join(', '),
                      ),
                      const SizedBox(height: 12),
                      if (modelMeta.featureImportances.isEmpty)
                        const _InlineMessageCard(
                          message:
                              'El modelo no reporta feature importance para este estado.',
                        )
                      else
                        ...modelMeta.featureImportances
                            .take(8)
                            .map(
                              (item) => _ImportanceRow(
                                label: item.label,
                                value: item.importance,
                              ),
                            ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _PanelCard(
                child: modelMetricsAsync.when(
                  loading: () => const _InlineLoadingCard(
                    message: 'Consultando metricas del modelo...',
                  ),
                  error: (error, _) =>
                      _InlineMessageCard(message: 'Error: $error'),
                  data: (metrics) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Estado de evaluacion',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: _DarkMetricTile(
                              label: 'Estado',
                              value: metrics.statusLabel,
                              tone: metrics.status == 'pendiente'
                                  ? AppColors.warning
                                  : AppColors.success,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _DarkMetricTile(
                              label: 'Evaluaciones',
                              value: '${metrics.evaluations}',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _DarkMetricTile(
                        label: 'Predicciones en cola',
                        value: '${metrics.pendingPredictions}',
                      ),
                      const SizedBox(height: 12),
                      _DarkMetricTile(label: 'Mensaje', value: metrics.message),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _AssistantTab extends StatelessWidget {
  const _AssistantTab({
    required this.combinedAsync,
    required this.insights,
    required this.messages,
    required this.loading,
    required this.controller,
    required this.onRefresh,
    required this.onSend,
    required this.onQuickQuestion,
    required this.horizon,
  });

  final AsyncValue<_AiCombinedResponse> combinedAsync;
  final _DashboardInsights? insights;
  final List<_ChatMessage> messages;
  final bool loading;
  final TextEditingController controller;
  final Future<void> Function() onRefresh;
  final VoidCallback onSend;
  final ValueChanged<String> onQuickQuestion;
  final int horizon;

  @override
  Widget build(BuildContext context) {
    return combinedAsync.when(
      loading: () => _LoadingList(onRefresh: onRefresh),
      error: (error, _) => _TabErrorView(
        message: 'No se pudo cargar el asistente: $error',
        onRefresh: onRefresh,
      ),
      data: (_) {
        final currentInsights = insights;
        final quickActions = [
          'Dame un resumen ejecutivo para gerencia.',
          'Que productos debo reponer primero?',
          'Como vienen los ingresos del horizonte actual?',
          'Cual es el producto motor del negocio?',
        ];

        return Column(
          children: [
            Expanded(
              child: RefreshIndicator(
                color: AppColors.gold,
                onRefresh: onRefresh,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
                  children: [
                    _PanelCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const _SectionKicker('Asistente inteligente'),
                          const SizedBox(height: 8),
                          const Text(
                            'Consulta el panel como si hablaras con gerencia, operaciones o contabilidad.',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _MiniStatPill(
                                label: 'Horizonte activo',
                                value: '$horizon dias',
                              ),
                              if (currentInsights != null)
                                _MiniStatPill(
                                  label: 'Alertas',
                                  value: '${currentInsights.atRiskCount}',
                                ),
                              if (currentInsights != null)
                                _MiniStatPill(
                                  label: 'Con historial',
                                  value: '${currentInsights.withHistoryCount}',
                                ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: quickActions
                                .map(
                                  (prompt) => _QuickPromptChip(
                                    label: prompt,
                                    onTap: () => onQuickQuestion(prompt),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (messages.isEmpty && !loading)
                      const _PanelCard(
                        child: _InlineMessageCard(
                          message:
                              'Todo listo para consultar. Puedes pedir una lectura ejecutiva, una explicacion de ingresos o prioridades de reposicion.',
                        ),
                      )
                    else
                      ...messages.map(
                        (message) => _ChatBubble(message: message),
                      ),
                    if (loading)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: _PanelCard(
                          child: _InlineLoadingCard(
                            message: 'Generando lectura del panel...',
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Container(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 12,
                bottom: MediaQuery.of(context).padding.bottom + 12,
              ),
              decoration: BoxDecoration(
                color: _panelCardSoft,
                border: Border(
                  top: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: controller,
                      style: const TextStyle(color: Colors.white),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => onSend(),
                      decoration: InputDecoration(
                        hintText: 'Escribe tu pregunta...',
                        hintStyle: const TextStyle(color: _panelTextMuted),
                        filled: true,
                        fillColor: _panelCard,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(18),
                          borderSide: const BorderSide(color: _panelStroke),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(18),
                          borderSide: const BorderSide(color: _panelStroke),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(18),
                          borderSide: const BorderSide(color: AppColors.gold),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  InkWell(
                    onTap: loading ? null : onSend,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: loading ? Colors.white12 : AppColors.gold,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        Icons.send_rounded,
                        color: loading ? _panelTextMuted : AppColors.black,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _LoadingList extends StatelessWidget {
  const _LoadingList({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.gold,
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: const [
          _PanelCard(
            child: SizedBox(
              height: 160,
              child: Center(
                child: CircularProgressIndicator(color: AppColors.gold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabErrorView extends StatelessWidget {
  const _TabErrorView({required this.message, required this.onRefresh});

  final String message;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _PanelCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.error_outline, color: AppColors.error),
              const SizedBox(height: 12),
              Text(
                message,
                style: const TextStyle(color: Colors.white, fontSize: 14),
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: onRefresh,
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PanelCard extends StatelessWidget {
  const _PanelCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: _panelCard,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: _panelStroke.withValues(alpha: 0.70)),
      ),
      padding: const EdgeInsets.all(18),
      child: child,
    );
  }
}

class _SectionKicker extends StatelessWidget {
  const _SectionKicker(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: const TextStyle(
        color: _panelTextMuted,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.7,
      ),
    );
  }
}

class _WarningBanner extends StatelessWidget {
  const _WarningBanner({required this.warnings});

  final List<String> warnings;

  @override
  Widget build(BuildContext context) {
    return _PanelCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppColors.warning),
              SizedBox(width: 8),
              Text(
                'Advertencias del servicio IA',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...warnings.map(
            (warning) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                '- $warning',
                style: const TextStyle(
                  color: _panelTextSoft,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _IreHeroCard extends StatelessWidget {
  const _IreHeroCard({
    required this.ire,
    required this.insights,
    required this.history,
  });

  final _IreData? ire;
  final _DashboardInsights insights;
  final List<_IreHistoryPoint> history;

  @override
  Widget build(BuildContext context) {
    if (ire == null) {
      return const _PanelCard(
        child: _InlineMessageCard(
          message: 'No se pudo calcular el IRE actual.',
        ),
      );
    }

    return _PanelCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionKicker('Indice de riesgo empresarial'),
                    const SizedBox(height: 12),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.end,
                      spacing: 10,
                      children: [
                        Text(
                          '${ire!.score.round()}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 54,
                            fontWeight: FontWeight.w900,
                            height: 0.9,
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.only(bottom: 6),
                          child: Text(
                            '/100',
                            style: TextStyle(
                              color: _panelTextSoft,
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: _riskColor(
                              ire!.level,
                            ).withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            _riskLabel(ire!.level),
                            style: TextStyle(
                              color: _riskColor(ire!.level),
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      ire!.description,
                      style: const TextStyle(
                        color: _panelTextSoft,
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...ire!.dimensions.entries.map((entry) {
            final weight = ire!.weights[entry.key] ?? 0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _DimensionRow(
                label:
                    '${_dimensionLabel(entry.key)} ${(weight * 100).round()}%',
                value: entry.value,
              ),
            );
          }),
          if (history.length >= 2) ...[
            const SizedBox(height: 6),
            SizedBox(
              height: 96,
              child: _MiniLineChart(
                values: history.map((item) => item.score).toList(),
                color: AppColors.gold,
                trailingLabel: 'Ultimos ${history.length} dias',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ProjectedIreCard extends StatelessWidget {
  const _ProjectedIreCard({
    required this.current,
    required this.projected,
    required this.horizon,
  });

  final _IreData? current;
  final _IreData? projected;
  final int horizon;

  @override
  Widget build(BuildContext context) {
    if (current == null || projected == null) {
      return const _PanelCard(
        child: _InlineMessageCard(
          message: 'No hay IRE proyectado disponible para este horizonte.',
        ),
      );
    }

    final delta = projected!.score - current!.score;
    final deltaText = delta == 0
        ? 'sin cambio'
        : '${delta > 0 ? 'sube' : 'baja'} ${delta.abs().round()} pts';

    return _PanelCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'IRE proyectado a $horizon dias',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                '${projected!.score.round()}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 42,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                '/100',
                style: TextStyle(color: _panelTextSoft, fontSize: 18),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: _riskColor(projected!.level).withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _riskLabel(projected!.level),
                  style: TextStyle(
                    color: _riskColor(projected!.level),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                deltaText,
                style: TextStyle(
                  color: delta > 0
                      ? AppColors.error
                      : delta < 0
                      ? AppColors.success
                      : _panelTextSoft,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            projected!.description,
            style: const TextStyle(
              color: _panelTextSoft,
              fontSize: 14,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExecutiveSummaryGrid extends StatelessWidget {
  const _ExecutiveSummaryGrid({required this.insights});

  final _DashboardInsights insights;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _PanelCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SectionKicker('Resumen ejecutivo'),
              const SizedBox(height: 10),
              Text(
                insights.headline,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                insights.detail,
                style: const TextStyle(
                  color: _panelTextSoft,
                  fontSize: 14,
                  height: 1.55,
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MiniStatPill(
                    label: 'Horizonte',
                    value: '${insights.horizon} dias',
                  ),
                  _MiniStatPill(
                    label: 'Con historial',
                    value: '${insights.withHistoryCount}',
                  ),
                  _MiniStatPill(
                    label: 'Sin historial',
                    value: '${insights.withoutHistoryCount}',
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _SummaryMetricCard(
                title: 'Ingreso esperado',
                value: _formatCurrency(insights.projectedRevenue),
                body: insights.financialRead,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _SummaryMetricCard(
                title: 'Foco de inventario',
                value: '${insights.atRiskCount} en riesgo',
                body: insights.inventoryRead,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _SummaryMetricCard(
          title: 'Producto motor',
          value: insights.productMotor?.primaryLabel ?? 'Sin definir',
          body: insights.portfolioRead,
        ),
      ],
    );
  }
}

class _ReadingCards extends StatelessWidget {
  const _ReadingCards({required this.insights});

  final _DashboardInsights insights;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _DarkMetricTile(
            label: 'Inventario',
            value: insights.inventoryRead,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _DarkMetricTile(
            label: 'Recomendacion',
            value: insights.recommendation,
          ),
        ),
      ],
    );
  }
}

class _RiskAlertsCard extends StatelessWidget {
  const _RiskAlertsCard({required this.title, required this.products});

  final String title;
  final List<_PredictionItem> products;

  @override
  Widget build(BuildContext context) {
    return _PanelCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          ...products.map((product) => _InventoryTile(product: product)),
        ],
      ),
    );
  }
}

class _SummaryMetricCard extends StatelessWidget {
  const _SummaryMetricCard({
    required this.title,
    required this.value,
    required this.body,
  });

  final String title;
  final String value;
  final String body;

  @override
  Widget build(BuildContext context) {
    return _PanelCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: _panelTextMuted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            body,
            style: const TextStyle(
              color: _panelTextSoft,
              fontSize: 13,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _DistributionRow extends StatelessWidget {
  const _DistributionRow({required this.item});

  final _DistributionItem item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          SizedBox(
            width: 110,
            child: Text(
              item.label,
              style: const TextStyle(color: _panelTextSoft, fontSize: 13),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: item.ratio,
                minHeight: 10,
                backgroundColor: Colors.white10,
                valueColor: AlwaysStoppedAnimation(item.color),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            '${item.count}',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _InventoryTile extends StatelessWidget {
  const _InventoryTile({required this.product});

  final _PredictionItem product;

  @override
  Widget build(BuildContext context) {
    final tone = _riskColor(product.displayRiskLevel);
    final stockBadgeColor = product.stock == 0
        ? AppColors.error
        : product.stockAlert
        ? AppColors.warning
        : AppColors.success;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _panelCardSoft,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 54,
              height: 54,
              child: product.imageUrl.isEmpty
                  ? Container(
                      color: Colors.white10,
                      child: const Icon(
                        Icons.inventory_2_outlined,
                        color: Colors.white54,
                      ),
                    )
                  : Image.network(
                      product.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: Colors.white10,
                        child: const Icon(
                          Icons.inventory_2_outlined,
                          color: Colors.white54,
                        ),
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (product.code.isNotEmpty)
                  Text(
                    product.code,
                    style: const TextStyle(
                      color: _panelTextMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                Text(
                  product.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  product.category,
                  style: const TextStyle(color: _panelTextSoft, fontSize: 12),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 10,
                  runSpacing: 6,
                  children: [
                    _InlineTag(
                      label: 'Stock ${product.stock}',
                      color: stockBadgeColor,
                    ),
                    _InlineTag(label: product.coverageLabel, color: tone),
                    _InlineTag(
                      label: '${product.confidence.round()}% conf.',
                      color: Colors.white70,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: tone.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _riskLabel(product.displayRiskLevel),
                  style: TextStyle(
                    color: tone,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                product.noHistory
                    ? 'Sin historial'
                    : '${_formatUnits(product.predictionWeekly)} u/sem',
                style: const TextStyle(color: _panelTextSoft, fontSize: 12),
              ),
              const SizedBox(height: 4),
              Text(
                _trendLabel(product.trend),
                style: TextStyle(
                  color: _trendColor(product.trend),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FinanceKpiCard extends StatelessWidget {
  const _FinanceKpiCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    this.positive = true,
  });

  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final bool positive;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 170,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _panelCardSoft,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: positive ? AppColors.gold : AppColors.error,
            size: 18,
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(color: _panelTextMuted, fontSize: 12),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(
              color: _panelTextSoft,
              fontSize: 12,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _RevenueChartCard extends StatelessWidget {
  const _RevenueChartCard({required this.forecast});

  final _RevenueForecast forecast;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _panelCardSoft,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Historico y proyeccion de ingresos',
            style: TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: _RevenueTrendChart(
              history: forecast.history,
              forecast: forecast.forecast,
            ),
          ),
        ],
      ),
    );
  }
}

class _PodiumTile extends StatelessWidget {
  const _PodiumTile({
    required this.position,
    required this.product,
    required this.window,
  });

  final int position;
  final _PredictionItem product;
  final int window;

  @override
  Widget build(BuildContext context) {
    final medals = ['🥇', '🥈', '🥉'];
    final sales = product.salesForWindow(window);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _panelCardSoft,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          Text(medals[position - 1], style: const TextStyle(fontSize: 24)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  product.category,
                  style: const TextStyle(color: _panelTextSoft, fontSize: 12),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${_formatUnits(sales)} uds',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _formatCurrency(sales * product.price),
                style: const TextStyle(color: _panelTextSoft, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LowRotationTile extends StatelessWidget {
  const _LowRotationTile({
    required this.index,
    required this.product,
    required this.window,
  });

  final int index;
  final _PredictionItem product;
  final int window;

  @override
  Widget build(BuildContext context) {
    final recommendation = _buildLowRotationRecommendation(product, window);
    final sales = product.salesForWindow(window);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _panelCardSoft,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: recommendation.color.withValues(alpha: 0.30)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '#$index',
                style: TextStyle(
                  color: recommendation.color,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  product.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
              Text(
                'Vendio ${_formatUnits(sales)}',
                style: const TextStyle(color: _panelTextSoft, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Stock ${product.stock} uds · ${product.coverageLabel}',
            style: const TextStyle(color: _panelTextSoft, fontSize: 12),
          ),
          const SizedBox(height: 10),
          Text(
            recommendation.text,
            style: TextStyle(
              color: recommendation.color,
              fontSize: 13,
              height: 1.4,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _AbcCard extends StatelessWidget {
  const _AbcCard({
    required this.label,
    required this.count,
    required this.description,
    required this.tone,
  });

  final String label;
  final int count;
  final String description;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _panelCardSoft,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: tone.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: tone,
              fontSize: 28,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$count productos',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: const TextStyle(
              color: _panelTextSoft,
              fontSize: 12,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _panelCardSoft,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(color: _panelTextMuted, fontSize: 11),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _ImportanceRow extends StatelessWidget {
  const _ImportanceRow({required this.label, required this.value});

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: _panelTextSoft, fontSize: 13),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: value.clamp(0, 1),
                minHeight: 8,
                backgroundColor: Colors.white10,
                valueColor: const AlwaysStoppedAnimation(AppColors.gold),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            '${(value * 100).toStringAsFixed(1)}%',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickPromptChip extends StatelessWidget {
  const _QuickPromptChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.gold.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.30)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: AppColors.goldLight,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message});

  final _ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Align(
        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.82,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isUser ? AppColors.gold : _panelCard,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isUser
                  ? AppColors.gold
                  : Colors.white.withValues(alpha: 0.08),
            ),
          ),
          child: Text(
            message.text,
            style: TextStyle(
              color: isUser ? AppColors.black : Colors.white,
              fontSize: 13,
              height: 1.45,
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniStatPill extends StatelessWidget {
  const _MiniStatPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _DarkMetricTile extends StatelessWidget {
  const _DarkMetricTile({
    required this.label,
    required this.value,
    this.tone = Colors.white,
  });

  final String label;
  final String value;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _panelCardSoft,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: _panelTextMuted, fontSize: 12),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: tone,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineMessageCard extends StatelessWidget {
  const _InlineMessageCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Text(
      message,
      style: const TextStyle(color: _panelTextSoft, fontSize: 13, height: 1.45),
    );
  }
}

class _InlineLoadingCard extends StatelessWidget {
  const _InlineLoadingCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.gold,
          ),
        ),
        const SizedBox(width: 12),
        Text(
          message,
          style: const TextStyle(color: _panelTextSoft, fontSize: 13),
        ),
      ],
    );
  }
}

class _DarkInfoCard extends StatelessWidget {
  const _DarkInfoCard({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return _PanelCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            body,
            style: const TextStyle(
              color: _panelTextSoft,
              fontSize: 13,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineTag extends StatelessWidget {
  const _InlineTag({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _WeeklyBars extends StatelessWidget {
  const _WeeklyBars({required this.points});

  final List<_WeeklySalesPoint> points;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const _InlineMessageCard(
        message: 'No hay datos de ventas semanales disponibles.',
      );
    }

    final maxValue = points.fold<double>(
      0,
      (current, item) => math.max(current, item.units),
    );

    return SizedBox(
      height: 160,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: points.map((point) {
          final height = maxValue <= 0 ? 0.08 : point.units / maxValue;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    _formatUnits(point.units),
                    style: const TextStyle(
                      color: _panelTextMuted,
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: Container(
                        height: (100 * height).clamp(10, 100).toDouble(),
                        decoration: BoxDecoration(
                          color: AppColors.gold,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    point.weekLabel,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: _panelTextSoft, fontSize: 10),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _MiniLineChart extends StatelessWidget {
  const _MiniLineChart({
    required this.values,
    required this.color,
    required this.trailingLabel,
  });

  final List<double> values;
  final Color color;
  final String trailingLabel;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _LineChartPainter(values: values, color: color),
      child: Align(
        alignment: Alignment.bottomRight,
        child: Padding(
          padding: const EdgeInsets.only(right: 8, bottom: 4),
          child: Text(
            trailingLabel,
            style: const TextStyle(color: _panelTextMuted, fontSize: 11),
          ),
        ),
      ),
    );
  }
}

class _RevenueTrendChart extends StatelessWidget {
  const _RevenueTrendChart({required this.history, required this.forecast});

  final List<_RevenuePoint> history;
  final List<_RevenuePoint> forecast;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DualLineChartPainter(history: history, forecast: forecast),
      child: const SizedBox.expand(),
    );
  }
}

class _LineChartPainter extends CustomPainter {
  _LineChartPainter({required this.values, required this.color});

  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.2
      ..style = PaintingStyle.stroke;
    final grid = Paint()
      ..color = Colors.white.withValues(alpha: 0.08)
      ..strokeWidth = 1;

    for (var i = 1; i <= 3; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    if (values.length < 2) return;

    final minValue = values.reduce(math.min);
    final maxValue = values.reduce(math.max);
    final range = (maxValue - minValue).abs() < 0.001
        ? 1.0
        : maxValue - minValue;
    final path = Path();

    for (var i = 0; i < values.length; i++) {
      final x = size.width * i / (values.length - 1);
      final y =
          size.height -
          ((values[i] - minValue) / range) * (size.height - 12) -
          6;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _LineChartPainter oldDelegate) {
    return oldDelegate.values != values || oldDelegate.color != color;
  }
}

class _DualLineChartPainter extends CustomPainter {
  _DualLineChartPainter({required this.history, required this.forecast});

  final List<_RevenuePoint> history;
  final List<_RevenuePoint> forecast;

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = Colors.white.withValues(alpha: 0.08)
      ..strokeWidth = 1;

    for (var i = 1; i <= 4; i++) {
      final y = size.height * i / 5;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final all = [...history, ...forecast];
    if (all.length < 2) return;

    final values = all.map((point) => point.income).toList();
    final minValue = values.reduce(math.min);
    final maxValue = values.reduce(math.max);
    final range = (maxValue - minValue).abs() < 0.001
        ? 1.0
        : maxValue - minValue;

    Path buildPath(List<_RevenuePoint> source, int offset, int totalCount) {
      final path = Path();
      for (var i = 0; i < source.length; i++) {
        final overallIndex = offset + i;
        final x = size.width * overallIndex / (totalCount - 1);
        final y =
            size.height -
            ((source[i].income - minValue) / range) * (size.height - 18) -
            9;
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      return path;
    }

    final historyPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2.2
      ..style = PaintingStyle.stroke;

    final forecastPaint = Paint()
      ..color = AppColors.gold
      ..strokeWidth = 2.4
      ..style = PaintingStyle.stroke;

    if (history.length >= 2) {
      canvas.drawPath(buildPath(history, 0, all.length), historyPaint);
    }
    if (forecast.isNotEmpty) {
      final startOffset = math.max(history.length - 1, 0);
      final merged = history.isEmpty ? forecast : [history.last, ...forecast];
      canvas.drawPath(
        buildPath(merged, startOffset, all.length),
        forecastPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _DualLineChartPainter oldDelegate) {
    return oldDelegate.history != history || oldDelegate.forecast != forecast;
  }
}

class _DimensionRow extends StatelessWidget {
  const _DimensionRow({required this.label, required this.value});

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    final color = value >= 75
        ? AppColors.error
        : value >= 50
        ? AppColors.warning
        : value >= 25
        ? AppColors.gold
        : AppColors.success;

    return Row(
      children: [
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: const TextStyle(color: _panelTextSoft, fontSize: 12),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: (value / 100).clamp(0, 1),
              minHeight: 10,
              backgroundColor: Colors.white10,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          value.toStringAsFixed(0),
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _DistributionItem {
  const _DistributionItem({
    required this.label,
    required this.count,
    required this.ratio,
    required this.color,
  });

  final String label;
  final int count;
  final double ratio;
  final Color color;
}

class _ChatMessage {
  const _ChatMessage({required this.role, required this.text});

  final String role;
  final String text;
}

class _LowRotationRecommendation {
  const _LowRotationRecommendation({required this.text, required this.color});

  final String text;
  final Color color;
}

class _DashboardInsights {
  _DashboardInsights({
    required this.horizon,
    required this.predictions,
    required this.withHistoryCount,
    required this.withoutHistoryCount,
    required this.atRiskCount,
    required this.outOfStockCount,
    required this.highDemandCount,
    required this.productMotor,
    required this.riskAlerts,
    required this.inventoryDistribution,
    required this.abcA,
    required this.abcB,
    required this.abcC,
    required this.projectedRevenue,
    required this.headline,
    required this.detail,
    required this.financialRead,
    required this.inventoryRead,
    required this.portfolioRead,
    required this.recommendation,
    required this.immobilizedCapital,
    required this.revenueAtRisk,
  });

  final int horizon;
  final List<_PredictionItem> predictions;
  final int withHistoryCount;
  final int withoutHistoryCount;
  final int atRiskCount;
  final int outOfStockCount;
  final int highDemandCount;
  final _PredictionItem? productMotor;
  final List<_PredictionItem> riskAlerts;
  final List<_DistributionItem> inventoryDistribution;
  final List<_PredictionItem> abcA;
  final List<_PredictionItem> abcB;
  final List<_PredictionItem> abcC;
  final double projectedRevenue;
  final String headline;
  final String detail;
  final String financialRead;
  final String inventoryRead;
  final String portfolioRead;
  final String recommendation;
  final double immobilizedCapital;
  final double revenueAtRisk;

  factory _DashboardInsights.fromData({
    required _AiCombinedResponse data,
    required int horizon,
    required int alertDays,
  }) {
    final predictions = data.predictions
        .map(
          (item) => item.copyWith(
            stockAlert:
                !item.noHistory &&
                (item.stock == 0 || item.daysUntilStockout <= alertDays),
          ),
        )
        .toList();

    final withHistory = predictions.where((item) => !item.noHistory).toList();
    final withoutHistory = predictions.where((item) => item.noHistory).toList();
    final atRisk = withHistory.where((item) => item.stockAlert).toList()
      ..sort((a, b) => a.daysUntilStockout.compareTo(b.daysUntilStockout));
    final outOfStock = withHistory.where((item) => item.stock == 0).toList();
    final highDemand = withHistory.where((item) => item.highDemand).toList();
    final productMotor = [...withHistory]
      ..sort(
        (a, b) =>
            b.dailyEstimatedConsumption.compareTo(a.dailyEstimatedConsumption),
      );

    final productMotorItem = productMotor.isEmpty ? null : productMotor.first;
    final summary = data.revenue?.summary;
    final growth = summary?.horizonGrowthPct ?? 0;
    final projectedRevenue = summary?.nextHorizon ?? 0;
    final inventoryHeavy = withHistory.any(
      (item) => item.daysUntilStockout >= 60 && item.stock > 5,
    );
    final weakBusiness = projectedRevenue <= 0 && withHistory.isEmpty;

    final headline = weakBusiness
        ? 'El negocio necesita una lectura mas clara antes de tomar decisiones.'
        : growth >= 8 && atRisk.isEmpty && !inventoryHeavy
        ? 'El negocio muestra una senal saludable para el horizonte actual.'
        : growth >= 0 && atRisk.isNotEmpty
        ? 'Hay crecimiento, pero el inventario necesita una reaccion preventiva.'
        : growth < 0 && atRisk.isEmpty
        ? 'El reto principal esta en recuperar ritmo comercial.'
        : growth < 0 && atRisk.isNotEmpty
        ? 'El negocio combina presion comercial con riesgo operativo.'
        : atRisk.isNotEmpty
        ? 'Existen senales de riesgo que requieren monitoreo activo.'
        : 'La lectura actual sigue siendo estable pero requiere seguimiento.';

    final detail = summary == null
        ? 'Todavia no hay suficiente informacion financiera para una lectura completa. El panel sigue monitoreando stock, demanda y comportamiento del modelo.'
        : 'Para los proximos $horizon dias se estiman ${_formatCurrency(projectedRevenue)} con una tendencia ${_trendLabel(summary.trend).toLowerCase()} y una confianza ${_confidenceLabel(summary.confidence).toLowerCase()}.';

    final financialRead = summary == null
        ? 'Aun no hay proyeccion financiera consolidada.'
        : growth >= 0
        ? 'Si el ritmo actual se mantiene, el negocio podria cerrar el horizonte con ${_formatCurrency(projectedRevenue)}, equivalente a ${_formatPercent(growth)} frente al tramo anterior.'
        : 'Si no se corrige el ritmo actual, el negocio podria cerrar el horizonte con ${_formatCurrency(projectedRevenue)}, es decir ${_formatPercent(growth)} frente al mismo tramo anterior.';

    final inventoryRead = atRisk.isEmpty
        ? 'No hay productos en riesgo para este horizonte. La cobertura de stock luce controlada.'
        : 'Hay ${atRisk.length} productos que necesitan seguimiento de stock para el umbral seleccionado.';

    final portfolioRead = productMotorItem == null
        ? 'Aun no hay historial suficiente para identificar productos motores del negocio.'
        : '${productMotorItem.name} lidera la rotacion actual con un consumo estimado de ${_formatUnits(productMotorItem.dailyEstimatedConsumption)} unidades por dia.';

    final recommendation = atRisk.isNotEmpty
        ? 'Prioriza reposicion de productos con cobertura corta y valida si la tendencia de demanda sigue bajando.'
        : growth < 0
        ? 'Refuerza promocion, visibilidad y precio en productos con mejor rotacion para recuperar el ritmo.'
        : 'Mantener el monitoreo semanal y proteger el stock de los productos con mejor salida.';

    final total = math.max(predictions.length, 1);
    final stableCount = predictions
        .where((item) => !item.noHistory && !item.stockAlert && item.stock > 0)
        .length;

    final inventoryDistribution = [
      _DistributionItem(
        label: 'En riesgo',
        count: atRisk.length,
        ratio: atRisk.length / total,
        color: AppColors.warning,
      ),
      _DistributionItem(
        label: 'Sin stock',
        count: outOfStock.length,
        ratio: outOfStock.length / total,
        color: AppColors.error,
      ),
      _DistributionItem(
        label: 'Estables',
        count: stableCount,
        ratio: stableCount / total,
        color: AppColors.success,
      ),
      _DistributionItem(
        label: 'Sin historial',
        count: withoutHistory.length,
        ratio: withoutHistory.length / total,
        color: AppColors.gold,
      ),
    ];

    final abc = _buildAbc(predictions);
    final immobilizedCapital = predictions
        .where((item) => !item.noHistory && item.daysUntilStockout >= 60)
        .fold<double>(0, (sum, item) => sum + item.stock * item.price);
    final revenueAtRisk = predictions
        .where((item) => item.trend == 'bajando')
        .fold<double>(
          0,
          (sum, item) =>
              sum + (item.dailyEstimatedConsumption * 30 * item.price),
        );

    return _DashboardInsights(
      horizon: horizon,
      predictions: predictions,
      withHistoryCount: withHistory.length,
      withoutHistoryCount: withoutHistory.length,
      atRiskCount: atRisk.length,
      outOfStockCount: outOfStock.length,
      highDemandCount: highDemand.length,
      productMotor: productMotorItem,
      riskAlerts: atRisk.take(6).toList(),
      inventoryDistribution: inventoryDistribution,
      abcA: abc.$1,
      abcB: abc.$2,
      abcC: abc.$3,
      projectedRevenue: projectedRevenue,
      headline: headline,
      detail: detail,
      financialRead: financialRead,
      inventoryRead: inventoryRead,
      portfolioRead: portfolioRead,
      recommendation: recommendation,
      immobilizedCapital: immobilizedCapital,
      revenueAtRisk: revenueAtRisk,
    );
  }

  List<_PredictionItem> topProducts(int window) {
    final sorted =
        predictions
            .where((item) => !item.noHistory && item.salesForWindow(window) > 0)
            .toList()
          ..sort(
            (a, b) =>
                b.salesForWindow(window).compareTo(a.salesForWindow(window)),
          );
    return sorted.take(3).toList();
  }

  List<_PredictionItem> lowRotationProducts(int window) {
    final sorted = predictions.where((item) => item.stock > 0).toList()
      ..sort(
        (a, b) => a.salesForWindow(window).compareTo(b.salesForWindow(window)),
      );
    return sorted.take(6).toList();
  }

  static (List<_PredictionItem>, List<_PredictionItem>, List<_PredictionItem>)
  _buildAbc(List<_PredictionItem> products) {
    final withHistory =
        products
            .where((item) => !item.noHistory && item.totalSoldHistorical > 0)
            .toList()
          ..sort(
            (a, b) => (b.totalSoldHistorical * b.price).compareTo(
              a.totalSoldHistorical * a.price,
            ),
          );

    final totalRevenue = withHistory.fold<double>(
      0,
      (sum, item) => sum + item.totalSoldHistorical * item.price,
    );

    double cumulative = 0;
    final a = <_PredictionItem>[];
    final b = <_PredictionItem>[];
    final c = <_PredictionItem>[];

    for (final item in withHistory) {
      cumulative += item.totalSoldHistorical * item.price;
      final pct = totalRevenue <= 0 ? 0 : cumulative / totalRevenue;
      if (pct <= 0.80) {
        a.add(item);
      } else if (pct <= 0.95) {
        b.add(item);
      } else {
        c.add(item);
      }
    }

    return (a, b, c);
  }
}

class _AiService {
  const _AiService();

  Future<_AiCombinedResponse> fetchCombined({
    required int horizon,
    required int history,
  }) async {
    final data = await _getJson(
      '/api/predict/combined',
      query: {'horizon': '$horizon', 'history': '$history'},
    );
    return _AiCombinedResponse.fromJson(data);
  }

  Future<List<_WeeklySalesPoint>> fetchWeeklyChart({required int weeks}) async {
    final data = await _getJson(
      '/api/sales/weekly-chart',
      query: {'weeks': '$weeks'},
    );
    final raw = _asList(data['chart']);
    return raw.map((item) => _WeeklySalesPoint.fromJson(_asMap(item))).toList();
  }

  Future<List<_IreHistoryPoint>> fetchIreHistory({required int days}) async {
    final data = await _getJson('/api/ire/historial', query: {'days': '$days'});
    final raw = _asList(data['historial']);
    return raw.map((item) => _IreHistoryPoint.fromJson(_asMap(item))).toList();
  }

  Future<_ModelMetricsStatus> fetchModelMetrics() async {
    final data = await _getJson('/api/model/metrics');
    return _ModelMetricsStatus.fromJson(data);
  }

  Future<Map<String, dynamic>> _getJson(
    String path, {
    Map<String, String>? query,
  }) async {
    final base = Env.aiServiceUrl.replaceAll(RegExp(r'/$'), '');
    final uri = Uri.parse('$base$path').replace(queryParameters: query);
    final token = Env.aiServiceToken.trim();
    final response = await http
        .get(
          uri,
          headers: {
            'Accept': 'application/json',
            if (token.isNotEmpty) 'Authorization': 'Bearer $token',
          },
        )
        .timeout(const Duration(seconds: 25));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('HTTP ${response.statusCode}');
    }

    final decoded = json.decode(response.body);
    if (decoded is! Map) {
      throw Exception('Respuesta invalida del servicio IA');
    }
    return _asMap(decoded);
  }
}

class _AiCombinedResponse {
  const _AiCombinedResponse({
    required this.predictions,
    required this.revenue,
    required this.ire,
    required this.ireProjected,
    required this.modelMeta,
    required this.warnings,
  });

  final List<_PredictionItem> predictions;
  final _RevenueForecast? revenue;
  final _IreData? ire;
  final _IreData? ireProjected;
  final _ModelMeta? modelMeta;
  final List<String> warnings;

  factory _AiCombinedResponse.fromJson(Map<String, dynamic> json) {
    final demand = _asMap(json['demand']);
    final rawPredictions = _asList(demand['predictions']);

    return _AiCombinedResponse(
      predictions: rawPredictions
          .map((item) => _PredictionItem.fromJson(_asMap(item)))
          .toList(),
      revenue: json['revenue'] == null
          ? null
          : _RevenueForecast.fromJson(_asMap(json['revenue'])),
      ire: json['ire'] == null ? null : _IreData.fromJson(_asMap(json['ire'])),
      ireProjected: json['ire_proyectado'] == null
          ? null
          : _IreData.fromJson(_asMap(json['ire_proyectado'])),
      modelMeta: demand['modelo_meta'] == null
          ? null
          : _ModelMeta.fromJson(_asMap(demand['modelo_meta'])),
      warnings: _asList(json['warnings']).map((item) => '$item').toList(),
    );
  }
}

class _PredictionItem {
  const _PredictionItem({
    required this.id,
    required this.imageUrl,
    required this.code,
    required this.name,
    required this.category,
    required this.price,
    required this.stock,
    required this.predictionUnits,
    required this.predictionWeekly,
    required this.totalSoldHistorical,
    required this.sales7Days,
    required this.sales15Days,
    required this.sales30Days,
    required this.dailyEstimatedConsumption,
    required this.daysUntilStockout,
    required this.stockoutDate,
    required this.trend,
    required this.confidence,
    required this.highDemand,
    required this.riskLevel,
    required this.stockAlert,
    required this.noHistory,
  });

  final String id;
  final String imageUrl;
  final String code;
  final String name;
  final String category;
  final double price;
  final int stock;
  final double predictionUnits;
  final double predictionWeekly;
  final double totalSoldHistorical;
  final double sales7Days;
  final double sales15Days;
  final double sales30Days;
  final double dailyEstimatedConsumption;
  final int daysUntilStockout;
  final String stockoutDate;
  final String trend;
  final double confidence;
  final bool highDemand;
  final String riskLevel;
  final bool stockAlert;
  final bool noHistory;

  factory _PredictionItem.fromJson(Map<String, dynamic> json) {
    return _PredictionItem(
      id: '${json['productId'] ?? ''}',
      imageUrl: '${json['imagen'] ?? ''}',
      code: '${json['codigo'] ?? ''}',
      name: '${json['nombre'] ?? ''}',
      category: '${json['categoria'] ?? ''}',
      price: _asDouble(json['precio']),
      stock: _asInt(json['stock_actual']),
      predictionUnits: _asDouble(json['prediccion_unidades']),
      predictionWeekly: _asDouble(json['prediccion_semanal']),
      totalSoldHistorical: _asDouble(json['total_vendido_historico']),
      sales7Days: _asDouble(json['ventas_7_dias']),
      sales15Days: _asDouble(json['ventas_15_dias']),
      sales30Days: _asDouble(json['ventas_30_dias']),
      dailyEstimatedConsumption: _asDouble(json['consumo_estimado_diario']),
      daysUntilStockout: _asInt(json['dias_hasta_agotarse']),
      stockoutDate: '${json['fecha_quiebre_stock'] ?? ''}',
      trend: '${json['tendencia'] ?? 'estable'}',
      confidence: _asDouble(json['confianza']),
      highDemand: json['alta_demanda'] == true,
      riskLevel: '${json['nivel_riesgo'] ?? 'estable'}',
      stockAlert: json['alerta_stock'] == true,
      noHistory: json['sin_historial'] == true,
    );
  }

  _PredictionItem copyWith({bool? stockAlert}) {
    return _PredictionItem(
      id: id,
      imageUrl: imageUrl,
      code: code,
      name: name,
      category: category,
      price: price,
      stock: stock,
      predictionUnits: predictionUnits,
      predictionWeekly: predictionWeekly,
      totalSoldHistorical: totalSoldHistorical,
      sales7Days: sales7Days,
      sales15Days: sales15Days,
      sales30Days: sales30Days,
      dailyEstimatedConsumption: dailyEstimatedConsumption,
      daysUntilStockout: daysUntilStockout,
      stockoutDate: stockoutDate,
      trend: trend,
      confidence: confidence,
      highDemand: highDemand,
      riskLevel: riskLevel,
      stockAlert: stockAlert ?? this.stockAlert,
      noHistory: noHistory,
    );
  }

  String get displayRiskLevel {
    if (noHistory) return 'sin_historial';
    if (stock == 0) return 'critico';
    if (stockAlert && riskLevel == 'estable') return 'atencion';
    return riskLevel;
  }

  int get riskSort {
    switch (displayRiskLevel) {
      case 'critico':
        return 0;
      case 'atencion':
        return 1;
      case 'vigilancia':
        return 2;
      case 'sin_historial':
        return 4;
      default:
        return 3;
    }
  }

  String get coverageLabel {
    if (noHistory) return 'sin historial';
    if (stock == 0) return 'sin stock';
    if (daysUntilStockout >= 999) return 'cobertura amplia';
    return '$daysUntilStockout dias';
  }

  String get primaryLabel => code.isNotEmpty ? code : name;

  double salesForWindow(int window) {
    switch (window) {
      case 7:
        return sales7Days;
      case 15:
        return sales15Days;
      default:
        return sales30Days;
    }
  }
}

class _RevenueForecast {
  const _RevenueForecast({
    required this.horizonDays,
    required this.historyDays,
    required this.summary,
    required this.history,
    required this.forecast,
  });

  final int horizonDays;
  final int historyDays;
  final _RevenueSummary summary;
  final List<_RevenuePoint> history;
  final List<_RevenuePoint> forecast;

  factory _RevenueForecast.fromJson(Map<String, dynamic> json) {
    return _RevenueForecast(
      horizonDays: _asInt(json['horizon_days']),
      historyDays: _asInt(json['history_days']),
      summary: _RevenueSummary.fromJson(_asMap(json['summary'])),
      history: _asList(
        json['history'],
      ).map((item) => _RevenuePoint.fromJson(_asMap(item))).toList(),
      forecast: _asList(
        json['forecast'],
      ).map((item) => _RevenuePoint.fromJson(_asMap(item))).toList(),
    );
  }
}

class _RevenueSummary {
  const _RevenueSummary({
    required this.next7Days,
    required this.next30Days,
    required this.nextHorizon,
    required this.averageHistoricalDaily,
    required this.averageProjectedDaily,
    required this.last30Days,
    required this.lastHorizon,
    required this.growthPct,
    required this.horizonGrowthPct,
    required this.trend,
    required this.confidence,
    required this.totalStoreHistory,
    required this.totalWebHistory,
  });

  final double next7Days;
  final double next30Days;
  final double nextHorizon;
  final double averageHistoricalDaily;
  final double averageProjectedDaily;
  final double last30Days;
  final double lastHorizon;
  final double growthPct;
  final double horizonGrowthPct;
  final String trend;
  final double confidence;
  final double totalStoreHistory;
  final double totalWebHistory;

  factory _RevenueSummary.fromJson(Map<String, dynamic> json) {
    return _RevenueSummary(
      next7Days: _asDouble(json['proximo_7_dias']),
      next30Days: _asDouble(json['proximo_30_dias']),
      nextHorizon: _asDouble(json['proximo_horizonte']),
      averageHistoricalDaily: _asDouble(json['promedio_diario_historico']),
      averageProjectedDaily: _asDouble(json['promedio_diario_proyectado']),
      last30Days: _asDouble(json['ultimo_30_dias']),
      lastHorizon: _asDouble(json['ultimo_horizonte']),
      growthPct: _asDouble(json['crecimiento_estimado_pct']),
      horizonGrowthPct: _asDouble(json['crecimiento_estimado_horizonte_pct']),
      trend: '${json['tendencia'] ?? 'estable'}',
      confidence: _asDouble(json['confianza']),
      totalStoreHistory: _asDouble(json['total_historico_tienda']),
      totalWebHistory: _asDouble(json['total_historico_web']),
    );
  }
}

class _RevenuePoint {
  const _RevenuePoint({required this.date, required this.income});

  final String date;
  final double income;

  factory _RevenuePoint.fromJson(Map<String, dynamic> json) {
    return _RevenuePoint(
      date: '${json['fecha'] ?? ''}',
      income: _asDouble(json['ingresos']),
    );
  }
}

class _IreData {
  const _IreData({
    required this.score,
    required this.level,
    required this.description,
    required this.dimensions,
    required this.weights,
  });

  final double score;
  final String level;
  final String description;
  final Map<String, double> dimensions;
  final Map<String, double> weights;

  factory _IreData.fromJson(Map<String, dynamic> json) {
    final dimensionsMap = _asMap(json['dimensiones']);
    final weightsMap = _asMap(json['pesos']);

    return _IreData(
      score: _asDouble(json['score']),
      level: '${json['nivel'] ?? 'moderado'}',
      description: '${json['descripcion'] ?? ''}',
      dimensions: dimensionsMap.map(
        (key, value) => MapEntry(key, _asDouble(value)),
      ),
      weights: weightsMap.map((key, value) => MapEntry(key, _asDouble(value))),
    );
  }
}

class _IreHistoryPoint {
  const _IreHistoryPoint({required this.date, required this.score});

  final String date;
  final double score;

  factory _IreHistoryPoint.fromJson(Map<String, dynamic> json) {
    return _IreHistoryPoint(
      date: '${json['fecha'] ?? ''}',
      score: _asDouble(json['score']),
    );
  }
}

class _ModelMeta {
  const _ModelMeta({
    required this.modelType,
    required this.sampleCount,
    required this.productCount,
    required this.dateStart,
    required this.dateEnd,
    required this.randomState,
    required this.sklearnVersion,
    required this.dataHash,
    required this.featureColumns,
    required this.featureImportances,
  });

  final String modelType;
  final int sampleCount;
  final int productCount;
  final String dateStart;
  final String dateEnd;
  final int randomState;
  final String sklearnVersion;
  final String dataHash;
  final List<String> featureColumns;
  final List<_FeatureImportance> featureImportances;

  String get modelLabel => modelType == 'random_forest'
      ? 'RandomForestRegressor'
      : 'Promedio movil / fallback';

  factory _ModelMeta.fromJson(Map<String, dynamic> json) {
    return _ModelMeta(
      modelType: '${json['model_type'] ?? 'desconocido'}',
      sampleCount: _asInt(json['n_samples']),
      productCount: _asInt(json['n_products']),
      dateStart: '${json['date_range_start'] ?? '-'}',
      dateEnd: '${json['date_range_end'] ?? '-'}',
      randomState: _asInt(json['random_state']),
      sklearnVersion: '${json['sklearn_version'] ?? '-'}',
      dataHash: '${json['data_hash'] ?? '-'}',
      featureColumns: _asList(
        json['feature_cols'],
      ).map((item) => '$item').toList(),
      featureImportances: _asList(
        json['feature_importances'],
      ).map((item) => _FeatureImportance.fromJson(_asMap(item))).toList(),
    );
  }
}

class _FeatureImportance {
  const _FeatureImportance({required this.label, required this.importance});

  final String label;
  final double importance;

  factory _FeatureImportance.fromJson(Map<String, dynamic> json) {
    return _FeatureImportance(
      label: '${json['feature'] ?? json['name'] ?? 'feature'}',
      importance: _asDouble(json['importance']),
    );
  }
}

class _WeeklySalesPoint {
  const _WeeklySalesPoint({required this.weekLabel, required this.units});

  final String weekLabel;
  final double units;

  factory _WeeklySalesPoint.fromJson(Map<String, dynamic> json) {
    return _WeeklySalesPoint(
      weekLabel: '${json['semana'] ?? ''}',
      units: _asDouble(json['unidades']),
    );
  }
}

class _ModelMetricsStatus {
  const _ModelMetricsStatus({
    required this.status,
    required this.evaluations,
    required this.pendingPredictions,
    required this.message,
  });

  final String status;
  final int evaluations;
  final int pendingPredictions;
  final String message;

  String get statusLabel => switch (status) {
    'ok' => 'Disponible',
    'pendiente' => 'Pendiente',
    _ => status,
  };

  factory _ModelMetricsStatus.fromJson(Map<String, dynamic> json) {
    return _ModelMetricsStatus(
      status: '${json['status'] ?? 'desconocido'}',
      evaluations: _asInt(json['n_evaluaciones']),
      pendingPredictions: _asInt(json['n_predicciones_en_cola']),
      message: '${json['mensaje'] ?? ''}',
    );
  }
}

String _buildAssistantReply(String message, _DashboardInsights insights) {
  final text = _normalize(message);

  if (_containsAny(text, ['resumen', 'gerencia', 'directiva', 'ejecutivo'])) {
    return 'Resumen ejecutivo:\n- ${insights.headline}\n- ${insights.detail}\n- Inventario: ${insights.inventoryRead}\n- Recomendacion: ${insights.recommendation}';
  }

  if (_containsAny(text, ['reponer', 'stock', 'riesgo', 'alerta'])) {
    if (insights.riskAlerts.isEmpty) {
      return 'No hay productos en riesgo para el umbral actual. La cobertura de stock luce controlada.';
    }
    final lines = insights.riskAlerts
        .take(3)
        .map(
          (item) =>
              '- ${item.primaryLabel}: stock ${item.stock}, cobertura ${item.coverageLabel}, tendencia ${_trendLabel(item.trend).toLowerCase()}',
        );
    return 'Prioridad de reposicion:\n${lines.join('\n')}\nAccion sugerida: valida abastecimiento inmediato para los productos con menor cobertura.';
  }

  if (_containsAny(text, ['ingreso', 'finanza', 'caja', 'venta'])) {
    return 'Lectura financiera:\n- Ingreso esperado: ${_formatCurrency(insights.projectedRevenue)}\n- ${insights.financialRead}\n- Ingresos en riesgo: ${_formatCurrency(insights.revenueAtRisk)}';
  }

  if (_containsAny(text, ['motor', 'estrella', 'lider'])) {
    if (insights.productMotor == null) {
      return 'Aun no hay historial suficiente para identificar un producto motor.';
    }
    final motor = insights.productMotor!;
    return 'Producto motor:\n- ${motor.name}\n- Codigo: ${motor.primaryLabel}\n- Consumo estimado: ${_formatUnits(motor.dailyEstimatedConsumption)} por dia\n- Tendencia: ${_trendLabel(motor.trend)}';
  }

  if (_containsAny(text, ['historial', 'sin datos', 'nuevos'])) {
    return 'Lectura de historial:\n- Con historial: ${insights.withHistoryCount}\n- Sin historial: ${insights.withoutHistoryCount}\nConviene monitorear los productos nuevos sin sobrerreaccionar hasta que acumulen ventas reales.';
  }

  if (_containsAny(text, ['modelo', 'confianza', 'precision'])) {
    return 'Lectura del modelo:\n- Productos con historial: ${insights.withHistoryCount}\n- Productos sin historial: ${insights.withoutHistoryCount}\n- La confianza reportada se interpreta mejor junto al volumen de historial y la estabilidad de demanda.';
  }

  return 'Puedo ayudarte con un resumen ejecutivo, prioridades de stock, lectura financiera, producto motor o estado del modelo. Si quieres, pregunta algo como "que productos debo reponer primero?"';
}

_LowRotationRecommendation _buildLowRotationRecommendation(
  _PredictionItem product,
  int window,
) {
  final sales = product.salesForWindow(window);
  if (product.noHistory && product.stock == 0) {
    return const _LowRotationRecommendation(
      text: 'Sin stock y sin ventas. Evalua si sigue vigente en el catalogo.',
      color: AppColors.warning,
    );
  }
  if (product.noHistory) {
    return const _LowRotationRecommendation(
      text:
          'No tiene historial de ventas. Revisa visibilidad, precio y rotacion real.',
      color: AppColors.gold,
    );
  }
  if (sales == 0 && product.stock > 20) {
    return const _LowRotationRecommendation(
      text:
          'Sin movimiento y con stock alto. Conviene aplicar descuento o liquidacion.',
      color: AppColors.error,
    );
  }
  if (sales < 2 && product.stock > 15) {
    return const _LowRotationRecommendation(
      text:
          'Rotacion muy baja con sobrestock. Reubica o combina con un producto estrella.',
      color: AppColors.warning,
    );
  }
  if (product.daysUntilStockout > 90) {
    return const _LowRotationRecommendation(
      text:
          'Cobertura mayor a 3 meses. Hay capital inmovilizado en este producto.',
      color: AppColors.warning,
    );
  }
  return const _LowRotationRecommendation(
    text:
        'Rotacion baja pero estable. Monitorear y activar una promocion puntual.',
    color: AppColors.gold,
  );
}

bool _containsAny(String text, List<String> terms) {
  return terms.any(text.contains);
}

String _normalize(String value) {
  return value.toLowerCase();
}

String _formatCurrency(double value) {
  return 'S/ ${value.toStringAsFixed(2)}';
}

String _formatPercent(double value) {
  final sign = value > 0 ? '+' : '';
  return '$sign${value.toStringAsFixed(1)}%';
}

String _formatUnits(double value) {
  return value == value.roundToDouble()
      ? value.toStringAsFixed(0)
      : value.toStringAsFixed(1);
}

String _trendLabel(String trend) {
  switch (trend) {
    case 'subiendo':
      return 'Subiendo';
    case 'bajando':
      return 'Bajando';
    default:
      return 'Estable';
  }
}

Color _trendColor(String trend) {
  switch (trend) {
    case 'subiendo':
      return AppColors.success;
    case 'bajando':
      return AppColors.error;
    default:
      return _panelTextSoft;
  }
}

String _riskLabel(String level) {
  switch (level) {
    case 'critico':
      return 'Critico';
    case 'atencion':
      return 'Moderado';
    case 'vigilancia':
      return 'Vigilancia';
    case 'sin_historial':
      return 'Sin historial';
    default:
      return 'Estable';
  }
}

Color _riskColor(String level) {
  switch (level) {
    case 'critico':
      return AppColors.error;
    case 'atencion':
      return AppColors.warning;
    case 'vigilancia':
      return AppColors.gold;
    case 'sin_historial':
      return Colors.white70;
    default:
      return AppColors.success;
  }
}

String _confidenceLabel(double confidence) {
  if (confidence >= 80) return 'Alta';
  if (confidence >= 60) return 'Media';
  return 'Baja';
}

String _windowLabel(int value) {
  switch (value) {
    case 7:
      return '7 dias';
    case 15:
      return '15 dias';
    default:
      return '30 dias';
  }
}

String _dimensionLabel(String key) {
  switch (key) {
    case 'riesgo_stock':
      return 'Stock';
    case 'riesgo_ingresos':
      return 'Ingresos';
    case 'riesgo_demanda':
      return 'Demanda';
    default:
      return key.replaceAll('_', ' ');
  }
}

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, val) => MapEntry('$key', val));
  }
  return <String, dynamic>{};
}

List<dynamic> _asList(dynamic value) {
  return value is List ? value : const [];
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? 0;
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse('${value ?? ''}') ?? 0;
}

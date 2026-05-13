import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PromptPanelQuickAction } from "@/components/ui/ai-prompt-box";
import { wakeAIService } from "@/services/aiAdminClient";
import { describeAIError, fetchAI, fetchCombinedPredictionsJson, invalidateAICache } from "./adminPredictionsApi";
import {
  ALERT_OPTIONS,
  buildAssistantContextV2,
  buildDistribucionInventarioFromView,
  buildResumenEjecutivoBloques,
  buildAbcInventoryItems,
  computePredictionCountKpis,
  filterPredictionsBySearchQuery,
  generarRecomendaciónes,
  HISTORY_OPTIONS,
  HORIZON_OPTIONS,
  loadPref,
  mapPredictionsForViewDataset,
  normalizeRevenueForecastForHorizon,
  scheduleTabPrefetchTimeouts,
  selectProductoMotorPrediction,
  selectTopRiskAlertsForPanel,
  sortPredictionsByAdminPriority,
  TAB_SEQUENCE,
  generateAIResponseV2,
  type AlertOption,
  type CampanaActiveResponse,
  type ChatMessage,
  type HistoryOption,
  type HorizonOption,
  type IreData,
  type IreHistorialPoint,
  type LearningStats,
  type ModelMetrics,
  type ModeloMeta,
  type Prediction,
  type PredictionTab,
  type RankingPeriod,
  type RevenueForecast,
  type WeekPoint,
} from "./adminPredictionsLogic";

type CombinedPredictionsPayload = {
  demand?: { predictions?: Prediction[]; modelo_meta?: ModeloMeta | null };
  revenue?: RevenueForecast | null;
  ire?: IreData | null;
  ire_proyectado?: IreData | null;
  warnings?: unknown;
};

export function useAdminPredictionsModel() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [weeklyChart, setWeeklyChart] = useState<WeekPoint[]>([]);
  const [revenueForecast, setRevenueForecast] = useState<RevenueForecast | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [ireData, setIreData] = useState<IreData | null>(null);
  const [ireProyectado, setIreProyectado] = useState<IreData | null>(null);
  const [ireHistorial, setIreHistorial] = useState<IreHistorialPoint[]>([]);
  const [modeloMeta, setModeloMeta] = useState<ModeloMeta | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [horizon, setHorizon] = useState<HorizonOption>(() => loadPref("pred_horizon", HORIZON_OPTIONS, 30));
  const [history, setHistory] = useState<HistoryOption>(() => loadPref("pred_history", HISTORY_OPTIONS, 120));
  const [alertDays, setAlertDays] = useState<AlertOption>(() => loadPref("pred_alert_days", ALERT_OPTIONS, 14));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PredictionTab>("resumen");
  const [tabDirection, setTabDirection] = useState(1);
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>(30);
  const [weeklyChartFetched, setWeeklyChartFetched] = useState(false);
  const [weeklyChartLoading, setWeeklyChartLoading] = useState(false);
  const [modelMetricsFetched, setModelMetricsFetched] = useState(false);
  const [modelMetricsLoading, setModelMetricsLoading] = useState(false);
  const [ireHistorialFetched, setIreHistorialFetched] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [campanaData, setCampanaData] = useState<CampanaActiveResponse | null>(null);
  const [campanaLoading, setCampanaLoading] = useState(false);
  const [campanaFetched, setCampanaFetched] = useState(false);
  const [campanaFeedbackLoading, setCampanaFeedbackLoading] = useState(false);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [learningStatsFetched, setLearningStatsFetched] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const changeTab = useCallback((nextTab: PredictionTab) => {
    if (nextTab === activeTab) return;
    const currentIndex = TAB_SEQUENCE.indexOf(activeTab);
    const nextIndex = TAB_SEQUENCE.indexOf(nextTab);
    setTabDirection(nextIndex >= currentIndex ? 1 : -1);
    setActiveTab(nextTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("pred_horizon", String(horizon));
  }, [horizon]);
  useEffect(() => {
    localStorage.setItem("pred_history", String(history));
  }, [history]);
  useEffect(() => {
    localStorage.setItem("pred_alert_days", String(alertDays));
  }, [alertDays]);

  useEffect(() => {
    wakeAIService();
  }, []);

  const load = useCallback(async (selectedHorizon: HorizonOption, selectedHistory: HistoryOption) => {
    setLoading(true);
    setRevenueLoading(true);
    setError(null);
    setRevenueForecast(null);
    setAiWarnings([]);
    try {
      const data = (await fetchCombinedPredictionsJson(selectedHorizon, selectedHistory)) as CombinedPredictionsPayload;
      setPredictions(data.demand?.predictions ?? []);
      setModeloMeta(data.demand?.modelo_meta ?? null);
      setRevenueForecast(data.revenue ?? null);
      setIreData(data.ire ?? null);
      setIreProyectado(data.ire_proyectado ?? null);
      setAiWarnings(Array.isArray(data.warnings) ? (data.warnings as string[]) : []);
    } catch (cause) {
      setError(describeAIError(cause));
      setPredictions([]);
      setModeloMeta(null);
      setIreData(null);
      setIreProyectado(null);
      setRevenueForecast(null);
    } finally {
      setLoading(false);
      setRevenueLoading(false);
    }
  }, []);

  const loadWeeklyChart = useCallback(async () => {
    setWeeklyChartLoading(true);
    try {
      const res = await fetchAI("/api/sales/weekly-chart?weeks=8");
      if (res.ok) {
        const data = (await res.json()) as { chart?: WeekPoint[] };
        setWeeklyChart(data.chart ?? []);
      }
    } catch {
      /* silencioso — gráfico semanal es complementario */
    }
    setWeeklyChartFetched(true);
    setWeeklyChartLoading(false);
  }, []);

  const loadModelMetrics = useCallback(async () => {
    setModelMetricsLoading(true);
    try {
      const res = await fetchAI("/api/model/metrics");
      if (res.ok) setModelMetrics(await res.json());
    } catch {
      /* silencioso */
    }
    setModelMetricsFetched(true);
    setModelMetricsLoading(false);
  }, []);

  const loadIreHistorial = useCallback(async () => {
    try {
      const res = await fetchAI("/api/ire/historial?days=60");
      if (res.ok) {
        const data = (await res.json()) as { historial?: IreHistorialPoint[] };
        setIreHistorial(data.historial ?? []);
      }
    } catch {
      /* silencioso — historial es complementario */
    }
    setIreHistorialFetched(true);
  }, []);

  const loadCampana = useCallback(async () => {
    setCampanaLoading(true);
    try {
      const res = await fetchAI("/api/campaign/active");
      if (res.ok) setCampanaData(await res.json());
    } catch {
      /* silencioso */
    }
    setCampanaFetched(true);
    setCampanaLoading(false);
  }, []);

  const loadLearningStats = useCallback(async () => {
    try {
      const res = await fetchAI("/api/campaign/learning-stats");
      if (res.ok) setLearningStats(await res.json());
    } catch {
      /* silencioso — panel complementario */
    }
    setLearningStatsFetched(true);
  }, []);

  const submitCampanaFeedback = useCallback(
    async (campanaId: number, accion: "confirmar" | "descartar" | "nota", nota?: string) => {
      setCampanaFeedbackLoading(true);
      try {
        await fetchAI("/api/campaign/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campana_id: campanaId, accion, nota }),
        });
        await Promise.all([loadCampana(), loadLearningStats()]);
        setLearningStatsFetched(true);
      } catch {
        /* silencioso */
      }
      setCampanaFeedbackLoading(false);
    },
    [loadCampana, loadLearningStats],
  );

  const runCampanaFeedback = useCallback(
    (campanaId: number, accion: "confirmar" | "descartar" | "nota", nota?: string) => {
      void submitCampanaFeedback(campanaId, accion, nota);
    },
    [submitCampanaFeedback],
  );

  const refreshCampanaData = useCallback(() => {
    void loadCampana().catch(() => undefined);
  }, [loadCampana]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      load(horizon, history).catch(() => undefined);
    }, 0);
    return () => globalThis.clearTimeout(timer);
  }, [horizon, history, load]);

  useEffect(() => {
    return scheduleTabPrefetchTimeouts({
      activeTab,
      weeklyChartFetched,
      weeklyChartLoading,
      modelMetricsFetched,
      modelMetricsLoading,
      modeloMeta,
      ireHistorialFetched,
      campanaFetched,
      campanaLoading,
      learningStatsFetched,
      loadWeeklyChart,
      loadModelMetrics,
      loadIreHistorial,
      loadCampana,
      loadLearningStats,
    });
  }, [
    activeTab,
    weeklyChartFetched,
    weeklyChartLoading,
    modelMetricsFetched,
    modelMetricsLoading,
    modeloMeta,
    ireHistorialFetched,
    loadWeeklyChart,
    loadModelMetrics,
    loadIreHistorial,
    campanaFetched,
    campanaLoading,
    loadCampana,
    learningStatsFetched,
    loadLearningStats,
  ]);

  const refreshPredictions = useCallback(async () => {
    setWeeklyChartFetched(false);
    setModelMetricsFetched(false);
    setIreHistorialFetched(false);
    setWeeklyChart([]);
    setModelMetrics(null);
    setIreHistorial([]);
    await invalidateAICache();
    await load(horizon, history);
  }, [horizon, history, load]);

  const predictionsForView = useMemo(
    () => mapPredictionsForViewDataset(predictions, alertDays),
    [predictions, alertDays],
  );

  const recomendaciones = useMemo(() => generarRecomendaciónes(predictionsForView), [predictionsForView]);

  const riskAlerts = useMemo(() => selectTopRiskAlertsForPanel(predictionsForView), [predictionsForView]);

  const porOrden = useMemo(
    () => sortPredictionsByAdminPriority(filterPredictionsBySearchQuery(predictionsForView, search)),
    [predictionsForView, search],
  );

  const normalizedRevenueForecast = useMemo(
    () => normalizeRevenueForecastForHorizon(revenueForecast),
    [revenueForecast],
  );

  const revenueSummary = normalizedRevenueForecast?.summary ?? null;

  const abcData = useMemo(() => buildAbcInventoryItems(predictionsForView), [predictionsForView]);

  const {
    enRiesgo,
    sinStock,
    altaDemanda,
    conHistorial,
    sinHistorial,
    sobreStock,
    rotacionDebil,
    promedioCobertura,
  } = useMemo(() => computePredictionCountKpis(predictionsForView), [predictionsForView]);

  const productoMotor = useMemo(
    () => selectProductoMotorPrediction(predictionsForView),
    [predictionsForView],
  );

  const resumenEjecutivo = useMemo(
    () =>
      buildResumenEjecutivoBloques({
        revenueSummary,
        horizon,
        riskAlerts,
        sobreStock,
        conHistorial,
        rotacionDebil,
        enRiesgo,
        altaDemanda,
        promedioCobertura,
        alertDays,
        productoMotor,
      }),
    [
      alertDays,
      altaDemanda,
      conHistorial,
      enRiesgo,
      horizon,
      productoMotor,
      promedioCobertura,
      revenueSummary,
      riskAlerts,
      rotacionDebil,
      sobreStock,
    ],
  );

  const distribucionInventario = useMemo(
    () => buildDistribucionInventarioFromView(predictionsForView),
    [predictionsForView],
  );

  const assistantContext = useMemo(() => buildAssistantContextV2(predictionsForView), [predictionsForView]);

  const handleSend = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      const userMsg: ChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setAiLoading(true);
      const reply = generateAIResponseV2(trimmed, predictionsForView, normalizedRevenueForecast, assistantContext);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setAiLoading(false);
    },
    [assistantContext, normalizedRevenueForecast, predictionsForView],
  );

  const assistantQuickActions = useMemo<PromptPanelQuickAction[]>(
    () => [
      { label: "Resumen gerencia", prompt: "Dame un resumen ejecutivo para gerencia con las cifras clave del panel." },
      { label: "¿Qué reponer?", prompt: "¿Qué producto debo reponer primero según riesgo y demanda?" },
      { label: "Ingresos vs. periodo", prompt: "Compara el próximo horizonte proyectado con el último período real de ingresos." },
      { label: "Alertas de stock", prompt: "Lista los productos en mayor riesgo de inventario y qué harías." },
      { label: "Mayor demanda", prompt: "¿Cuáles son los productos con más demanda ahora?" },
      { label: "Sobrestock", prompt: "¿Dónde estamos acumulando sobrestock o rotación lenta?" },
      { label: "Confianza del modelo", prompt: "Explícame qué tan confiable es la proyección y por qué." },
      { label: "Producto motor", prompt: "¿Cuál es el producto motor y cómo lo defenderías?" },
      { label: "Sin historial", prompt: "¿Qué productos siguen sin historial suficiente y qué implica?" },
    ],
    [],
  );

  const assistantQuestionIdeas = useMemo(
    () => [
      "¿Qué combinación de productos debería comprar primero para no frenar ventas?",
      "Si mantengo este ritmo, ¿qué lectura le darías a la junta directiva?",
      "¿Dónde estoy inmovilizando capital en inventario con poca salida?",
      "¿Qué me preocupa más hoy: stock, ingresos o mezcla de portafolio?",
    ],
    [],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return {
    predictions,
    weeklyChart,
    revenueForecast,
    revenueLoading,
    ireData,
    ireProyectado,
    ireHistorial,
    modeloMeta,
    modelMetrics,
    horizon,
    setHorizon,
    history,
    setHistory,
    alertDays,
    setAlertDays,
    search,
    setSearch,
    loading,
    error,
    messages,
    aiLoading,
    activeTab,
    tabDirection,
    rankingPeriod,
    setRankingPeriod,
    weeklyChartFetched,
    weeklyChartLoading,
    modelMetricsFetched,
    modelMetricsLoading,
    ireHistorialFetched,
    aiWarnings,
    campanaData,
    campanaLoading,
    campanaFetched,
    campanaFeedbackLoading,
    learningStats,
    learningStatsFetched,
    chatEndRef,
    changeTab,
    load,
    loadWeeklyChart,
    loadModelMetrics,
    loadIreHistorial,
    loadCampana,
    loadLearningStats,
    submitCampanaFeedback,
    runCampanaFeedback,
    refreshCampanaData,
    refreshPredictions,
    predictionsForView,
    recomendaciones,
    riskAlerts,
    porOrden,
    normalizedRevenueForecast,
    revenueSummary,
    abcData,
    enRiesgo,
    sinStock,
    altaDemanda,
    conHistorial,
    sinHistorial,
    sobreStock,
    rotacionDebil,
    promedioCobertura,
    productoMotor,
    resumenEjecutivo,
    distribucionInventario,
    handleSend,
    assistantQuickActions,
    assistantQuestionIdeas,
  };
}

export type AdminPredictionsModelState = ReturnType<typeof useAdminPredictionsModel>;

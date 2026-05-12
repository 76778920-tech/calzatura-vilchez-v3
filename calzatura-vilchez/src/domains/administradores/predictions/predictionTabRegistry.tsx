import type { FC } from "react";
import type { AdminPredictionsModelState } from "./useAdminPredictionsModel";
import type { PredictionTab } from "./adminPredictionsLogic";
import {
  PredictionsAsistenteTabPanel,
  PredictionsCampanasTabPanel,
  PredictionsFinanzasTabPanel,
  PredictionsIreTabPanel,
  PredictionsModeloTabPanel,
  PredictionsRankingTabPanelWrapper,
  PredictionsResumenTabPanel,
  PredictionsVentasTabPanel,
} from "./AdminPredictionsDashboardTabs";

export const predictionTabPanels: Record<PredictionTab, FC<AdminPredictionsModelState>> = {
  resumen: PredictionsResumenTabPanel,
  ire: PredictionsIreTabPanel,
  ventas: PredictionsVentasTabPanel,
  finanzas: PredictionsFinanzasTabPanel,
  ranking: PredictionsRankingTabPanelWrapper,
  modelo: PredictionsModeloTabPanel,
  asistente: PredictionsAsistenteTabPanel,
  campanas: PredictionsCampanasTabPanel,
};

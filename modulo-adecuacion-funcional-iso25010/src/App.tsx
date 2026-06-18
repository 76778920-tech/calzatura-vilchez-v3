import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";

import { DashboardPage } from "./pages/DashboardPage";

import { EvaluationPage } from "./pages/EvaluationPage";

import { NewEvaluationPage } from "./pages/NewEvaluationPage";

import "./styles.css";



export default function App() {

  return (

    <BrowserRouter basename="/adecuacion-funcional">

      <AppLayout>

        <Routes>

          <Route path="/" element={<DashboardPage />} />

          <Route path="/nueva" element={<NewEvaluationPage />} />

          <Route path="/evaluacion/:id" element={<EvaluationPage />} />

        </Routes>

      </AppLayout>

    </BrowserRouter>

  );

}


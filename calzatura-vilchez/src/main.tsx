import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "@/domains/usuarios/context/AuthContext";
import { FavoritesProvider } from "@/domains/clientes/context/FavoritesContext";
import { AppErrorBoundary } from "./components/layout/AppErrorBoundary";
import { installChunkErrorRecovery } from "./utils/chunkRecovery";

installChunkErrorRecovery();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <FavoritesProvider>
          <App />
        </FavoritesProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>
);

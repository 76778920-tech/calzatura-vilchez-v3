import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/fonts.css";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "@/domains/usuarios/context/AuthContext";
import { AppErrorBoundary } from "./components/layout/AppErrorBoundary";
import { installBenignRejectionFilter } from "./utils/benignRejectionFilter";
import { installChunkErrorRecovery } from "./utils/chunkRecovery";
import { installClientStorageGuard } from "./utils/clientStorageGuard";

/** Referencia de build — invalida caché CDN tras endurecimiento ZAP. */
void "zap-v4c";

installClientStorageGuard();
installBenignRejectionFilter();
installChunkErrorRecovery();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
);

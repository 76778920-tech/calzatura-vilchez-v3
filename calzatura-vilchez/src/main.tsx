import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/playfair-display/index.css";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "@/domains/usuarios/context/AuthContext";
import { AppErrorBoundary } from "./components/layout/AppErrorBoundary";
import { installChunkErrorRecovery } from "./utils/chunkRecovery";
import { installClientStorageGuard } from "./utils/clientStorageGuard";

installClientStorageGuard();
installChunkErrorRecovery();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>
);

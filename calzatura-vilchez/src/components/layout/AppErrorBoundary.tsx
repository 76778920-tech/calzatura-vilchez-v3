import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  isChunkLoadError,
  reloadOnceForFreshAssets,
  resetChunkReloadAttempt,
} from "@/utils/chunkRecovery";

function ErrorFallback({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <main className="app-error-page">
      <div className="app-error-card">
        <span className="app-error-mark">CV</span>
        <h1>No pudimos cargar la página</h1>
        <p>
          Es posible que tu navegador tenga una versión anterior guardada. Actualiza para cargar
          la versión más reciente de Calzatura Vilchez.
        </p>
        <button type="button" className="btn-primary" onClick={onRetry}>
          Recargar página
        </button>
      </div>
    </main>
  );
}

export class AppErrorBoundary extends Component<
  Readonly<{ children: ReactNode }>,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("App render error", error, errorInfo);
    if (isChunkLoadError(error)) {
      reloadOnceForFreshAssets();
    }
  }

  handleRetry = () => {
    resetChunkReloadAttempt();
    globalThis.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

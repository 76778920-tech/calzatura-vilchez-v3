const CHUNK_ERROR_RE =
  /ChunkLoadError|Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i;
const RELOAD_KEY = "cv_chunk_reload_attempted";

export function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return CHUNK_ERROR_RE.test(message);
}

export function reloadOnceForFreshAssets() {
  if (sessionStorage.getItem(RELOAD_KEY) === "true") return false;
  sessionStorage.setItem(RELOAD_KEY, "true");
  window.location.reload();
  return true;
}

export function resetChunkReloadAttempt() {
  sessionStorage.removeItem(RELOAD_KEY);
}

export function installChunkErrorRecovery() {
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      reloadOnceForFreshAssets();
    }
  });

  window.addEventListener("error", (event) => {
    if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
      reloadOnceForFreshAssets();
    }
  });
}

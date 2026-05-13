const CHUNK_ERROR_RE =
  /ChunkLoadError|Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i;
const RELOAD_KEY = "cv_chunk_reload_attempted";

export function isChunkLoadError(error: unknown) {
  let message = "";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else if (error !== null && error !== undefined) {
    const encoded = JSON.stringify(error);
    message = typeof encoded === "string" ? encoded : "";
  }
  return CHUNK_ERROR_RE.test(message);
}

export function reloadOnceForFreshAssets() {
  if (sessionStorage.getItem(RELOAD_KEY) === "true") return false;
  sessionStorage.setItem(RELOAD_KEY, "true");
  globalThis.location.reload();
  return true;
}

export function resetChunkReloadAttempt() {
  sessionStorage.removeItem(RELOAD_KEY);
}

export function installChunkErrorRecovery() {
  globalThis.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      reloadOnceForFreshAssets();
    }
  });

  globalThis.addEventListener("error", (event) => {
    if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
      reloadOnceForFreshAssets();
    }
  });
}

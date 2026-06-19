import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installChunkErrorRecovery,
  isChunkLoadError,
  reloadOnceForFreshAssets,
  resetChunkReloadAttempt,
} from "@/utils/chunkRecovery";

describe("chunkRecovery", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetChunkReloadAttempt();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetChunkReloadAttempt();
  });

  it("detecta ChunkLoadError y variantes", () => {
    expect(isChunkLoadError(new Error("ChunkLoadError: loading chunk 5 failed"))).toBe(true);
    expect(isChunkLoadError("Failed to fetch dynamically imported module")).toBe(true);
    expect(isChunkLoadError({ message: "Loading chunk abc failed" })).toBe(true);
    expect(isChunkLoadError(new Error("network timeout"))).toBe(false);
  });

  it("recarga una sola vez por sesión", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    expect(reloadOnceForFreshAssets()).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(reloadOnceForFreshAssets()).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("instala listeners de recuperación", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    const addSpy = vi.spyOn(globalThis, "addEventListener");
    installChunkErrorRecovery();
    expect(addSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));
  });
});

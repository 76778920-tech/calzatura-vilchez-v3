import { describe, it, expect, beforeEach } from "vitest";
import {
  savePendingVerificationEmail,
  getPendingVerificationEmail,
  clearPendingVerificationEmail,
} from "@/utils/pendingVerification";

describe("pendingVerification email storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("usa sessionStorage, no localStorage persistente", () => {
    savePendingVerificationEmail("user@example.com");
    expect(sessionStorage.getItem("calzatura.pendingVerificationEmail")).toBe("user@example.com");
    expect(localStorage.getItem("calzatura.pendingVerificationEmail")).toBeNull();
  });

  it("migra y borra valor legado en localStorage", () => {
    localStorage.setItem("calzatura.pendingVerificationEmail", "legacy@example.com");
    expect(getPendingVerificationEmail()).toBe("legacy@example.com");
    expect(localStorage.getItem("calzatura.pendingVerificationEmail")).toBeNull();
    expect(sessionStorage.getItem("calzatura.pendingVerificationEmail")).toBe("legacy@example.com");
  });

  it("clear elimina session y legado", () => {
    savePendingVerificationEmail("a@b.com");
    clearPendingVerificationEmail();
    expect(getPendingVerificationEmail()).toBeNull();
  });
});

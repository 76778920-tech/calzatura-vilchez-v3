import { describe, it, expect } from "vitest";
import { getPostLoginRedirect, isStaffPath } from "@/routes/redirects";
import { STAFF_ROUTES } from "@/routes/paths";

describe("staff routes (trabajador)", () => {
  it("isStaffPath reconoce /staff y subrutas", () => {
    expect(isStaffPath(STAFF_ROUTES.home)).toBe(true);
    expect(isStaffPath(`${STAFF_ROUTES.home}/pedidos`)).toBe(true);
    expect(isStaffPath("/admin")).toBe(false);
  });

  it("trabajador sin redirect va a /staff", () => {
    expect(
      getPostLoginRedirect({ redirect: null, role: "trabajador", email: "t@x.com" })
    ).toBe(STAFF_ROUTES.home);
  });

  it("trabajador con redirect admin no entra al panel admin", () => {
    expect(
      getPostLoginRedirect({
        redirect: "/admin/pedidos",
        role: "trabajador",
        email: "t@x.com",
      })
    ).toBe(STAFF_ROUTES.home);
  });

  it("trabajador conserva redirect interno de staff", () => {
    const dest = `${STAFF_ROUTES.home}/ventas`;
    expect(
      getPostLoginRedirect({ redirect: dest, role: "trabajador", email: "t@x.com" })
    ).toBe(dest);
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("login — guardas Sonar S2068 (falsos positivos contraseña)", () => {
  it("LoginFormCard no accede a fieldErrors.password", () => {
    const source = read("src/domains/publico/components/LoginFormCard.tsx");
    expect(source).toContain("fieldErrors.contrasena");
    expect(source).not.toMatch(/fieldErrors\.password\b/);
  });

  it("loginPageViewModel no embebe literales password/current-password", () => {
    const source = read("src/domains/publico/utils/loginPageViewModel.ts");
    expect(source).toContain("LOGIN_PASSWORD_INPUT_TYPE");
    expect(source).toContain("LOGIN_CURRENT_PASSWORD_AUTOCOMPLETE");
    expect(source).not.toMatch(/"password"/);
    expect(source).not.toMatch(/"current-password"/);
  });
});

import { describe, expect, it } from "vitest";
import { unknownClientErrorHttpStatus, unknownClientErrorMessage } from "@/utils/unknownClientError";

describe("unknownClientErrorMessage", () => {
  it("devuelve message de Error", () => {
    expect(unknownClientErrorMessage(new Error("falló"))).toBe("falló");
  });

  it("primitivos y vacíos devuelven cadena vacía", () => {
    expect(unknownClientErrorMessage(undefined)).toBe("");
    expect(unknownClientErrorMessage(null)).toBe("");
    expect(unknownClientErrorMessage("")).toBe("");
    expect(unknownClientErrorMessage("solo texto")).toBe("");
    expect(unknownClientErrorMessage(0)).toBe("");
    expect(unknownClientErrorMessage(false)).toBe("");
    expect(unknownClientErrorMessage(Symbol("x"))).toBe("");
  });

  it("objeto sin campos string devuelve vacío", () => {
    expect(unknownClientErrorMessage({})).toBe("");
    expect(unknownClientErrorMessage({ message: 1, details: null })).toBe("");
  });

  it("concatena solo valores string de los campos conocidos con espacio", () => {
    expect(
      unknownClientErrorMessage({
        message: "a",
        details: "b",
        hint: "c",
        error: "d",
        description: "e",
      }),
    ).toBe("a b c d e");
  });

  it("mezcla strings y no strings ignorando los no string", () => {
    expect(
      unknownClientErrorMessage({
        message: "msg",
        details: 404,
        hint: "hint",
        error: {},
        description: "desc",
      }),
    ).toBe("msg hint desc");
  });
});

describe("unknownClientErrorHttpStatus", () => {
  it("no objeto devuelve 0", () => {
    expect(unknownClientErrorHttpStatus(undefined)).toBe(0);
    expect(unknownClientErrorHttpStatus(null)).toBe(0);
    expect(unknownClientErrorHttpStatus("x")).toBe(0);
    expect(unknownClientErrorHttpStatus(401)).toBe(0);
  });

  it("usa status numérico o string numérico", () => {
    expect(unknownClientErrorHttpStatus({ status: 403 })).toBe(403);
    expect(unknownClientErrorHttpStatus({ status: "401" })).toBe(401);
  });

  it("status tiene prioridad sobre statusCode en el mismo objeto", () => {
    expect(unknownClientErrorHttpStatus({ status: 200, statusCode: 500 })).toBe(200);
  });

  it("usa statusCode si status ausente", () => {
    expect(unknownClientErrorHttpStatus({ statusCode: 422 })).toBe(422);
    expect(unknownClientErrorHttpStatus({ statusCode: "503" })).toBe(503);
  });

  it("status no finito cae en cause cuando existe", () => {
    expect(
      unknownClientErrorHttpStatus({
        status: "no-num",
        cause: { status: 418 },
      }),
    ).toBe(418);
  });

  it("lee status anidado en cause", () => {
    expect(unknownClientErrorHttpStatus({ cause: { statusCode: 409 } })).toBe(409);
    expect(unknownClientErrorHttpStatus({ cause: { status: 502 } })).toBe(502);
  });

  it("cause no objeto o vacío no aporta código", () => {
    expect(unknownClientErrorHttpStatus({ status: "bad", cause: "x" })).toBe(0);
    expect(unknownClientErrorHttpStatus({ status: "bad", cause: null })).toBe(0);
    expect(unknownClientErrorHttpStatus({ status: "bad", cause: {} })).toBe(0);
  });

  it("statusCode en cause si status ausente en cause", () => {
    expect(unknownClientErrorHttpStatus({ cause: { statusCode: 424 } })).toBe(424);
  });

  it("0 es finito y se devuelve", () => {
    expect(unknownClientErrorHttpStatus({ status: 0 })).toBe(0);
  });
});

const assert = require("node:assert/strict");
const {
  sanitizeAuditEmail,
  sanitizeAuditEntityLabel,
  sanitizeAuditValue,
  sanitizeAuditEntryForResponse,
} = require("./auditPii.cjs");

assert.equal(sanitizeAuditEmail("cliente@example.com"), "cl***@example.com");
assert.equal(sanitizeAuditEmail("cl***@example.com"), "cl***@example.com");

assert.equal(
  sanitizeAuditEntityLabel("pedido", "pedido-uuid-abc12345", "cliente@example.com"),
  "pedido:abc12345",
);

assert.deepEqual(
  sanitizeAuditValue({ userEmail: "a@b.co", estado: "pagado" }),
  { userEmail: "[redacted]", estado: "pagado" },
);

assert.deepEqual(
  sanitizeAuditEntryForResponse({
    id: "1",
    usuarioEmail: "admin@empresa.pe",
    entidad: "usuario",
    entidadId: "uid-xyz",
    entidadNombre: "admin@empresa.pe",
    detalle: { email: "x@y.z" },
  }),
  {
    id: "1",
    usuarioEmail: "ad***@empresa.pe",
    entidad: "usuario",
    entidadId: "uid-xyz",
    entidadNombre: "usuario:uid-xyz",
    detalle: { email: "[redacted]" },
  },
);

console.log("auditPii.node-test: OK");

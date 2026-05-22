const ORDER_STATUSES = new Set(["pendiente", "pagado", "enviado", "entregado", "cancelado"]);

const ORDER_STATUS_TRANSITIONS = Object.freeze({
  pendiente: new Set(["pagado", "cancelado"]),
  pagado: new Set(["enviado", "cancelado"]),
  enviado: new Set(["entregado"]),
  entregado: new Set(),
  cancelado: new Set(),
});

function currentOrderStatus(order) {
  if (ORDER_STATUSES.has(order?.estado)) return order.estado;
  throw Object.assign(new Error("Estado actual del pedido invalido"), { status: 409 });
}

function assertOrderStatusTransition(order, nextEstado) {
  if (!ORDER_STATUSES.has(nextEstado)) {
    throw Object.assign(new Error("Estado invalido"), { status: 400 });
  }

  const currentEstado = currentOrderStatus(order);
  if (currentEstado === nextEstado) {
    return currentEstado;
  }

  const allowed = ORDER_STATUS_TRANSITIONS[currentEstado] || new Set();
  if (allowed.has(nextEstado)) {
    return currentEstado;
  }

  throw Object.assign(
    new Error(`Transicion de estado no permitida: ${currentEstado} -> ${nextEstado}`),
    { status: 409 },
  );
}

module.exports = {
  ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  assertOrderStatusTransition,
  currentOrderStatus,
};

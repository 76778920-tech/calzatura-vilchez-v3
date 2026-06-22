(function installBenignConsoleGuard(global) {
  var BENIGN_RE =
    /message channel closed before a response was received|extension context invalidated|listener indicated an asynchronous response/i;

  function messageFromReason(reason) {
    if (reason instanceof Error) return reason.message;
    if (typeof reason === "string") return reason;
    if (reason && typeof reason === "object" && typeof reason.message === "string") {
      return reason.message;
    }
    return String(reason || "");
  }

  function isBenignMessage(text) {
    return BENIGN_RE.test(text);
  }

  function isBenignReason(reason) {
    return isBenignMessage(messageFromReason(reason));
  }

  global.addEventListener(
    "unhandledrejection",
    function onUnhandledRejection(event) {
      if (!isBenignReason(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  global.addEventListener(
    "error",
    function onWindowError(event) {
      if (!isBenignMessage(event.message || "")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  var nativeConsoleError = global.console.error.bind(global.console);
  global.console.error = function filteredConsoleError() {
    var text = Array.prototype.join.call(arguments, " ");
    if (isBenignMessage(text)) return;
    nativeConsoleError.apply(global.console, arguments);
  };
})(window);

import { useEffect, type RefObject } from "react";

const DEFAULT_FOCUS_SELECTOR =
  "button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

type DialogKeyboardTrapOptions = {
  onEscape?: () => void;
  enabled?: boolean;
  focusSelector?: string;
};

export function useDialogKeyboardTrap(
  dialogRef: RefObject<HTMLDialogElement | null>,
  { onEscape, enabled = true, focusSelector = DEFAULT_FOCUS_SELECTOR }: DialogKeyboardTrapOptions = {},
) {
  useEffect(() => {
    if (!enabled) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusSelector)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable.at(-1);
      if (!last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [dialogRef, enabled, focusSelector, onEscape]);
}

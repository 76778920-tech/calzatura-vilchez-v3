import { useEffect, type RefObject } from "react";

type Viewport = { innerWidth: number; innerHeight: number };

/**
 * Positions a floating panel under a trigger, synced on resize/scroll (capture).
 * Keeps rAF scheduling in one place to reduce cognitive complexity in page components.
 */
export function usePopoverDockEffect(
  isActive: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  frameRef: RefObject<number | null>,
  setStyle: (next: { top: number; left: number; width: number }) => void,
  measure: (rect: DOMRect, viewport: Viewport) => { top: number; left: number; width: number },
): void {
  useEffect(() => {
    if (!isActive || !triggerRef.current) return undefined;

    const syncPopoverPosition = () => {
      if (!triggerRef.current) return;
      if (frameRef.current) {
        globalThis.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = globalThis.requestAnimationFrame(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setStyle(measure(rect, { innerWidth: globalThis.innerWidth, innerHeight: globalThis.innerHeight }));
      });
    };

    syncPopoverPosition();
    globalThis.addEventListener("resize", syncPopoverPosition);
    globalThis.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      if (frameRef.current) {
        globalThis.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      globalThis.removeEventListener("resize", syncPopoverPosition);
      globalThis.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [frameRef, isActive, measure, setStyle, triggerRef]);
}

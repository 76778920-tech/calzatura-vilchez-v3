import { useEffect, type MutableRefObject, type RefObject } from "react";

type Viewport = { innerWidth: number; innerHeight: number };

/**
 * Positions a floating panel under a trigger, synced on resize/scroll (capture).
 * Keeps rAF scheduling in one place to reduce cognitive complexity in page components.
 */
export function usePopoverDockEffect(
  isActive: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  frameRef: MutableRefObject<number | null>,
  setStyle: (next: { top: number; left: number; width: number }) => void,
  measure: (rect: DOMRect, viewport: Viewport) => { top: number; left: number; width: number },
): void {
  useEffect(() => {
    if (!isActive || !triggerRef.current) return undefined;

    const syncPopoverPosition = () => {
      if (!triggerRef.current) return;
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setStyle(measure(rect, { innerWidth: window.innerWidth, innerHeight: window.innerHeight }));
      });
    };

    syncPopoverPosition();
    window.addEventListener("resize", syncPopoverPosition);
    window.addEventListener("scroll", syncPopoverPosition, true);
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      window.removeEventListener("resize", syncPopoverPosition);
      window.removeEventListener("scroll", syncPopoverPosition, true);
    };
  }, [frameRef, isActive, measure, setStyle, triggerRef]);
}

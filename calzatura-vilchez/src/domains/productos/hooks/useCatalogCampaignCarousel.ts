import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, RefObject } from "react";

type CampaignSlide = { id: string; image: string; alt: string };

type CampaignTransition = { from: number; to: number; direction: 1 | -1 };

export type CatalogCampaignCarouselControls = {
  activeCampaignSlide: number;
  isCampaignDragging: boolean;
  campaignTrackRef: RefObject<HTMLDivElement | null>;
  handleCampaignPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handleCampaignPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handleCampaignPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  handleCampaignPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  handleCampaignAnimationEnd: (index: number) => void;
  getCampaignSlideClassName: (index: number) => string;
  getCampaignSlideStyle: (index: number) => CSSProperties | undefined;
};

export function useCatalogCampaignCarousel(
  catalogCampaignSlides: CampaignSlide[],
  rotationMs: number,
): CatalogCampaignCarouselControls {
  const campaignTrackRef = useRef<HTMLDivElement | null>(null);
  const campaignDragStartXRef = useRef<number | null>(null);
  const campaignDragDeltaXRef = useRef(0);
  const [activeCampaignSlide, setActiveCampaignSlide] = useState(0);
  const [isCampaignDragging, setIsCampaignDragging] = useState(false);
  const [campaignDragOffset, setCampaignDragOffset] = useState(0);
  const [campaignWidth, setCampaignWidth] = useState(0);
  const [campaignTransition, setCampaignTransition] = useState<CampaignTransition | null>(null);

  useEffect(() => {
    const track = campaignTrackRef.current;
    if (!track) return undefined;

    const updateCampaignWidth = () => {
      setCampaignWidth(track.getBoundingClientRect().width);
    };
    updateCampaignWidth();

    const observer = new ResizeObserver(updateCampaignWidth);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const moveCampaignBy = useCallback(
    (direction: 1 | -1) => {
      const slideCount = catalogCampaignSlides.length;
      if (slideCount < 2 || campaignTransition) return;

      const from = activeCampaignSlide;
      const to = (activeCampaignSlide + direction + slideCount) % slideCount;
      setActiveCampaignSlide(to);
      setCampaignTransition({ from, to, direction });
    },
    [activeCampaignSlide, campaignTransition, catalogCampaignSlides.length],
  );

  const handleCampaignPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const track = campaignTrackRef.current;
      if (!track || catalogCampaignSlides.length < 2 || campaignTransition) return;
      campaignDragStartXRef.current = event.clientX;
      campaignDragDeltaXRef.current = 0;
      setCampaignWidth(track.getBoundingClientRect().width);
      setIsCampaignDragging(true);
      try {
        track.setPointerCapture?.(event.pointerId);
      } catch {
        // Playwright synthetic touch events do not always create an active pointer.
      }
    },
    [campaignTransition, catalogCampaignSlides.length],
  );

  const handleCampaignPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const startX = campaignDragStartXRef.current;
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    campaignDragDeltaXRef.current = deltaX;
    setCampaignDragOffset(deltaX);
    event.preventDefault();
  }, []);

  const endCampaignDrag = useCallback(
    (pointerId?: number) => {
      const track = campaignTrackRef.current;
      const startX = campaignDragStartXRef.current;
      campaignDragStartXRef.current = null;
      setIsCampaignDragging(false);
      setCampaignDragOffset(0);
      if (!track || startX === null) return;

      if (typeof pointerId === "number" && track.hasPointerCapture?.(pointerId)) {
        track.releasePointerCapture(pointerId);
      }

      const dragDeltaX = campaignDragDeltaXRef.current;
      if (Math.abs(dragDeltaX) > 44) {
        moveCampaignBy(dragDeltaX < 0 ? 1 : -1);
      }
    },
    [moveCampaignBy],
  );

  const handleCampaignPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endCampaignDrag(event.pointerId);
    },
    [endCampaignDrag],
  );

  const handleCampaignPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      endCampaignDrag(event.pointerId);
    },
    [endCampaignDrag],
  );

  const advanceCampaignSlide = useCallback(() => {
    if (catalogCampaignSlides.length < 2) return;
    moveCampaignBy(1);
  }, [catalogCampaignSlides.length, moveCampaignBy]);

  useEffect(() => {
    if (catalogCampaignSlides.length < 2 || isCampaignDragging || campaignTransition) return undefined;
    const timer = globalThis.setTimeout(() => {
      advanceCampaignSlide();
    }, rotationMs);
    return () => globalThis.clearTimeout(timer);
  }, [
    activeCampaignSlide,
    advanceCampaignSlide,
    campaignTransition,
    catalogCampaignSlides.length,
    isCampaignDragging,
    rotationMs,
  ]);

  const handleCampaignAnimationEnd = useCallback(
    (index: number) => {
      if (campaignTransition?.to === index) {
        setCampaignTransition(null);
      }
    },
    [campaignTransition],
  );

  let campaignDragDirection = 0;
  if (campaignDragOffset < 0) campaignDragDirection = 1;
  else if (campaignDragOffset > 0) campaignDragDirection = -1;
  const campaignDragTarget =
    campaignDragDirection === 0
      ? null
      : (activeCampaignSlide + campaignDragDirection + catalogCampaignSlides.length) % catalogCampaignSlides.length;

  const getCampaignSlideClassName = useCallback(
    (index: number) => {
      let className = "catalog-campaign-slide";
      if (campaignTransition) {
        if (index === campaignTransition.from) {
          className += ` is-active is-exiting ${campaignTransition.direction === 1 ? "to-left" : "to-right"}`;
        }
        if (index === campaignTransition.to) {
          className += ` is-active is-entering ${campaignTransition.direction === 1 ? "from-right" : "from-left"}`;
        }
        return className;
      }

      if (index === activeCampaignSlide) className += " is-active";
      if (isCampaignDragging && campaignDragTarget === index) className += " is-drag-target";
      return className;
    },
    [activeCampaignSlide, campaignDragTarget, campaignTransition, isCampaignDragging],
  );

  const getCampaignSlideStyle = useCallback(
    (index: number) => {
      if (!isCampaignDragging || campaignDragDirection === 0 || campaignWidth <= 0) return undefined;

      if (index === activeCampaignSlide) {
        return { transform: `translate3d(${campaignDragOffset}px, 0, 0)`, opacity: 1, zIndex: 2 };
      }

      if (index === campaignDragTarget) {
        const origin = campaignDragDirection === 1 ? campaignWidth : -campaignWidth;
        return { transform: `translate3d(${origin + campaignDragOffset}px, 0, 0)`, opacity: 1, zIndex: 1 };
      }

      return undefined;
    },
    [activeCampaignSlide, campaignDragDirection, campaignDragOffset, campaignDragTarget, campaignWidth, isCampaignDragging],
  );

  return {
    activeCampaignSlide,
    isCampaignDragging,
    campaignTrackRef,
    handleCampaignPointerDown,
    handleCampaignPointerMove,
    handleCampaignPointerUp,
    handleCampaignPointerCancel,
    handleCampaignAnimationEnd,
    getCampaignSlideClassName,
    getCampaignSlideStyle,
  };
}

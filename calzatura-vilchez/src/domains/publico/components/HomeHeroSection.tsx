import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export type HomeHeroSlide = {
  id: string;
  image: string;
  alt: string;
  kicker: string;
  title: string;
  subtitle: string;
  primaryLink: string;
  primaryText: string;
  secondaryLink: string;
  secondaryText: string;
  badges: string[];
  spotlightTitle: string;
  spotlightCopy: string;
};

const HERO_ROTATION_MS = 10000;
const HERO_SWIPE_THRESHOLD = 56;

function shouldResumeHeroCarouselAutoplay(container: HTMLElement, relatedTarget: EventTarget | null): boolean {
  return !(relatedTarget instanceof Node) || !container.contains(relatedTarget);
}

type Props = Readonly<{
  slides: HomeHeroSlide[];
  productCountLabel: string;
}>;

export default function HomeHeroSection({ slides: heroSlides, productCountLabel }: Props) {
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [isHeroInteractionPaused, setIsHeroInteractionPaused] = useState(false);
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const [heroDragOffset, setHeroDragOffset] = useState(0);
  const [heroParallax, setHeroParallax] = useState({ x: 0, y: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();
  const heroCarouselRef = useRef<HTMLElement | null>(null);
  const heroDragStartXRef = useRef<number | null>(null);
  const heroDragStartYRef = useRef<number | null>(null);
  const heroSwipeSuppressClickRef = useRef(false);

  const activeHero = heroSlides[activeHeroIndex] ?? heroSlides[0];
  const canAutoRotateHero = !prefersReducedMotion && heroSlides.length > 1;
  const isHeroAutoRotationActive = canAutoRotateHero && !isHeroInteractionPaused;
  let heroDragDirection: "left" | "right" | "idle" = "idle";
  if (heroDragOffset > 0) heroDragDirection = "right";
  else if (heroDragOffset < 0) heroDragDirection = "left";

  const shiftHeroSlide = useCallback(
    (direction: 1 | -1) => {
      if (heroSlides.length < 2) return;
      setActiveHeroIndex((current) => (current + direction + heroSlides.length) % heroSlides.length);
    },
    [heroSlides.length],
  );

  const goToHeroSlide = useCallback(
    (index: number) => {
      if (heroSlides.length < 2 || index < 0 || index >= heroSlides.length) return;
      setActiveHeroIndex(index);
    },
    [heroSlides.length],
  );

  const handleHeroControl = (action: () => void) => {
    setIsHeroInteractionPaused(true);
    action();
  };

  useEffect(() => {
    if (!isHeroAutoRotationActive) return undefined;

    const timer = globalThis.setTimeout(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length);
    }, HERO_ROTATION_MS);

    return () => globalThis.clearTimeout(timer);
  }, [activeHeroIndex, heroSlides.length, isHeroAutoRotationActive]);

  const updateHeroDrag = (clientX: number, clientY: number) => {
    const startX = heroDragStartXRef.current;
    const startY = heroDragStartYRef.current;
    if (startX === null || startY === null) return;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    setIsHeroDragging(true);
    setHeroDragOffset(deltaX);
  };

  const beginHeroSwipe = useCallback((clientX: number, clientY: number) => {
    if (heroSlides.length < 2) return;
    heroDragStartXRef.current = clientX;
    heroDragStartYRef.current = clientY;
    heroSwipeSuppressClickRef.current = false;
    setIsHeroInteractionPaused(true);
  }, [heroSlides.length]);

  const finishHeroSwipe = useCallback((clientX: number, clientY: number) => {
    const startX = heroDragStartXRef.current;
    const startY = heroDragStartYRef.current;
    const deltaX = startX === null ? 0 : clientX - startX;
    const deltaY = startY === null ? 0 : clientY - startY;

    heroDragStartXRef.current = null;
    heroDragStartYRef.current = null;
    setIsHeroInteractionPaused(false);
    setIsHeroDragging(false);
    setHeroDragOffset(0);

    if (Math.abs(deltaX) < HERO_SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    heroSwipeSuppressClickRef.current = true;
    shiftHeroSlide(deltaX < 0 ? 1 : -1);
  }, [shiftHeroSlide]);

  const cancelHeroSwipe = () => {
    heroDragStartXRef.current = null;
    heroDragStartYRef.current = null;
    setIsHeroInteractionPaused(false);
    setIsHeroDragging(false);
    setHeroDragOffset(0);
  };

  useEffect(() => {
    const carousel = heroCarouselRef.current;
    if (!carousel) return undefined;

    const slideCount = heroSlides.length;

    const onKeyDown = (event: KeyboardEvent) => {
      if (slideCount < 2) return;
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          setIsHeroInteractionPaused(true);
          shiftHeroSlide(-1);
          break;
        case "ArrowRight":
          event.preventDefault();
          setIsHeroInteractionPaused(true);
          shiftHeroSlide(1);
          break;
        case "Home":
          event.preventDefault();
          setIsHeroInteractionPaused(true);
          goToHeroSlide(0);
          break;
        case "End":
          event.preventDefault();
          setIsHeroInteractionPaused(true);
          goToHeroSlide(slideCount - 1);
          break;
        default:
          break;
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      beginHeroSwipe(touch.clientX, touch.clientY);
    };

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) {
        cancelHeroSwipe();
        return;
      }
      finishHeroSwipe(touch.clientX, touch.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      updateHeroDrag(touch.clientX, touch.clientY);
      if (heroDragStartXRef.current !== null && heroDragStartYRef.current !== null) {
        const deltaX = touch.clientX - heroDragStartXRef.current;
        const deltaY = touch.clientY - heroDragStartYRef.current;
        if (Math.abs(deltaX) > Math.abs(deltaY) && event.cancelable) {
          event.preventDefault();
        }
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      beginHeroSwipe(event.clientX, event.clientY);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (heroDragStartXRef.current !== null) {
        updateHeroDrag(event.clientX, event.clientY);
        return;
      }
      if (prefersReducedMotion) return;
      const bounds = carousel.getBoundingClientRect();
      const relativeX = (event.clientX - bounds.left) / bounds.width;
      const relativeY = (event.clientY - bounds.top) / bounds.height;
      setHeroParallax({ x: (relativeX - 0.5) * 26, y: (relativeY - 0.5) * 22 });
    };

    const onMouseUp = (event: MouseEvent) => {
      if (heroDragStartXRef.current === null) return;
      finishHeroSwipe(event.clientX, event.clientY);
    };

    const onMouseLeave = () => {
      if (heroDragStartXRef.current !== null) {
        cancelHeroSwipe();
      }
      setHeroParallax({ x: 0, y: 0 });
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!heroSwipeSuppressClickRef.current) return;
      heroSwipeSuppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    };

    const onFocus = () => setIsHeroInteractionPaused(true);
    const onBlur = (event: FocusEvent) => {
      if (shouldResumeHeroCarouselAutoplay(carousel, event.relatedTarget)) {
        setIsHeroInteractionPaused(false);
      }
    };

    carousel.addEventListener("keydown", onKeyDown);
    carousel.addEventListener("touchstart", onTouchStart, { passive: true });
    carousel.addEventListener("touchend", onTouchEnd);
    carousel.addEventListener("touchmove", onTouchMove, { passive: false });
    carousel.addEventListener("touchcancel", cancelHeroSwipe);
    carousel.addEventListener("mousedown", onMouseDown);
    carousel.addEventListener("mousemove", onMouseMove);
    carousel.addEventListener("mouseup", onMouseUp);
    carousel.addEventListener("mouseleave", onMouseLeave);
    carousel.addEventListener("click", onClickCapture, true);
    carousel.addEventListener("focus", onFocus);
    carousel.addEventListener("blur", onBlur);

    return () => {
      carousel.removeEventListener("keydown", onKeyDown);
      carousel.removeEventListener("touchstart", onTouchStart);
      carousel.removeEventListener("touchend", onTouchEnd);
      carousel.removeEventListener("touchmove", onTouchMove);
      carousel.removeEventListener("touchcancel", cancelHeroSwipe);
      carousel.removeEventListener("mousedown", onMouseDown);
      carousel.removeEventListener("mousemove", onMouseMove);
      carousel.removeEventListener("mouseup", onMouseUp);
      carousel.removeEventListener("mouseleave", onMouseLeave);
      carousel.removeEventListener("click", onClickCapture, true);
      carousel.removeEventListener("focus", onFocus);
      carousel.removeEventListener("blur", onBlur);
    };
  }, [beginHeroSwipe, finishHeroSwipe, goToHeroSlide, heroSlides.length, prefersReducedMotion, shiftHeroSlide]);

  const getHeroSlideState = (index: number) => {
    if (index === activeHeroIndex) return "active";
    if (index === (activeHeroIndex - 1 + heroSlides.length) % heroSlides.length) return "prev";
    if (index === (activeHeroIndex + 1) % heroSlides.length) return "next";
    return "hidden";
  };

  return (
    <section className="home-hero" aria-roledescription="carousel" aria-label="Promociones destacadas">
      <section
        ref={heroCarouselRef}
        aria-label="Carrusel de promociones destacadas"
        aria-describedby="home-hero-carousel-keyboard-help"
        className={`home-hero-carousel ${isHeroDragging ? "is-dragging" : ""}`}
        data-drag-direction={heroDragDirection}
        style={
          {
            "--hero-drag-offset": `${heroDragOffset}px`,
            "--hero-parallax-x": `${heroParallax.x}px`,
            "--hero-parallax-y": `${heroParallax.y}px`,
          } as CSSProperties
        }
        tabIndex={heroSlides.length > 1 ? 0 : undefined}
      >
        <div id="home-hero-carousel-keyboard-help" className="home-hero-progress-sr-only">
          Usa las flechas izquierda y derecha para cambiar de promocion. Usa Inicio y Fin para ir a la primera o ultima promocion.
        </div>
        {heroSlides.map((slide, index) => {
          const slideState = getHeroSlideState(index);
          const isActive = slideState === "active";
          const shouldRenderImage = slideState !== "hidden";
          return (
            <article
              key={slide.id}
              className={`home-hero-slide is-${slideState}`}
              data-slide-id={slide.id}
              aria-hidden={!isActive}
            >
              {shouldRenderImage && (
                <img
                  src={slide.image}
                  alt={slide.alt}
                  loading={isActive ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={isActive ? "high" : "low"}
                />
              )}
            </article>
          );
        })}
        <div className="home-hero-progress-sr-only" aria-live="polite" aria-atomic="true">
          {`Promocion ${activeHeroIndex + 1} de ${heroSlides.length}: ${activeHero.title}`}
        </div>
        <div className="home-hero-shade" />
        <div className="home-hero-grid" />
        <div className="home-hero-orbit home-hero-orbit-a" />
        <div className="home-hero-orbit home-hero-orbit-b" />

        {heroSlides.length > 1 ? (
          <>
            <button
              type="button"
              className="home-hero-arrow-btn home-hero-arrow-prev"
              aria-label="Promocion anterior"
              onClick={() => handleHeroControl(() => shiftHeroSlide(-1))}
            >
              <ChevronLeft size={22} aria-hidden="true" focusable="false" />
            </button>
            <button
              type="button"
              className="home-hero-arrow-btn home-hero-arrow-next"
              aria-label="Siguiente promocion"
              onClick={() => handleHeroControl(() => shiftHeroSlide(1))}
            >
              <ChevronRight size={22} aria-hidden="true" focusable="false" />
            </button>
          </>
        ) : null}

        <div className="home-hero-content">
          <div className="home-hero-inner">
            <div key={`copy-${activeHero.id}`} className="home-hero-copy">
              <span className="home-kicker">{activeHero.kicker}</span>
              <h1 className="home-title">{activeHero.title}</h1>
              <p className="home-subtitle">{activeHero.subtitle}</p>

              <div className="home-mood-row">
                {activeHero.badges.map((badge) => (
                  <span key={`${activeHero.id}-${badge}`} className="home-mood-pill">
                    {badge}
                  </span>
                ))}
              </div>

              <div className="home-actions">
                <Link to={activeHero.primaryLink} className="btn-primary btn-lg">
                  {activeHero.primaryText} <ArrowRight size={18} />
                </Link>
                <Link to={activeHero.secondaryLink} className="btn-ghost btn-lg">
                  {activeHero.secondaryText}
                </Link>
              </div>

              <div className="home-proof-row">
                <div>
                  <strong>{productCountLabel}</strong>
                  <span>modelos en catálogo</span>
                </div>
                <div>
                  <strong>24h</strong>
                  <span>atención de pedidos</span>
                </div>
                <div>
                  <strong>7d</strong>
                  <span>cambios disponibles</span>
                </div>
              </div>
            </div>

            <aside className="home-hero-showcase" aria-label="Vitrina destacada">
              <div key={`showcase-${activeHero.id}`} className="home-showcase-shell">
                <div className="home-showcase-copy-card">
                  <span className="home-showcase-kicker">{activeHero.kicker}</span>
                  <strong className="home-showcase-title">{activeHero.spotlightTitle}</strong>
                  <p className="home-showcase-copy">{activeHero.spotlightCopy}</p>
                </div>

                <div className="home-showcase-visual">
                  <img src={activeHero.image} alt={activeHero.alt} loading="eager" decoding="async" fetchPriority="high" />
                  <div className="home-showcase-badge home-showcase-badge-top">
                    <span>Disponible</span>
                    <strong>{productCountLabel} modelos</strong>
                  </div>
                  <div className="home-showcase-badge home-showcase-badge-bottom">
                    <span>Explorar</span>
                    <strong>{activeHero.secondaryText}</strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
        <progress
          className="home-hero-progress-sr-only"
          max={heroSlides.length}
          value={activeHeroIndex + 1}
          aria-label={`Progreso del carrusel: ${activeHeroIndex + 1} de ${heroSlides.length}`}
        />
        <div className="home-hero-progress" aria-hidden="true">
          <span className="home-hero-progress-track">
            <span
              key={`hero-progress-${activeHeroIndex}`}
              className={`home-hero-progress-fill${canAutoRotateHero ? " is-animating" : ""}${isHeroInteractionPaused ? " is-paused" : ""}`}
              style={canAutoRotateHero ? ({ "--hero-progress-duration": `${HERO_ROTATION_MS}ms` } as CSSProperties) : undefined}
            />
          </span>
        </div>
        {heroSlides.length > 1 ? (
          <div className="home-hero-dots" aria-label="Seleccionar promocion">
            {heroSlides.map((slide, index) => {
              const isActive = index === activeHeroIndex;
              return (
                <button
                  key={`hero-dot-${slide.id}`}
                  type="button"
                  className={`home-hero-dot${isActive ? " is-active" : ""}`}
                  aria-label={`Ver promocion ${index + 1}: ${slide.title}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => handleHeroControl(() => goToHeroSlide(index))}
                >
                  <span
                    className={`home-hero-dot-fill${isActive && canAutoRotateHero ? " is-animating" : ""}${
                      isActive && isHeroInteractionPaused ? " is-paused" : ""
                    }`}
                    style={isActive && canAutoRotateHero ? ({ "--hero-progress-duration": `${HERO_ROTATION_MS}ms` } as CSSProperties) : undefined}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
    </section>
  );
}

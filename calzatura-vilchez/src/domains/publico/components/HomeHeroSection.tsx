import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

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

type Props = {
  slides: HomeHeroSlide[];
  productCountLabel: string;
};

export default function HomeHeroSection({ slides: heroSlides, productCountLabel }: Props) {
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [isHeroInteractionPaused, setIsHeroInteractionPaused] = useState(false);
  const [isHeroDragging, setIsHeroDragging] = useState(false);
  const [heroDragOffset, setHeroDragOffset] = useState(0);
  const [heroParallax, setHeroParallax] = useState({ x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const heroCarouselRef = useRef<HTMLDivElement | null>(null);
  const heroDragStartXRef = useRef<number | null>(null);
  const heroDragStartYRef = useRef<number | null>(null);
  const heroSwipeSuppressClickRef = useRef(false);

  const activeHero = heroSlides[activeHeroIndex] ?? heroSlides[0];
  const canAutoRotateHero = !prefersReducedMotion && heroSlides.length > 1;
  const isHeroAutoRotationActive = canAutoRotateHero && !isHeroInteractionPaused;
  const heroDragDirection = heroDragOffset > 0 ? "right" : heroDragOffset < 0 ? "left" : "idle";

  const shiftHeroSlide = useCallback(
    (direction: 1 | -1) => {
      if (heroSlides.length < 2) return;
      setActiveHeroIndex((current) => (current + direction + heroSlides.length) % heroSlides.length);
    },
    [heroSlides.length],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (!isHeroAutoRotationActive) return undefined;

    const timer = window.setTimeout(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length);
    }, HERO_ROTATION_MS);

    return () => window.clearTimeout(timer);
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

  const beginHeroSwipe = (clientX: number, clientY: number) => {
    if (heroSlides.length < 2) return;
    heroDragStartXRef.current = clientX;
    heroDragStartYRef.current = clientY;
    heroSwipeSuppressClickRef.current = false;
    setIsHeroInteractionPaused(true);
  };

  const finishHeroSwipe = (clientX: number, clientY: number) => {
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
  };

  const cancelHeroSwipe = () => {
    heroDragStartXRef.current = null;
    heroDragStartYRef.current = null;
    setIsHeroInteractionPaused(false);
    setIsHeroDragging(false);
    setHeroDragOffset(0);
  };

  const handleHeroTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    beginHeroSwipe(touch.clientX, touch.clientY);
  };

  const handleHeroTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      cancelHeroSwipe();
      return;
    }

    finishHeroSwipe(touch.clientX, touch.clientY);
  };

  const handleHeroTouchMove = (event: TouchEvent<HTMLDivElement>) => {
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

  const handleHeroMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    beginHeroSwipe(event.clientX, event.clientY);
  };

  const handleHeroMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (heroDragStartXRef.current !== null) {
      updateHeroDrag(event.clientX, event.clientY);
      return;
    }

    if (prefersReducedMotion) return;
    const container = heroCarouselRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const relativeY = (event.clientY - bounds.top) / bounds.height;
    const nextX = (relativeX - 0.5) * 26;
    const nextY = (relativeY - 0.5) * 22;
    setHeroParallax({ x: nextX, y: nextY });
  };

  const handleHeroMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    if (heroDragStartXRef.current === null) return;
    finishHeroSwipe(event.clientX, event.clientY);
  };

  const handleHeroMouseLeave = () => {
    if (heroDragStartXRef.current !== null) {
      cancelHeroSwipe();
    }
    setHeroParallax({ x: 0, y: 0 });
  };

  const handleHeroClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!heroSwipeSuppressClickRef.current) return;
    heroSwipeSuppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const getHeroSlideState = (index: number) => {
    if (index === activeHeroIndex) return "active";
    if (index === (activeHeroIndex - 1 + heroSlides.length) % heroSlides.length) return "prev";
    if (index === (activeHeroIndex + 1) % heroSlides.length) return "next";
    return "hidden";
  };

  return (
    <section className="home-hero" aria-roledescription="carousel" aria-label="Promociones destacadas">
      <div
        ref={heroCarouselRef}
        className={`home-hero-carousel ${isHeroDragging ? "is-dragging" : ""}`}
        data-drag-direction={heroDragDirection}
        style={
          {
            "--hero-drag-offset": `${heroDragOffset}px`,
            "--hero-parallax-x": `${heroParallax.x}px`,
            "--hero-parallax-y": `${heroParallax.y}px`,
          } as CSSProperties
        }
        onMouseLeave={handleHeroMouseLeave}
        onMouseDown={handleHeroMouseDown}
        onMouseMove={handleHeroMouseMove}
        onMouseUp={handleHeroMouseUp}
        onTouchStart={handleHeroTouchStart}
        onTouchMove={handleHeroTouchMove}
        onTouchEnd={handleHeroTouchEnd}
        onTouchCancel={cancelHeroSwipe}
        onClickCapture={handleHeroClickCapture}
        onFocus={() => setIsHeroInteractionPaused(true)}
        onBlur={(event) => {
          if (shouldResumeHeroCarouselAutoplay(event.currentTarget, event.relatedTarget)) {
            setIsHeroInteractionPaused(false);
          }
        }}
      >
        {heroSlides.map((slide, index) => (
          <article
            key={slide.id}
            className={`home-hero-slide is-${getHeroSlideState(index)}`}
            data-slide-id={slide.id}
            aria-hidden={index !== activeHeroIndex}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              loading={index === activeHeroIndex ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === activeHeroIndex ? "high" : "low"}
            />
          </article>
        ))}
        <div className="home-hero-shade" />
        <div className="home-hero-grid" />
        <div className="home-hero-orbit home-hero-orbit-a" />
        <div className="home-hero-orbit home-hero-orbit-b" />

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
        <div
          className="home-hero-progress"
          role="progressbar"
          aria-label="Progreso del carrusel"
          aria-valuemin={1}
          aria-valuemax={heroSlides.length}
          aria-valuenow={activeHeroIndex + 1}
          aria-valuetext={`${activeHeroIndex + 1} de ${heroSlides.length}`}
        >
          <span className="home-hero-progress-track">
            <span
              key={`hero-progress-${activeHeroIndex}`}
              className={`home-hero-progress-fill${canAutoRotateHero ? " is-animating" : ""}${isHeroInteractionPaused ? " is-paused" : ""}`}
              style={canAutoRotateHero ? ({ "--hero-progress-duration": `${HERO_ROTATION_MS}ms` } as CSSProperties) : undefined}
            />
          </span>
        </div>
      </div>
    </section>
  );
}

import type { CSSProperties } from "react";

export type BrandLogoVariant = "premium" | "commercial" | "heritage";
export type BrandLogoMode = "light" | "dark";
export type BrandLogoLayout = "horizontal" | "compact";

type BrandLogoProps = {
  readonly variant?: BrandLogoVariant;
  readonly mode?: BrandLogoMode;
  readonly layout?: BrandLogoLayout;
  readonly className?: string;
  readonly title?: string;
};

type LogoPalette = {
  textPrimary:  string;
  textSecondary:string;
  petalFill:    string;  // main petal color  (#E8C96D adapted)
  ringOuter:    string;  // outer ring stroke  (#C9A227)
  ringInner:    string;  // inner dashed ring  (#A8841A)
  centerFill:   string;  // center disc        (#2A1706)
  centerDot:    string;  // center accent dot
  outline:      string;
  plate:        string;
};

function getPalette(mode: BrandLogoMode): LogoPalette {
  if (mode === "light") {
    return {
      textPrimary:  "#111111",
      textSecondary:"#9a7318",
      petalFill:    "#d4a828",
      ringOuter:    "#c9a227",
      ringInner:    "#a8841a",
      centerFill:   "#3d1e08",
      centerDot:    "#c9a227",
      outline:      "rgba(18,18,18,0.13)",
      plate:        "rgba(201,162,39,0.10)",
    };
  }
  return {
    textPrimary:  "#f7f1e4",
    textSecondary:"#ddb447",
    petalFill:    "#e8c96d",   // matches user's SVG exactly
    ringOuter:    "#c9a227",   // matches user's SVG stroke
    ringInner:    "#a8841a",   // matches user's SVG dashed ring
    centerFill:   "#2a1706",   // matches user's SVG center
    centerDot:    "#f2db83",   // matches user's SVG CV text color
    outline:      "rgba(255,245,220,0.14)",
    plate:        "rgba(221,180,71,0.11)",
  };
}

// ── Petal angle sets ──────────────────────────────────────────────────────────
const ANGLES_8  = [0, 45, 90, 135, 180, 225, 270, 315];
const ANGLES_12 = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

// ── Badge mark ────────────────────────────────────────────────────────────────
// Adapted from user's SVG (180×180 center 90,90) → our space (68×68 center 34,34).
// Scale ≈ 0.38. Transform trick: rotate(N) translate(0 -dist) places each ellipse
// radially at `dist` from center and orients it outward — same as the reference SVG.

function BadgeMark({
  palette,
  variant,
}: Readonly<{
  palette: LogoPalette;
  variant: BrandLogoVariant;
}>) {
  const angles = variant === "heritage" ? ANGLES_12 : ANGLES_8;
  // heritage: more petals → narrower; premium/commercial: classic 8
  // Scaled from reference SVG (180×180 → 68×68) keeping original proportions
  const rx   = variant === "heritage" ? 1.8 : 2.3;
  const ry   = variant === "heritage" ? 5 : 6.3;
  const dist = variant === "heritage" ? 13  : 14;

  return (
    <g>
      {/* Outer ring — reference proportion: outerR/centerDist = 62/90 */}
      <circle
        cx="34" cy="34" r="27"
        fill="none"
        stroke={palette.ringOuter}
        strokeWidth="2"
      />

      {/* Inner dashed ring — petal tips at ≈20.3, ring at 21 mirrors reference */}
      <circle
        cx="34" cy="34" r="21"
        fill="none"
        stroke={palette.ringInner}
        strokeWidth="0.9"
        strokeDasharray="2 4.5"
      />

      {/*
        SVG transforms apply right-to-left:
          1. translate(0 -dist)  → position ellipse at radius `dist` pointing up
          2. rotate(angle)       → rotate it around the group origin (mark center)
        Outer <g translate(34 34)> moves the pivot to the mark center.
      */}
      <g transform="translate(34 34)">
        {angles.map((angle) => (
          <ellipse
            key={angle}
            rx={rx}
            ry={ry}
            fill={palette.petalFill}
            transform={`rotate(${angle}) translate(0 -${dist})`}
          />
        ))}
      </g>

      {/* Center disc */}
      <circle cx="34" cy="34" r="7.2" fill={palette.centerFill} />
      {/* Center accent dot */}
      <circle cx="34" cy="34" r="2.2" fill={palette.centerDot}  opacity="0.88" />
    </g>
  );
}

// ── Wordmarks ─────────────────────────────────────────────────────────────────

function PremiumWordmark({ palette }: Readonly<{ palette: LogoPalette }>) {
  return (
    <>
      {/* textLength pins the width so italic overhang never clips at the viewBox edge */}
      <text
        x="80" y="33"
        fill={palette.textPrimary}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="24"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing="0.1"
        textLength="170"
        lengthAdjust="spacingAndGlyphs"
      >
        Calzatura Vilchez
      </text>
      <text
        x="81" y="50"
        fill={palette.textSecondary}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="8.7"
        fontWeight="800"
        letterSpacing="3.2"
      >
        CALZADO PREMIUM
      </text>
    </>
  );
}

function CommercialWordmark({ palette }: Readonly<{ palette: LogoPalette }>) {
  return (
    <>
      <rect
        x="76" y="8" width="196" height="50" rx="25"
        fill={palette.plate} stroke={palette.outline} strokeWidth="1"
      />
      <text
        x="93" y="31"
        fill={palette.textPrimary}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="22"
        fontWeight="900"
        letterSpacing="0.8"
      >
        CALZATURA
      </text>
      <text
        x="93" y="47"
        fill={palette.textSecondary}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="9.5"
        fontWeight="800"
        letterSpacing="3.2"
      >
        VILCHEZ PREMIUM
      </text>
    </>
  );
}

function HeritageWordmark({ palette }: Readonly<{ palette: LogoPalette }>) {
  return (
    <>
      <line x1="80" y1="17" x2="268" y2="17" stroke={palette.outline} strokeWidth="1.2" />
      <text
        x="80" y="29"
        fill={palette.textSecondary}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7.5"
        fontWeight="800"
        letterSpacing="3.4"
      >
        CASA DE CALZADO
      </text>
      <text
        x="80" y="44"
        fill={palette.textPrimary}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="21"
        fontWeight="700"
        letterSpacing="0.3"
      >
        CALZATURA VILCHEZ
      </text>
      <text
        x="80" y="57"
        fill={palette.textSecondary}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7.2"
        fontWeight="700"
        letterSpacing="2.5"
      >
        HERENCIA · OFICIO · PRESENCIA
      </text>
    </>
  );
}

// Compact: badge only (icon-scale usage). "CV" inside center is legible at 68px+.
function CompactLockup({
  palette,
  variant,
}: Readonly<{
  palette: LogoPalette;
  variant: BrandLogoVariant;
}>) {
  return (
    <>
      <BadgeMark palette={palette} variant={variant} />
      {/* "CV" monogram inside center disc */}
      <text
        x="34" y="38"
        textAnchor="middle"
        fill={palette.centerDot}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="9"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing="0.5"
      >
        CV
      </text>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function BrandLogo({
  variant   = "premium",
  mode      = "dark",
  layout    = "horizontal",
  className,
  title     = "Calzatura Vilchez",
}: Readonly<BrandLogoProps>) {
  const palette   = getPalette(mode);
  const isCompact = layout === "compact";

  // Horizontal viewBox is 292 wide (22px wider than before) so the italic
  // "Calzatura Vilchez" tail never clips at the right edge.
  const viewBox = isCompact ? "0 0 68 68" : "0 0 292 68";

  const cssVars = {
    "--brand-text-primary":   palette.textPrimary,
    "--brand-text-secondary": palette.textSecondary,
  } as CSSProperties;

  return (
    <svg
      className={className}
      style={cssVars}
      viewBox={viewBox}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {isCompact ? (
        <CompactLockup palette={palette} variant={variant} />
      ) : (
        <>
          <BadgeMark palette={palette} variant={variant} />
          {variant === "premium"    && <PremiumWordmark    palette={palette} />}
          {variant === "commercial" && <CommercialWordmark palette={palette} />}
          {variant === "heritage"   && <HeritageWordmark   palette={palette} />}
        </>
      )}
    </svg>
  );
}

/**
 * Toaster headless — usa useToaster() de react-hot-toast para el estado
 * pero renderiza con estilos inline propios (sin goober styled components).
 * Esto evita que goober inyecte CSS dinámico en <style id="_goober">,
 * eliminando las violaciones CSP style-src-elem de forma permanente.
 */
import { useToaster, resolveValue } from "react-hot-toast";
import type { Toast } from "react-hot-toast";

function SuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" stroke="#4ade80" strokeWidth="2" />
      <path d="M7.5 12.5l3 3 6-6.5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" stroke="#f87171" strokeWidth="2" />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="#60a5fa" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.75s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

function ToastIcon({ t }: Readonly<{ t: Toast }>) {
  if (t.icon != null) {
    return <span style={{ flexShrink: 0, fontSize: 20, lineHeight: 1 }}>{t.icon as React.ReactNode}</span>;
  }
  if (t.type === "success") return <SuccessIcon />;
  if (t.type === "error") return <ErrorIcon />;
  if (t.type === "loading") return <LoadingIcon />;
  return null;
}

export function CustomToaster() {
  const { toasts, handlers } = useToaster({ duration: 4000 });
  const { startPause, endPause, calculateOffset, updateHeight } = handlers;

  return (
    <section
      aria-label="Notificaciones"
      style={{ position: "fixed", bottom: 24, right: 16, zIndex: 9999, pointerEvents: "none" }}
      onMouseEnter={startPause}
      onMouseLeave={endPause}
    >
      {toasts.map((t) => {
        const offset = calculateOffset(t, { reverseOrder: false, gutter: 8 });

        return (
          <div
            key={t.id}
            ref={(el) => {
              if (el && t.height === undefined) updateHeight(t.id, el.offsetHeight);
            }}
            {...t.ariaProps}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#1a1a1a",
              color: "#f9fafb",
              padding: "12px 20px",
              borderRadius: "999px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              lineHeight: 1.4,
              maxWidth: "420px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              pointerEvents: "auto",
              transform: `translateY(${-offset}px)`,
              transition: "transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.15s ease",
              opacity: t.visible ? 1 : 0,
              willChange: "transform, opacity",
              ...t.style,
            }}
          >
            <ToastIcon t={t} />
            <span>{resolveValue(t.message, t)}</span>
          </div>
        );
      })}
    </section>
  );
}

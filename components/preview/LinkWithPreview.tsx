import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { fetchPreviewClientOnly } from "../../services/fetchPreview";
import { getDomain, getOrFetch, type PreviewResult, type PreviewData } from "../../services/previewCache";
import styles from "./LinkWithPreview.module.css";

type Placement = "top" | "bottom" | "left" | "right";

export interface LinkWithPreviewProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  placement?: Placement;
  delay?: number; // ms before showing preview on hover/focus
  cacheTTL?: number; // ms
  className?: string;
  children?: React.ReactNode;
}

/**
 * Accessible, client-only link preview. Shows on hover/focus with debounce,
 * hides on leave/blur/scroll/Escape. Prefetches when link enters viewport.
 */
export const LinkWithPreview: React.FC<LinkWithPreviewProps> = ({
  href,
  placement = "top",
  delay = 200,
  cacheTTL = 60 * 60 * 1000, // 1h
  className,
  children,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  onKeyDown,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);

  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const showTimer = useRef<number | null>(null);
  const isMounted = useRef(true);

  const tooltipId = useId();

  const safeHref = useMemo(() => {
    try {
      const u = new URL(href);
      if (!/^https?:$/i.test(u.protocol)) return null;
      u.hash = "";
      return u.toString();
    } catch {
      return null;
    }
  }, [href]);

  // Prefetch when in viewport
  useEffect(() => {
    if (!safeHref || !linkRef.current || typeof IntersectionObserver === "undefined") return;
    const el = linkRef.current;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          // fire and forget prefetch with short debounce
          void getOrFetch(safeHref, (u) => fetchPreviewClientOnly(u), cacheTTL);
          io.disconnect();
          break;
        }
      }
    }, { rootMargin: "200px" });

    io.observe(el);
    return () => io.disconnect();
  }, [safeHref, cacheTTL]);

  // Cleanup flag
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (showTimer.current) {
        window.clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      removeGlobalListeners();
    };
  }, []);

  const openCard = useCallback(async () => {
    if (!safeHref) return;
    setOpen(true);

    // If we already have data or error, do not refetch immediately
    if (result) return;

    setLoading(true);
    const r = await getOrFetch(safeHref, (u) => fetchPreviewClientOnly(u), cacheTTL);
    if (!isMounted.current) return;
    setResult(r);
    setLoading(false);
  }, [safeHref, cacheTTL, result]);

  const closeCard = useCallback(() => {
    setOpen(false);
  }, []);

  const scheduleOpen = useCallback(() => {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    showTimer.current = window.setTimeout(() => {
      showTimer.current = null;
      void openCard();
    }, Math.max(0, delay));
  }, [openCard, delay]);

  const cancelScheduledOpen = useCallback(() => {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseEnter?.(e);
    scheduleOpen();
    addGlobalListeners();
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseLeave?.(e);
    cancelScheduledOpen();
    // Delay close slightly to allow moving pointer into card
    window.setTimeout(() => {
      if (!cardRef.current) return closeCard();
      const onOverCard = (cardRef.current as any).__hovering;
      if (!onOverCard) closeCard();
    }, 80);
  };

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(e);
    scheduleOpen();
    addGlobalListeners();
  };

  const handleBlur = (e: React.FocusEvent<HTMLAnchorElement>) => {
    onBlur?.(e);
    cancelScheduledOpen();
    // Close when focus leaves link and card
    window.setTimeout(() => {
      if (!cardRef.current) return closeCard();
      const onOverCard = (cardRef.current as any).__hovering;
      if (!onOverCard && document.activeElement !== linkRef.current) closeCard();
    }, 80);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    onKeyDown?.(e);
    if (e.key === "Escape") {
      e.stopPropagation();
      closeCard();
    }
  };

  const onScrollOrResize = useCallback(() => {
    closeCard();
  }, [closeCard]);

  const onGlobalKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") closeCard();
  }, [closeCard]);

  function addGlobalListeners() {
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize, true);
    window.addEventListener("keydown", onGlobalKey, true);
  }

  function removeGlobalListeners() {
    window.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("resize", onScrollOrResize, true);
    window.removeEventListener("keydown", onGlobalKey, true);
  }

  const domain = useMemo(() => (safeHref ? getDomain(safeHref) : ""), [safeHref]);

  // Card content render helpers
  const isError = (r: PreviewResult | null): r is { error: true; message: string } => !!r && "error" in r && r.error;

  const preview = (r: PreviewResult | null): PreviewData | null => {
    if (!r || isError(r)) return null;
    return r;
  };

  const pv = preview(result);

  // Track hover over card for small leave/blur grace period
  const cardMouseEnter = () => {
    if (cardRef.current) (cardRef.current as any).__hovering = true;
  };
  const cardMouseLeave = () => {
    if (cardRef.current) (cardRef.current as any).__hovering = false;
    // close when leaving card if link not focused
    window.setTimeout(() => {
      if (document.activeElement !== linkRef.current) closeCard();
    }, 50);
  };

  // Positioning class
  const placementClass = useMemo(() => {
    switch (placement) {
      case "bottom":
        return styles.bottom;
      case "left":
        return styles.left;
      case "right":
        return styles.right;
      case "top":
      default:
        return styles.top;
    }
  }, [placement]);

  // ARIA: role=tooltip with id, and link gets aria-describedby while open
  return (
    <span className={styles.wrapper}>
      <a
        {...rest}
        ref={linkRef}
        href={safeHref ?? href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-describedby={open ? tooltipId : undefined}
        className={className}
      >
        {children ?? href}
      </a>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          ref={cardRef}
          className={`${styles.card} ${placementClass}`}
          aria-live="polite"
          onMouseEnter={cardMouseEnter}
          onMouseLeave={cardMouseLeave}
        >
          <div className={styles.inner} style={{ minWidth: 280, maxWidth: 360 }}>
            {/* Reserve space to avoid layout shift */}
            <div className={styles.headerArea} aria-hidden="true"></div>

            {loading && (
              <div className={styles.skeleton}>
                <div className={styles.skelImage} />
                <div className={styles.skelTitle} />
                <div className={styles.skelDesc} />
              </div>
            )}

            {!loading && isError(result) && (
              <div className={styles.content}>
                <div className={styles.metaRow}>
                  <span className={styles.domain}>{domain || "Preview"}</span>
                </div>
                <p className={styles.errorMsg}>Preview unavailable</p>
              </div>
            )}

            {!loading && pv && (
              <div className={styles.content}>
                {pv.images?.[0] && (
                  <div className={styles.imageWrap}>
                    <img
                      src={pv.images[0]}
                      alt={pv.title ? `${pv.title} image` : ""}
                      loading="lazy"
                      width={320}
                      height={160}
                    />
                  </div>
                )}

                <div className={styles.textWrap}>
                  <div className={styles.metaRow}>
                    <span className={styles.domain}>{pv.siteName || domain}</span>
                  </div>
                  {pv.title && <h4 className={styles.title}>{pv.title}</h4>}
                  {pv.description && <p className={styles.desc}>{pv.description}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
};
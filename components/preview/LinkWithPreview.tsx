import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { fetchPreviewClientOnly } from "../../services/fetchPreview";
import { getDomain, getOrFetch, type PreviewResult, type PreviewData } from "../../services/previewCache";
import styles from "./LinkWithPreview.module.css";
import { createPortal } from "react-dom";

type Placement = "top" | "bottom" | "left" | "right";

export interface LinkWithPreviewProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  placement?: Placement; // preferred placement; "top" by default, but auto will adjust
  delay?: number; // ms before showing preview on hover/focus
  hideDelay?: number; // ms before hiding on leave/blur
  cacheTTL?: number; // ms
  className?: string;
  children?: React.ReactNode;
  headerOffsetPx?: number; // fixed header height if any, used for top-boundary clamping
  maxWidthPx?: number; // max width for card
  maxHeightPx?: number; // max height for card
}

/**
 * Accessible, client-only link preview. Shows on hover/focus with debounce,
 * hides on leave/blur/scroll/Escape. Prefetches when link enters viewport.
 * Smart auto-positioning with viewport collision avoidance.
 */
export const LinkWithPreview: React.FC<LinkWithPreviewProps> = ({
  href,
  placement = "top",
  delay = 80,
  hideDelay = 280,
  cacheTTL = 60 * 60 * 1000, // 1h
  className,
  children,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  onKeyDown,
  headerOffsetPx = 0,
  maxWidthPx = 360,
  maxHeightPx = 380,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [computedPlacement, setComputedPlacement] = useState<Placement>(placement);

  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const isMounted = useRef(true);
  const rafPos = useRef<number | null>(null);
  const portalEl = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

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

  // Create a global portal container for the floating card (prevents stacking conflicts)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.pointerEvents = "none"; // Let our card manage pointer events
    el.style.zIndex = "2147483646";
    el.style.isolation = "isolate";
    portalEl.current = el;
    document.body.appendChild(el);
    setMounted(true);
    return () => {
      portalEl.current?.parentElement?.removeChild(portalEl.current);
      portalEl.current = null;
      setMounted(false);
    };
  }, []);

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
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (rafPos.current) {
        cancelAnimationFrame(rafPos.current);
        rafPos.current = null;
      }
      removeGlobalListeners();
    };
  }, []);

  const recomputePlacement = useCallback(() => {
    if (!linkRef.current || !cardRef.current) return;

    const trigger = linkRef.current.getBoundingClientRect();
    const card = cardRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    // Calculate available space
    const spaceTop = trigger.top - headerOffsetPx;
    const spaceBottom = vh - trigger.bottom;
    const spaceLeft = trigger.left;
    const spaceRight = vw - trigger.right;

    // Prefer preference, then fallbacks that fit
    const fitsTop = card.height + 12 <= spaceTop;
    const fitsBottom = card.height + 12 <= spaceBottom;
    const fitsLeft = card.width + 12 <= spaceLeft;
    const fitsRight = card.width + 12 <= spaceRight;

    const ordered: Placement[] = (() => {
      switch (placement) {
        case "bottom": return ["bottom", "top", "right", "left"];
        case "left": return ["left", "right", "top", "bottom"];
        case "right": return ["right", "left", "top", "bottom"];
        case "top":
        default: return ["top", "bottom", "right", "left"];
      }
    })();

    const fits: Record<Placement, boolean> = {
      top: fitsTop,
      bottom: fitsBottom,
      left: fitsLeft,
      right: fitsRight,
    };

    const best = ordered.find(p => fits[p]) ?? (spaceBottom >= spaceTop ? "bottom" : "top");
    setComputedPlacement(best);

    // Also clamp horizontally/vertically to viewport to avoid overflow
    const margin = 8;
    let left = 0;
    let top = 0;

    if (best === "top") {
      top = Math.max(headerOffsetPx + margin, trigger.top - card.height - margin);
      left = Math.max(margin, Math.min(trigger.left, vw - card.width - margin));
    } else if (best === "bottom") {
      top = Math.min(vh - card.height - margin, trigger.bottom + margin);
      left = Math.max(margin, Math.min(trigger.left, vw - card.width - margin));
    } else if (best === "left") {
      top = Math.max(headerOffsetPx + margin, Math.min(trigger.top, vh - card.height - margin));
      left = Math.max(margin, trigger.left - card.width - margin);
    } else {
      // right
      top = Math.max(headerOffsetPx + margin, Math.min(trigger.top, vh - card.height - margin));
      left = Math.min(vw - card.width - margin, trigger.right + margin);
    }

    // Apply to fixed-positioned portal card
    const cardEl = cardRef.current;
    cardEl.style.position = "fixed";
    cardEl.style.top = `${Math.round(top)}px`;
    cardEl.style.left = `${Math.round(left)}px`;
    cardEl.style.right = "";
    cardEl.style.bottom = "";
    cardEl.style.maxWidth = `${maxWidthPx}px`;
    cardEl.style.maxHeight = `${maxHeightPx}px`;
    // Enable pointer interactions after it is placed
    cardEl.style.pointerEvents = "auto";
  }, [headerOffsetPx, placement, maxWidthPx, maxHeightPx]);

  const scheduleRecompute = useCallback(() => {
    if (rafPos.current) cancelAnimationFrame(rafPos.current);
    rafPos.current = requestAnimationFrame(() => {
      rafPos.current = null;
      recomputePlacement();
    });
  }, [recomputePlacement]);

  const openCard = useCallback(async () => {
    if (!safeHref) return;
    // If portal element not yet created, create it synchronously as a fallback
    if (!portalEl.current && typeof document !== "undefined") {
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.inset = "0";
      el.style.pointerEvents = "none";
      el.style.zIndex = "2147483646";
      el.style.isolation = "isolate";
      document.body.appendChild(el);
      portalEl.current = el;
      setMounted(true);
      console.debug("[LWP] portal created on-demand");
    }
    if (!portalEl.current) return;

    console.debug("[LWP] openCard: setOpen(true) for", safeHref);
    setOpen(true);

    // Place immediately in next frame for "buttery" feel
    requestAnimationFrame(() => {
      console.debug("[LWP] scheduleRecompute via rAF");
      scheduleRecompute();
    });

    // If we already have data or error, do not refetch immediately
    if (result) {
      console.debug("[LWP] openCard: using existing result");
      return;
    }

    setLoading(true);
    console.debug("[LWP] fetching preview...");
    const r = await getOrFetch(safeHref, (u) => fetchPreviewClientOnly(u), cacheTTL);
    if (!isMounted.current) return;
    setResult(r);
    setLoading(false);
    console.debug("[LWP] fetch complete", r && ("error" in r ? "error" : "ok"));
  }, [safeHref, cacheTTL, result, scheduleRecompute]);

  const closeCard = useCallback(() => {
    setOpen(false);
  }, []);

  const scheduleOpen = useCallback(() => {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    console.debug("[LWP] scheduleOpen: scheduling in", Math.max(0, delay), "ms");
    showTimer.current = window.setTimeout(() => {
      showTimer.current = null;
      console.debug("[LWP] scheduleOpen: firing openCard");
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
    console.debug("[LWP] onMouseEnter");
    // No gating — open on hover reliably
    scheduleOpen();
    addGlobalListeners();
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseLeave?.(e);
    console.debug("[LWP] onMouseLeave");
    cancelScheduledOpen();
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    // Delay close slightly to allow moving pointer into card
    hideTimer.current = window.setTimeout(() => {
      if (!cardRef.current) return closeCard();
      const onOverCard = (cardRef.current as any).__hovering;
      console.debug("[LWP] hideTimer(link): hovering card?", onOverCard);
      if (!onOverCard) closeCard();
    }, Math.max(200, Math.min(600, hideDelay)));
  };

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(e);
    scheduleOpen();
    addGlobalListeners();
  };

  const handleBlur = (e: React.FocusEvent<HTMLAnchorElement>) => {
    onBlur?.(e);
    cancelScheduledOpen();
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    // Close when focus leaves link and card
    hideTimer.current = window.setTimeout(() => {
      if (!cardRef.current) return closeCard();
      const onOverCard = (cardRef.current as any).__hovering;
      if (!onOverCard && document.activeElement !== linkRef.current) closeCard();
    }, Math.max(100, Math.min(700, hideDelay)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    onKeyDown?.(e);
    if (e.key === "Escape") {
      e.stopPropagation();
      closeCard();
    }
  };

  const onScrollOrResize = useCallback(() => {
    // Recompute rather than always close; only close on large scrolls
    if (!open) return;
    scheduleRecompute();
  }, [open, scheduleRecompute]);

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
    console.debug("[LWP] cardMouseEnter");
  };
  const cardMouseLeave = () => {
    if (cardRef.current) (cardRef.current as any).__hovering = false;
    console.debug("[LWP] cardMouseLeave -> close after grace if link not focused");
    // close when leaving card if link not focused
    window.setTimeout(() => {
      if (document.activeElement !== linkRef.current) closeCard();
    }, 120);
  };

  // Positioning class (use computedPlacement)
  const placementClass = useMemo(() => {
    switch (computedPlacement) {
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
  }, [computedPlacement]);

  // ARIA: role=tooltip with id, and link gets aria-describedby while open
  return (
    <span
      className={styles.wrapper}
      style={{ pointerEvents: "auto", position: "relative", zIndex: 1 }}
    >
      <a
        {...rest}
        ref={linkRef}
        href={safeHref ?? href}
        target="_blank"
        rel="noopener noreferrer"
        // Use only mouse events for reliability; remove pointer events to avoid duplication/quirks
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-describedby={open ? tooltipId : undefined}
        aria-haspopup="dialog"
        aria-expanded={open || undefined}
        className={className}
        // Ensure the link is focusable and receives events
        tabIndex={0}
        style={{ pointerEvents: "auto", position: "relative", zIndex: 1 }}
      >
        {children ?? href}
      </a>

      {mounted && open && portalEl.current
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              ref={cardRef}
              className={`${styles.card} ${placementClass}`}
              aria-live="polite"
              onMouseEnter={cardMouseEnter}
              onMouseLeave={cardMouseLeave}
              style={{ minWidth: 280, maxWidth: maxWidthPx, maxHeight: maxHeightPx, pointerEvents: "auto" }}
            >
              <div className={styles.inner}>
                <div className={styles.headerArea} aria-hidden="true"></div>

                {loading && (
                  <div className={styles.skeleton} aria-busy="true">
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
                          decoding="async"
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
            </div>,
            portalEl.current
          )
        : null}
    </span>
  );
};
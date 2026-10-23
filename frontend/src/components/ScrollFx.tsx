"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Site-wide motion that is not tied to one section:
 * - a gold reading-progress line under the header and a back-to-top button with a progress ring;
 * - `data-parallax` media drift against the scroll (their image is scaled up in CSS to leave room);
 * - `data-spotlight` elements get `--mx`/`--my` set to the pointer position, for a glow that follows it.
 * Parallax and the spotlight are skipped with reduced motion.
 */
export function ScrollFx() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parallax = reduce ? [] : Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let frame = 0;

    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      barRef.current?.style.setProperty("transform", `scaleX(${progress})`);
      ringRef.current?.style.setProperty("stroke-dashoffset", String(1 - progress));
      setShowTop(window.scrollY > window.innerHeight * 1.2);

      const vh = window.innerHeight;
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        // -1 when the element enters from below, +1 when it leaves at the top
        const t = (vh - r.top) / (vh + r.height) * 2 - 1;
        el.style.setProperty("--py", `${(t * -6).toFixed(2)}%`);
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-spotlight]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <>
      <div className="progress" aria-hidden="true">
        <div ref={barRef} />
      </div>
      <button
        type="button"
        className={`totop${showTop ? " is-on" : ""}`}
        aria-label="Lên đầu trang"
        tabIndex={showTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" pathLength={1} className="totop__track" />
          <circle ref={ringRef} cx="24" cy="24" r="22" pathLength={1} className="totop__ring" />
          <path d="M24 31V17M18 23l6-6 6 6" />
        </svg>
      </button>
    </>
  );
}

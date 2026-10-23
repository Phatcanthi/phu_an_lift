"use client";

import { useEffect } from "react";

/**
 * Scroll-in animations for the server-rendered sections. Elements marked `data-reveal` get `is-in` when they
 * enter the viewport (`stagger` and `cascade` animate their children one after another, `image` wipes open);
 * `data-count` numbers count up from zero. Content stays fully visible without JS or with
 * reduced motion, because the hidden start state only applies under `html.reveal-ready`.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("reveal-ready");

    const countUp = (el: HTMLElement) => {
      const text = el.dataset.count ?? el.textContent ?? "";
      const match = text.match(/^(\d+)(.*)$/);
      if (!match) return;
      const target = Number(match[1]);
      const rest = match[2];
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1600);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = `${Math.round(target * eased)}${rest}`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add("is-in");
          el.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    // `cascade` blocks stagger their direct children in document order
    document.querySelectorAll('[data-reveal="cascade"]').forEach((el) => {
      Array.from(el.children).forEach((child, i) => (child as HTMLElement).style.setProperty("--i", String(i)));
    });
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}

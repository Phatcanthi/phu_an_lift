"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/content/products";
import { ProductCard } from "./ProductCard";

/** Horizontally scrolling row of product cards with arrow buttons, drag-to-scroll and a progress line. */
export function ProductRail({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? track.scrollLeft / max : 1;
      fillRef.current?.style.setProperty("transform", `scaleX(${Math.max(0.08, p)})`);
      setEdges({ start: track.scrollLeft < 8, end: track.scrollLeft > max - 8 });
    };
    onScroll();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const step = (dir: number) => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    track.scrollBy({ left: dir * (card.offsetWidth + 24), behavior: "smooth" });
  };

  return (
    <div className="rail">
      <div
        ref={trackRef}
        className="rail__track"
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !trackRef.current) return;
          drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const track = trackRef.current;
          if (!d || !track) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 4 && !d.moved) {
            d.moved = true;
            track.classList.add("is-dragging");
          }
          if (d.moved) track.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => {
          trackRef.current?.classList.remove("is-dragging");
          // keep `drag.current` until the click that follows, so a drag does not open a card
          setTimeout(() => (drag.current = null));
        }}
        onPointerLeave={() => {
          trackRef.current?.classList.remove("is-dragging");
          drag.current = null;
        }}
        // links and images are natively draggable, which would cancel the pointer drag
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (drag.current?.moved) e.preventDefault();
        }}
      >
        {products.map((p, i) => (
          <ProductCard key={p.slug} product={p} index={i} sizes="(max-width: 640px) 80vw, 360px" />
        ))}
      </div>
      <div className="rail__foot">
        <span className="rail__progress" aria-hidden="true">
          <span ref={fillRef} />
        </span>
        <div className="rail__arrows">
          <button type="button" className="iconbtn" onClick={() => step(-1)} disabled={edges.start} aria-label="Sản phẩm trước">
            ←
          </button>
          <button type="button" className="iconbtn" onClick={() => step(1)} disabled={edges.end} aria-label="Sản phẩm tiếp theo">
            →
          </button>
        </div>
      </div>
    </div>
  );
}

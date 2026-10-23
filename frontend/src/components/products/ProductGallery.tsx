"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Cross-fading main image with thumbnails, arrow keys/buttons and swipe. Clicking the image opens a
 * full-screen viewer (rendered into <body> so no transformed ancestor can trap it).
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const swipe = useRef<number | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const count = images.length;

  const go = useCallback((dir: number) => setIndex((i) => (i + dir + count) % count), [count]);

  useEffect(() => {
    if (!zoom) return;
    const root = document.documentElement;
    root.classList.add("menu-open");
    closer.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("menu-open");
      window.removeEventListener("keydown", onKey);
      opener.current?.focus();
    };
  }, [zoom, go]);

  const swipeHandlers = {
    onPointerDown: (e: ReactPointerEvent) => (swipe.current = e.clientX),
    onPointerUp: (e: ReactPointerEvent) => {
      if (swipe.current === null) return;
      const dx = e.clientX - swipe.current;
      swipe.current = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    },
  };

  return (
    <div className="gallery">
      <div className="gallery__stage" {...swipeHandlers}>
        {images.map((src, i) => (
          <Image
            key={src + i}
            src={src}
            alt={i === index ? alt : ""}
            aria-hidden={i !== index}
            width={947}
            height={1136}
            sizes="(max-width: 960px) 100vw, 55vw"
            priority={i === 0}
            className={i === index ? "is-active" : undefined}
            draggable={false}
          />
        ))}
        <button ref={opener} type="button" className="gallery__zoom" onClick={() => setZoom(true)} aria-label="Xem ảnh toàn màn hình">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        {count > 1 && (
          <div className="gallery__nav">
            <span className="label">
              <b>{pad(index + 1)}</b> / {pad(count)}
            </span>
            <button type="button" className="iconbtn" onClick={() => go(-1)} aria-label="Ảnh trước">
              ←
            </button>
            <button type="button" className="iconbtn" onClick={() => go(1)} aria-label="Ảnh tiếp theo">
              →
            </button>
          </div>
        )}
      </div>

      {count > 1 && (
        <ul className="gallery__thumbs" aria-label="Chọn ảnh">
          {images.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                className={i === index ? "is-active" : undefined}
                onClick={() => setIndex(i)}
                aria-label={`Ảnh ${i + 1}`}
                aria-current={i === index}
              >
                <Image src={src} alt="" width={160} height={192} sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoom &&
        createPortal(
          <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setZoom(false)}>
            <div className="lightbox__img" onClick={(e) => e.stopPropagation()} {...swipeHandlers}>
              <Image key={index} src={images[index]} alt={alt} width={947} height={1136} sizes="100vw" draggable={false} />
            </div>
            <div className="lightbox__bar" onClick={(e) => e.stopPropagation()}>
              <span className="label">
                {pad(index + 1)} / {pad(count)}
              </span>
              {count > 1 && (
                <>
                  <button type="button" className="iconbtn" onClick={() => go(-1)} aria-label="Ảnh trước">
                    ←
                  </button>
                  <button type="button" className="iconbtn" onClick={() => go(1)} aria-label="Ảnh tiếp theo">
                    →
                  </button>
                </>
              )}
              <button ref={closer} type="button" className="iconbtn" onClick={() => setZoom(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

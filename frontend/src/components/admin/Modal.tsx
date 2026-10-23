"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** Centered dialog: closes on Escape or a click on the backdrop, and gives focus back to what opened it. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus();
    };
  }, [onClose]);

  return (
    <div className="adm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className="adm-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="adm-modal__head">
          <h2>{title}</h2>
          <button type="button" className="adm-iconbtn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

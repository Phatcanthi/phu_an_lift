"use client";

import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { categories, type CategoryId, type Product } from "@/content/products";
import { ProductCard } from "./ProductCard";

type Filter = CategoryId | "all";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/**
 * Category tabs (with a sliding indicator) and a search box over the product grid. The chosen category lives
 * in `?loai=`, so it can be linked to (also from this page) and survives a reload. The prerendered HTML shows
 * every product; the URL is applied once the page is running in the browser.
 */
export function ProductBrowser({ products }: { products: Product[] }) {
  return (
    <Suspense fallback={<Browser products={products} filter="all" />}>
      <BrowserFromUrl products={products} />
    </Suspense>
  );
}

function BrowserFromUrl({ products }: { products: Product[] }) {
  const loai = useSearchParams().get("loai");
  const filter = categories.some((c) => c.id === loai) ? (loai as CategoryId) : "all";
  return <Browser products={products} filter={filter} />;
}

function Browser({ products, filter }: { products: Product[]; filter: Filter }) {
  const [query, setQuery] = useState("");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Next.js keeps useSearchParams in sync with native history updates, without a server round trip. The state
  // must be null: passing Next's own history state marks the call as internal and skips the sync.
  const choose = (f: Filter) => {
    const url = new URL(window.location.href);
    if (f === "all") url.searchParams.delete("loai");
    else url.searchParams.set("loai", f);
    window.history.replaceState(null, "", url);
  };

  // move the indicator under the active tab
  useLayoutEffect(() => {
    const tabs = tabsRef.current;
    const place = () => {
      const active = tabs?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!tabs || !active) return;
      tabs.style.setProperty("--ind-x", `${active.offsetLeft}px`);
      tabs.style.setProperty("--ind-w", `${active.offsetWidth}px`);
    };
    place();
    // tab widths change once the web font has loaded
    document.fonts?.ready.then(place);
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [filter]);

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    return products.filter(
      (p) =>
        (filter === "all" || p.category === filter) &&
        (!q || normalize(`${p.name} ${p.nameEn} ${p.tagline} ${p.applications.join(" ")}`).includes(q)),
    );
  }, [products, filter, query]);

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: products.length },
    ...categories.map((c) => ({ id: c.id, label: c.label, count: products.filter((p) => p.category === c.id).length })),
  ];

  return (
    <>
      <div className="browser__bar">
        <div ref={tabsRef} className="tabs" role="tablist" aria-label="Danh mục sản phẩm">
          <span className="tabs__indicator" aria-hidden="true" />
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filter === t.id}
              aria-controls="product-grid"
              onClick={() => choose(t.id)}
            >
              {t.label}
              <sup>{t.count}</sup>
            </button>
          ))}
        </div>
        <label className="search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <span className="sr-only">Tìm sản phẩm</span>
          <input type="search" placeholder="Tìm theo tên, công trình…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      <p className="browser__count label" aria-live="polite">
        Hiển thị {shown.length} / {products.length} sản phẩm
      </p>

      {shown.length > 0 ? (
        // keyed by the category so switching tabs replays the entrance stagger
        <div id="product-grid" key={filter} className="pgrid" role="tabpanel">
          {shown.map((p, i) => (
            <ProductCard
              key={p.slug}
              product={p}
              index={products.indexOf(p)}
              style={{ "--i": Math.min(i, 8) } as CSSProperties}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>Không tìm thấy sản phẩm phù hợp</h3>
          <p className="muted">Thử từ khóa khác, hoặc liên hệ để được tư vấn giải pháp riêng cho công trình của bạn.</p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setQuery("");
              choose("all");
            }}
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      )}
    </>
  );
}

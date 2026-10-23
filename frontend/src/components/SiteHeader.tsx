"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { company, navItems } from "@/content/site";

const tel = (s: string) => `tel:${s.replace(/[^\d+]/g, "")}`;

/**
 * Transparent over the full-screen hero, frosted once the page has scrolled past it. Below the hero it
 * slides away while scrolling down and returns on the way up. Small screens get a full-screen menu.
 * On the home page the link of the section in view is highlighted; elsewhere the link matching the route.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [spy, setSpy] = useState<string | null>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    const sections = pathname === "/" ? navItems.map((n) => document.getElementById(n.section)) : [];
    const onScroll = () => {
      const y = window.scrollY;
      const hero = document.getElementById("top");
      const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - window.innerHeight * 0.5 : 80;
      const past = y > heroEnd;
      setSolid(past);
      if (!past || y < lastY - 4) setHidden(false);
      else if (y > lastY + 4) setHidden(true);
      lastY = y;

      let current: string | null = null;
      sections.forEach((el) => {
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) current = el.id;
      });
      setSpy(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (n: (typeof navItems)[number]) =>
    pathname === "/" ? spy === n.section : n.href !== "/" && !n.href.startsWith("/#") && pathname.startsWith(n.href);

  return (
    <header className={`nav${solid ? " is-solid" : ""}${hidden && !open ? " is-hidden" : ""}${open ? " is-open" : ""}`}>
      <div className="nav__inner">
        <Link href="/" className="brand" aria-label={company.name} onClick={() => setOpen(false)}>
          <Image src="/images/logo.png" alt="" width={236} height={180} priority className="brand__logo" />
          <span className="brand__text">
            <span className="brand__name">Thang máy</span>
            <span className="label label--gold">Phú An</span>
          </span>
        </Link>
        <nav className="nav__links" aria-label="Điều hướng chính">
          {navItems.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={isActive(n) ? "is-active" : undefined}
              aria-current={isActive(n) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <a className="btn btn--outline nav__cta" href={tel(company.hotline)}>
          Gọi {company.hotline}
        </a>
        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <i />
          <i />
        </button>
      </div>

      <div id="mobile-menu" className="menu" hidden={!open}>
        <nav aria-label="Điều hướng (di động)">
          {navItems.map((n, i) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} style={{ "--i": i } as CSSProperties}>
              <span className="menu__num">{String(i + 1).padStart(2, "0")}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <a className="btn btn--solid" href={tel(company.hotline)}>
          Gọi {company.hotline}
        </a>
      </div>
    </header>
  );
}

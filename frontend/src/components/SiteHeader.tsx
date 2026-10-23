"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { defaultLocale, localizedPath, locales, stripLocale } from "@/i18n/config";
import { Link } from "@/i18n/Link";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";

type NavItem = { label: string; href: string; section: string };

const tel = (s: string) => `tel:${s.replace(/[^\d+]/g, "")}`;

/**
 * Transparent over the full-screen hero, frosted once the page has scrolled past it. Below the hero it
 * slides away while scrolling down and returns on the way up. Small screens get a full-screen menu.
 * On the home page the link of the section in view is highlighted; elsewhere the link matching the route.
 */
export function SiteHeader({ navItems, hotline, name }: { navItems: NavItem[]; hotline: string; name: string }) {
  const locale = useLocale();
  const m = useMessages().header;
  const router = useRouter();
  const rawPath = usePathname();
  // routes are written without a locale prefix, so compare against the path with it removed
  const pathname = stripLocale(rawPath);
  const other = locales.find((l) => l !== locale) ?? defaultLocale;
  const switchHref = localizedPath(other, pathname);
  // keep the query string and anchor (e.g. the product filter) when switching language
  const switchLocale = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push(switchHref + window.location.search + window.location.hash);
  };
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
  }, [pathname, navItems]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (n: NavItem) =>
    pathname === "/" ? spy === n.section : n.href !== "/" && !n.href.startsWith("/#") && pathname.startsWith(n.href);

  return (
    <header className={`nav${solid ? " is-solid" : ""}${hidden && !open ? " is-hidden" : ""}${open ? " is-open" : ""}`}>
      <div className="nav__inner">
        <Link href="/" className="brand" aria-label={name} onClick={() => setOpen(false)}>
          <Image src="/images/logo.png" alt="" width={236} height={180} priority className="brand__logo" />
          <span className="brand__text">
            <span className="brand__name">{m.brandTop}</span>
            <span className="label label--gold">{m.brandBottom}</span>
          </span>
        </Link>
        <nav className="nav__links" aria-label={m.mainNav}>
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
        <a className="btn btn--outline nav__cta" href={tel(hotline)}>
          {m.call(hotline)}
        </a>
        {/* the dashboard lives outside the localized site, so this link is not locale-prefixed */}
        <a className="nav__login label" href="/admin/login" aria-label={m.login}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
          </svg>
          <span className="nav__logintext">{m.login}</span>
        </a>
        <a
          className="nav__lang label"
          href={switchHref}
          hrefLang={other}
          lang={other}
          aria-label={m.switchAria}
          onClick={switchLocale}
        >
          {m.switchLabel}
        </a>
        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? m.closeMenu : m.openMenu}
          onClick={() => setOpen((v) => !v)}
        >
          <i />
          <i />
        </button>
      </div>

      <div id="mobile-menu" className="menu" hidden={!open}>
        <nav aria-label={m.mobileNav}>
          {navItems.map((n, i) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} style={{ "--i": i } as CSSProperties}>
              <span className="menu__num">{String(i + 1).padStart(2, "0")}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <a className="btn btn--solid" href={tel(hotline)}>
          {m.call(hotline)}
        </a>
        <div className="menu__row">
          <a className="btn btn--ghost" href="/admin/login">
            {m.login}
          </a>
          <a className="nav__lang label" href={switchHref} hrefLang={other} lang={other} aria-label={m.switchAria} onClick={switchLocale}>
            {m.switchLabel}
          </a>
        </div>
      </div>
    </header>
  );
}

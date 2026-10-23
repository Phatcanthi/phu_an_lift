"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { company, hero, technology } from "@/content/site";
import { finishes } from "./cabinStyles";
import { createSceneState, INSIDE_THRESHOLD } from "./sceneState";

const ElevatorCanvas = dynamic(() => import("./ElevatorCanvas"), { ssr: false });

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const order = (i: number) => ({ "--i": i }) as CSSProperties;

// Stops along the camera path. The captions reuse the catalogue's technology items, each shown where it
// fits the shot (the door technology while the doors open, the quiet drive while stepping in).
const chapters = [
  { at: 0, label: "Sảnh" },
  { at: 0.22, label: "Kiến trúc", item: technology.items[0] },
  { at: 0.42, label: "Cửa tầng", item: technology.items[2] },
  { at: 0.62, label: "Bước vào", item: technology.items[1] },
  { at: INSIDE_THRESHOLD, label: "Cabin" },
];
/** The loader stays up at least this long so it never just flashes. */
const MIN_LOADER_MS = 1400;

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Shows the scroll-driven 3D elevator when the device allows it, otherwise the static hero
 * that was rendered on the server (also used for search engines and reduced-motion users).
 * The link `/#cabin` opens the page already inside the cabin.
 */
export function HeroExperience({ fallback }: { fallback: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (!reduceMotion && !saveData && canUseWebGL()) setEnabled(true);
  }, []);

  return enabled ? <ScrollScene onFail={() => setEnabled(false)} /> : <>{fallback}</>;
}

function ScrollScene({ onFail }: { onFail: () => void }) {
  const stateRef = useRef(createSceneState());
  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const railFillRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const firstUpdate = useRef(true);

  const [finishIndex, setFinishIndex] = useState(0);
  const [inside, setInside] = useState(false);
  const [doorOpen, setDoorOpen] = useState(true);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [caption, setCaption] = useState(-1);
  const [bloom] = useState(() => window.matchMedia("(min-width: 900px) and (pointer: fine)").matches);

  const update = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const s = stateRef.current;
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = clamp(-rect.top / total, 0, 1);
    s.progress = p;
    // Page opened (or reloaded) part-way down: jump to the pose instead of animating from the start.
    if (firstUpdate.current) {
      firstUpdate.current = false;
      if (p > 0.02) s.snap = true;
    }

    if (introRef.current) {
      const o = clamp(1 - (p - 0.04) / 0.12, 0, 1);
      introRef.current.style.opacity = String(o);
      introRef.current.style.pointerEvents = o < 0.2 ? "none" : "auto";
      introRef.current.style.transform = `translateY(${(1 - o) * -40}px)`;
    }
    if (hintRef.current) hintRef.current.style.opacity = String(clamp(1 - p / 0.05, 0, 1));
    if (railFillRef.current) railFillRef.current.style.transform = `scaleY(${p})`;
    // The page is over once the scene has scrolled away; hide the rail before the next section arrives.
    if (railRef.current) railRef.current.style.opacity = String(clamp((1 - p) / 0.03, 0, 1));

    let current = 0;
    chapters.forEach((c, i) => {
      if (p >= c.at) current = i;
    });
    setChapter((prev) => (prev === current ? prev : current));
    const next = chapters[current + 1]?.at ?? 1;
    const shown = chapters[current].item && p > chapters[current].at + 0.01 && p < next - 0.035 ? current : -1;
    setCaption((prev) => (prev === shown ? prev : shown));

    const isInside = p > INSIDE_THRESHOLD;
    setInside((prev) => (prev === isInside ? prev : isInside));
    if (p < INSIDE_THRESHOLD - 0.04 && s.manualDoor !== null) {
      s.manualDoor = null;
      s.yawTarget = 0;
      s.pitchTarget = 0;
      setDoorOpen(true);
    }
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (section && window.location.hash === "#cabin") {
      const total = section.offsetHeight - window.innerHeight;
      window.scrollTo(0, section.offsetTop + total * 0.97);
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [update]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Parallax: the camera leans slightly towards the pointer.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const s = stateRef.current;
      s.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      s.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (countRef.current) countRef.current.textContent = "100";
    if (barRef.current) barRef.current.style.transform = "scaleX(1)";
    const wait = Math.max(0, MIN_LOADER_MS - performance.now());
    const id = window.setTimeout(() => setRevealed(true), wait + 350);
    return () => window.clearTimeout(id);
  }, [ready]);

  const onProgress = useCallback((ratio: number) => {
    if (countRef.current) countRef.current.textContent = String(Math.round(ratio * 99));
    if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
  }, []);

  useEffect(() => {
    if (!inside) return;
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === "ArrowLeft") s.yawTarget = clamp(s.yawTarget + 0.3, -2.6, 2.6);
      if (e.key === "ArrowRight") s.yawTarget = clamp(s.yawTarget - 0.3, -2.6, 2.6);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inside]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!inside || (e.target as HTMLElement).closest("button, a")) return;
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    const s = stateRef.current;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    s.yawTarget = clamp(s.yawTarget - dx * 0.006, -2.6, 2.6);
    if (e.pointerType === "mouse") s.pitchTarget = clamp(s.pitchTarget - dy * 0.004, -0.7, 0.7);
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const toggleDoor = () => {
    const s = stateRef.current;
    const next = !(s.manualDoor ?? true);
    s.manualDoor = next;
    setDoorOpen(next);
  };

  /** Scrolls to a chapter, landing a little past its start so its caption is showing. */
  const goTo = (i: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const at = i === 0 ? 0 : i === chapters.length - 1 ? 0.97 : chapters[i].at + 0.06;
    const total = section.offsetHeight - window.innerHeight;
    window.scrollTo({ top: section.offsetTop + total * at, behavior: "smooth" });
  };

  const current = finishes[finishIndex];

  return (
    <section id="top" ref={sectionRef} className="scene" aria-label="Cảnh 3D thang máy">
      <div
        className={`scene__sticky${inside ? " is-inside" : ""}${ready ? " is-ready" : ""}${revealed ? " is-revealed" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="scene__canvas">
          <ElevatorCanvas
            stateRef={stateRef}
            finishIndex={finishIndex}
            active={active}
            bloom={bloom}
            onReady={() => setReady(true)}
            onProgress={onProgress}
            onError={onFail}
          />
        </div>
        <div className="scene__vignette" aria-hidden="true" />
        <div className="scene__grain" aria-hidden="true" />

        <div ref={introRef} className="scene__intro wrap">
          <div className="scene__brandrow rv" style={order(0)}>
            <Image src="/images/catalogue/elite-logo.png" alt={company.brand} width={172} height={172} className="hero__brand" priority />
            <span className="badge">
              <i aria-hidden="true" />
              {hero.badge}
            </span>
          </div>
          <h1 className="scene__title">
            <span className="mask">
              <span style={order(1)}>{hero.title[0]}</span>
            </span>
            <span className="mask">
              <span style={order(2)}>{hero.title[1]}</span>
            </span>
            <em className="mask">
              <span style={order(3)}>{hero.accent}</span>
            </em>
          </h1>
          <div className="scene__introfoot">
            <p className="lead rv" style={order(4)}>
              {hero.lead}
            </p>
            <div className="hero__actions rv" style={order(5)}>
              <a className="btn btn--solid" href="#products">
                <span>Khám phá sản phẩm</span> <span aria-hidden="true">→</span>
              </a>
              <a className="btn btn--ghost" href="#contact">
                <span>Đặt lịch khảo sát</span>
              </a>
            </div>
          </div>
        </div>

        <div className="scene__captions" aria-hidden="true">
          {chapters.map(
            (c, i) =>
              c.item && (
                <div key={c.label} className={`caption${caption === i ? " is-on" : ""}${i % 2 ? " caption--left" : ""}`}>
                  <span className="caption__num">{String(i).padStart(2, "0")}</span>
                  <span className="label label--gold caption__kicker">{c.label}</span>
                  <h2 className="mask">
                    <span>{c.item.title}</span>
                  </h2>
                  <p>{c.item.text}</p>
                </div>
              ),
          )}
        </div>

        <nav ref={railRef} className="scene__rail" aria-label="Các chặng của cảnh 3D">
          <span className="scene__railtrack" aria-hidden="true">
            <i ref={railFillRef} />
          </span>
          <ol>
            {chapters.map((c, i) => (
              <li key={c.label}>
                <button
                  type="button"
                  className={i === chapter ? "is-active" : i < chapter ? "is-past" : ""}
                  onClick={() => goTo(i)}
                  aria-current={i === chapter ? "step" : undefined}
                >
                  <span className="label">{c.label}</span>
                  <i aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div ref={hintRef} className="scene__hint" aria-hidden="true">
          <span className="scene__mouse">
            <i />
          </span>
          <span className="label">Cuộn để bước vào thang máy</span>
        </div>

        <div className={`scene__panel${inside ? " is-on" : ""}`} aria-hidden={!inside}>
          <div className="scene__panelhead">
            <div>
              <span className="label label--gold">Hoàn thiện vách cabin</span>
              <h2>{current.name}</h2>
            </div>
            <button type="button" className="btn btn--outline" onClick={toggleDoor} tabIndex={inside ? 0 : -1}>
              {doorOpen ? "Đóng cửa" : "Mở cửa"}
            </button>
          </div>
          <ul className="scene__styles" aria-label="Chọn màu hoàn thiện">
            {finishes.map((f, i) => (
              <li key={f.code}>
                <button
                  type="button"
                  className={i === finishIndex ? "is-active" : ""}
                  onClick={() => setFinishIndex(i)}
                  aria-pressed={i === finishIndex}
                  tabIndex={inside ? 0 : -1}
                >
                  <span className="scene__swatch" style={{ background: f.swatch }} aria-hidden="true" />
                  <span className="label">{f.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="scene__note">
            Kéo chuột (hoặc vuốt ngang) để nhìn quanh. Màu chỉ mang tính minh họa; các mẫu họa tiết xem ở phần Cabin bên dưới.
          </p>
        </div>

        <a className="scene__skip label" href="#about">
          Bỏ qua cảnh 3D
        </a>

        <div className="loader" aria-hidden="true">
          <div className="loader__inner">
            <Image src="/images/catalogue/elite-logo.png" alt="" width={172} height={172} className="loader__logo" />
            <span className="loader__count">
              <span ref={countRef}>0</span>
              <small>%</small>
            </span>
            <span className="loader__bar">
              <i ref={barRef} />
            </span>
            <span className="label">Đang chuẩn bị không gian</span>
          </div>
        </div>
      </div>
    </section>
  );
}

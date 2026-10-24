"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FormEvent, PointerEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { startSession } from "@/admin/auth";
import { useMessages } from "@/i18n/LocaleProvider";

// The only area that exists so far is the dashboard prototype, so a (mock) sign-in lands there.
const AFTER_SIGN_IN = "/admin";
// How long the doors take to close before the route changes (matches the CSS animation).
const CLOSE_MS = 1250;

type Problem = { field: "email" | "password"; text: string; tick: number };

const Eye = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

/**
 * Sign-in page. The page opens like a cabin door (two steel panels slide apart); a successful sign-in closes
 * them again before moving on. Pointer position drives a slight parallax on the photograph and a soft light
 * on the form, both through CSS variables so nothing re-renders while the mouse moves.
 */
export function LoginExperience({ slogan }: { slogan: string }) {
  const m = useMessages().login;
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const submitBtn = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width) * 2 - 1));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height) * 2 - 1));
    const p = panel.current?.getBoundingClientRect();
    if (p && panel.current) {
      panel.current.style.setProperty("--mx", `${e.clientX - p.left}px`);
      panel.current.style.setProperty("--my", `${e.clientY - p.top}px`);
    }
  };

  // The button leans a few pixels towards the pointer.
  const lean = (e: PointerEvent<HTMLButtonElement>) => {
    const b = submitBtn.current;
    if (!b || e.pointerType !== "mouse") return;
    const r = b.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 14;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 8;
    b.style.transform = `translate(${x}px, ${y}px)`;
  };
  const settle = () => {
    if (submitBtn.current) submitBtn.current.style.transform = "";
  };

  const fail = (field: Problem["field"], text: string) => {
    setProblem((p) => ({ field, text, tick: (p?.tick ?? 0) + 1 }));
    (field === "email" ? emailInput : passwordInput).current?.focus();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (closing) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("email", m.errEmail);
    if (!password) return fail("password", m.errPassword);
    setProblem(null);
    startSession(email.trim());
    router.prefetch(AFTER_SIGN_IN);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(AFTER_SIGN_IN);
      return;
    }
    setClosing(true);
    timer.current = window.setTimeout(() => router.push(AFTER_SIGN_IN), CLOSE_MS);
  };

  const invalid = (f: Problem["field"]) => problem?.field === f;

  return (
    <main ref={root} className={`lgn${closing ? " is-closing" : ""}`} onPointerMove={onMove}>
      <div className="lgn__bg" aria-hidden="true">
        <span className="lgn__ghost">{m.ghost}</span>
      </div>

      <div className="wrap lgn__grid">
        <figure className="lgn__stage">
          <span className="lgn__outline" aria-hidden="true" />
          <div className="lgn__frame">
            <div className="lgn__zoom">
              <Image
                src="/images/catalogue/hero-living-room.jpg"
                alt=""
                fill
                priority
                sizes="(max-width: 960px) 100vw, 46vw"
                className="lgn__photo"
              />
            </div>
            <div className="lgn__shade" />
            <figcaption className="lgn__cap">
              <span className="label label--gold">{m.caption}</span>
              <p>{slogan}</p>
            </figcaption>
          </div>
        </figure>

        <div ref={panel} className="lgn__panel">
          {["tl", "tr", "bl", "br"].map((c) => (
            <i key={c} className={`lgn__tick lgn__tick--${c}`} aria-hidden="true" />
          ))}

          <form onSubmit={submit} noValidate>
            <span className="label label--gold lgn__kicker">{m.kicker}</span>
            <h1 className="lgn__title">
              <span className="mask">
                <span>{m.line1}</span>
              </span>
              <span className="mask" style={{ "--i": 1 } as CSSProperties}>
                <span>
                  <em>{m.line2}</em>
                </span>
              </span>
            </h1>
            <p className="lgn__lead">{m.lead}</p>

            <div className="lgn__field" style={{ "--i": 0 } as CSSProperties}>
              <input
                ref={emailInput}
                id="lgn-email"
                className="lgn__input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (problem?.field === "email") setProblem(null);
                }}
                autoComplete="off"
                placeholder=" "
                aria-invalid={invalid("email")}
                aria-describedby={invalid("email") ? errorId : undefined}
              />
              <label htmlFor="lgn-email">{m.email}</label>
              <span className="lgn__bar" aria-hidden="true" />
            </div>

            <div className="lgn__field" style={{ "--i": 1 } as CSSProperties}>
              <input
                ref={passwordInput}
                id="lgn-password"
                className="lgn__input"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (problem?.field === "password") setProblem(null);
                }}
                autoComplete="off"
                placeholder=" "
                aria-invalid={invalid("password")}
                aria-describedby={invalid("password") ? errorId : undefined}
              />
              <label htmlFor="lgn-password">{m.password}</label>
              <span className="lgn__bar" aria-hidden="true" />
              <button
                type="button"
                className="lgn__eye"
                aria-pressed={show}
                aria-label={show ? m.hide : m.show}
                onClick={() => setShow((s) => !s)}
              >
                <Eye off={show} />
              </button>
            </div>

            <p id={errorId} key={problem?.tick ?? 0} className="lgn__error" role="alert">
              {problem?.text}
            </p>

            <button
              ref={submitBtn}
              type="submit"
              className="btn btn--solid lgn__submit"
              disabled={closing}
              onPointerMove={lean}
              onPointerLeave={settle}
            >
              {closing ? m.submitting : m.submit} <span aria-hidden="true">→</span>
            </button>

            <p className="lgn__note">
              <strong>{m.demoTitle}</strong> {m.demo}
            </p>
          </form>
        </div>
      </div>

      {/* decorative intro and outro: two steel door panels over the whole screen */}
      <div className="lgn__doors" aria-hidden="true">
        <div className="lgn__door lgn__door--l" />
        <div className="lgn__door lgn__door--r" />
        <div className="lgn__mark">
          <Image src="/images/logo.png" alt="" width={236} height={180} className="lgn__logo" />
          <span className="label label--gold">Thang máy Phú An</span>
        </div>
      </div>
    </main>
  );
}

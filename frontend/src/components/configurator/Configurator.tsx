"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { useMessages } from "@/i18n/LocaleProvider";
import { defaultSelection, groupOrder, groups, presets } from "./config";
import type { GroupId, Selection, ViewId } from "./config";

// three.js touches `window`, so the canvas only loads in the browser.
const CabinCanvas = dynamic(() => import("./CabinCanvas"), { ssr: false });

const views: ViewId[] = ["lobby", "inside", "room"];
const selectionIds = Object.keys(defaultSelection) as Exclude<GroupId, "preset">[];

type Status = "loading" | "ready" | "error";

/** Reads `?floor=stoneGrey&...&preset=rose` back into a selection; unknown codes are ignored. */
function readUrl(search: string): { selection: Selection; preset: string | null } {
  const params = new URLSearchParams(search);
  const named = presets.find((p) => p.code === params.get("preset"));
  const selection = { ...(named?.picks ?? defaultSelection) };
  let changed = false;
  for (const id of selectionIds) {
    const code = params.get(id);
    if (code && code !== selection[id] && groups.find((g) => g.id === id)?.options.some((o) => o.code === code)) {
      selection[id] = code;
      changed = true;
    }
  }
  // A template with edits on top is no longer that template.
  return { selection, preset: named ? (changed ? null : named.code) : changed ? null : "inox" };
}

export function Configurator({ email }: { email: string }) {
  const m = useMessages().customize;
  const [selection, setSelection] = useState<Selection>(defaultSelection);
  const [preset, setPreset] = useState<string | null>("inox");
  const [view, setView] = useState<ViewId>("lobby");
  const [tab, setTab] = useState<GroupId>("preset");
  const [doorsOpen, setDoorsOpen] = useState(true);
  const [status, setStatus] = useState<Status>("loading");
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [restored, setRestored] = useState(false);

  // Restore a shared configuration from the address, then keep the address in step with the choices.
  useEffect(() => {
    const saved = readUrl(window.location.search);
    setSelection(saved.selection);
    setPreset(saved.preset);
    const savedView = new URLSearchParams(window.location.search).get("view");
    if (views.some((v) => v === savedView)) setView(savedView as ViewId);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    const params = new URLSearchParams();
    if (preset && preset !== "inox") params.set("preset", preset);
    for (const id of selectionIds) if (selection[id] !== defaultSelection[id]) params.set(id, selection[id]);
    if (view !== "lobby") params.set("view", view);
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
  }, [selection, preset, view, restored]);

  const choose = (id: Exclude<GroupId, "preset">, code: string) => {
    setSelection((s) => ({ ...s, [id]: code }));
    setPreset(null);
  };
  const choosePreset = (code: string) => {
    const p = presets.find((x) => x.code === code);
    if (!p) return;
    setSelection({ ...p.picks });
    setPreset(code);
  };
  const reset = () => choosePreset("inox");

  const onReady = useCallback(() => setStatus("ready"), []);
  const onError = useCallback(() => setStatus("error"), []);

  const summary = () => {
    const lines: string[] = [];
    if (preset) lines.push(`${m.groups.preset}: ${m.presets[preset]}`);
    for (const g of groups) {
      if (g.options.length === 0) continue;
      lines.push(`${m.groups[g.id]}: ${m.options[selection[g.id]] ?? selection[g.id]}`);
    }
    return lines.join("\n");
  };

  const shareUrl = () => window.location.origin + window.location.pathname + window.location.search;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${summary()}\n${shareUrl()}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (insecure origin or denied permission): nothing useful to do
    }
  };

  const quote = () => {
    const body = `${m.mailIntro}\n\n${summary()}\n\n${m.mailLink}: ${shareUrl()}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(m.mailSubject)}&body=${encodeURIComponent(body)}`;
  };

  const group = tab === "preset" ? null : groups.find((g) => g.id === tab) ?? null;
  const current = group ? selection[group.id] : null;

  // Arrow keys move between the tabs, as a tablist is expected to.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = groupOrder[(groupOrder.indexOf(tab) + step + groupOrder.length) % groupOrder.length];
    setTab(next);
    document.getElementById(`cfg-tab-${next}`)?.focus();
  };

  return (
    <div className="cfg">
      <div className="cfg__stage">
        <div className="cfg__canvas">
          <CabinCanvas
            selection={selection}
            view={view}
            doorsOpen={doorsOpen}
            onReady={onReady}
            onError={onError}
            onProgress={setProgress}
            label={m.canvasLabel}
          />
          {status !== "ready" && (
            <div className="cfg__overlay label" role="status">
              {status === "error" ? m.failed : `${m.loading} ${progress > 0 ? Math.round(progress * 100) + "%" : ""}`}
            </div>
          )}
          {status === "ready" && <p className="cfg__hint">{view === "inside" ? m.hintInside : m.hint}</p>}
        </div>

        <div className="cfg__bar">
          <div className="cfg__seg" role="group" aria-label={m.viewLabel}>
            {views.map((v) => (
              <button key={v} type="button" className="cfg__segbtn" aria-pressed={view === v} onClick={() => setView(v)}>
                {m.views[v]}
              </button>
            ))}
          </div>
          <button type="button" className="cfg__toggle" aria-pressed={doorsOpen} onClick={() => setDoorsOpen((o) => !o)}>
            {doorsOpen ? m.doorClose : m.doorOpen}
          </button>
        </div>
      </div>

      <aside className="cfg__panel" aria-label={m.panelTitle}>
        <div className="cfg__tabs" role="tablist" aria-label={m.tabsLabel} onKeyDown={onTabKey}>
          {groupOrder.map((id) => (
            <button
              key={id}
              id={`cfg-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="cfg-tabpanel"
              tabIndex={tab === id ? 0 : -1}
              className="cfg__tab"
              onClick={() => setTab(id)}
            >
              {m.groups[id]}
            </button>
          ))}
        </div>

        <div id="cfg-tabpanel" role="tabpanel" aria-labelledby={`cfg-tab-${tab}`} className="cfg__body">
          <h2 className="cfg__title">{m.groups[tab]}</h2>

          {tab === "preset" && (
            <>
              <p className="muted cfg__note">{m.presetNote}</p>
              <div className="cfg__cards" role="radiogroup" aria-label={m.groups.preset}>
                {presets.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    role="radio"
                    aria-checked={preset === p.code}
                    className="cfg__card"
                    onClick={() => choosePreset(p.code)}
                  >
                    <span className="cfg__dots" aria-hidden="true">
                      {p.swatches.map((c, i) => (
                        <i key={i} style={{ background: c }} />
                      ))}
                    </span>
                    <span className="cfg__name">{m.presets[p.code]}</span>
                  </button>
                ))}
              </div>
              {!preset && <p className="cfg__custom">{m.presetCustom}</p>}
            </>
          )}

          {group && group.options.length === 0 && <p className="muted cfg__note">{m.unavailable}</p>}

          {group && group.options.length > 0 && (
            <div className="cfg__cards" role="radiogroup" aria-label={m.groups[group.id]}>
              {group.options.map((o) => (
                <button
                  key={o.code}
                  type="button"
                  role="radio"
                  aria-checked={current === o.code}
                  className="cfg__card"
                  onClick={() => choose(group.id, o.code)}
                >
                  <i className={o.hide ? "cfg__sw cfg__sw--none" : "cfg__sw"} style={{ background: o.swatch }} aria-hidden="true" />
                  <span className="cfg__name">{m.options[o.code]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cfg__foot">
          <button type="button" className="cfg__cta" onClick={quote}>
            {m.requestQuote} <span aria-hidden="true">→</span>
          </button>
          <div className="cfg__row">
            <button type="button" className="cfg__btn" onClick={copy}>
              {copied ? m.copied : m.copy}
            </button>
            <button type="button" className="cfg__btn" onClick={reset}>
              {m.reset}
            </button>
          </div>
          <p className="muted cfg__note">{m.note}</p>
        </div>
      </aside>
    </div>
  );
}

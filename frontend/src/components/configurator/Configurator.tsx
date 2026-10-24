"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { useMessages } from "@/i18n/LocaleProvider";
import { defaultSelection, finishGroups, finishes, groupOrder, groups, presets } from "./config";
import type { FinishPicks, GroupId, Selection, Space, ViewId } from "./config";

// three.js touches `window`, so the canvas only loads in the browser.
const CabinCanvas = dynamic(() => import("./CabinCanvas"), { ssr: false });

const spaces: Space[] = ["room", "lift"];
/** The views offered for each space; the last one is the wide shot. */
const viewsFor: Record<Space, ViewId[]> = {
  room: ["lobby", "demo", "panel", "inside", "room"],
  lift: ["lobby", "demo", "panel", "inside", "angle"],
};
const wideView: Record<Space, ViewId> = { room: "room", lift: "angle" };
/** Tabs that are about the landing side of the lift: they look at the demo wall beside it. */
const demoTabs: GroupId[] = ["landingDoor", "hallButtons", "doorFrame"];
/** Views a tab moves the camera to, and back to the lobby when another tab is chosen. */
const tabViews: Partial<Record<GroupId, ViewId>> = { ...Object.fromEntries(demoTabs.map((t) => [t, "demo"])), cabinButtons: "panel" };
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
  const [picks, setPicks] = useState<FinishPicks>({});
  const [space, setSpace] = useState<Space>("room");
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
    const params = new URLSearchParams(window.location.search);
    const savedPicks: FinishPicks = {};
    for (const id of finishGroups) {
      const code = params.get(`finish_${id}`);
      if (finishes.some((f) => f.code === code)) savedPicks[id] = code as string;
    }
    setPicks(savedPicks);
    const savedSpace: Space = params.get("space") === "lift" ? "lift" : "room";
    setSpace(savedSpace);
    const savedView = params.get("view");
    if (viewsFor[savedSpace].some((v) => v === savedView)) setView(savedView as ViewId);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    const params = new URLSearchParams();
    if (preset && preset !== "inox") params.set("preset", preset);
    for (const id of selectionIds) if (selection[id] !== defaultSelection[id]) params.set(id, selection[id]);
    for (const id of finishGroups) if (picks[id]) params.set(`finish_${id}`, picks[id] as string);
    if (space !== "room") params.set("space", space);
    if (view !== "lobby") params.set("view", view);
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
  }, [selection, preset, picks, view, space, restored]);

  const chooseSpace = (next: Space) => {
    setSpace(next);
    // the wide shot differs per space: keep the viewer on a wide shot rather than on one that no longer exists
    if (view === wideView.room || view === wideView.lift) setView(wideView[next]);
  };

  const choose = (id: Exclude<GroupId, "preset">, code: string) => {
    setSelection((s) => ({ ...s, [id]: code }));
    // a finish belongs to the style it was chosen for
    setPicks((p) => ({ ...p, [id]: undefined }));
    setPreset(null);
  };
  const chooseFinish = (id: Exclude<GroupId, "preset">, code: string) => {
    setPicks((p) => ({ ...p, [id]: code === "finishOriginal" ? undefined : code }));
    setPreset(null);
  };
  const choosePreset = (code: string) => {
    const p = presets.find((x) => x.code === code);
    if (!p) return;
    setSelection({ ...p.picks });
    setPicks({});
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
      const finish = picks[g.id];
      lines.push(`${m.groups[g.id]}: ${m.options[selection[g.id]] ?? selection[g.id]}${finish ? ` (${m.options[finish]})` : ""}`);
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

  // The landing side is shown on the demo wall and the cabin buttons close up; leaving brings the camera back
  const chooseTab = (next: GroupId) => {
    setTab(next);
    const to = tabViews[next];
    if (to) setView(to);
    else if (view === "demo" || view === "panel") setView("lobby");
  };

  const group = tab === "preset" ? null : groups.find((g) => g.id === tab) ?? null;
  const current = group ? selection[group.id] : null;
  const currentOption = group ? (group.options.find((o) => o.code === current) ?? group.options[0]) : null;

  // Arrow keys move between the tabs, as a tablist is expected to.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = groupOrder[(groupOrder.indexOf(tab) + step + groupOrder.length) % groupOrder.length];
    chooseTab(next);
    document.getElementById(`cfg-tab-${next}`)?.focus();
  };

  return (
    <div className="cfg">
      <div className="cfg__stage">
        <div className="cfg__canvas">
          <CabinCanvas
            selection={selection}
            picks={picks}
            view={view}
            doorsOpen={doorsOpen}
            space={space}
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
          <div className="cfg__seg" role="group" aria-label={m.spaceLabel}>
            {spaces.map((sp) => (
              <button key={sp} type="button" className="cfg__segbtn" aria-pressed={space === sp} onClick={() => chooseSpace(sp)}>
                {m.spaces[sp]}
              </button>
            ))}
          </div>
        </div>

        <div className="cfg__bar">
          <div className="cfg__seg" role="group" aria-label={m.viewLabel}>
            {viewsFor[space].map((v) => (
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
              onClick={() => chooseTab(id)}
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

          {group && group.id === "exterior" && space === "room" && <p className="cfg__custom">{m.exteriorHint}</p>}
          {group && group.options.length === 0 && <p className="muted cfg__note">{m.unavailable}</p>}

          {group && group.options.length > 0 && (
            <div className="cfg__cards" role="radiogroup" aria-label={m.groups[group.id]}>
              {group.options
                .filter((o) => !o.hidden)
                .map((o) => (
                  <button
                    key={o.code}
                    type="button"
                    role="radio"
                    aria-checked={current === o.code}
                    className={o.image ? "cfg__card cfg__card--photo" : "cfg__card"}
                    onClick={() => choose(group.id, o.code)}
                  >
                    {o.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="cfg__thumb" src={o.image} alt="" loading="lazy" width={56} height={56} />
                    ) : (
                      <i className={o.hide ? "cfg__sw cfg__sw--none" : "cfg__sw"} style={{ background: o.swatch }} aria-hidden="true" />
                    )}
                    <span className="cfg__name">{m.options[o.code]}</span>
                  </button>
                ))}
            </div>
          )}

          {group && finishGroups.includes(group.id) && currentOption?.glb && (
            <div className="cfg__finish">
              <h3 className="cfg__subtitle">{m.finishTitle}</h3>
              <p className="muted cfg__note">{m.finishNote}</p>
              <div className="cfg__chips" role="radiogroup" aria-label={m.finishTitle}>
                {finishes.map((f) => (
                  <button
                    key={f.code}
                    type="button"
                    role="radio"
                    aria-checked={(picks[group.id] ?? "finishOriginal") === f.code}
                    className="cfg__chip"
                    title={m.options[f.code]}
                    onClick={() => chooseFinish(group.id, f.code)}
                  >
                    <i className="cfg__sw" style={{ background: f.swatch }} aria-hidden="true" />
                    <span className="cfg__name">{m.options[f.code]}</span>
                  </button>
                ))}
              </div>
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

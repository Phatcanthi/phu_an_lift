import type { ReactNode } from "react";
import { initials } from "@/admin/utils";

export function Avatar({ name }: { name: string }) {
  return (
    <span className="adm-avatar" aria-hidden="true">
      {initials(name)}
    </span>
  );
}

type Tone = "green" | "amber" | "red" | "gray" | "blue";

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`adm-badge adm-badge--${tone}`}>{children}</span>;
}

export function PageHeader({ title, text, actions }: { title: string; text?: string; actions?: ReactNode }) {
  return (
    <header className="adm-pagehead">
      <div>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {actions && <div className="adm-pagehead__actions">{actions}</div>}
    </header>
  );
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="adm-empty">
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}

import type { ReactNode } from "react";

/** Re-mounted on every navigation, so each page fades in (the header and footer live in the layout). */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page">{children}</div>;
}

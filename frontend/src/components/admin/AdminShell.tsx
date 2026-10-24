"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { endSession, getSession } from "@/admin/auth";
import { useAdminStore } from "@/admin/store";
import { Avatar } from "./ui";

const icons = {
  overview: <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" />,
  employees: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5.2a3 3 0 0 1 0 5.6M18 14c2 .6 3 2.2 3 5" />
    </>
  ),
  attendance: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  leave: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4M9 15l2 2 4-4" />
    </>
  ),
};

const nav = [
  { href: "/admin", label: "Tổng quan", icon: "overview" },
  { href: "/admin/employees", label: "Nhân sự", icon: "employees" },
  { href: "/admin/attendance", label: "Chấm công", icon: "attendance" },
  { href: "/admin/leave", label: "Nghỉ phép", icon: "leave" },
] as const;

/** Sidebar + top bar around the dashboard pages. Redirects to the sign-in page when there is no (mock) session. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resetData } = useAdminStore();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) router.replace("/login");
    else setEmail(session);
  }, [router]);

  useEffect(() => setOpen(false), [pathname]);

  if (!email) return <div className="adm-boot" aria-busy="true" />;

  const signOut = () => {
    endSession();
    router.replace("/login");
  };

  return (
    <div className={`adm-app${open ? " is-open" : ""}`}>
      <aside className="adm-side">
        <Link href="/admin" className="adm-brand">
          <span className="adm-brand__mark">PA</span>
          <span>
            <strong>Phú An</strong>
            <small>Quản lý nhân sự</small>
          </span>
        </Link>
        <nav aria-label="Menu quản trị">
          {nav.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  {icons[n.icon]}
                </svg>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="adm-side__foot">
          <Link href="/">← Về website</Link>
        </div>
      </aside>
      <div className="adm-scrim" onClick={() => setOpen(false)} />

      <div className="adm-main">
        <header className="adm-top">
          <button type="button" className="adm-iconbtn adm-top__menu" onClick={() => setOpen((v) => !v)} aria-label="Mở menu" aria-expanded={open}>
            ☰
          </button>
          <span className="adm-chip" title="Dữ liệu lưu trong trình duyệt này, chưa kết nối máy chủ">
            Dữ liệu mô phỏng
          </span>
          <button
            type="button"
            className="adm-link"
            onClick={() => {
              if (window.confirm("Khôi phục dữ liệu mẫu ban đầu? Các thay đổi của bạn sẽ mất.")) resetData();
            }}
          >
            Khôi phục dữ liệu mẫu
          </button>
          <span className="adm-top__user">
            <Avatar name={email} />
            <span>{email}</span>
          </span>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={signOut}>
            Đăng xuất
          </button>
        </header>
        <main className="adm-content">{children}</main>
      </div>
    </div>
  );
}

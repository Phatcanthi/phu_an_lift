import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AdminStoreProvider } from "@/admin/store";
import "./admin.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Quản trị | Thang máy Phú An", template: "%s | Quản trị Phú An" },
  robots: { index: false, follow: false },
};

// A root layout of its own: the dashboard shares nothing with the public site (no header, footer or locale).
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={jakarta.className}>
      <body className="adm">
        <AdminStoreProvider>{children}</AdminStoreProvider>
      </body>
    </html>
  );
}

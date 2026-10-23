import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import { ScrollFx } from "@/components/ScrollFx";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-head-next",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500"],
  variable: "--font-body-next",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Thang máy Phú An", template: "%s | Thang máy Phú An" },
  description:
    "Công ty Cổ phần Thang máy Phú An — thiết kế, cung cấp, lắp đặt và bảo trì thang máy.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${jakarta.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <ScrollFx />
      </body>
    </html>
  );
}

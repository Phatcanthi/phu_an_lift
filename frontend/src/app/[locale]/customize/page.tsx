import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { Configurator } from "@/components/configurator/Configurator";
import { getSite } from "@/content";
import { isLocale } from "@/i18n/config";
import { Link } from "@/i18n/Link";
import { messages } from "@/i18n/messages";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { title, description } = messages[locale].customize;
  return { title, description };
}

export default async function CustomizePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const m = messages[locale];
  const p = m.customize;
  const { company } = getSite(locale);

  return (
    <main>
      <section className="phero phero--compact">
        <div className="phero__glow" aria-hidden="true" />
        <span className="phero__ghost" aria-hidden="true">
          {p.ghost}
        </span>
        <div className="wrap phero__inner">
          <nav className="crumbs label" aria-label="Breadcrumb">
            <Link href="/">{m.common.home}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{p.title}</span>
          </nav>
          <h1 className="phero__title">
            <span className="mask">
              <span>{p.heroLine1}</span>
            </span>
            <span className="mask" style={{ "--i": 1 } as CSSProperties}>
              <span>
                {p.heroPre}
                <em>{p.heroEm}</em>
              </span>
            </span>
          </h1>
          <p className="lead phero__lead">{p.lead}</p>
        </div>
      </section>

      <section className="section cfgsec">
        <div className="wrap">
          <Configurator email={company.email} />
        </div>
      </section>
    </main>
  );
}

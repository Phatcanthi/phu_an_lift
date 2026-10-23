import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CompanyMap } from "@/components/CompanyMap";
import { HeroExperience } from "@/components/hero/HeroExperience";
import { ProductRail } from "@/components/products/ProductRail";
import { RevealObserver } from "@/components/RevealObserver";
import { products } from "@/content/products";
import {
  about,
  cabinNote,
  cabins,
  company,
  hero,
  productLines,
  services,
  stats,
  technology,
  wellFrames,
} from "@/content/site";

const tel = (s: string) => `tel:${s.replace(/[^\d+]/g, "")}`;
/** Stagger index for `data-reveal` children (read by the CSS as a transition delay). */
const order = (i: number) => ({ "--i": i }) as CSSProperties;

function TechIcon({ name }: { name: string }) {
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.2 };
  switch (name) {
    case "controller":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M6 4v16M12 4v16M18 4v16" />
          <circle cx="6" cy="9" r="2" />
          <circle cx="12" cy="15" r="2" />
          <circle cx="18" cy="8" r="2" />
        </svg>
      );
    case "motor":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
        </svg>
      );
    case "door":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" />
          <path d="M12 3v18M9 12h-2M15 12h2" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 21c-5 0-8-3.5-8-8 5 0 8 2 8 8Zm0 0c5 0 8-3.5 8-8-5 0-8 2-8 8Z" />
          <path d="M12 21V8M12 8c0-3 1.5-4.5 3-5" />
        </svg>
      );
  }
}

export default function HomePage() {
  const staticHero = (
    <section id="top" className="hero">
      <div className="hero__glow" aria-hidden="true" />
      <div className="wrap hero__grid">
        <div className="hero__content">
          <Image
            src="/images/catalogue/elite-logo.png"
            alt={company.brand}
            width={172}
            height={172}
            className="hero__brand"
            priority
          />
          <span className="badge">
            <i aria-hidden="true" />
            {hero.badge}
          </span>
          <h1>
            {hero.title[0]}
            <br />
            {hero.title[1]}
            <em>{hero.accent}</em>
          </h1>
          <p className="lead">{hero.lead}</p>
          <div className="hero__actions">
            <a className="btn btn--solid" href="#products">
              Khám phá sản phẩm <span aria-hidden="true">→</span>
            </a>
            <a className="btn btn--ghost" href="#contact">
              Đặt lịch khảo sát
            </a>
          </div>
        </div>
        <div className="hero__photo">
          <Image src={hero.image} alt="Thang máy tròn ELITE trong không gian biệt thự" width={1024} height={1024} priority />
        </div>
      </div>
    </section>
  );

  return (
    <>
      <RevealObserver />

      <main>
        <HeroExperience fallback={staticHero} />

        <section className="statsbar">
          <div className="wrap">
            <dl className="stats" data-reveal>
              {stats.map((s, i) => (
                <div key={s.label} style={order(i)}>
                  <dt>
                    <span className="stats__value" data-count={s.value}>
                      {s.value}
                    </span>
                    <span className="label">{s.label}</span>
                  </dt>
                  <dd>{s.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* decorative: the same range is listed in the About section; rendered twice so the loop has no gap */}
        <div className="marquee" aria-hidden="true">
          {[0, 1].map((copy) => (
            <ul key={copy} className="marquee__track">
              {about.range.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ))}
        </div>

        <section id="about" className="section">
          <div className="wrap split">
            <div className="split__media" data-reveal="image" data-parallax>
              <Image src={about.image} alt="Biệt thự sử dụng thang máy ELITE" width={950} height={1150} />
            </div>
            <div className="split__text" data-reveal="cascade">
              <span className="label label--gold rule">Hồ sơ công ty</span>
              <h2>{company.legalName}</h2>
              {about.paragraphs.map((p) => (
                <p key={p} className="muted">
                  {p}
                </p>
              ))}
              <p className="label">Dải sản phẩm</p>
              <ul className="tags">
                {about.range.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="muted lifecycle">
                Hệ thống làm việc khép kín: {about.lifecycle.join(" · ")}.
              </p>
              <span className="label">
                {company.legalNameEn} · Mã số thuế {company.taxCode}
              </span>
            </div>
          </div>
        </section>

        <section id="technology" className="section section--low">
          <div className="wrap">
            <header className="section__head" data-reveal>
              <div>
                <span className="label label--gold rule">Công nghệ</span>
                <h2>
                  Công nghệ dẫn đầu
                  <br />
                  Hiệu năng vượt trội
                </h2>
              </div>
              <p className="muted">Leading Technology · Outstanding Performance</p>
            </header>
            <div className="tech">
              <ul className="tech__list" data-reveal="stagger">
                {technology.items.map((t, i) => (
                  <li key={t.title} className="card card--pad" style={order(i)} data-spotlight>
                    <span className="tech__icon">
                      <TechIcon name={t.icon} />
                    </span>
                    <h3>{t.title}</h3>
                    <p className="muted">{t.text}</p>
                  </li>
                ))}
              </ul>
              <div className="tech__media" data-reveal="image" data-parallax>
                <Image src={technology.image} alt="Cabin thang máy ELITE với màn hình điều khiển" width={950} height={1150} />
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="section">
          <div className="wrap">
            <header className="section__head" data-reveal>
              <div>
                <span className="label label--gold rule">Sản phẩm</span>
                <h2>Thang máy biệt thự</h2>
              </div>
              <div className="section__aside">
                <p className="muted">Elegant Villas Art Collection</p>
                <Link className="arrow-link" href="/san-pham">
                  Xem toàn bộ sản phẩm <span aria-hidden="true">→</span>
                </Link>
              </div>
            </header>
            <div className="lines">
              {productLines.map((p, i) => (
                <article key={p.id} className={`line${i % 2 ? " line--flip" : ""}`}>
                  <div className="line__media" data-reveal="image" data-parallax>
                    <Image src={p.image} alt={p.title} width={950} height={1150} />
                    <span className="chip chip--tl">{p.tag}</span>
                  </div>
                  <div className="line__body" data-reveal="cascade">
                    <span className="line__index label">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="line__title">{p.title}</h3>
                    {"bullets" in p && p.bullets && (
                      <ul className="bullets">
                        {p.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {"paragraphs" in p &&
                      p.paragraphs?.map((t) => (
                        <p key={t} className="muted">
                          {t}
                        </p>
                      ))}
                    {"specs" in p && p.specs && (
                      <dl className="specs">
                        {p.specs.map((s) => (
                          <div key={s.label}>
                            <dt className="label">{s.label}</dt>
                            <dd>{s.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {"chips" in p && p.chips && (
                      <div>
                        <p className="label">Phương thức mở cửa</p>
                        <ul className="tags">
                          {p.chips.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {"note" in p && p.note && <p className="muted">{p.note}</p>}
                    <Link className="btn btn--ghost line__cta" href={`/san-pham/${p.slug}`}>
                      Xem chi tiết sản phẩm <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}

              <article className="line line--flip">
                <div className="line__media" data-reveal="image" data-parallax>
                  <Image src={wellFrames.image} alt="Giếng thang hợp kim nhôm và kính" width={950} height={1150} />
                  <span className="chip chip--tl">Giếng thang</span>
                </div>
                <div className="line__body" data-reveal="cascade">
                  <span className="line__index label">{String(productLines.length + 1).padStart(2, "0")}</span>
                  <h3 className="line__title">Giếng thang kết cấu thép &amp; hợp kim nhôm</h3>
                  <div>
                    <p className="label label--gold">Kết cấu thép</p>
                    <p className="muted">{wellFrames.steel}</p>
                  </div>
                  <div>
                    <p className="label label--gold">Hợp kim nhôm</p>
                    <p className="muted">{wellFrames.aluminum}</p>
                  </div>
                  <div>
                    <p className="label">Khung kim loại sơn phủ cao cấp</p>
                    <ul className="swatches">
                      {wellFrames.colors.map((c) => (
                        <li key={c.name}>
                          <span style={{ background: c.css }} aria-hidden="true" />
                          {c.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            </div>

            <div className="catalog">
              <header className="section__head" data-reveal>
                <div>
                  <span className="label label--gold rule">Danh mục</span>
                  <h2>Toàn bộ sản phẩm</h2>
                </div>
                <Link className="btn btn--outline" href="/san-pham">
                  Xem {products.length} sản phẩm <span aria-hidden="true">→</span>
                </Link>
              </header>
              <div data-reveal>
                <ProductRail products={products} />
              </div>
            </div>
          </div>
        </section>

        <section id="cabins" className="section section--low">
          <div className="wrap">
            <header className="section__head" data-reveal>
              <div>
                <span className="label label--gold rule">Cabin</span>
                <h2>Phong cách nội thất cabin</h2>
              </div>
              <p className="muted">Lựa chọn không gian sống đẳng cấp.</p>
            </header>
            <ul className="cards cards--cabins" data-reveal="stagger">
              {cabins.map((c, i) => (
                <li key={c.code} className="card" style={order(i)} data-spotlight>
                  <div className="card__photo card__photo--tall">
                    <Image src={c.image} alt={`Cabin ${c.code} — ${c.name}`} width={500} height={900} />
                    <span className="chip chip--tl">{c.code}</span>
                    <span className="chip chip--br">{c.level}</span>
                  </div>
                  <div className="card__body">
                    <h3>{c.name}</h3>
                    <p className="muted">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="muted cabin-note">{cabinNote}</p>
          </div>
        </section>

        <section id="services" className="section">
          <div className="wrap split split--wide">
            <div className="split__media split__media--short" data-reveal="image">
              <Image src={services.image} alt="Tư vấn viên Phú An" width={370} height={900} />
            </div>
            <div className="split__text" data-reveal>
              <span className="label label--gold rule">Dịch vụ</span>
              <h2>
                Dịch vụ hoàn hảo
                <br />
                Lựa chọn chuyên nghiệp
              </h2>
              <ol className="steps" data-reveal="stagger">
                {services.items.map((s, i) => (
                  <li key={s.title} style={order(i)}>
                    <span className="label label--gold">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{s.title}</h3>
                      <p className="muted">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="contact" className="section section--low">
          <div className="wrap">
            <div className="panel cta" data-reveal>
              <span className="label label--gold">Liên hệ</span>
              <h2>Đặt lịch khảo sát &amp; nhận tư vấn</h2>
              <p className="muted">{company.slogan}.</p>
              <dl className="contact">
                <div>
                  <dt className="label">Hotline</dt>
                  <dd>
                    <a href={tel(company.hotline)}>{company.hotline}</a>
                  </dd>
                </div>
                <div>
                  <dt className="label">Điện thoại</dt>
                  <dd>
                    <a href={tel(company.phone)}>{company.phone}</a>
                  </dd>
                </div>
                <div>
                  <dt className="label">Email</dt>
                  <dd>
                    <a href={`mailto:${company.email}`}>{company.email}</a>
                  </dd>
                </div>
                <div>
                  <dt className="label">Địa chỉ</dt>
                  <dd>{company.address}</dd>
                </div>
              </dl>
              <CompanyMap />
              <div className="hero__actions">
                <a className="btn btn--solid" href={tel(company.hotline)}>
                  Gọi hotline
                </a>
                <a className="btn btn--ghost" href={company.zalo} target="_blank" rel="noopener noreferrer">
                  Zalo
                </a>
                <a className="btn btn--ghost" href={company.facebook} target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

    </>
  );
}

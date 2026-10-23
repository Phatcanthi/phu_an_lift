import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RevealObserver } from "@/components/RevealObserver";
import { ProductAR } from "@/components/products/ProductAR";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductGallery } from "@/components/products/ProductGallery";
import { categoryLabel, getProduct, products, relatedProducts } from "@/content/products";
import { cabinNote, cabins, company, wellFrames } from "@/content/site";

type Props = { params: Promise<{ slug: string }> };

const tel = (s: string) => `tel:${s.replace(/[^\d+]/g, "")}`;
const order = (i: number) => ({ "--i": i }) as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};
  return { title: product.name, description: product.tagline };
}

export default async function ProductPage({ params }: Props) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const at = products.indexOf(product);
  const prev = products[(at - 1 + products.length) % products.length];
  const next = products[(at + 1) % products.length];

  return (
    <>
      <RevealObserver />
      <main>
        <section className="pdetail">
          <div className="phero__glow" aria-hidden="true" />
          <div className="wrap">
            <nav className="crumbs label" aria-label="Breadcrumb">
              <Link href="/">Trang chủ</Link>
              <span aria-hidden="true">/</span>
              <Link href="/san-pham">Sản phẩm</Link>
              <span aria-hidden="true">/</span>
              <Link href={`/san-pham?loai=${product.category}#danh-sach`}>{categoryLabel(product.category)}</Link>
            </nav>

            <div className="pdetail__grid">
              <div className="pdetail__media enter" style={order(1)}>
                <ProductGallery images={product.images} alt={product.name} />
              </div>

              <div className="pdetail__info">
                <span className="label label--gold rule enter" style={order(1)}>
                  {pad(at + 1)} · {product.nameEn}
                </span>
                <h1 className="pdetail__title">
                  <span className="mask">
                    <span>{product.name}</span>
                  </span>
                </h1>
                <p className="lead enter" style={order(3)}>
                  {product.tagline}
                </p>
                <dl className="pdetail__highlights enter" style={order(4)}>
                  {product.highlights.map((h) => (
                    <div key={h.label}>
                      <dt className="label">{h.label}</dt>
                      <dd>{h.value}</dd>
                    </div>
                  ))}
                </dl>
                {product.doors && (
                  <div className="enter" style={order(5)}>
                    <p className="label">Phương thức mở cửa</p>
                    <ul className="tags">
                      {product.doors.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="hero__actions enter" style={order(6)}>
                  <a className="btn btn--solid" href={tel(company.hotline)}>
                    Nhận báo giá <span aria-hidden="true">→</span>
                  </a>
                  <a className="btn btn--ghost" href={company.zalo} target="_blank" rel="noopener noreferrer">
                    Tư vấn qua Zalo
                  </a>
                </div>
                <p className="pdetail__note enter" style={order(7)}>
                  Thông số mang tính tham khảo. Mỗi công trình được khảo sát và thiết kế cấu hình riêng.
                </p>
              </div>
            </div>
          </div>
        </section>

        {product.ar && (
          <section className="section">
            <div className="wrap">
              <header className="section__head" data-reveal>
                <div>
                  <span className="label label--gold rule">Thực tế tăng cường</span>
                  <h2>Xem thang máy trong không gian của bạn</h2>
                </div>
                <p className="muted">Xoay mô hình 3D, hoặc dùng camera điện thoại để đặt thang máy vào đúng kích thước thật.</p>
              </header>
              <ProductAR src={product.ar.glb} alt={product.ar.alt} />
            </div>
          </section>
        )}

        <section className="section section--low">
          <div className="wrap split split--top">
            <div className="split__text" data-reveal="cascade">
              <span className="label label--gold rule">Tổng quan</span>
              <h2>Giới thiệu sản phẩm</h2>
              {product.summary.filter(Boolean).map((p) => (
                <p key={p} className="muted pdetail__summary">
                  {p}
                </p>
              ))}
              <div>
                <p className="label">Phù hợp cho</p>
                <ul className="tags">
                  {product.applications.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
            <ol className="features" data-reveal="stagger">
              {product.features.map((f, i) => (
                <li key={f} style={order(i)} data-spotlight>
                  <span className="features__num">{pad(i + 1)}</span>
                  <p>{f}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <header className="section__head" data-reveal>
              <div>
                <span className="label label--gold rule">Thông số</span>
                <h2>Thông số kỹ thuật</h2>
              </div>
              <p className="muted">Có thể thay đổi theo kích thước giếng thang và yêu cầu của công trình.</p>
            </header>
            <dl className="spectable" data-reveal="stagger">
              {product.specs.map((s, i) => (
                <div key={s.label} style={order(i)}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {product.category === "gia-dinh" && (
          <section className="section section--low">
            <div className="wrap">
              <header className="section__head" data-reveal>
                <div>
                  <span className="label label--gold rule">Hoàn thiện</span>
                  <h2>Màu khung giếng thang</h2>
                </div>
                <p className="muted">Khung kim loại sơn phủ cao cấp, đồng bộ với nội thất.</p>
              </header>
              <ul className="finishes" data-reveal="stagger">
                {wellFrames.colors.map((c, i) => (
                  <li key={c.name} style={order(i)}>
                    <span style={{ background: c.css }} aria-hidden="true" />
                    <span className="label">{c.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {product.cabins && (
          <section className="section">
            <div className="wrap">
              <header className="section__head" data-reveal>
                <div>
                  <span className="label label--gold rule">Cabin</span>
                  <h2>Phong cách nội thất cabin</h2>
                </div>
                <p className="muted">{cabinNote}</p>
              </header>
              <ul className="cards cards--cabins cards--six" data-reveal="stagger">
                {cabins.map((c, i) => (
                  <li key={c.code} className="card" style={order(i)} data-spotlight>
                    <div className="card__photo card__photo--tall">
                      <Image src={c.image} alt={`Cabin ${c.code} — ${c.name}`} width={500} height={900} sizes="(max-width: 760px) 50vw, 16vw" />
                      <span className="chip chip--tl">{c.code}</span>
                    </div>
                    <div className="card__body">
                      <h3>{c.name}</h3>
                      <span className="label">{c.level}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="section section--low">
          <div className="wrap">
            <header className="section__head" data-reveal>
              <div>
                <span className="label label--gold rule">Khám phá thêm</span>
                <h2>Sản phẩm liên quan</h2>
              </div>
              <Link className="arrow-link" href="/san-pham">
                Tất cả sản phẩm <span aria-hidden="true">→</span>
              </Link>
            </header>
            <div className="pgrid" data-reveal="stagger">
              {relatedProducts(product).map((p, i) => (
                <ProductCard key={p.slug} product={p} index={products.indexOf(p)} style={order(i)} />
              ))}
            </div>

            <nav className="pager" aria-label="Sản phẩm trước và sau">
              <Link href={`/san-pham/${prev.slug}`} className="pager__link" data-spotlight>
                <span className="label">← Sản phẩm trước</span>
                <span className="pager__name">{prev.name}</span>
              </Link>
              <Link href={`/san-pham/${next.slug}`} className="pager__link pager__link--next" data-spotlight>
                <span className="label">Sản phẩm tiếp theo →</span>
                <span className="pager__name">{next.name}</span>
              </Link>
            </nav>
          </div>
        </section>
      </main>
    </>
  );
}

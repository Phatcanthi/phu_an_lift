import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { RevealObserver } from "@/components/RevealObserver";
import { ProductBrowser } from "@/components/products/ProductBrowser";
import { categories, products } from "@/content/products";
import { company } from "@/content/site";

export const metadata: Metadata = {
  title: "Sản phẩm",
  description: "Danh mục thang máy gia đình, thang máy tải khách, thang máy chuyên dụng, thang cuốn và băng tải bộ của Thang máy Phú An.",
};

const tel = (s: string) => `tel:${s.replace(/[^\d+]/g, "")}`;

export default function ProductsPage() {
  return (
    <>
      <RevealObserver />
      <main>
        <section className="phero">
          <div className="phero__glow" aria-hidden="true" />
          <span className="phero__ghost" aria-hidden="true">
            ELITE
          </span>
          <div className="wrap phero__inner">
            <nav className="crumbs label" aria-label="Breadcrumb">
              <Link href="/">Trang chủ</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Sản phẩm</span>
            </nav>
            <h1 className="phero__title">
              <span className="mask">
                <span>Bộ sưu tập</span>
              </span>
              <span className="mask" style={{ "--i": 1 } as CSSProperties}>
                <span>
                  <em>thang máy</em> ELITE
                </span>
              </span>
            </h1>
            <p className="lead phero__lead">
              Từ thang máy gia đình cho biệt thự đến thang cuốn cho công trình công cộng — chọn một sản phẩm để xem hình
              ảnh, thông số và các tùy chọn hoàn thiện.
            </p>
            <ul className="phero__cats">
              {categories.map((c, i) => (
                <li key={c.id} style={{ "--i": i + 3 } as CSSProperties}>
                  <Link href={`/san-pham?loai=${c.id}#danh-sach`} className="phero__cat">
                    <span className="phero__catcount">{String(products.filter((p) => p.category === c.id).length).padStart(2, "0")}</span>
                    <span>
                      <span className="label label--gold">{c.label}</span>
                      <span className="muted">{c.note}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="danh-sach" className="section browser">
          <div className="wrap">
            <ProductBrowser products={products} />
          </div>
        </section>

        <section className="section section--low">
          <div className="wrap">
            <div className="panel cta" data-reveal>
              <span className="label label--gold">Tư vấn miễn phí</span>
              <h2>Chưa chắc dòng thang nào phù hợp?</h2>
              <p className="muted">
                Đội ngũ kỹ thuật sẽ khảo sát công trình và đề xuất cấu hình phù hợp với kết cấu, phong cách kiến trúc và
                nhu cầu sử dụng của bạn.
              </p>
              <div className="hero__actions">
                <a className="btn btn--solid" href={tel(company.hotline)}>
                  Gọi {company.hotline} <span aria-hidden="true">→</span>
                </a>
                <Link className="btn btn--ghost" href="/#contact">
                  Đặt lịch khảo sát
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

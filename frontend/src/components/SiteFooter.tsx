import Image from "next/image";
import Link from "next/link";
import { company, navItems } from "@/content/site";
import { categories } from "@/content/products";

const tel = (s: string) => `tel:${s.replace(/[^\d+]/g, "")}`;

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div className="footer__brand">
            <Link href="/" className="brand" aria-label={company.name}>
              <Image src="/images/logo.png" alt="" width={236} height={180} className="brand__logo" />
              <span className="brand__text">
                <span className="brand__name">Thang máy</span>
                <span className="label label--gold">Phú An</span>
              </span>
            </Link>
            <p className="muted">{company.slogan}.</p>
          </div>
          <nav className="footer__col" aria-label="Liên kết nhanh">
            <span className="label label--gold">Khám phá</span>
            {navItems.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
          </nav>
          <nav className="footer__col" aria-label="Danh mục sản phẩm">
            <span className="label label--gold">Sản phẩm</span>
            {categories.map((c) => (
              <Link key={c.id} href={`/san-pham?loai=${c.id}#danh-sach`}>
                {c.label}
              </Link>
            ))}
          </nav>
          <div className="footer__col">
            <span className="label label--gold">Liên hệ</span>
            <a href={tel(company.hotline)}>Hotline {company.hotline}</a>
            <a href={tel(company.phone)}>{company.phone}</a>
            <a href={`mailto:${company.email}`}>{company.email}</a>
            <span className="muted">{company.address}</span>
          </div>
        </div>
        <div className="footer__bottom">
          <span className="muted">
            © {new Date().getFullYear()} {company.legalName}. Mã số thuế {company.taxCode}.
          </span>
          <a className="label" href={company.website} target="_blank" rel="noopener noreferrer">
            www.phuanlift.com
          </a>
        </div>
      </div>
    </footer>
  );
}

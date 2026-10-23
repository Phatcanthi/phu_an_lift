import type { CSSProperties } from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap notfound">
      <span className="notfound__code enter">404</span>
      <h1 className="enter" style={{ "--i": 1 } as CSSProperties}>
        Không tìm thấy trang
      </h1>
      <p className="lead enter" style={{ "--i": 2 } as CSSProperties}>
        Trang bạn tìm có thể đã được đổi tên hoặc không còn tồn tại.
      </p>
      <div className="hero__actions enter" style={{ "--i": 3 } as CSSProperties}>
        <Link className="btn btn--solid" href="/san-pham">
          Xem sản phẩm <span aria-hidden="true">→</span>
        </Link>
        <Link className="btn btn--ghost" href="/">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}

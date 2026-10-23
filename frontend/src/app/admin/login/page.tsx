"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "@/admin/auth";

/** Mock sign-in: any well-formed email and a non-empty password get in. Nothing is checked or stored server-side. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Vui lòng nhập email hợp lệ.");
    if (!password) return setError("Vui lòng nhập mật khẩu.");
    startSession(email.trim());
    router.push("/admin");
  };

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit} noValidate>
        <span className="adm-brand__mark">PA</span>
        <h1>Đăng nhập quản trị</h1>
        <p className="adm-muted">Thang máy Phú An · Quản lý nhân sự</p>

        <div className="adm-notice">
          Đây là bản thử giao diện. Nhập <strong>bất kỳ email và mật khẩu nào</strong> để vào; chưa có xác thực thật.
        </div>

        <label className="adm-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" placeholder="ten@example.com" />
        </label>
        <label className="adm-field">
          <span>Mật khẩu</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
        </label>
        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="adm-btn adm-btn--primary adm-btn--block">
          Đăng nhập
        </button>
      </form>
    </div>
  );
}

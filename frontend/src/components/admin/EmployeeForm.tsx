"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { departments, employeeStatusLabel } from "@/admin/types";
import type { Employee, EmployeeInput, EmployeeStatus } from "@/admin/types";
import { toISO } from "@/admin/utils";

type Errors = Partial<Record<keyof EmployeeInput, string>>;

export function EmployeeForm({
  employee,
  onSubmit,
  onCancel,
}: {
  employee: Employee | null;
  onSubmit: (input: EmployeeInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EmployeeInput>(
    employee ?? {
      name: "",
      email: "",
      phone: "",
      department: departments[0],
      position: "",
      status: "working",
      joinDate: toISO(new Date()),
    },
  );
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Vui lòng nhập họ tên.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Email chưa hợp lệ.";
    if (!/^[\d\s+().-]{8,}$/.test(form.phone)) next.phone = "Số điện thoại chưa hợp lệ.";
    if (!form.position.trim()) next.position = "Vui lòng nhập chức vụ.";
    if (!form.joinDate) next.joinDate = "Vui lòng chọn ngày vào làm.";
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit({ ...form, name: form.name.trim(), email: form.email.trim(), position: form.position.trim() });
  };

  return (
    <form className="adm-form" onSubmit={submit} noValidate>
      <label className="adm-field adm-field--full">
        <span>Họ và tên</span>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={Boolean(errors.name)} />
        {errors.name && <em className="adm-error">{errors.name}</em>}
      </label>
      <label className="adm-field">
        <span>Email</span>
        <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(errors.email)} />
        {errors.email && <em className="adm-error">{errors.email}</em>}
      </label>
      <label className="adm-field">
        <span>Số điện thoại</span>
        <input value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={Boolean(errors.phone)} />
        {errors.phone && <em className="adm-error">{errors.phone}</em>}
      </label>
      <label className="adm-field">
        <span>Phòng ban</span>
        <select value={form.department} onChange={(e) => set("department", e.target.value as EmployeeInput["department"])}>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <label className="adm-field">
        <span>Chức vụ</span>
        <input value={form.position} onChange={(e) => set("position", e.target.value)} aria-invalid={Boolean(errors.position)} />
        {errors.position && <em className="adm-error">{errors.position}</em>}
      </label>
      <label className="adm-field">
        <span>Ngày vào làm</span>
        <input type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} aria-invalid={Boolean(errors.joinDate)} />
        {errors.joinDate && <em className="adm-error">{errors.joinDate}</em>}
      </label>
      <label className="adm-field">
        <span>Trạng thái</span>
        <select value={form.status} onChange={(e) => set("status", e.target.value as EmployeeStatus)}>
          {(Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => (
            <option key={s} value={s}>
              {employeeStatusLabel[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="adm-form__foot">
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="adm-btn adm-btn--primary">
          {employee ? "Lưu thay đổi" : "Thêm nhân sự"}
        </button>
      </div>
    </form>
  );
}

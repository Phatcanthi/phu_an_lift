"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAdminStore } from "@/admin/store";
import { departments, employeeStatusLabel, leaveTypeLabel } from "@/admin/types";
import type { EmployeeStatus } from "@/admin/types";
import { useToday } from "@/admin/useToday";
import { daysBetween, formatDate } from "@/admin/utils";
import { Avatar, Empty, PageHeader } from "@/components/admin/ui";

const statusColor: Record<EmployeeStatus, string> = {
  working: "var(--green)",
  onLeave: "var(--amber)",
  resigned: "var(--gray)",
};

export default function OverviewPage() {
  const { employees, leaves, setLeaveStatus } = useAdminStore();
  const today = useToday();

  const stats = useMemo(() => {
    const current = employees.filter((e) => e.status !== "resigned");
    const byDepartment = departments.map((d) => ({ label: d, value: current.filter((e) => e.department === d).length }));
    const byStatus = (Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => ({
      key: s,
      label: employeeStatusLabel[s],
      value: employees.filter((e) => e.status === s).length,
    }));
    const onLeaveToday = today
      ? leaves.filter((l) => l.status === "approved" && l.from <= today && today <= l.to).length
      : null;

    // new hires for the last six months, oldest first
    const months: { label: string; value: number }[] = [];
    if (today) {
      const [y, m] = today.split("-").map(Number);
      for (let i = 5; i >= 0; i--) {
        const d = new Date(y, m - 1 - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ label: `T${d.getMonth() + 1}`, value: employees.filter((e) => e.joinDate.startsWith(key)).length });
      }
    }
    return {
      total: current.length,
      working: employees.filter((e) => e.status === "working").length,
      pending: leaves.filter((l) => l.status === "pending").length,
      onLeaveToday,
      byDepartment,
      byStatus,
      months,
    };
  }, [employees, leaves, today]);

  const pending = leaves.filter((l) => l.status === "pending");
  const recent = [...employees].sort((a, b) => b.joinDate.localeCompare(a.joinDate)).slice(0, 5);
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";

  const maxDept = Math.max(1, ...stats.byDepartment.map((d) => d.value));
  const maxMonth = Math.max(1, ...stats.months.map((m) => m.value));
  const statusTotal = Math.max(1, stats.byStatus.reduce((s, x) => s + x.value, 0));
  let acc = 0;
  const donut = stats.byStatus
    .filter((s) => s.value > 0)
    .map((s) => {
      const from = (acc / statusTotal) * 360;
      acc += s.value;
      return `${statusColor[s.key]} ${from}deg ${(acc / statusTotal) * 360}deg`;
    })
    .join(", ");

  return (
    <>
      <PageHeader title="Tổng quan nhân sự" text="Số liệu cập nhật theo dữ liệu mô phỏng hiện có." />

      <section className="adm-stats" aria-label="Số liệu chính">
        <Stat label="Tổng nhân sự" value={stats.total} note="Không tính đã nghỉ việc" />
        <Stat label="Đang làm việc" value={stats.working} note="Trạng thái hoạt động" />
        <Stat label="Nghỉ phép hôm nay" value={stats.onLeaveToday ?? "–"} note="Đơn đã duyệt" />
        <Stat label="Đơn chờ duyệt" value={stats.pending} note="Cần xử lý" tone={stats.pending > 0 ? "amber" : undefined} />
      </section>

      <section className="adm-grid">
        <article className="adm-card">
          <h2>Nhân sự theo phòng ban</h2>
          <ul className="adm-bars">
            {stats.byDepartment.map((d) => (
              <li key={d.label}>
                <span>{d.label}</span>
                <span className="adm-bars__track">
                  <i style={{ width: `${(d.value / maxDept) * 100}%` }} />
                </span>
                <b>{d.value}</b>
              </li>
            ))}
          </ul>
        </article>

        <article className="adm-card">
          <h2>Trạng thái nhân sự</h2>
          <div className="adm-donut">
            <div className="adm-donut__ring" style={{ background: `conic-gradient(${donut})` }} role="img" aria-label="Biểu đồ trạng thái nhân sự">
              <span>{employees.length}</span>
            </div>
            <ul>
              {stats.byStatus.map((s) => (
                <li key={s.key}>
                  <i style={{ background: statusColor[s.key] }} />
                  {s.label}
                  <b>{s.value}</b>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="adm-card">
          <h2>Nhân sự mới 6 tháng gần đây</h2>
          <ul className="adm-cols">
            {stats.months.map((m) => (
              <li key={m.label}>
                <b>{m.value}</b>
                <span className="adm-cols__bar">
                  <i style={{ height: `${(m.value / maxMonth) * 100}%` }} />
                </span>
                <small>{m.label}</small>
              </li>
            ))}
          </ul>
        </article>

        <article className="adm-card">
          <header className="adm-card__head">
            <h2>Nhân sự vào làm gần đây</h2>
            <Link href="/admin/employees" className="adm-link">
              Xem tất cả
            </Link>
          </header>
          <ul className="adm-people">
            {recent.map((e) => (
              <li key={e.id}>
                <Avatar name={e.name} />
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.position} · {e.department}
                  </small>
                </span>
                <time>{formatDate(e.joinDate)}</time>
              </li>
            ))}
          </ul>
        </article>

        <article className="adm-card adm-card--wide">
          <header className="adm-card__head">
            <h2>Đơn nghỉ phép chờ duyệt</h2>
            <Link href="/admin/leave" className="adm-link">
              Quản lý nghỉ phép
            </Link>
          </header>
          {pending.length === 0 ? (
            <Empty title="Không có đơn nào chờ duyệt" />
          ) : (
            <ul className="adm-people">
              {pending.map((l) => (
                <li key={l.id}>
                  <Avatar name={nameOf(l.employeeId)} />
                  <span>
                    <strong>{nameOf(l.employeeId)}</strong>
                    <small>
                      {leaveTypeLabel[l.type]} · {formatDate(l.from)} – {formatDate(l.to)} ({daysBetween(l.from, l.to)} ngày)
                    </small>
                  </span>
                  <span className="adm-actions">
                    <button type="button" className="adm-btn adm-btn--small adm-btn--primary" onClick={() => setLeaveStatus(l.id, "approved")}>
                      Duyệt
                    </button>
                    <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setLeaveStatus(l.id, "rejected")}>
                      Từ chối
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: number | string; note: string; tone?: "amber" }) {
  return (
    <div className={`adm-stat${tone ? ` adm-stat--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

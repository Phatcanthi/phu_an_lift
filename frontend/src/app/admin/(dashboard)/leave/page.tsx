"use client";

import { useState } from "react";
import { useAdminStore } from "@/admin/store";
import { leaveStatusLabel, leaveTypeLabel } from "@/admin/types";
import type { LeaveStatus } from "@/admin/types";
import { daysBetween, formatDate } from "@/admin/utils";
import { Avatar, Badge, Empty, PageHeader } from "@/components/admin/ui";

const tone = { pending: "amber", approved: "green", rejected: "red" } as const;
type Tab = LeaveStatus | "all";

export default function LeavePage() {
  const { employees, leaves, setLeaveStatus } = useAdminStore();
  const [tab, setTab] = useState<Tab>("pending");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: leaves.length },
    { id: "pending", label: leaveStatusLabel.pending, count: leaves.filter((l) => l.status === "pending").length },
    { id: "approved", label: leaveStatusLabel.approved, count: leaves.filter((l) => l.status === "approved").length },
    { id: "rejected", label: leaveStatusLabel.rejected, count: leaves.filter((l) => l.status === "rejected").length },
  ];
  const list = leaves.filter((l) => tab === "all" || l.status === tab).sort((a, b) => b.from.localeCompare(a.from));

  return (
    <>
      <PageHeader title="Nghỉ phép" text="Duyệt hoặc từ chối đơn nghỉ phép. Đơn đã duyệt được tính vào chấm công." />

      <div className="adm-tabs" role="tablist" aria-label="Lọc đơn nghỉ phép">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            <sup>{t.count}</sup>
          </button>
        ))}
      </div>

      <div className="adm-card adm-card--flush">
        {list.length === 0 ? (
          <Empty title="Không có đơn nghỉ phép" text="Chưa có đơn nào trong nhóm này." />
        ) : (
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Nhân sự</th>
                  <th>Loại nghỉ</th>
                  <th>Thời gian</th>
                  <th>Số ngày</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((l) => {
                  const e = employees.find((x) => x.id === l.employeeId);
                  return (
                    <tr key={l.id}>
                      <td>
                        <span className="adm-person">
                          <Avatar name={e?.name ?? "?"} />
                          <span>
                            <strong>{e?.name ?? "Đã xóa"}</strong>
                            <small>{e?.department}</small>
                          </span>
                        </span>
                      </td>
                      <td>{leaveTypeLabel[l.type]}</td>
                      <td>
                        {formatDate(l.from)}
                        {l.to !== l.from && ` – ${formatDate(l.to)}`}
                      </td>
                      <td>{daysBetween(l.from, l.to)}</td>
                      <td className="adm-wrap">{l.reason}</td>
                      <td>
                        <Badge tone={tone[l.status]}>{leaveStatusLabel[l.status]}</Badge>
                      </td>
                      <td className="adm-actions">
                        {l.status === "pending" ? (
                          <>
                            <button type="button" className="adm-btn adm-btn--small adm-btn--primary" onClick={() => setLeaveStatus(l.id, "approved")}>
                              Duyệt
                            </button>
                            <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setLeaveStatus(l.id, "rejected")}>
                              Từ chối
                            </button>
                          </>
                        ) : (
                          <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setLeaveStatus(l.id, "pending")}>
                            Mở lại
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

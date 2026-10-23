"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/admin/store";
import { attendanceStatusLabel, departments } from "@/admin/types";
import type { AttendanceStatus } from "@/admin/types";
import { useToday } from "@/admin/useToday";
import { addDays, attendanceFor, formatDate, isWeekend } from "@/admin/utils";
import { Avatar, Badge, Empty, PageHeader } from "@/components/admin/ui";

const tone = { onTime: "green", late: "amber", absent: "red", leave: "blue", off: "gray" } as const;
const summaryOrder: AttendanceStatus[] = ["onTime", "late", "absent", "leave"];

export default function AttendancePage() {
  const { employees, leaves } = useAdminStore();
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const [department, setDepartment] = useState("");

  // Until the browser reports today's date there is nothing to show. On a weekend, open the last working day
  // instead of a page that is empty by definition; the arrows and the date field still reach any day.
  let initialDate = today;
  while (initialDate && isWeekend(initialDate)) initialDate = addDays(initialDate, -1);
  const date = picked ?? initialDate;

  const rows = useMemo(() => {
    if (!date) return [];
    return employees
      .filter((e) => e.status !== "resigned" && e.joinDate <= date && (!department || e.department === department))
      .map((e) => ({ employee: e, record: attendanceFor(e, date, leaves) }));
  }, [employees, leaves, date, department]);

  const counts = summaryOrder.map((s) => ({ status: s, value: rows.filter((r) => r.record.status === s).length }));
  const weekend = date ? isWeekend(date) : false;

  return (
    <>
      <PageHeader title="Chấm công" text="Dữ liệu chấm công được tạo mẫu theo ngày; nghỉ phép đã duyệt được tính vào." />

      <div className="adm-toolbar">
        <span className="adm-datepick">
          <button type="button" className="adm-btn adm-btn--ghost" disabled={!date} onClick={() => date && setPicked(addDays(date, -1))} aria-label="Ngày trước">
            ←
          </button>
          <label>
            <span className="adm-sr">Chọn ngày</span>
            <input type="date" value={date ?? ""} onChange={(e) => e.target.value && setPicked(e.target.value)} />
          </label>
          <button type="button" className="adm-btn adm-btn--ghost" disabled={!date} onClick={() => date && setPicked(addDays(date, 1))} aria-label="Ngày sau">
            →
          </button>
          {today && date !== today && (
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setPicked(today)}>
              Hôm nay
            </button>
          )}
        </span>
        <select aria-label="Lọc theo phòng ban" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      {weekend && <div className="adm-notice">Ngày {date && formatDate(date)} là cuối tuần, không tính chấm công.</div>}

      <section className="adm-stats adm-stats--small" aria-label="Tổng hợp chấm công">
        {counts.map((c) => (
          <div key={c.status} className="adm-stat">
            <span>{attendanceStatusLabel[c.status]}</span>
            <strong>{weekend ? "–" : c.value}</strong>
          </div>
        ))}
      </section>

      <div className="adm-card adm-card--flush">
        {rows.length === 0 ? (
          <Empty title="Không có dữ liệu chấm công" text="Chưa có nhân sự nào đang làm việc vào ngày này." />
        ) : (
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Nhân sự</th>
                  <th>Phòng ban</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ employee: e, record }) => (
                  <tr key={e.id}>
                    <td>
                      <span className="adm-person">
                        <Avatar name={e.name} />
                        <span>
                          <strong>{e.name}</strong>
                          <small>{e.code}</small>
                        </span>
                      </span>
                    </td>
                    <td>{e.department}</td>
                    <td>{record.checkIn ?? "–"}</td>
                    <td>{record.checkOut ?? "–"}</td>
                    <td>
                      <Badge tone={tone[record.status]}>{attendanceStatusLabel[record.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

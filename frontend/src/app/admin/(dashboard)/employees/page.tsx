"use client";

import { useCallback, useMemo, useState } from "react";
import { useAdminStore } from "@/admin/store";
import { departments, employeeStatusLabel } from "@/admin/types";
import type { Employee, EmployeeStatus } from "@/admin/types";
import { formatDate, normalize } from "@/admin/utils";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { Modal } from "@/components/admin/Modal";
import { Avatar, Badge, Empty, PageHeader } from "@/components/admin/ui";

const PAGE_SIZE = 8;
const statusTone = { working: "green", onLeave: "amber", resigned: "gray" } as const;

type SortKey = "name" | "joinDate";
// `null` = closed, `"new"` = add form, otherwise the employee being edited
type FormState = null | "new" | Employee;

export default function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useAdminStore();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(null);
  const [removing, setRemoving] = useState<Employee | null>(null);

  const closeForm = useCallback(() => setForm(null), []);
  const closeRemove = useCallback(() => setRemoving(null), []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const list = employees.filter(
      (e) =>
        (!department || e.department === department) &&
        (!status || e.status === status) &&
        (!q || normalize(`${e.name} ${e.code} ${e.email} ${e.position}`).includes(q)),
    );
    return list.sort((a, b) => {
      const cmp = sort.key === "name" ? a.name.localeCompare(b.name, "vi") : a.joinDate.localeCompare(b.joinDate);
      return cmp * sort.dir;
    });
  }, [employees, query, department, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : "");
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none");

  return (
    <>
      <PageHeader
        title="Nhân sự"
        text={`${employees.length} nhân sự trong danh sách.`}
        actions={
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => setForm("new")}>
            + Thêm nhân sự
          </button>
        }
      />

      <div className="adm-toolbar">
        <label className="adm-search">
          <span className="adm-sr">Tìm nhân sự</span>
          <input
            type="search"
            placeholder="Tìm theo tên, mã, email, chức vụ…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Lọc theo phòng ban"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Lọc theo trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => (
            <option key={s} value={s}>
              {employeeStatusLabel[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-card adm-card--flush">
        {rows.length === 0 ? (
          <Empty title="Không tìm thấy nhân sự phù hợp" text="Thử đổi từ khóa hoặc bộ lọc." />
        ) : (
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th aria-sort={ariaSort("name")}>
                    <button type="button" className="adm-sort" onClick={() => toggleSort("name")}>
                      Nhân sự{arrow("name")}
                    </button>
                  </th>
                  <th>Mã</th>
                  <th>Phòng ban</th>
                  <th>Chức vụ</th>
                  <th aria-sort={ariaSort("joinDate")}>
                    <button type="button" className="adm-sort" onClick={() => toggleSort("joinDate")}>
                      Ngày vào làm{arrow("joinDate")}
                    </button>
                  </th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="adm-person">
                        <Avatar name={e.name} />
                        <span>
                          <strong>{e.name}</strong>
                          <small>{e.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>{e.code}</td>
                    <td>{e.department}</td>
                    <td>{e.position}</td>
                    <td>{formatDate(e.joinDate)}</td>
                    <td>
                      <Badge tone={statusTone[e.status]}>{employeeStatusLabel[e.status]}</Badge>
                    </td>
                    <td className="adm-actions">
                      <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setForm(e)}>
                        Sửa
                      </button>
                      <button type="button" className="adm-btn adm-btn--small adm-btn--danger" onClick={() => setRemoving(e)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="adm-pager">
          <span>
            Hiển thị {rows.length} / {filtered.length} nhân sự
          </span>
          <span className="adm-pager__nav">
            <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              ← Trước
            </button>
            <span>
              Trang {current} / {pages}
            </span>
            <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" disabled={current >= pages} onClick={() => setPage(current + 1)}>
              Sau →
            </button>
          </span>
        </footer>
      </div>

      {form && (
        <Modal title={form === "new" ? "Thêm nhân sự" : "Sửa thông tin nhân sự"} onClose={closeForm}>
          <EmployeeForm
            employee={form === "new" ? null : form}
            onCancel={closeForm}
            onSubmit={(input) => {
              if (form === "new") addEmployee(input);
              else updateEmployee(form.id, input);
              setForm(null);
            }}
          />
        </Modal>
      )}

      {removing && (
        <Modal title="Xóa nhân sự" onClose={closeRemove}>
          <div className="adm-confirm">
            <p>
              Xóa <strong>{removing.name}</strong> ({removing.code}) khỏi danh sách? Các đơn nghỉ phép của người này cũng bị xóa.
            </p>
            <div className="adm-form__foot">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeRemove}>
                Hủy
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--danger-solid"
                onClick={() => {
                  deleteEmployee(removing.id);
                  setRemoving(null);
                }}
              >
                Xóa nhân sự
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

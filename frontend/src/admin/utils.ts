import type { AttendanceRecord, Employee, LeaveRequest } from "./types";

const DAY = 86_400_000;

/** `yyyy-mm-dd` for a local date. */
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Parses `yyyy-mm-dd` as a local date (not UTC, so it never shifts a day). */
export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const isWeekend = (iso: string) => [0, 6].includes(fromISO(iso).getDay());

/** Inclusive number of days between two ISO dates. */
export const daysBetween = (from: string, to: string) => Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / DAY) + 1;

export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/** Removes accents so searching "nguyen" finds "Nguyễn". */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/** Small deterministic hash, so the mock attendance for a given person and day never changes between renders. */
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const time = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** Mock attendance for one employee on one day. Approved leave and weekends are respected; the rest is generated. */
export function attendanceFor(employee: Employee, iso: string, leaves: LeaveRequest[]): AttendanceRecord {
  if (isWeekend(iso)) return { status: "off" };
  const onLeave = leaves.some((l) => l.employeeId === employee.id && l.status === "approved" && l.from <= iso && iso <= l.to);
  if (onLeave) return { status: "leave" };
  const r = hash(`${employee.id}|${iso}`);
  if (r < 0.04) return { status: "absent" };
  const outMinute = Math.floor(hash(`${employee.id}|${iso}|out`) * 50);
  if (r < 0.16) {
    return { status: "late", checkIn: time(8, 15 + Math.floor(hash(`${employee.id}|${iso}|in`) * 40)), checkOut: time(17, 30 + (outMinute % 30)) };
  }
  return { status: "onTime", checkIn: time(7, 40 + Math.floor(hash(`${employee.id}|${iso}|in`) * 19)), checkOut: time(17, 30 + (outMinute % 30)) };
}

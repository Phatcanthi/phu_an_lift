// Types for the HR dashboard. The dashboard runs on mock data only (see mock.ts); there is no backend yet.

export const departments = [
  "Kinh doanh",
  "Kỹ thuật lắp đặt",
  "Bảo trì",
  "Thiết kế",
  "Kế toán",
  "Hành chính nhân sự",
  "Kho vận",
] as const;
export type Department = (typeof departments)[number];

export type EmployeeStatus = "working" | "onLeave" | "resigned";
export const employeeStatusLabel: Record<EmployeeStatus, string> = {
  working: "Đang làm việc",
  onLeave: "Nghỉ dài hạn",
  resigned: "Đã nghỉ việc",
};

export interface Employee {
  id: string;
  /** Display code such as NV001. */
  code: string;
  name: string;
  email: string;
  phone: string;
  department: Department;
  position: string;
  status: EmployeeStatus;
  /** ISO date (yyyy-mm-dd). */
  joinDate: string;
}

export type EmployeeInput = Omit<Employee, "id" | "code">;

export type LeaveType = "annual" | "sick" | "unpaid" | "other";
export const leaveTypeLabel: Record<LeaveType, string> = {
  annual: "Phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Nghỉ không lương",
  other: "Lý do khác",
};

export type LeaveStatus = "pending" | "approved" | "rejected";
export const leaveStatusLabel: Record<LeaveStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  /** ISO dates, inclusive. */
  from: string;
  to: string;
  reason: string;
  status: LeaveStatus;
}

export type AttendanceStatus = "onTime" | "late" | "absent" | "leave" | "off";
export const attendanceStatusLabel: Record<AttendanceStatus, string> = {
  onTime: "Đúng giờ",
  late: "Đi trễ",
  absent: "Vắng",
  leave: "Nghỉ phép",
  off: "Nghỉ cuối tuần",
};

export interface AttendanceRecord {
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
}
